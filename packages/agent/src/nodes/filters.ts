/**
 * Filter Node — deterministic pre-filters, zero LLM tokens.
 *
 * Filters out noise:
 *   - Pikud HaOref area list "простыни" (high comma count)
 *   - Summary/recap posts with timestamp patterns "(HH:MM)", "X минут"
 *   - IDF/Tsahal press releases (long official texts)
 *
 * Builds ChannelTracking structure for the LLM pipeline.
 */

import * as logger from "@easyoref/monitoring";
import type { AgentStateType } from "../graph.js";
import {
  ChannelPost,
  ChannelTracking,
  ChannelWithUpdates,
  getActiveSession,
  getChannelPosts,
  getEnrichmentData,
  getLastUpdateTs,
  TrackedMessage,
} from "@easyoref/shared";

// ── Noise detectors ────────────────────────────────────

const OREF_LINK_PATTERN = /oref\.org\.il/i;
const OREF_CHANNEL_PATTERN = /pikud|פיקוד|oref/i;
const IDF_CHANNEL_PATTERN = /idf|צה"?ל|tsahal/i;

function isAreaListNoise(text: string): boolean {
  if (OREF_LINK_PATTERN.test(text)) return true;
  const commaCount = (text.match(/,/g) || []).length;
  return commaCount >= 8;
}

function isSummaryPost(text: string): boolean {
  const timeParenCount = (text.match(/\(\d{1,2}:\d{2}\)/g) || []).length;
  if (timeParenCount >= 2) return true;
  if (/\d+\s+минут[ыа]?\b/i.test(text)) return true;
  return false;
}

function isIdfPressRelease(channel: string, text: string): boolean {
  if (!IDF_CHANNEL_PATTERN.test(channel)) return false;
  return text.length > 400;
}

function isNoise(post: ChannelPost): boolean {
  if (OREF_CHANNEL_PATTERN.test(post.channel) && post.text.length > 300) return true;
  if (isAreaListNoise(post.text)) return true;
  if (isSummaryPost(post.text)) return true;
  if (isIdfPressRelease(post.channel, post.text)) return true;
  return false;
}

// ── Channel tracking ────────────────────────────────────

function toTrackedMessage(post: ChannelPost): TrackedMessage {
  return {
    timestamp: post.ts,
    text: post.text,
    url: post.messageUrl,
    channel: post.channel,
  };
}

function buildChannelTracking(
  posts: ChannelPost[],
  sessionStartTimestamp: number,
  lastUpdateTimestamp: number,
): ChannelTracking {
  const channelMap = new Map<
    string,
    { previous: TrackedMessage[]; latest: TrackedMessage[] }
  >();

  for (const post of posts) {
    if (isNoise(post)) continue;
    if (post.ts < sessionStartTimestamp) continue;

    if (!channelMap.has(post.channel)) {
      channelMap.set(post.channel, { previous: [], latest: [] });
    }
    const bucket = channelMap.get(post.channel)!;
    const trackedMessage = toTrackedMessage(post);

    if (lastUpdateTimestamp > 0 && post.ts <= lastUpdateTimestamp) {
      bucket.previous.push(trackedMessage);
    } else {
      bucket.latest.push(trackedMessage);
    }
  }

  const channelsWithUpdates: ChannelWithUpdates[] = [];
  for (const [channel, { previous, latest }] of channelMap) {
    if (latest.length > 0) {
      channelsWithUpdates.push({
        channel,
        prev_tracked_messages: previous.sort(
          (a, b) => a.timestamp - b.timestamp,
        ),
        last_tracked_messages: latest.sort(
          (a, b) => a.timestamp - b.timestamp,
        ),
      });
    }
  }

  return {
    track_start_timestamp: sessionStartTimestamp,
    last_update_timestamp: lastUpdateTimestamp,
    channels_with_updates: channelsWithUpdates,
  };
}

// ── Node ───────────────────────────────────────────────

export const filterNode = async (
  state: AgentStateType,
): Promise<Partial<AgentStateType>> => {
  const posts = await getChannelPosts(state.alertId);
  const previousEnrichment = await getEnrichmentData();
  const session = await getActiveSession();
  const sessionStartTimestamp = session?.sessionStartTs ?? state.alertTs;
  const lastUpdateTimestamp = await getLastUpdateTs();

  if (posts.length === 0) {
    logger.info("Agent: no posts", { alertId: state.alertId });
    return { tracking: undefined, previousEnrichment };
  }

  const tracking = buildChannelTracking(
    posts,
    sessionStartTimestamp,
    lastUpdateTimestamp,
  );

  logger.info("Agent: channel tracking", {
    alertId: state.alertId,
    total_posts: posts.length,
    channels_with_updates: tracking.channels_with_updates.length,
    total_new_posts: tracking.channels_with_updates.reduce(
      (total, channel) => total + channel.last_tracked_messages.length,
      0,
    ),
  });

  return { tracking, previousEnrichment };
};
