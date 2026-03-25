/** Shared types for the agent subsystem */
// Re-export all types from schemas (zod validated)
export {
  ActiveSessionSchema,
  AlertMetaSchema,
  AlertTypeConfigSchema,
  AlertTypeSchema,
  ChannelPostSchema,
  ChannelTrackingSchema,
  ChannelWithUpdatesSchema,
  CitedSourceSchema,
  ClarifyInputSchema,
  ClarifyOutputSchema,
  createEmptyEnrichmentData,
  EnrichmentDataSchema,
  ExtractContextSchema,
  ExtractionResultSchema,
  GifModeSchema,
  InlineCiteSchema,
  parseJSON,
  QualitativeCountSchema,
  RelevanceCheckSchema,
  RunEnrichmentInputSchema,
  TelegramMessageSchema,
  TrackedMessageSchema,
  ValidatedExtractionSchema,
  validateSafe,
  VotedResultSchema,
} from "@easyoref/shared";

// Re-export from agent
export { AgentState, AgentStateType } from "@easyoref/agent";

// Re-export inferred types for convenience
export type {
  ActiveSession,
  AlertMeta,
  AlertType,
  AlertTypeConfig,
  ChannelPost,
  ChannelTracking,
  ChannelWithUpdates,
  CitedSource,
  ClarifyInput,
  ClarifyOutput,
  EnrichmentData,
  ExtractContext,
  ExtractionResult,
  GifMode,
  InlineCite,
  QualitativeCount,
  RelevanceCheck,
  RunEnrichmentInput,
  TelegramMessage,
  TrackedMessage,
  ValidatedExtraction,
  VotedResult,
} from "@easyoref/shared";

// Keep backward compatibility
import { createEmptyEnrichmentData } from "@easyoref/shared";
export const emptyEnrichmentData = createEmptyEnrichmentData;

/**
 * ✅ All TypeScript interfaces are now generated from zod schemas in ./schemas.ts
 * The old interface definitions below are kept as comments for reference
 * and have been replaced by zod schema validation.
 *
 * Types to use:
 * - AlertType, QualitativeCount, TrackedMessage, ChannelWithUpdates, ChannelTracking
 * - RelevanceCheck, ExtractionResult, ValidatedExtraction
 * - CitedSource, VotedResult, InlineCite, EnrichmentData
 * - TelegramMessage, AlertMeta, ChannelPost, ActiveSession
 * - ExtractContext, ClarifyInput, ClarifyOutput
 * - AgentState, RunEnrichmentInput, AlertTypeConfig, GifMode
 *
 * Schemas use zod and provide runtime validation with parse() method.
 * See ./schemas.ts for all definitions and validation.
 */
