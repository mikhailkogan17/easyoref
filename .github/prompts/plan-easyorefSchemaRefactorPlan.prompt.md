# EasyOref Schema Refactor Plan — Comprehensive

**Status:** Planning
**Scope:** 25 schemas → 20 refined schemas + renamed types
**Estimate:** 5-7 days (parallelizable)

---

## Phase 0: Preparation (Day 1)

### 0.1 Create branching strategy
- [ ] Create `refactor/schema-cleanup` branch
- [ ] Set up migration fixtures for Redis (before/after)
- [ ] Create `MIGRATION.md` document

### 0.2 Audit existing usage
- [ ] Search all usages of `AlertTypeSchema`, `TrackedMessage`, `TelegramMessage` in codebase
- [ ] Map dependencies: which files import which schemas
- [ ] Identify external APIs (if any) that depend on old names

### 0.3 Create compatibility layer (optional)
- [ ] Consider `type aliases` for gradual migration, OR full cutover

**Deliverable:** Dependency map + migration checklist

---

## Phase 1: Base Types Refactor (Day 1-2) ⚡ PARALLEL

### 1.1 AlertTypeSchema consolidation
**Files:** `packages/shared/src/schemas.ts`

**Changes:**
```typescript
// OLD
export const AlertTypeSchema = z.enum(["early_warning", "siren", "resolved"]);
export const AlertTypeConfigSchema = z.enum(["early", "siren", "resolved"]);

// NEW
export const AlertTypeSchema = z.enum(["early_warning", "red_alert", "resolved"]);
export type AlertType = z.infer<typeof AlertTypeSchema>;

// DELETE AlertTypeConfigSchema (merge into AlertTypeSchema)
```

**Breaking Changes:**
- `"siren"` → `"red_alert"` (need find/replace in logs, tests, comments)
- `AlertTypeConfigSchema` deleted (alias any old references to `AlertTypeSchema`)

**Migration Code:**
```typescript
// Migration: old redis data
function migrateAlertType(oldValue: string): string {
  return oldValue === "siren" ? "red_alert" : oldValue;
}
```

### 1.2 Rename BASE types consistency
- [ ] `QualitativeCountSchema` (already done ✅)
- [ ] Remove/consolidate `CountryOriginSchema` (needs audit)

**Status:** Ready to commit after Phase 1

---

## Phase 2: Input/Output Semantics (Day 2-3) ⚡ PARALLEL

### 2.1 Message Type Hierarchy

**Create new base type:**
```typescript
// Base for all incoming messages
export const BaseSourceMessageSchema = z.object({
  channelId: z.string().min(1),
  sourceType: z.enum(["telegram_channel", "web_scrape", "manual"]),
  timestamp: z.number().int().min(0),
  text: z.string().min(1),
  sourceUrl: z.url().optional(),
});
export type BaseSourceMessage = z.infer<typeof BaseSourceMessageSchema>;

// Input: from Telegram
export const NewsMessageSchema = BaseSourceMessageSchema.extend({
  sourceType: z.literal("telegram_channel"),
  gramjyMessageId: z.number().optional(),
});
export type NewsMessage = z.infer<typeof NewsMessageSchema>;

// REMOVED (move logic to NewsMessage)
// ❌ TrackedMessageSchema
// ❌ ChannelPostSchema
```

### 2.2 Channel/Group Hierarchy

**Clarify semantics:**
```typescript
// Source: Telegram channels being monitored
export const NewsChannelSchema = z.object({
  channelId: z.string().min(1),
  channelName: z.string(),
  language: z.string().min(2).max(5),
  region: z.string().optional(),
});
export type NewsChannel = z.infer<typeof NewsChannelSchema>;

// Target: Group where bot sends alerts
export const TargetGroupSchema = z.object({
  chatId: z.string().min(1),
  groupName: z.string(),
  subscribedRegions: z.array(z.string()),
});
export type TargetGroup = z.infer<typeof TargetGroupSchema>;

// REMOVED
// ❌ TelegramMessageSchema (merge into TargetGroupMessage)
// ❌ ChannelWithUpdatesSchema (rename to NewsChannelWithUpdates)
```

### 2.3 Batch/Update Container

```typescript
export const NewsChannelWithUpdatesSchema = z.object({
  channel: NewsChannelSchema,
  processedMessages: z.array(NewsMessageSchema).default([]).describe("已处理"),
  unprocessedMessages: z.array(NewsMessageSchema).default([]).describe("待处理"),
});
export type NewsChannelWithUpdates = z.infer<typeof NewsChannelWithUpdatesSchema>;
```

**Status:** Requires refactoring all graph nodes that consume these types

---

## Phase 3: Extraction/Validation Pipeline (Day 3-4) 🔴 CRITICAL

### 3.1 Define Insight discriminatedUnion (NEW)

```typescript
export const InsightKindSchema = z.enum([
  "rocket_impact",
  "rocket_interception",
  "location",
  "casualty",
  "injury",
  "eta_minutes",
  "cassette_munition"
]);
export type InsightKind = z.infer<typeof InsightKindSchema>;

export const InsightSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("rocket_impact"), value: z.number().int().min(0) }),
  z.object({ kind: z.literal("rocket_interception"), value: z.number().int().min(0) }),
  z.object({ kind: z.literal("location"), value: z.string().min(1) }),
  z.object({ kind: z.literal("casualty"), value: z.number().int().min(0) }),
  z.object({ kind: z.literal("eta_minutes"), value: z.number().int().min(0) }),
  z.object({ kind: z.literal("cassette_munition"), value: z.boolean() }),
]);
export type Insight = z.infer<typeof InsightSchema>;
```

### 3.2 Extraction Result (rebuilt)

```typescript
export const ExtractionSchema = z.object({
  sourceMessage: NewsMessageSchema,
  insight: InsightSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

// REMOVED
// ❌ ExtractionResultSchema (was 20+ fields, now discriminatedUnion)
```

### 3.3 Validation Result (NEW)

```typescript
export const ValidatedExtractionSchema = ExtractionSchema.extend({
  validationScore: z.number().min(0).max(1),
  validationDetails: z.string().optional(),
});
export type ValidatedExtraction = z.infer<typeof ValidatedExtractionSchema>;

export const ValidationResultSchema = z.object({
  valid: z.array(ValidatedExtractionSchema).default([]),
  needsClarify: z.array(ExtractionSchema).default([]),
  invalid: z.array(z.object({
    extraction: ExtractionSchema,
    reason: z.string(),
  })).default([]),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// REMOVED
// ❌ ValidatedExtractionSchema (old version)
// ❌ RelevanceCheckSchema (implicit in pre-filter node)
```

### 3.4 Filter Output (clarify)

```typescript
export const FilterOutputSchema = z.object({
  relevantChannels: z.array(NewsChannelSchema).describe("Channels with current-attack intel"),
});
export type FilterOutput = z.infer<typeof FilterOutputSchema>;
// No changes, just rename reference
```

**Status:** BREAKING - all extraction/validation nodes need rewrite

---

## Phase 4: Consensus & Enrichment (Day 4-5) ⚡ PARALLEL

### 4.1 Vote Result (simplified)

```typescript
export const ConsensusInsightSchema = z.object({
  insight: InsightSchema,
  validExtractions: z.array(ValidatedExtractionSchema),
  avgConfidence: z.number().min(0).max(1),
  sourcesCount: z.number().int().min(1),
});
export type ConsensusInsight = z.infer<typeof ConsensusInsightSchema>;

export const VoteResultSchema = z.object({
  insights: z.array(ConsensusInsightSchema).default([]),
  needsClarify: z.array(ExtractionSchema).default([]),
  timestamp: z.number().int().min(0),
});
export type VoteResult = z.infer<typeof VoteResultSchema>;

// REMOVED
// ❌ VotedResultSchema (was 30+ fields)
// ❌ CitedSourceSchema (merged into ValidatedExtraction)
// ❌ CountryOriginSchema (not needed)
```

### 4.2 Enrichment Data (same structure, different semantics)

```typescript
export const EnrichmentDataSchema = z.object({
  // Group insights by kind for persistence
  rocketImpacts: z.array(ConsensusInsightSchema).default([]),
  casualties: z.array(ConsensusInsightSchema).default([]),
  locations: z.array(ConsensusInsightSchema).default([]),

  // Cross-phase metadata
  lastUpdated: z.number().int().min(0),
  clarifyRound: z.number().int().min(0).default(0),
});
export type EnrichmentData = z.infer<typeof EnrichmentDataSchema>;

// REMOVED
// ❌ InlineCiteSchema (move to rendering layer, not schema)
```

**Status:** Simplified but needs new Redis migration

---

## Phase 5: Store & State (Day 5) ⚡ SIMPLIFIED

### 5.1 Alert Metadata (consolidated)

```typescript
export const AlertMetadataSchema = z.object({
  alertId: z.string().min(1),
  alertType: AlertTypeSchema,
  alertTime: z.number().int().min(0),
  sourceRegions: z.array(z.string()),
  targetGroup: TargetGroupSchema,

  // Timeline
  createdAt: z.number().int().min(0),
  updatedAt: z.number().int().min(0),

  // State
  currentText: z.string().min(1),
  enrichmentData: EnrichmentDataSchema.optional(),
  sentMessages: z.array(z.object({
    messageId: z.number().int().min(1),
    timestamp: z.number().int().min(0),
  })).default([]),
});
export type AlertMetadata = z.infer<typeof AlertMetadataSchema>;

// DEPRECATED
// ❌ AlertMetaSchema (merged)
// ❌ TelegramMessageSchema (merged as sentMessages)
// ❌ ActiveSessionSchema (separate table, not per-alert)
```

### 5.2 Active Session (unchanged semantics, clarified)

```typescript
export const ActiveSessionSchema = z.object({
  sessionId: z.string().min(1),
  sessionStartTime: z.number().int().min(0),
  currentAlert: AlertMetadataSchema,
  clarifyAttemptsRemaining: z.number().int().min(0).max(3),
});
export type ActiveSession = z.infer<typeof ActiveSessionSchema>;
```

### 5.3 Redis Strategy (PRAGMATIC — Single Dev)

**Since you're the only developer: no complex migrations needed.**

```typescript
// Option 1: SIMPLEST — Flush on deploy ✅ RECOMMENDED
// ────────────────────────────────────────────
export async function ensureSchemaVersion() {
  const stored = await redis.get("SCHEMA_VERSION");
  const current = process.env.npm_package_version; // e.g. "1.21.0"

  if (stored !== current) {
    logger.warn("Schema version mismatch — flushing Redis", {
      from: stored,
      to: current,
    });
    await redis.flushAll();
    await redis.set("SCHEMA_VERSION", current);
  }
}

// Call this once on bot startup
// All old keys are gone, new data uses new schemas
// Consequence: active sessions restart fresh (acceptable for alpha)
```

---

- On each deploy: check version
- Version mismatch → `redis.flushAll()`
- Fresh start with new schemas
- No crash, no corruption, no complex code

---

## Phase 6: Graph & Nodes Update (Day 5-6) 🔴 BLOCKING

### 6.1 Files to update
- [ ] `packages/agent/src/graph.ts` (AgentState)
- [ ] `packages/agent/src/nodes/*.ts` (all node implementations)
- [ ] `packages/agent/src/runtime/*.ts` (if any pipeline logic)
- [ ] `packages/shared/src/store.ts` (Redis interface)
- [ ] All tests (`__tests__/**/*.test.ts`)

### 6.2 AgentStateSchema (new)

```typescript
export const AgentStateSchema = z.object({
  // Input
  inputMessage: NewsMessageSchema,
  alertContext: z.object({
    alertId: z.string(),
    alertType: AlertTypeSchema,
    targetRegions: z.array(z.string()),
  }),

  // Processing
  currentExtractions: z.array(ExtractionSchema).default([]),
  validationResult: ValidationResultSchema.optional(),
  consensusResult: VoteResultSchema.optional(),

  // State
  clarifyRound: z.number().int().min(0).default(0),
  shouldClarify: z.boolean().default(false),

  // Output
  finalEnrichment: EnrichmentDataSchema.optional(),
});
export type AgentState = z.infer<typeof AgentStateSchema>;
```

**Status:** After this, graph will work with new types

---

## Phase 7: Testing & Validation (Day 6-7)

### 7.1 Unit tests
- [ ] Each schema validates correctly
- [ ] discriminatedUnion Insight works properly
- [ ] Backward compat helpers work

### 7.2 Integration tests
- [ ] Graph node flow with new types
- [ ] Redis migrations apply without data loss
- [ ] Old records gracefully migrate

### 7.3 E2E test
- [ ] Full alert flow from start to finish
- [ ] Clarify loop works
- [ ] Enrichment persists

---

## 🎛️ Parallelization Strategy

```
Phase 0 (BLOCKING)
    ↓
Phase 1 (1-2 days) → Phase 2 (1 day) ⚡ PARALLEL
Phase 3 (1.5 days) [depends on 1-2]
    ↓
Phase 4 (1 day) ⚡ PARALLEL with Phase 3 tail
    ↓
Phase 5 (0.5 days) [write migrations]
    ↓
Phase 6 (1.5 days) [update graph, depends on 5]
    ↓
Phase 7 (1 day) [tests]
```

**Total: ~5 days** (serial) → **~3-4 days** (if parallelized)

---

## ⚠️ Breaking Changes Checklist

- [ ] `AlertType`: "siren" → "red_alert"
- [ ] `AlertTypeConfigSchema` deleted → use `AlertTypeSchema`
- [ ] `TrackedMessageSchema` → `NewsMessageSchema`
- [ ] `TelegramMessageSchema` → absorbed into `AlertMetadata.sentMessages`
- [ ] `ExtractionResultSchema` → `ExtractionSchema` (Insight discriminatedUnion)
- [ ] `VotedResultSchema` → `VoteResultSchema` (30 fields → 3 arrays)
- [ ] `AgentStateSchema` completely rewritten

**Migration Path:**
1. Create compatibility aliases for 1 commit (optional)
2. Update all imports
3. Rewrite graph nodes
4. Redis data migration scripts
5. Full validation

---

## 📊 Files to Create/Modify

**Create:**
- `packages/shared/src/migrations.ts` (Redis migration code)
- `packages/agent/__tests__/schema-refactor.test.ts` (validation tests)

**Modify:**
- `packages/shared/src/schemas.ts` (main target - ~1000 lines)
- `packages/agent/src/graph.ts`
- `packages/agent/src/nodes/*.ts` (5-10 files)
- `packages/shared/src/store.ts`
- All test files (20+ files)

---

## 🚨 Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Node implementations break | HIGH | Update nodes immediately after schemas |
| Tests fail silently | MEDIUM | Write comprehensive type tests |
| Type inference breaks | MEDIUM | Use `z.infer` consistently |
| Old API contract break | LOW (no real customers) | just docs update |

---

## ✅ Definition of Done

- [ ] All 25 old schemas → 20 new schemas (or deleted)
- [ ] All graph nodes updated
- [ ] All tests pass (unit + integration + e2e)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Schema version check implemented in bot startup
- [ ] PR reviewed & approved

---

## Next Steps

1. **Approve this plan** or request adjustments
2. **Create feature branch:** `git checkout -b refactor/schema-cleanup`
3. **Start Phase 0:** Create audit checklist
4. **Execute phases 1-2:** Get quick wins (base types, semantics)
5. **Pause & validate:** Ensure graph can handle Phase 3
