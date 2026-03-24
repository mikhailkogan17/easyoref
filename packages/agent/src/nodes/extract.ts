/**
 * Extract Node — cheap LLM filter + expensive extraction.
 */

import * as logger from "@easyoref/monitoring";
import {
  config,
  setLastUpdateTs,
  type TrackedMessage,
} from "@easyoref/shared";
import {
  extractPosts,
  filterChannelsCheap,
  postFilter,
  type ExtractContext,
} from "../extract.js";
import type { AgentStateType } from "../graph.js";

export const extractNode = async (
  state: AgentStateType,
): Promise<Partial<AgentStateType>> => {
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
};
