/** Shared types for the agent subsystem */
// Re-export all types from schemas (zod validated)
export {
  ActiveSessionSchema,
  AgentStateSchema,
  AlertMetaSchema,
  AlertTypeConfigSchema,
  AlertTypeSchema,
  ChannelPostSchema,
  ChannelTrackingSchema,
  ChannelWithUpdatesSchema,
  TelegramMessageSchema,
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
  QualCountSchema,
  RelevanceCheckSchema,
  RunEnrichmentInputSchema,
  TrackedMessageSchema,
  ValidatedExtractionSchema,
  validateSafe,
  VotedResultSchema,
} from "./schemas.js";

// Re-export inferred types for convenience
export type {
  ActiveSession,
  AgentState,
  AlertMeta,
  AlertType,
  AlertTypeConfig,
  ChannelPost,
  ChannelTracking,
  ChannelWithUpdates,
  TelegramMessage,
  CitedSource,
  ClarifyInput,
  ClarifyOutput,
  EnrichmentData,
  ExtractContext,
  ExtractionResult,
  GifMode,
  InlineCite,
  QualCount,
  RelevanceCheck,
  RunEnrichmentInput,
  TrackedMessage,
  ValidatedExtraction,
  VotedResult,
} from "./schemas.js";

// Keep backward compatibility
import { createEmptyEnrichmentData } from "./schemas.js";
export const emptyEnrichmentData = createEmptyEnrichmentData;

/**
 * ✅ All TypeScript interfaces are now generateDfrom zod schemas in ./schemas.ts
 * The old interface definitions below are kept as comments for reference
 * and have been replaced by zod schema validation.
 *
 * Types to use:
 * - AlertType, QualCount, TrackedMessage, ChannelWithUpdates, ChannelTracking
 * - RelevanceCheck, ExtractionResult, ValidatedExtraction
 * - CitedSource, VotedResult, InlineCite, EnrichmentData
 * - TelegramMessage, AlertMeta, ChannelPost, ActiveSession
 * - ExtractContext, ClarifyInput, ClarifyOutput
 * - AgentState, RunEnrichmentInput, AlertTypeConfig, GifMode
 *
 * Schemas use zod and provide runtime validation with parse() method.
 * See ./schemas.ts for all definitions and validation.
 */
