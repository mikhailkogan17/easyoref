/**
 * LangGraph.js enrichment pipeline — phase-aware, time-validated.
 *
 * Pipeline:
 *   filter → extract → vote → [clarify → revote] → edit
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
  setLastUpdateTs,
  validateSafe,
  type TrackedMessage,
} from "@easyoref/shared";
import {
  END,
  MemorySaver,
  ReducedValue,
  START,
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
import { clarifyNode } from "./nodes/clarify.js";
import { filterNode } from "./nodes/filters.js";
import { editMessage } from "./nodes/message.js";
import { voteNode } from "./nodes/vote.js";

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

export type AgentStateType = typeof AgentState.State;

async function extractNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  if (!state.tracking || state.tracking.channels_with_updates.length === 0) {
    logger.info("Agent: no channels with updates", {
      alertId: state.alertId,
    });
    return { extractions: [] };
  }

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

  const postsToExtract: TrackedMessage[] = [];
  for (const channel of state.tracking.channels_with_updates) {
    const match = relevantChannels.some(
      (rc) =>
        rc === channel.channel ||
        rc === `@${channel.channel}` ||
        `@${rc}` === channel.channel,
    );
    if (match) {
      postsToExtract.push(...channel.last_tracked_messages);
    }
  }

  if (postsToExtract.length === 0) {
    logger.info("Agent: no posts from relevant channels", {
      alertId: state.alertId,
    });
    return { extractions: [] };
  }

  const context: ExtractContext = {
    alertTs: state.alertTs,
    alertType: state.alertType,
    alertAreas: state.alertAreas,
    alertId: state.alertId,
    language: config.language,
    existingEnrichment: state.previousEnrichment,
  };
  const raw = await extractPosts(postsToExtract, context);
  const filtered = postFilter(raw, state.alertId);

  await setLastUpdateTs(Date.now());

  return { extractions: filtered };
}

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

  const origins = state.votedResult.country_origins;
  if (
    origins &&
    origins.length === 1 &&
    state.votedResult.sources_count === 1
  ) {
    if (
      origins[0]!.name === "Lebanon" &&
      state.alertAreas.some(
        (area) =>
          area.includes("תל אביב") ||
          area.includes("גוש דן") ||
          area.includes("שרון") ||
          area.includes("מרכז"),
      )
    ) {
      logger.info("Agent: routing to clarify (suspicious Lebanon origin)", {});
      return "clarify";
    }
  }

  return "editMessage";
}

const checkpointer = new MemorySaver();

export function buildGraph() {
  return new StateGraph(AgentState)
    .addNode("filter", filterNode)
    .addNode("extract", extractNode)
    .addNode("vote", voteNode)
    .addNode("clarify", clarifyNode)
    .addNode("revote", voteNode)
    .addNode("edit", editNode)
    .addEdge(START, "filter")
    .addEdge("filter", "extract")
    .addEdge("extract", "vote")
    .addConditionalEdges("vote", shouldClarify, {
      clarify: "clarify",
      editMessage: "edit",
    })
    .addEdge("clarify", "revote")
    .addEdge("revote", "edit")
    .addEdge("edit", END)
    .compile({ checkpointer });
}

export type { RunEnrichmentInput } from "@easyoref/shared";
export { RunEnrichmentInputSchema };

export async function runEnrichment(input: unknown): Promise<void> {
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
