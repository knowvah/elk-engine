<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations — layered-pipeline (mission 7f, 2026-11-04)

## Observation: the ptolemy corpus needs no label or comment processor

- **Context**: Sizing row 7f and choosing what a first running pipeline must include.
- **Finding**: Over the 550 JSON models, 1,814 levels: 0 with edge labels, 0 files with `commentBox` or `hypernode`, 112
  levels with self loops; 484 models have no self loop at any level. A scratch union-find without external-port dummies
  counts about 335 multi-component levels and 1,184 levels with external ports.
- **Impact**: The whole default corpus can run before the label family lands, but not before `components`.
- **Confidence**: High (labels, comments, self loops, external ports), Medium (the component count)

## Observation: `doLayout` depends on `components` on every layout

- **Context**: Reading `ElkLayered.java` `doLayout`.
- **Finding**: `split` and `combine` run unconditionally; `ComponentGroupGraphPlacer` is the default with external ports;
  `ComponentsCompactor` is reached only from the three placers under connected-components compaction.
- **Impact**: The roadmap's placement of `components` in 7h could not meet row 7f's exit; moved by F1.
- **Confidence**: High

## Observation: `MARKER` in the staged-classes fitness test closes the mission names

- **Context**: Naming 7f2 in stage markers.
- **Finding**: `test/architecture/staged-classes.fitness.test.ts:22` is `/^\/\/ @staged (7[b-h])$/`, and
  `LinearSegmentsNodePlacer.test.ts` also pins `DotDebugUtil is ported in mission 7f`.
- **Impact**: A split of a roadmap row touches these; F9 was amended for both.
- **Confidence**: High

## Observation: the landed `refs/elk` goldens were recorded without `-XX:hashCode=2`

- **Context**: Comparing `tools/oracle/run.sh` with the layered recorders' JVM flags.
- **Finding**: `oracle_java` sets seed properties but no identity-hash flag; the layered recorders set it. Whether the two
  agree on full layouts has not been measured.
- **Impact**: T1 checks this first (F4, stop 19); it decides whether the rows can be trusted against the goldens.
- **Confidence**: High (the flag difference), Unknown (its effect)

## Observation: timing baselines on this machine are load-sensitive

- **Context**: Phase 8 `npm test`.
- **Finding**: With WebStorm at about 600 % CPU and two `dot-engine` node processes running, `npm test` took 81.4 s
  (load 4.4 rising to 21) and 85.8 s (load 16.8 rising to 55), against 7e's 58.3 s reading at lower load. The suite itself
  drives load up.
- **Impact**: Compare stop 11 readings at similar load; re-measure at mission start on a quiet machine.
- **Confidence**: High
