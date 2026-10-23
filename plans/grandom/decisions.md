<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — grandom (locked 2026-10-22)

All approved by the user during planning, as recommended. They amend, never rewrite, AD-1…AD-16
(`plans/elk-engine-skeleton/decisions.md`), D0–D10 of `plans/conformance-corpus/decisions.md` (D7 sets the exit, D8
governs syntax errors), the standing rules and amendments (`plans/core-metadata/decisions.md`) and G1–G8
(`plans/graph-text/decisions.md`).

| ID | Decision |
|----|----------|
| D1 | Evidence: `ElkrGenerateVectors` over ~35–45 seeded scenarios + invariant-only unseeded scenarios; no oracle patch; exit = 9 corpus files byte-exact + every vector row |
| D2 | Hand-written `GRandomLexer` (ANTLR token decisions) + recursive-descent `GRandomParser` on `src/xtext`; syntax errors by presence |
| D3 | `gRandom` model as plain classes with EMF accessor names; no Factory/Package/Switch/AdapterFactory |
| D4 | `RandomGraphGenerator` split by Java section into six files; helpers take the generator first |
| D5 | `ElkMath` partial port: `boundi` only, "ported so far" header (ElkUtil precedent) |
| D6 | Internal facade `GRandomText` (`parse`, `validate`); generation via `new RandomGraphGenerator(null).generate(config)` |
| D7 | `Collections.shuffle(list)` default-randomness overload; CLAUDE.md sentence updated |
| D8 | `Math.fround` at every Java `float` operation; Java oddities kept |
| D9 | `plans/grandom/`, mission 4f, branch `feature/grandom`, unsigned commits, user signs/PRs/merges with a merge commit |

## D1 — Evidence and exit

Fact: the harness (`tools/oracle/harness/GrandomGenerator.java`) parses one `.elkr`, calls
`new RandomGraphGenerator(null).generate(config)`, names an unnamed root `"root"` and exports with
`CaseRunner.export` (`omitLayout(false)`, `omitZeroDimension(false)`, `omitZeroPositions(false)`,
`omitUnknownLayoutOptions(true)`, `prettyPrint(true)`) plus a trailing `"\n"`. Generation is seeded by
`new Random(seed)` when the config has a seed. Three paths are unseeded: `BlindTextGenerator` (edge labels),
`sample()` → `Collections.shuffle(list)` (cross-hierarchy edges when `CROSS_HIER`/`EXACT_RELATIVE_HIER` > 0), and a
config without `seed` (`new Random()`).
Decision: `tools/vectors/ElkrGenerateVectors.java` records, per seeded scenario, the parsed `GeneratorOptions` (every
property, Java declaration order) and every generated graph exported exactly as `CaseRunner.export`. Unseeded
scenarios record invariants only (per-level node counts, edge/port/label counts, label text masked). `RandVal` draw
rows (`seed`, `kind`, params, the first N `val`/`intVal`/`floatVal` draws) pin the float paths. The nine corpus
`.elkr` inputs are copied into the scenario dir (`corpus-*.elkr`) so the recorder proves export equivalence
(stop 7) without widening `VC_INPUT_DIRS`. No oracle patch: nothing in the seeded paths needs one. Exit: the TS
regenerates all nine `test/corpus/generated/*.json` byte for byte, and every `grandom-*.json` row replays.

## D2 — Lexer and parser

The lexer reproduces the generated `InternalGRandomLexer` token decisions (`src-gen/.../InternalGRandomLexer.java`
is the edge-case spec, never ported line by line): multi-word keywords (`'cross-hierarchy relative edges'`,
`'bipartite graphs'`, `'self loops'`, `'remove isolated'`, `'+/-'`, …) by longest match, `INT '.' INT` as three
tokens, `ID`, `STRING`, `ML_COMMENT`, `SL_COMMENT`, `WS`, `ANY_OTHER`, with 4b's recovery semantics
(`.agent-notes/graph-text.md`). The parser has one method per rule on `src/xtext/parser` (`ParseSession`,
`TokenCursor`, `SessionVocabulary`, unordered groups) and converts `Double`/`Float`/`Integer` through
`EFactoryValueConverter` (`"2.5"` as `Integer` is a conversion diagnostic, exact). Syntax errors match by presence
(corpus D8 #1); models, conversion and validator issues match exactly. Vectors: lexer tokens, parse model dump
(with `isSet` for every unsettable feature), validate issues.

## D3 — Model

`src/core/debug/grandom/gRandom/`: `RandGraph`, `Configuration`, `Hierarchy`, `Edges`, `Nodes`, `Size`, `Ports`,
`Flow`, `DoubleQuantity` as plain classes with the generated getters/setters and `isXxx` for boolean features
(`isMD`, `isMW`, `isPF`, `isDensity`, …); unset object features are `number | null`/`T | null` (EMF `EDoubleObject`
default `null`). Enums `Formats`, `Form`, `Side`, `FlowType`, `ConstraintType` per translation-rules §6.3 with the
generated literals (`custom='graphs'`, …). Feature literals only `CONFIGURATION__MD`, `CONFIGURATION__MW`,
`CONFIGURATION__PF` (the validator's three). No `GRandomFactory`, `GRandomPackage`, `GRandomSwitch`,
`GRandomAdapterFactory`, serializer (AD-11, YAGNI).

## D4 — `RandomGraphGenerator` split

Six files under `generators/`, by Java section, so each stays under 500 lines:
`RandomGraphGenerator.ts` (fields, ctor, both `generate`, `randomGeneratorFromConfig`, `addHierarchicalNodes`,
`connectAtomicNodesOnDifferentLevels`, `sample`, `makeGraph`, `generateCustomGraph`, `randomInt`, `isHypernode`,
`get`/`set`), `RandomGraphGeneratorTypes.ts` (`generateAnyGraph` ×2, `generateBipartite`, `generateTree`,
`generateBiconnectedGraph`, `generateTriconnectedGraph`), `RandomGraphGeneratorAnte.ts` (`generateANTEGraph`,
`compareId`, `HeadComparator`, `TailComparator`; the nested class `HierarchyEdge` gets its own `HierarchyEdge.ts`,
one class per file), `RandomGraphGeneratorElements.ts`
(`createIndependentSet`, `createClique`, `createNode`, `createPort`, `distributePorts`),
`RandomGraphGeneratorConnect.ts` (`connect`, `addEdgeLabel`, `retrievePort`, `connectConditional`,
`connectRandomlyAndConditional` ×2, `determineOutgoingEdges` ×2, `removeIsolatedNodes`, `findNodeWithDFS`,
`connected`), `RandomGraphGeneratorRewire.ts` (`moveSource`, `moveTarget`, `split`). Helpers are exported functions
taking the generator first; generator state is non-private and `@internal`. Overloads get the suffixes already used
by the port (translation-rules §6.5). Java method order is kept inside each file.

## D5 — `ElkMath`

`src/core/math/ElkMath.ts` ports `boundi` only, with a header saying which members are ported so far and why
(`ElkUtil.ts` precedent). `@see` to `ElkMath.java`; its JUnit tests for `boundi`, if any, come along.

## D6 — Entry points

`src/core/debug/grandom/GRandomText.ts`: `parse(text)` (model + syntax/conversion diagnostics, mirroring
`ElkGraphJsonText.load`'s result shape) and `validate(text)` (issues incl. `GRandomValidator`). Generation:
`new RandomGraphGenerator(null).generate(config)` → `ElkNode[]`. Nothing exported from `src/index.ts`. The corpus test
mirrors the harness: root id `"root"` when unnamed, `CaseRunner.export` flags, trailing `"\n"`, byte compare.

## D7 — `Collections.shuffle(list)`

`sample()` calls the one-argument `Collections.shuffle(list)`, which uses a default source of randomness. Add the
overload to `src/java/util/Collections.ts` backed by one module-level `const` holder of an unseeded `Random` (created
lazily on first use, no module-level `let`). It is unseeded by contract, so only invariants are asserted. CLAUDE.md's
"`Collections.shuffle` has no in-scope caller" sentence is updated in the same task (T4); translation-rules §3 in T15.

## D8 — `float`

Every Java `float` value and operation goes through `Math.fround` (translation-rules §1.6): `nextFloat`, `float`
fields (`HIERARCHY_CHANCE`, `HIERARCHY_NODES_FACTOR`, `HYPERNODE_CHANCE`), `RandVal.floatVal`, the `float`
arithmetic in the generators (`p1`, `sizeFactor`, `r`). `Math.round` of a `float` uses `roundFloat`; `(int)` casts use
`d2i`; `(int) Math.round(double)` uses `l2i(round(…))`. Java precedence oddities stay, e.g. `(int) density * cn * cn`
casts before multiplying. Collections.sort with the comparators is stable (merge sort) — `Array.prototype.sort` is
stable too.

## D9 — Process

Brief at `plans/grandom/`, labelled 4f. Branch `feature/grandom`; unsigned commits; the user signs by rebase, pushes,
opens the PR and merges with a merge commit. T15 appends a roadmap revision for row 4d.

## Operational readiness (Phase 4)

- **Observability:** N/A (library). Evidence = vector replay + corpus byte replay; `vector-cache.sh` per-program
  timing lines; tests stay within vitest defaults; no logging in `src/`.
- **Rollback:** Reversible — revert the merge commit; all-new files plus additive edits; corpus and refs read-only.
- **Scale:** corpus graphs ≤ 50 nodes; one 200-node stress scenario (stop 12); whole-program vector cache, no
  per-row cache; no flag; nothing exported.
- **Failure modes (runbook in `docs/architecture/grandom.md`, T15):** (1) JVM `Random` draw drift → first diverging
  vector row or first differing corpus byte; dump both draw sequences. (2) `float`/`double` rounding (missing
  `fround`) → off-by-one sizes or counts. (3) Lexer vs ANTLR (multi-word keywords, `INT '.' INT`) → lexer rows.
  Regenerate with `tools/vectors/elkr-vectors.sh`; `ELK_VECTORS_CACHE=off` for a cold run; masked fields listed.
- **Compatibility:** no API, schema or golden change; `Collections.shuffle(list)` is additive with no prior caller.

## Baseline (pre-flight 2026-10-22)

On `main` at `9f081f0`: `npm run typecheck` 0, `npm run complexity` clean, `npm run coverage` 0 (307 files, 17,340
passed + 68 skipped; 99.38/97.95/99.38/99.41; 155 s wall), `npm test` 0 in **84 s** wall at load average 16.
`npm run format:check` flags only the untracked planning file `.plan-mission-progress.md`, deleted at handoff. Stop
12 is measured against this `npm test` time (the mission may add ~10 s), not the older ~60 s figure, which the
baseline already exceeds.
