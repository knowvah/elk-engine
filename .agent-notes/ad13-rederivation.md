<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — ad13-rederivation (mission 6c, 2026-10-27)

## Observation: `PORT_RATIO_OR_POSITION` does not survive ELK JSON

- **Context**: T2 recorder, `FIXED_RATIO` scenarios stored as ELK JSON input plus steps.
- **Finding**: `PortPlacementCalculator.PORT_RATIO_OR_POSITION` (`PortPlacementCalculator.java:45`) is a bare
  `Property` no MELK provider registers. `JsonExporter` omits unknown options and `JsonImporter.setOption`
  (`JsonImporter.xtend:462-469`) drops ids without option data, so a re-imported port reads the default 0.0. Only the
  three port placement calculators read it, live through the port adapter.
- **Impact**: vectors that carry `FIXED_RATIO` ratios through ELK JSON need a side channel (6c: the `setPortRatio`
  step, applied after `NodeContext` construction).
- **Confidence**: High

## Observation: replay coverage misses whole option dimensions

- **Context**: T1, the 326-row `node-micro-layout.json` replay alone with coverage on the T4 files.
- **Finding**: no row sets a port alignment or a north/south border offset, so 26 branches stay untaken. Covering them
  took 13 unit-level scenarios.
- **Impact**: an end-to-end sweep passing does not mean every option arm ran. Measure coverage of the sweep alone
  before relying on it as the evidence for a class.
- **Confidence**: High

## Observation: subagents' Java line "corrections" need checking

- **Context**: T3a reported that the spec's `NodeContext.java:250-255` was wrong and cited `:266-268` for side order.
- **Finding**: side order is `comparePortSides` at `NodeContext.java:250-252`; `:266-268` is the same-side volatile-id
  sort. The spec was right and the "correction" was not. The orchestrator fixed the comment before committing.
- **Impact**: verify every corrected `file:line` an agent reports before accepting it into a test comment.
- **Confidence**: High
