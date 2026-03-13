---
"@easyoref/bot": patch
---

fix: raise enrichment quality — deaths 99% threshold, injury retractions, geo-filter for debris

- **Deaths hallucination prevention**: casualties now require `CERTAIN` (≥0.95) confidence and the
  extraction prompt requires an explicit "killed/dead/נהרג/погиб" word in the source. Deaths can
  never be shown with the `(?)` uncertainty marker.
- **Injury retractions**: extraction prompt now recognises explicit "false report / ложное сообщение
  о раненом / אין פצועים" retractions and emits `injuries=0`; `buildEnrichmentFromVote` clears a
  previously reported injury count when a high-confidence zero is returned.
- **Geo-filter for debris hits**: extraction prompt now requires hits/damage to be attributed to the
  configured alert zone. If the source describes damage in a *different* city, the actual city with
  its distance is added to `hit_detail` (e.g. `"Ришон-ле-Цион (~20km)"`) and the alert-zone
  `hits_confirmed` flag is not set.
- **Resolved phase timing**: update interval 3 min → 2.5 min (`150 000 ms`), initial delay 1 min →
  1.5 min (`90 000 ms`), total window remains 10 min.
