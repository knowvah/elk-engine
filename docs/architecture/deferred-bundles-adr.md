<!-- SPDX-License-Identifier: EPL-2.0 -->

# ADR: deferred bundles (alg.libavoid, alg.graphviz.dot, alg.graphviz.layouter)

**Status:** Proposed (2026-11-13). Acceptance: #88

## Context

Roadmap row 11 (issue #42) asks for a go/no-go on the three bundles CLAUDE.md lists as "Deferred (roadmap decides)". For
each, three options were weighed: **skip** (stay unported), **port** (line by line, the Java as the spec) and **delegate** (to
[`@knowvah/dot-engine`](https://github.com/knowvah/dot-engine), a TypeScript port of Graphviz). The evidence was gathered from
the ELK source at the pin `8aaa3c14` (AD-2) and is recorded, with every command, in
[`plans/deferred-bundles-adr/evidence.md`](../../plans/deferred-bundles-adr/evidence.md); the row ids below (`LA-n`, `GD-n`,
`GL-n`, `S-n`) are its rows.

The rules a verdict has to fit:

- **AD-1, AD-3, AD-4.** The Java is the spec; the oracle is ELK built from the pinned source plus patches; numbers match
  within 1e-6.
- **Browser-safe `src/`** and **zero runtime dependencies** (CLAUDE.md § Boundaries).
- **YAGNI** and **AD-14.** Nothing the Java does not have; an idiomatic wrapper is a separate later layer.

## Decision

| Bundle                  | Recommendation | Option chosen                                                             | Deciding evidence                             |
| ----------------------- | -------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| `alg.libavoid`          | **no-go**      | skip                                                                      | LA-3, LA-7, LA-8, LA-11, LA-12; S-4, S-5, S-6 |
| `alg.graphviz.dot`      | **no-go**      | skip                                                                      | GD-4, GD-10, GD-11; S-4, S-5, S-6             |
| `alg.graphviz.layouter` | **no-go**      | skip in this package; delegate only as a separate package, when asked for | GL-7, GL-8, GL-10, GL-12; S-4, S-5, S-6       |

No in-scope code calls any of the three, no ELK test exercises them, and none of the 898 corpus models names their
algorithms (S-4, S-5, S-6), so a no-go breaks nothing that is ported or planned.

**`alg.libavoid`: skip.** The bundle is a client. It serializes the graph as text, starts a downloaded C++ binary
(`LibavoidServer.java:214`, libavoid-server v0.3.1) and reads the routes back (LA-3). The routing is not in the Java, so the
pinned source does not define the result and the oracle could only record what the binary prints (LA-8). A port of the 1,548
Java lines gives a client with no server in a browser (LA-7); making it work means porting libavoid itself, about 868 KB of
LGPL-2.1-or-later C++ with no oracle here (LA-9, LA-11). dot-engine holds no libavoid, so there is nothing to delegate to
(LA-12).

**`alg.graphviz.dot`: skip.** This is the only one of the three that a port could carry under today's rules: it starts no
process, its transforms are plain mappings between ElkGraph and a DOT model, and the oracle could prove it without any
external binary (GD-3, GD-7, GD-8). It is not recommended because nothing uses it: its one consumer is
`alg.graphviz.layouter`, and `DotImporter` has no consumer at all (GD-4). A port would cost 7 to 10 tasks (GD-11) for a DOT
reader and writer that no in-scope code, test or model calls (YAGNI, GD-10). Delegating its grammar to dot-engine would cover
the smaller part and add a runtime dependency (GD-12).

**`alg.graphviz.layouter`: skip in this package.** Two thirds of the bundle is process and Eclipse code that has no browser
form (GL-1, GL-7), and its results come from whichever Graphviz is on `PATH`, which the AD-3 oracle cannot pin (GL-8).
Delegation to dot-engine is technically available: same licence, all five engines, DOT in and attributed DOT or geometry out
(GL-9, GL-12). It does not belong in `@knowvah/elk-engine`: it would add a runtime dependency, replace `GraphvizTool` with
code the Java does not have, and could not be held to 1e-6, because dot-engine matches the C binary within ±0.01 pt on `dot`,
`circo` and `twopi` and ±0.5 pt on `neato` and `fdp` (GL-10, GL-12). If a consumer asks for Graphviz layouts on an ElkGraph,
the place is a package of its own that depends on both engines (AD-14's later layer), at about 5 to 8 tasks (GL-11). That
route needs no locked rule amended. Doing it inside this package would need "Zero runtime dependencies" and AD-4 amended;
this ADR does not propose that.

## Consequences

**On acceptance** (none of this is done by the mission that wrote the ADR):

- CLAUDE.md § ELK Source Map moves the three bundles from "Deferred" to "Out of scope", with the reasons above. The three
  `.ide` bundles stay deferred; this ADR does not cover them.
- An AD-17 row recording the three verdicts is appended to `plans/elk-engine-skeleton/decisions.md`, and the rows in
  [inventory.md](inventory.md) and [port-map.md](port-map.md) change from `Deferred` to `Out`.
- `test/architecture/bundle-deps.json` and `tools/bundle-deps.ts` do not change: no bundle is adopted. No follow-up mission
  is needed, and roadmap row 11 closes.
- When `shared.test` is ported, its manifest entry for `alg.graphviz.layouter` is not carried: none of its four classes
  uses the bundle (S-4a).

**If the maintainer rules "go" for a bundle instead**, the follow-up is: add its suffix to `IN_SCOPE_SUFFIXES`
(`tools/bundle-deps.ts:29-46`), regenerate `bundle-deps.json` with `tools/bundle-deps.ts`, add a mapping test like the
`grammar bundles (conformance-corpus D0)` block, and add a roadmap row. `alg.graphviz.layouter` cannot be adopted without
`alg.graphviz.dot` (GL-2).

**Enforced now.** "Deferred" already means "cannot be ported by accident" (S-13). In
`test/architecture/module-boundaries.fitness.test.ts`, `src tree respects bundle boundaries › has no unmapped directories`
(`:322`) fails on any file under `src/` whose directory `bundle-deps.json` does not map, and its rule is self-checked by
`flags files in directories that belong to no bundle` (`:306`). `regeneration › regenerated deps equal the committed file`
(`:342`) ties the table to `IN_SCOPE_SUFFIXES`; it runs only when the ELK checkout is at the pin and is skipped otherwise.
No new test is needed.

**Revisit when** a pin move (roadmap row 13) changes one of the bundles or gives one an in-scope caller or test; a consumer
asks for Graphviz layouts on ElkGraphs or for DOT import and export; elk-models gains a model that names one of these
algorithms; or dot-engine's conformance bar or API changes what GL-12 says.

## Evidence summary

One line per evidence row; the detail and the commands are in
[`evidence.md`](../../plans/deferred-bundles-adr/evidence.md).

| Row                       | `alg.libavoid`                                      | `alg.graphviz.dot`                                     | `alg.graphviz.layouter`                                      |
| ------------------------- | --------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| 1 Hand-written lines      | 1,548 (+ 265 `.melk`)                               | 2,728 (2,206 transforms, 522 Xtext glue); 43 `src-gen` | 1,743 (540 layout logic, 1,156 process and Eclipse)          |
| 2 Out-of-scope requires   | `core.runtime` (OSGi)                               | Xtext, ANTLR, EMF, Guice                               | `alg.graphviz.dot`, `core.service`, Eclipse UI               |
| 3 External process        | libavoid-server v0.3.1, text over stdin and stdout  | none                                                   | Graphviz `dot -q -y -K<cmd>`, DOT over stdin and stdout      |
| 4 In-scope callers        | none                                                | none; only `graphviz.layouter`; `DotImporter` unused   | none; an unused `shared.test` manifest entry                 |
| 5 ELK tests               | none                                                | none                                                   | none                                                         |
| 6 Corpus models           | 0 of 898                                            | 0 of 898; no `.dot` file                               | 0 of 898                                                     |
| 7 Browser-safe            | no (process, files, thread)                         | yes, once the Xtext parts are hand-written             | no (process, `PATH`, files, thread, Eclipse preferences)     |
| 8 Oracle without a binary | no: the C++ binary computes the result              | yes                                                    | no: unpinned Graphviz (16.1.0 here)                          |
| 9 External licence        | libavoid LGPL-2.1-or-later; libavoid-server EPL-2.0 | none bundled                                           | Graphviz EPL-2.0; dot-engine EPL-2.0                         |
| 10 Rules a "go" meets     | browser-safe `src/`; AD-1 or zero dependencies      | YAGNI only                                             | browser-safe `src/`; zero dependencies and AD-4 if delegated |
| 11 Effort                 | 2-3 tasks for a client; tens of tasks for libavoid  | 7-10 tasks                                             | 2-3 line by line (unusable); 5-8 delegated, separate package |
| 12 dot-engine             | no delegate exists                                  | parses and writes DOT, not the ElkGraph mapping        | five engines; ±0.01 / ±0.5 pt bar; y-up output               |
| 13 Enforcement today      | `module-boundaries.fitness.test.ts:322`             | same                                                   | same                                                         |
