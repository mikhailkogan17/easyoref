/**
 * Consensus voting — deterministic, 0 tokens.
 *
 * Aggregates extraction results from multiple sources into a single
 * voted consensus using median, majority, and weighted confidence.
 */

import * as logger from "@easyoref/monitoring";
import type {
  CitedSource,
  QualCount,
  ValidatedExtraction,
  VotedResult,
} from "@easyoref/shared";

// ── Helpers ────────────────────────────────────────────

/** Average weighted confidence across sources */
function fieldConf(
  srcs: Array<{ source_trust: number; confidence: number }>,
): number {
  if (srcs.length === 0) return 0;
  return (
    srcs.reduce((s, e) => s + e.source_trust * e.confidence, 0) / srcs.length
  );
}

/** Mode (most frequent value) for QualCount fields */
function modeQual(
  srcs: Array<{ [k: string]: unknown }>,
  key: string,
): QualCount | undefined {
  const vals = srcs
    .map((e) => e[key] as QualCount | undefined)
    .filter((v): v is QualCount => v !== undefined);
  if (vals.length === 0) return undefined;
  const freq = new Map<QualCount, number>();
  for (const v of vals) freq.set(v, (freq.get(v) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

/** Median reference number for qual fields */
function medianQualNum(
  srcs: Array<{ [k: string]: unknown }>,
  key: string,
): number | undefined {
  const vals = srcs
    .map((e) => e[key] as number | undefined)
    .filter((v): v is number => v !== undefined)
    .sort((a, b) => a - b);
  return vals.length > 0 ? vals[Math.floor(vals.length / 2)] : undefined;
}

// ── Vote ───────────────────────────────────────────────

/**
 * Aggregate valid extractions into a single consensus result.
 * Returns undefined if no valid extractions.
 */
export function vote(
  extractions: ValidatedExtraction[],
  alertId: string,
): VotedResult | undefined {
  const valid = extractions.filter((e) => e.valid);

  if (valid.length === 0) return undefined;

  // Assign 1-based citation indices
  const indexed = valid.map((e, i) => ({ ...e, idx: i + 1 }));

  const citedSources: CitedSource[] = indexed.map((e) => ({
    index: e.idx,
    channel: e.channel,
    ...(e.messageUrl && { messageUrl: e.messageUrl }),
  }));

  // ETA: highest confidence source
  const withEta = indexed
    .filter((e) => e.eta_refined_minutes !== undefined)
    .sort((a, b) => b.confidence - a.confidence);
  const bestEta = withEta[0] ?? undefined;

  // Country: group unique values (case-insensitive dedup, preserve first casing)
  const countryMap = new Map<
    string,
    { canonical: string; citations: number[] }
  >();
  for (const e of indexed) {
    if (e.country_origin) {
      const key = e.country_origin.toLowerCase();
      const entry = countryMap.get(key);
      if (entry) {
        entry.citations.push(e.idx);
      } else {
        countryMap.set(key, {
          canonical: e.country_origin,
          citations: [e.idx],
        });
      }
    }
  }
  const country_origins =
    countryMap.size > 0
      ? Array.from(countryMap.values()).map(({ canonical, citations }) => ({
          name: canonical,
          citations,
        }))
      : undefined;

  // Rocket count: range
  const rocketSrcs = indexed.filter((e) => e.rocket_count !== undefined);
  const rocketVals = rocketSrcs.map((e) => e.rocket_count as number);
  const rocket_count_min =
    rocketVals.length > 0 ? Math.min(...rocketVals) : undefined;
  const rocket_count_max =
    rocketVals.length > 0 ? Math.max(...rocketVals) : undefined;
  const rocket_citations = rocketSrcs.map((e) => e.idx);
  const rocket_confidence = fieldConf(rocketSrcs);

  // Rocket detail: pick from highest-confidence source with a detail string
  const detailSrcs = indexed
    .filter((e) => e.rocket_detail)
    .sort((a, b) => b.confidence - a.confidence);
  const rocket_detail = detailSrcs[0]?.rocket_detail;

  // Cassette: majority
  const cassSrcs = indexed.filter((e) => e.is_cassette !== undefined);
  const cassVals = cassSrcs.map((e) => e.is_cassette as boolean);
  const is_cassette =
    cassVals.length > 0
      ? cassVals.filter(Boolean).length > cassVals.length / 2
      : undefined;
  const is_cassette_confidence = fieldConf(cassSrcs);

  // Intercepted: median / qual
  const interceptedSrcs = indexed.filter((e) => e.intercepted !== undefined);
  const interceptedQualSrcs = indexed.filter(
    (e) => e.intercepted_qual !== undefined,
  );
  const interceptedVals = interceptedSrcs
    .map((e) => e.intercepted as number)
    .sort((a, b) => a - b);
  const intercepted =
    interceptedVals.length > 0
      ? interceptedVals[Math.floor(interceptedVals.length / 2)]
      : undefined;
  const intercepted_qual =
    intercepted === undefined
      ? modeQual(interceptedQualSrcs, "intercepted_qual")
      : undefined;
  const intercepted_qual_num = intercepted_qual
    ? medianQualNum(interceptedQualSrcs, "intercepted_qual_num")
    : undefined;
  const intercepted_confidence = fieldConf(
    interceptedSrcs.length > 0 ? interceptedSrcs : interceptedQualSrcs,
  );

  // Sea impact
  const seaSrcs = indexed.filter((e) => e.sea_impact !== undefined);
  const seaQualSrcs = indexed.filter((e) => e.sea_impact_qual !== undefined);
  const seaVals = seaSrcs
    .map((e) => e.sea_impact as number)
    .sort((a, b) => a - b);
  const sea_impact =
    seaVals.length > 0 ? seaVals[Math.floor(seaVals.length / 2)] : undefined;
  const sea_impact_qual =
    sea_impact === undefined
      ? modeQual(seaQualSrcs, "sea_impact_qual")
      : undefined;
  const sea_impact_qual_num = sea_impact_qual
    ? medianQualNum(seaQualSrcs, "sea_impact_qual_num")
    : undefined;
  const sea_confidence = fieldConf(seaSrcs.length > 0 ? seaSrcs : seaQualSrcs);

  // Open area impact
  const openSrcs = indexed.filter((e) => e.open_area_impact !== undefined);
  const openQualSrcs = indexed.filter(
    (e) => e.open_area_impact_qual !== undefined,
  );
  const openVals = openSrcs
    .map((e) => e.open_area_impact as number)
    .sort((a, b) => a - b);
  const open_area_impact =
    openVals.length > 0 ? openVals[Math.floor(openVals.length / 2)] : undefined;
  const open_area_impact_qual =
    open_area_impact === undefined
      ? modeQual(openQualSrcs, "open_area_impact_qual")
      : undefined;
  const open_area_impact_qual_num = open_area_impact_qual
    ? medianQualNum(openQualSrcs, "open_area_impact_qual_num")
    : undefined;
  const open_area_confidence = fieldConf(
    openSrcs.length > 0 ? openSrcs : openQualSrcs,
  );

  // Hits
  const allHitsSrcs = indexed.filter((e) => e.hits_confirmed !== undefined);
  const hitsVals = allHitsSrcs
    .map((e) => e.hits_confirmed as number)
    .sort((a, b) => a - b);
  const hits_confirmed =
    hitsVals.length > 0 ? hitsVals[Math.floor(hitsVals.length / 2)] : undefined;
  const hitsSrcs = allHitsSrcs.filter((e) => (e.hits_confirmed as number) > 0);
  const hits_citations =
    hitsSrcs.length > 0
      ? hitsSrcs.map((e) => e.idx)
      : allHitsSrcs.map((e) => e.idx);
  const hits_confidence = fieldConf(allHitsSrcs);

  // Hit location & type & detail: highest-confidence source with hits > 0
  const hitsWithLoc = hitsSrcs
    .filter((e) => e.hit_location)
    .sort((a, b) => b.confidence - a.confidence);
  const hit_location = hitsWithLoc[0]?.hit_location;
  const hit_type = hitsWithLoc[0]?.hit_type;

  // hit_detail: from highest-confidence source that has one
  const hitsWithDetail = hitsSrcs
    .filter((e) => e.hit_detail)
    .sort((a, b) => b.confidence - a.confidence);
  const hit_detail = hitsWithDetail[0]?.hit_detail;

  // No impacts: explicit confirmation from sources
  const noImpactSrcs = allHitsSrcs.filter(
    (e) => (e.hits_confirmed as number) === 0,
  );
  const no_impacts = noImpactSrcs.length > 0 && hits_confirmed === 0;
  const no_impacts_citations = noImpactSrcs.map((e) => e.idx);

  // Casualties
  const casualtySrcs = indexed.filter((e) => e.casualties && e.casualties > 0);
  const casualtyVals = casualtySrcs
    .map((e) => e.casualties as number)
    .sort((a, b) => a - b);
  const casualties =
    casualtyVals.length > 0
      ? casualtyVals[Math.floor(casualtyVals.length / 2)]
      : undefined;
  const casualties_citations = casualtySrcs.map((e) => e.idx);
  const casualties_confidence = fieldConf(casualtySrcs);

  // Injuries
  const injurySrcs = indexed.filter(
    (e) => e.injuries !== undefined && (e.injuries as number) > 0,
  );
  const injuryVals = injurySrcs
    .map((e) => e.injuries as number)
    .sort((a, b) => a - b);
  const injuries =
    injuryVals.length > 0
      ? injuryVals[Math.floor(injuryVals.length / 2)]
      : undefined;
  const injuries_citations = injurySrcs.map((e) => e.idx);
  const injuries_confidence = fieldConf(injurySrcs);

  // Injuries cause: majority vote — "rocket" beats "rushing_to_shelter" if tie
  const injuryCauseVals = injurySrcs
    .map((e) => e.injuries_cause)
    .filter((v): v is "rocket" | "rushing_to_shelter" => v !== undefined);
  const rocketCauseCount = injuryCauseVals.filter((v) => v === "rocket").length;
  const shelterCauseCount = injuryCauseVals.filter(
    (v) => v === "rushing_to_shelter",
  ).length;
  const injuries_cause =
    injuryCauseVals.length === 0
      ? undefined
      : rocketCauseCount >= shelterCauseCount
      ? "rocket"
      : "rushing_to_shelter";

  // Overall weighted confidence
  const totalWeight = indexed.reduce(
    (s, e) => s + e.source_trust * e.confidence,
    0,
  );
  const weightedConf = totalWeight / indexed.length;

  const voted: VotedResult = {
    eta_refined_minutes: bestEta?.eta_refined_minutes,
    eta_citations: bestEta ? [bestEta.idx] : [],
    country_origins: country_origins ?? [],
    rocket_count_min,
    rocket_count_max,
    rocket_citations,
    rocket_confidence,
    rocket_detail,
    is_cassette,
    is_cassette_confidence,
    intercepted,
    intercepted_qual,
    intercepted_confidence,
    sea_impact,
    sea_impact_qual,
    sea_confidence,
    open_area_impact,
    open_area_impact_qual,
    open_area_confidence,
    hits_confirmed,
    hits_citations,
    hits_confidence,
    hit_location,
    hit_type,
    hit_detail,
    no_impacts,
    no_impacts_citations,
    intercepted_citations: interceptedSrcs.map((e) => e.idx),
    casualties,
    casualties_citations,
    casualties_confidence,
    injuries,
    injuries_cause,
    injuries_citations,
    injuries_confidence,
    confidence: Math.round(weightedConf * 100) / 100,
    sources_count: indexed.length,
    citedSources,
  };

  logger.info("Agent: voted", { alertId, voted });
  return voted;
}
