/**
 * Unit tests for synthesize-node.
 *
 * Covers: early-return when votedResult is null/empty → must return synthesizedInsights: [].
 * This was the ROOT CAUSE of the 2026-03-29 production crash:
 * synthesize-node returned without setting synthesizedInsights, leaving it
 * undefined in LangGraph state, which caused edit-node to crash on .some().
 *
 * No LLM, no network — only tests the deterministic early-return path.
 */

import { describe, expect, it, vi } from "vitest";
import { AIMessage } from "langchain";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("@easyoref/shared", async () => {
  const actual = await vi.importActual("@easyoref/shared");
  return {
    ...actual,
    config: {
      agent: {
        filterModel: "google/gemini-2.5-flash-lite",
        filterFallbackModel: "meta-llama/llama-3.3-70b-instruct:free",
        extractModel: "google/gemini-2.5-flash-lite",
        extractFallbackModel: "meta-llama/llama-3.3-70b-instruct:free",
        apiKey: "test-key",
        mcpTools: false,
        clarifyFetchCount: 3,
        confidenceThreshold: 0.6,
        channels: [],
        areaLabels: {},
      },
      botToken: "",
      areas: ["תל אביב"],
      language: "ru",
    },
  };
});

vi.mock("@easyoref/monitoring", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

// ── Import (after mocks) ──────────────────────────────────

import { synthesizeNode } from "../src/nodes/synthesize-node.js";

// ── Helpers ───────────────────────────────────────────────

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    messages: [],
    alertId: "alert-1",
    alertTs: Date.now(),
    alertType: "red_alert" as const,
    alertAreas: ["תל אביב"],
    chatId: "-1001234567890",
    messageId: 100,
    isCaption: false,
    currentText: "Red Alert",
    votedResult: undefined,
    synthesizedInsights: [],
    clarifyAttempted: false,
    extractedInsights: [],
    filteredInsights: [],
    previousInsights: [],
    telegramMessages: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────
// synthesizeNode — early return paths
// ─────────────────────────────────────────────────────────

describe("synthesizeNode", () => {
  it("returns synthesizedInsights: [] when votedResult is undefined", async () => {
    const state = makeState({ votedResult: undefined });
    const result = await synthesizeNode(state as any);

    expect(result.synthesizedInsights).toBeDefined();
    expect(result.synthesizedInsights).toEqual([]);
    expect(result.messages).toHaveLength(1);
  });

  it("returns synthesizedInsights: [] when votedResult has empty consensus", async () => {
    const state = makeState({
      votedResult: {
        consensus: {},
        needsClarify: false,
      },
    });
    const result = await synthesizeNode(state as any);

    expect(result.synthesizedInsights).toBeDefined();
    expect(result.synthesizedInsights).toEqual([]);
    expect(result.messages).toHaveLength(1);
  });

  it("returns synthesizedInsights: [] (not undefined) — prevents downstream crash", async () => {
    // Explicit check: the returned object must have the key set to [],
    // NOT omit it (which would leave ReducedValue untouched → undefined in state)
    const state = makeState({ votedResult: undefined });
    const result = await synthesizeNode(state as any);

    expect("synthesizedInsights" in result).toBe(true);
    expect(result.synthesizedInsights).toStrictEqual([]);
  });
});
