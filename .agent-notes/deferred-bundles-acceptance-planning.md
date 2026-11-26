<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: deferred-bundles-acceptance (#88)

## Observation: #88's ruling routes its edits to #95, then #88 was re-readied

- **Context**: Selecting `next` for the queue on 2026-11-24.
- **Finding**: The maintainer's 2026-11-14 ruling on #88 says #95 "also carries the ADR amendment, CLAUDE.md, the AD row and
  `bundle-deps` changes". An automated triage comment on 2026-11-21 asked for a ruling again; the maintainer answered "good to go"
  on 2026-11-23 and #88 went back to `queue:ready`. Planning took #88 as #95's step 1 (decisions D0).
- **Impact**: When #95 is planned, step 1 is already on `chore/issue-queue`; start at step 2. A triage pass that labels an issue
  `needs-ruling` should first read the issue's comments for a ruling already given.
- **Confidence**: High

## Observation: the three deferred bundles did not change across the pin move

- **Context**: Checking whether the ADR's evidence (gathered at `8aaa3c14`) still holds at `8bca22f4`.
- **Finding**: `git -C ../elk log --oneline 8aaa3c14..8bca22f4 -- plugins/org.eclipse.elk.alg.{libavoid,graphviz.dot,graphviz.layouter}`
  is empty, and so is `8bca22f4..HEAD` on the same paths (2026-11-24).
- **Impact**: The ADR's line citations into those bundles are valid at the current pin.
- **Confidence**: High

## Observation: Graphviz requires after the in-scope filter

- **Context**: Deriving D3's expected bundle-table entries.
- **Finding**: At the pin, `alg.graphviz.dot` requires (ELK, in scope) `graph`, `core`; `alg.graphviz.layouter` requires `graph`,
  `core`, `alg.graphviz.dot`, plus `core.service;resolution:=optional`, which `buildBundleDeps` drops as out of scope.
- **Impact**: A ported layouter may import only `src/alg/graphviz/dot`, `src/core`, `src/graph` (and the shim directories).
  Anything it needs from `core.service` has to be replaced, not imported.
- **Confidence**: High
