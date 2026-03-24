/**
 * Deterministic pre-filters — zero LLM tokens.
 *
 * Filters out noise:
 *   - Pikud HaOref area list "простыни" (high comma count)
 *   - Summary/recap posts with timestamp patterns "(HH:MM)", "X минут"
 *   - IDF/Tsahal press releases (long official texts)
 *
 * Builds ChannelTracking structure for the LLM pipeline.
 */

import type {
  ChannelTracking,
  ChannelWithUpdates,
  TrackedMessage,
} from "./schemas.js";
import type { ChannelPost } from "./store.js";

// ── Noise detectors ────────────────────────────────────

const OREF_LINK_RE = /oref\.org\.il/i;
const OREF_CHANNEL_RE = /pikud|פיקוד|oref/i;
const IDF_CHANNEL_RE = /idf|צה"?ל|tsahal/i;

/**
 * Pikud HaOref "простыня" — area list with many commas.
 */
function isAreaListNoise(text: string): boolean {
  if (OREF_LINK_RE.test(text)) return true;
  const commaCount = (text.match(/,/g) || []).length;
  return commaCount >= 8;
}

/**
 * Summary/recap posts with timestamp patterns.
 * Real-time intel doesn't contain multiple "(HH:MM)" timestamps
 * or "X минут/минуты" duration references.
 */
function isSummaryPost(text: string): boolean {
  // Multiple "(HH:MM)" timestamps in one post = recap/summary
  const timeParenCount = (text.match(/\(\d{1,2}:\d{2}\)/g) || []).length;
  if (timeParenCount >= 2) return true;
  // "X минуты" / "X минут" — Russian time duration references (recap formatting)
  if (/\d+\s+минут[ыа]?\b/i.test(text)) return true;
  return false;
}

/**
 * IDF/Tsahal press releases — long official texts (>400 chars from IDF channels).
 */
function isIdfPressRelease(channel: string, text: string): boolean {
  if (!IDF_CHANNEL_RE.test(channel)) return false;
  return text.length > 400;
}

/**
 * Combined noise filter. Returns true if post should be filtered OUT.
 */
export function isNoise(post: ChannelPost): boolean {
  // Pikud HaOref channels with long posts are area lists
  if (OREF_CHANNEL_RE.test(post.channel) && post.text.length > 300) return true;
  // Area list spam (any channel)
  if (isAreaListNoise(post.text)) return true;
  // Summary/recap posts
  if (isSummaryPost(post.text)) return true;
  // IDF press releases
  if (isIdfPressRelease(post.channel, post.text)) return true;
  return false;
}

// ── Channel tracking structure ─────────────────────────

function toTrackedMessage(post: ChannelPost): TrackedMessage {
  return {
    timestamp: post.ts,
    text: post.text,
    url: post.messageUrl,
    channel: post.channel,
  };
}

/**
 * Build ChannelTracking from session posts.
 *
 * Splits posts per channel into prev (already processed) and last (new).
 * Applies deterministic noise filter on all posts.
 * Only includes channels that have new (last) messages.
 */
export function buildChannelTracking(
  posts: ChannelPost[],
  sessionStartTs: number,
  lastUpdateTs: number,
): ChannelTracking {
  const channelMap = new Map<
    string,
    { prev: TrackedMessage[]; last: TrackedMessage[] }
  >();

  for (const post of posts) {
    if (isNoise(post)) continue;
    if (post.ts < sessionStartTs) continue;

    if (!channelMap.has(post.channel)) {
      channelMap.set(post.channel, { prev: [], last: [] });
    }
    const bucket = channelMap.get(post.channel)!;
    const msg = toTrackedMessage(post);

    if (lastUpdateTs > 0 && post.ts <= lastUpdateTs) {
      bucket.prev.push(msg);
    } else {
      bucket.last.push(msg);
    }
  }

  const channels_with_updates: ChannelWithUpdates[] = [];
  for (const [channel, { prev, last }] of channelMap) {
    if (last.length > 0) {
      channels_with_updates.push({
        channel,
        prev_tracked_messages: prev.sort((a, b) => a.timestamp - b.timestamp),
        last_tracked_messages: last.sort((a, b) => a.timestamp - b.timestamp),
      });
    }
  }

  return {
    track_start_timestamp: sessionStartTs,
    last_update_timestamp: lastUpdateTs,
    channels_with_updates,
  };
}

// ── Exported for testing ───────────────────────────────

export const _test = {
  isAreaListNoise,
  isSummaryPost,
  isIdfPressRelease,
  isNoise,
  toTrackedMessage,
} as const;
