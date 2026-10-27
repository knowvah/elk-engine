<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Docs, journal closure, roadmap

One task, run by the main session. Then the mission-end gates and the landing regroup (stop 10).

| ID  | Description                                        | Agent        | Writes                                                                                                                                                                            | Depends On | Done |
| --- | -------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---- |
| T4  | Conformance, architecture runbook, 6b flag closure | main session | docs/conformance.md, docs/architecture/alg-common.md, plans/alg-common-nodespacing/decision-journal.md (append), plans/roadmap.md (append), .agent-notes/ad13-rederivation.md, plans/ad13-rederivation/README.md (summary) | T3a, T3b   | [x]  |

The batch is done when `npm run docs:build` is green, the mission-end gates pass, and the README has a mission summary.
