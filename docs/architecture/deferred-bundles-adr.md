<!-- SPDX-License-Identifier: EPL-2.0 -->

# ADR: deferred bundles (alg.libavoid, alg.graphviz.dot, alg.graphviz.layouter)

**Status:** Accepted, amended (ruling 2026-11-14, confirmed 2026-11-23). Proposed 2026-11-13. Issue: #88

The maintainer accepted this ADR with one amendment: `alg.libavoid` is out of scope, as recommended, and the two Graphviz
bundles are **in scope**, against the recommendation. [Ruling](#ruling-2026-11-14) states what was decided and
[Consequences](#consequences) what follows; Context, Decision and the evidence summary are the Proposed analysis, kept as
written.

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

_The Proposed analysis of 2026-11-13, unchanged. The [ruling](#ruling-2026-11-14) overrides its two Graphviz rows._

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

## Ruling (2026-11-14)

Maintainer ruling on issue #88, 2026-11-14, confirmed there on 2026-11-23 ("good to go"): accept the ADR **amended**.

| Bundle                  | Recommendation | Ruling           | Where the work lives                                                    |
| ----------------------- | -------------- | ---------------- | ----------------------------------------------------------------------- |
| `alg.libavoid`          | no-go          | **out of scope** | nowhere: not ported                                                     |
| `alg.graphviz.dot`      | no-go          | **in scope**     | issue #95, step 2                                                       |
| `alg.graphviz.layouter` | no-go          | **in scope**     | issue #95, step 3; the runner API is step 4, the adapter (outside) is 5 |

**`alg.libavoid`: out of scope**, "as the ADR recommends".

**`alg.graphviz.dot` and `alg.graphviz.layouter`: go**, "inside `@knowvah/elk-engine`, ported faithfully with `GraphvizTool`'s
process replaced by an injected runner. The same functionality then comes from `@knowvah/dot-engine` through a small adapter
outside this package, so zero runtime dependencies and browser safety hold. The ADR's objections assumed a delegate inside the
package; with the runner as a parameter there is none." The runner takes DOT text and the algorithm and returns DOT text
(#95); it is the one point where `GraphvizLayoutProvider` touches Graphviz (`GraphvizTool.java:182-211`). The analysis above
weighed "skip", a line-by-line "port" and "delegate" (dot-engine as a dependency of this package); it did not weigh a port
whose one Graphviz call is a parameter, which is the shape the ruling chooses. How the runner is injected is not ruled: it is
new API, to settle with the maintainer under #95.

**AD-4 exception, one suite only.** "The export, DOT parse and `transferLayout` are deterministic ELK Java and meet AD-4
exactly. Only an end-to-end suite (pinned Graphviz 16.1.0 against the dot-engine adapter) uses dot-engine's bar, as a stated
AD-4 exception for that suite." The bar's numbers are in #95: ±0.01 pt for `dot`, ±0.5 pt for `neato` and `fdp`.

**The evidence still holds at the current pin.** It was gathered at `8aaa3c14`; the pin is now `8bca22f4`.
`git -C "$ELK_SOURCE_DIR" log --oneline 8aaa3c14..8bca22f4 -- plugins/org.eclipse.elk.alg.libavoid
plugins/org.eclipse.elk.alg.graphviz.dot plugins/org.eclipse.elk.alg.graphviz.layouter` prints nothing, and `git diff --quiet`
over the same commits and paths exits 0 (2026-11-24): the three bundles are identical at both commits, so every line citation
into them is valid at the pin.

The ruling is recorded as AD-17 in `plans/elk-engine-skeleton/decisions.md`.

## Consequences

**Done on acceptance** (mission `deferred-bundles-acceptance`, issue #88, 2026-11-24; it ports nothing):

- AD-17 is appended to `plans/elk-engine-skeleton/decisions.md`: the ruling's four points, and the amended bundle-scope
  table.
- CLAUDE.md § ELK Source Map lists `alg.graphviz.dot` and `alg.graphviz.layouter` under "In scope" and `alg.libavoid` under
  "Out of scope". The three `.ide` bundles stay deferred; this ADR does not cover them.
- The rows in [inventory.md](inventory.md) and the scope paragraph of [port-map.md](port-map.md) say the same, as do the
  triage table of [elk-upgrade.md](elk-upgrade.md) and the source list of [melk-codegen.md](melk-codegen.md).
- `IN_SCOPE_SUFFIXES` (`tools/bundle-deps.ts:30-49`) holds both Graphviz suffixes, and `test/architecture/bundle-deps.json`,
  regenerated by `tools/bundle-deps.ts --write`, maps `src/alg/graphviz/dot` (requires `src/core`, `src/graph`) and
  `src/alg/graphviz/layouter` (requires `src/alg/graphviz/dot`, `src/core`, `src/graph`). The layouter's optional
  `core.service` requirement is out of scope and is not in the table: what the Java takes from it has to be replaced, not
  imported. The block `graphviz bundles (AD-17)` in `test/architecture/module-boundaries.fitness.test.ts` pins both entries.
- Roadmap row 11 closes.

**Left to issue #95** (steps 2 to 5; step 1 is the list above):

- The port of `alg.graphviz.dot` (the DOT model, a hand-written parser for its grammar, the serializer, `DotExporter` and the
  transforms) and of `alg.graphviz.layouter` (`GraphvizLayoutProvider`, `LayoutDotExporter`, `GraphvizException`,
  `Graphviz.melk`), with the Eclipse-only parts journaled as omissions.
- How the runner is injected. It is new API, settled with the maintainer; module-level mutable state is not an option
  (AD-8).
- The dot-engine adapter, outside this package, which needs knowvah/dot-engine#220 (`-y`).
- The end-to-end suite and its entry in `docs/conformance.md` as the AD-4 exception; pinning Graphviz in the oracle build.
- When `shared.test` is ported, its manifest entry for `alg.graphviz.layouter` is still not carried on S-4a's ground: none
  of its four classes uses the bundle.

**Enforced now.** A bundle that is not in the table cannot be ported by accident (S-13). In
`test/architecture/module-boundaries.fitness.test.ts`, `src tree respects bundle boundaries › has no unmapped directories`
(`:333`) fails on any file under `src/` whose directory `bundle-deps.json` does not map, and its rule is self-checked by
`flags files in directories that belong to no bundle` (`:317`). `regeneration › regenerated deps equal the committed file`
(`:360`) ties the table to `IN_SCOPE_SUFFIXES`; since issue #89 it runs whenever the ELK checkout contains the pin, at any
`HEAD`, and is skipped only without such a checkout. Since the acceptance, `graphviz bundles (AD-17)` also pins that
`src/alg/libavoid/` and a file directly under `src/alg/graphviz/` stay unmapped, and that `src/alg/graphviz/dot` may not
import `src/alg/graphviz/layouter`.

**Revisit `alg.libavoid` when** a pin move (roadmap row 13) changes the bundle or gives it an in-scope caller or test; a
consumer asks for libavoid routing on ElkGraphs; or elk-models gains a model that names its algorithm. The Graphviz triggers
of the Proposed text are moot: both bundles are in scope.

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
| 13 Enforcement today      | `module-boundaries.fitness.test.ts:323`             | same                                                   | same                                                         |
