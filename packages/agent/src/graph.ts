/**
 * LangGraph.js enrichment pipeline — phase-aware, time-validated.
 *
 * Lean orchestrator: connects filter → extract → vote → edit.
 * All logic lives in dedicated modules:
 *   - filters.ts:  deterministic noise filter, channel tracking
 *   - extract.ts:  cheap LLM pre-filter, expensive extraction, post-filter
 *   - vote.ts:     consensus voting (deterministic)
 *   - message.ts:  message building, Telegram editing
 *   - helpers.ts:  toIsraelTime, textHash
 *
 * Pipeline:
 *   collectAndFilter → extract → vote → [clarify → revote] → editMessage
 */

import * as logger from "@easyoref/monitoring";
import {
  AlertTypeSchema,
  ChannelTrackingSchema,
  EnrichmentDataSchema,
  RunEnrichmentInputSchema,
  TelegramMessageSchema,
  ValidatedExtractionSchema,
  VotedResultSchema,
  config,
  createEmptyEnrichmentData,
  getActiveSession,
  getChannelPosts,
  getEnrichmentData,
  getLastUpdateTs,
  setLastUpdateTs,
  validateSafe,
  type TrackedMessage,
} from "@easyoref/shared";
import {
  MemorySaver,
  ReducedValue,
  StateGraph,
  StateSchema,
} from "@langchain/langgraph";
import { z } from "zod";
import {
  extractPosts,
  filterChannelsCheap,
  postFilter,
  type ExtractContext,
} from "./extract.js";
import { runClarify } from "./nodes/clarify.js";
import { buildChannelTracking } from "./nodes/filters.js";
import { editMessage } from "./nodes/message.js";
import { vote } from "./nodes/vote.js";

// ── State ──────────────────────────────────────────────

export const AgentState = new StateSchema({
  alertId: z.string(),
  alertTs: z.number(),
  alertType: AlertTypeSchema,
  alertAreas: z.array(z.string()),
  chatId: z.string(),
  messageId: z.number(),
  isCaption: z.boolean(),
  currentText: z.string(),
  tracking: ChannelTrackingSchema.optional(),
  extractions: new ReducedValue(z.array(ValidatedExtractionSchema), {
    reducer: (previous, current) => [...previous, ...current],
  }),
  votedResult: VotedResultSchema.optional(),
  clarifyAttempted: z.boolean().default(false),
  previousEnrichment: EnrichmentDataSchema.optional(),
  monitoringLabel: z.string().optional(),
  telegramMessages: new ReducedValue(z.array(TelegramMessageSchema), {
    reducer: (previous, current) => [...previous, ...current],
  }),
});

type AgentStateType = typeof AgentState.State;

// ── Node: collect posts + deterministic noise filter ───

async function collectAndFilter(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const posts = await getChannelPosts(state.alertId);
  const prevEnrichment = await getEnrichmentData();
  const session = await getActiveSession();
  const sessionStartTs = session?.sessionStartTs ?? state.alertTs;
  const lastUpdateTs = await getLastUpdateTs();

  if (posts.length === 0) {
    logger.info("Agent: no posts", { alertId: state.alertId });
    return { tracking: undefined, previousEnrichment: prevEnrichment };
  }

  const tracking = buildChannelTracking(posts, sessionStartTs, lastUpdateTs);

  logger.info("Agent: channel tracking", {
    alertId: state.alertId,
    total_posts: posts.length,
    channels_with_updates: tracking.channels_with_updates.length,
    total_new_posts: tracking.channels_with_updates.reduce(
      (s, c) => s + c.last_tracked_messages.length,
      0,
    ),
  });

  return { tracking, previousEnrichment: prevEnrichment };
}

// ── Node: cheap LLM channel filter + expensive extraction ──

async function extractNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  if (!state.tracking || state.tracking.channels_with_updates.length === 0) {
    logger.info("Agent: no channels with updates", {
      alertId: state.alertId,
    });
    return { extractions: [] };
  }

  // Step 1: cheap LLM — which channels have important military intel?
  const relevantChannels = await filterChannelsCheap(
    state.tracking,
    state.alertAreas,
    state.alertTs,
    state.alertType,
  );

  if (relevantChannels.length === 0) {
    logger.info("Agent: no relevant channels after cheap filter", {
      alertId: state.alertId,
    });
    return { extractions: [] };
  }

  // Step 2: collect posts from relevant channels only
  const postsToExtract: TrackedMessage[] = [];
  for (const ch of state.tracking.channels_with_updates) {
    const match = relevantChannels.some(
      (rc) =>
        rc === ch.channel || rc === `@${ch.channel}` || `@${rc}` === ch.channel,
    );
    if (match) {
      postsToExtract.push(...ch.last_tracked_messages);
    }
  }

  if (postsToExtract.length === 0) {
    logger.info("Agent: no posts from relevant channels", {
      alertId: state.alertId,
    });
    return { extractions: [] };
  }

  // Step 3: expensive extraction with post-level dedup
  const ctx: ExtractContext = {
    alertTs: state.alertTs,
    alertType: state.alertType,
    alertAreas: state.alertAreas,
    alertId: state.alertId,
    language: config.language,
    existingEnrichment: state.previousEnrichment,
  };
  const raw = await extractPosts(postsToExtract, ctx);

  // Step 4: deterministic post-filter
  const filtered = postFilter(raw, state.alertId);

  // Update timestamp for next job's dedup split
  await setLastUpdateTs(Date.now());

  return { extractions: filtered };
}

// ── Node: vote ─────────────────────────────────────────

function voteNode(state: AgentStateType): Partial<AgentStateType> {
  return { votedResult: vote(state.extractions, state.alertId) };
}

// ── Node: clarify (MCP tool calling) ───────────────────

async function clarifyNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  if (!state.votedResult) {
    logger.info("Agent: clarify skipped — no voted result", {
      alertId: state.alertId,
    });
    return { clarifyAttempted: true };
  }

  logger.info("Agent: clarify triggered", {
    alertId: state.alertId,
    confidence: state.votedResult.confidence,
  });

  try {
    const result = await runClarify({
      alertId: state.alertId,
      alertAreas: state.alertAreas,
      alertType: state.alertType,
      alertTs: state.alertTs,
      messageId: state.messageId,
      currentText: state.currentText,
      extractions: state.extractions,
      votedResult: state.votedResult,
    });

    return {
      extractions: [...state.extractions, ...result.newExtractions],
      votedResult: undefined,
      clarifyAttempted: true,
    };
  } catch (err) {
    logger.error("Agent: clarify failed", {
      alertId: state.alertId,
      error: String(err),
    });
    return { clarifyAttempted: true };
  }
}

// ── Node: edit Telegram message ────────────────────────

async function editNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  await editMessage({
    alertId: state.alertId,
    alertTs: state.alertTs,
    alertType: state.alertType,
    chatId: state.chatId,
    messageId: state.messageId,
    isCaption: state.isCaption,
    telegramMessages: state.telegramMessages,
    currentText: state.currentText,
    votedResult: state.votedResult,
    previousEnrichment:
      state.previousEnrichment ?? EnrichmentDataSchema.parse({}),
    monitoringLabel: state.monitoringLabel,
  });
  return {};
}

// ── Conditional routing after vote ─────────────────────

function shouldClarify(state: AgentStateType): "clarify" | "editMessage" {
  if (state.clarifyAttempted) return "editMessage";
  if (!config.agent.mcpTools) return "editMessage";
  if (!state.votedResult) return "editMessage";

  if (state.votedResult.confidence < config.agent.confidenceThreshold) {
    logger.info("Agent: routing to clarify (low confidence)", {
      confidence: state.votedResult.confidence,
    });
    return "clarify";
  }

  // Suspicious single-source: Lebanon for central Israel → verify
  const origins = state.votedResult.country_origins;
  if (
    origins &&
    origins.length === 1 &&
    state.votedResult.sources_count === 1
  ) {
    if (
      origins[0]!.name === "Lebanon" &&
      state.alertAreas.some(
        (a) =>
          a.includes("תל אביב") ||
          a.includes("גוש דן") ||
          a.includes("שרון") ||
          a.includes("מרכז"),
      )
    ) {
      logger.info("Agent: routing to clarify (suspicious Lebanon origin)", {});
      return "clarify";
    }
  }

  return "editMessage";
}

// ── Build graph ────────────────────────────────────────

const checkpointer = new MemorySaver();

function buildGraph() {
  return new StateGraph(AgentState)
    .addNode("collectAndFilter", collectAndFilter)
    .addNode("extract", extractNode)
    .addNode("vote", voteNode)
    .addNode("clarify", clarifyNode)
    .addNode("revote", voteNode)
    .addNode("editMessage", editNode)
    .addEdge("__start__", "collectAndFilter")
    .addEdge("collectAndFilter", "extract")
    .addEdge("extract", "vote")
    .addConditionalEdges("vote", shouldClarify, {
      clarify: "clarify",
      editMessage: "editMessage",
    })
    .addEdge("clarify", "revote")
    .addEdge("revote", "editMessage")
    .addEdge("editMessage", "__end__")
    .compile({ checkpointer });
}

// ── Public API ─────────────────────────────────────────

export type { RunEnrichmentInput } from "@easyoref/shared";
export { RunEnrichmentInputSchema };

export async function runEnrichment(input: unknown): Promise<void> {
  // Validate input against schema
  const validation = validateSafe(RunEnrichmentInputSchema, input);
  if (!validation.ok) {
    logger.error("Enrichment: invalid input", { error: validation.error });
    throw new Error(`Invalid enrichment input: ${validation.error}`);
  }

  const validInput = validation.data;

  await buildGraph().invoke(
    {
      alertId: validInput.alertId,
      alertTs: validInput.alertTs,
      alertType: validInput.alertType,
      alertAreas: validInput.alertAreas,
      chatId: validInput.chatId,
      messageId: validInput.messageId,
      isCaption: validInput.isCaption,
      telegramMessages: validInput.telegramMessages,
      currentText: validInput.currentText,
      previousEnrichment: createEmptyEnrichmentData(),
      monitoringLabel: validInput.monitoringLabel,
    },
    { configurable: { thread_id: validInput.alertId } },
  );
}
