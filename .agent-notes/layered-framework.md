<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — layered-framework (mission 7a, 2026-10-27)

## Observation: `LGraphElement` reaches into `graph.transform`

- **Context**: T3 forward-reference scan of the LGraph model.
- **Finding**: `LGraphElement.getDesignation()` calls `ElkGraphTransformer.getOriginIdentifier` (`LGraphElement.java:52`).
  A direct ESM import closes `LGraphElement → ElkGraphTransformer → ElkGraphImporter → LGraph extends LGraphElement`,
  a TDZ whenever a graph module is the entry. Resolved by X1: `graph/transform/ElkGraphTransformerUtility.ts`.
- **Impact**: any later class whose Java imports reach back to a base class's module needs the same section split.
- **Confidence**: High

## Observation: the melk emitter skipped held-back algorithm classes

- **Context**: T3, `npm run melk:generate Layered` with `LayeredLayoutProvider` pending.
- **Finding**: `emitBundle` emitted no class for a held-back algorithm, so `LayeredOptions.ts` was missing although
  T3 code reads its constants. Since X3 the class is emitted without factory or registrations.
- **Impact**: pending a provider no longer hides its option constants; T7 regenerates the full class.
- **Confidence**: High

## Observation: an option default can name a non-leaf enum

- **Context**: T3 per-module import smoke run.
- **Finding**: `NodeFlexibility` imports `LayeredOptions` (for `getNodeFlexibility`), and the bundle class evaluated
  `NodeFlexibility.NONE` eagerly, so entering through `NodeFlexibility` threw a TDZ error. M12 assumed `*_DEFAULT`
  expressions name leaf classes only. `tools/melk/config.ts` `NON_LEAF_DEFAULT_TYPES` now makes such options lazy.
- **Impact**: when a ported enum or value class starts importing an options class, add it to that list and
  regenerate; run the import smoke (`npx tsx -e "import('./<file>')"` per module) after porting option-adjacent classes.
- **Confidence**: High

## Observation: the melk recorder cannot encode a `List<Integer>` default

- **Context**: T3 `test/melk/layered-options.test.ts`.
- **Finding**: `RecordingRegistry` encodes numbers by the option's INT/DOUBLE type; `cmEnforcedGroupOrders` is an
  OBJECT option with a `List<Integer>` default, so `encodeNumber` throws. The dump also names its class
  `UnmodifiableRandomAccessList`. A dependency whose target registers later needs a shape-priming pass.
- **Impact**: T7's full `diffCalls` over `LayeredMetaDataProvider` needs a recorder extension or a documented skip.
- **Confidence**: High

## Observation: `tools/melk/emit.ts` already exceeded the complexity limits

- **Context**: T3 S4 generator edits.
- **Finding**: before 7a, `emit.ts` was 509 lines and `lazyConstant` took 6 parameters; `npm run complexity` scans
  `src/` only, so neither was flagged. 7a's edits added no new function violation (now 535 lines).
- **Impact**: candidate for a dedicated cleanup PR splitting `emit.ts` by section.
- **Confidence**: High

## Observation: `LGraphAdapters` ignore layerless nodes

- **Context**: T9 replay-alone coverage showed the node, port and label adapters at 0 % under the `adapters` replay.
- **Finding**: `LGraphAdapter.getNodes()` walks `getLayers()` only (`LGraphAdapters.java:278-280`); an LGraph straight
  from `ElkGraphImporter` has every node layerless, so `NodeDimensionCalculation` over it sizes nothing. The first T1
  recording therefore held the import state (0 of 357 nodes with a margin or padding) and T8 matched it trivially.
  X4 layers each graph first; the re-recorded rows carry real sizes.
- **Impact**: any oracle scenario that drives a layered processor before layering needs an explicit layer; a green
  replay is not evidence until replay-alone coverage shows the code under test ran.
- **Confidence**: High

## Observation: ELK JSON exports can contain bare `Infinity`

- **Context**: T10 embedded the oracle's `ElkGraphJson` export of a layout result in a vector row.
- **Finding**: Gson's `JsonElement.toString()` writes a non-finite double as a bare `Infinity`/`-Infinity`/`NaN` token,
  which is not JSON (`JSON.parse` rejects the whole file). The TS `JsonWriter` shim is faithful and writes the same.
  An external port on a zero-size graph produces such a coordinate (`transform/misc/undefined-port-side-zero-size-graph`).
- **Impact**: any recorder that embeds raw ELK JSON must sanitise those tokens (T10 maps them to the strings
  `"Infinity"`/`"-Infinity"`/`"NaN"`) and strict-parse its output; a TS replay must parse the exporter's output after the
  same substitution.
- **Confidence**: High

## Observation: decision ids repeat across missions

- **Context**: reviewing an agent's citation of "D10" and "AD-16b" for the NPE → `TypeError` rule.
- **Finding**: `D10` exists in `plans/elkgraph-model`, `plans/conformance-corpus` and `plans/docs-site` with unrelated
  meanings; `AD-16b` is a sub-heading of AD-16, not a table row, so a grep of table rows misses it. The NPE rule is
  elkgraph-model D10 (amended 2026-10-15) + AD-16b.
- **Impact**: cite decisions with their mission (`elkgraph-model D10`) and grep headings as well as table rows before
  calling a citation wrong; the orchestrator rejected two valid citations in 7a before checking.
- **Confidence**: High

## Observation: a JS array proxy for `ArrayList.subList` must bounds-check

- **Context**: oracle row `site/lnode/portSideView` (T11a).
- **Finding**: `SubList.get/set` throw `IndexOutOfBoundsException` ("Index 2 out of bounds for length 2"); a
  `Proxy` over a JS array silently returns `undefined` out of range, and a JS `push` is an index write at
  index = size (Java `set(size)`, also out of bounds). Negative keys are not array indices in JS, so the index regex
  must accept them to mirror `get(-1)`.
- **Impact**: the fixed `subListView` (`LNode.ts`) is the pattern for any later sub-list view; hand-derived tests of such
  views encode TS-array assumptions (X7).
- **Confidence**: High

## Observation: stop-12 timing needs a comparable load

- **Context**: batch-8 gates ran while other sessions' node and dot jobs held the 1-minute load at 89.
- **Finding**: `npm test` took 83.7 s at load 89 and 79.4 s at load 19.7 for the same tree (baseline 75 s at ~15).
- **Impact**: a suite-time stop must be measured alone after waiting for the 1-minute load to fall near the baseline's;
  the first number at high load is not evidence either way.
- **Confidence**: High
