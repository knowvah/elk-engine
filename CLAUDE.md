<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-engine — Claude Code Instructions

## Mission

A faithful TypeScript port of [Eclipse ELK](https://github.com/eclipse-elk/elk)
(package `@knowvah/elk-engine`). The Java at `$ELK_SOURCE_DIR` (default
`../elk`), pinned to commit `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`
(AD-2), is the **canonical specification**. The port is consumed as a library
and must run in a browser.

Keep the `plans/` contents — they are the archaeology of this effort. Never
delete or rewrite them; append to the active mission's `decision-journal.md`.
Locked decisions (AD-1…AD-16) live in `plans/elk-engine-skeleton/decisions.md`.

## The Java Is Sacred

Years of user-reported bugs and layout quirks are encoded in the Java. Rules:

- **Do not optimize or simplify algorithms.** If the Java looks redundant or
  odd, preserve it — the oddity is almost certainly load-bearing.
- **Port every branch.** Special cases exist because someone hit them.
- **Keep method boundaries.** Split or merge only where TypeScript forces it
  (e.g., no overloading by type, no inner-class access to outer privates).
- **Do not reorder logic.** Side-effect order is often intentional; note any
  deviation explicitly.
- **Port the JUnit tests too.** Each encodes a known correct behavior; port
  them alongside the code they test.

**Carve-out, prose only.** A typo in ELK's human-readable text (a
description, label, or message string nothing branches on) is corrected
proactively, not reproduced: fix it at the port site with a comment naming the
upstream text, assert the corrected string in the ported test, and list the
case under "upstream typos" in `docs/conformance.md`. Behaviour, identifiers,
and anything compared against the oracle stay verbatim.

When in doubt, read the Java. Still in doubt: keep the Java behavior and
journal the question. On any divergence, instrument the oracle and dump actual
values before hypothesizing — the default stance is "my port differs — find where."

## Verification

- Oracle = ELK **built from source** by `tools/oracle/build.sh`: a detached git
  worktree of `$ELK_SOURCE_DIR` at the sha in `tools/oracle/ELK_COMMIT`, plus
  `tools/oracle/patches/*.patch` (AD-3). Never use elkjs as an oracle (GWT
  emulation differs from the JVM and cannot carry our patches).
- Conformance bar (AD-4): ids, element counts, edge-section topology,
  bend-point counts, and non-numeric values match exactly; numeric
  coordinates/sizes match within absolute tolerance **1e-6**. Last-ulp
  `Math.*` JVM-vs-V8 differences go to a known-divergences list.
- Goldens (AD-5): curated oracle outputs under `test/golden/refs/elk/` with
  `_meta.json`; JVM vectors under `test/golden/refs/java/`; comparator
  `test/golden/compare-json.ts`. Regenerate refs by script, never by hand, and
  journal the regeneration with the patch id.
- Gates before any commit: `npm run typecheck` clean, `npm run coverage`
  green (90% lines/branches/functions/statements), golden suite green,
  `npm run complexity` clean (plain lizard skips functions; never trust its exit code).
- Journal every fix in the active mission's `decision-journal.md`.

## Tests Are Immutable (AD-13)

Expected values come from the oracle, JVM vectors, or the Java source
**before** the implementation is written. Once written, an assertion is
frozen: a failing test means the implementation is wrong.

**STOP rule:** if a test can only pass by changing its assertion (or a vector
or golden), STOP. Journal the case in `decision-journal.md` and wait for the
user. Never loosen a tolerance, delete a case, or regenerate a ref to get green.

## Translation Rules

Full list: [`docs/translation-rules.md`](docs/translation-rules.md). Core rows:

| Java concept                  | TypeScript                                                                                                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `int`                         | `number`, wrapped via `src/java/lang/Int32` ops                                                                                                                                                                                |
| `long`                        | `number`; `bigint` only beyond 2^53, document site                                                                                                                                                                             |
| `double`                      | `number`                                                                                                                                                                                                                       |
| `(int)` of `double`/`float`   | saturating `d2i` shim (NaN → 0, clamps to int32)                                                                                                                                                                               |
| `(int)` of `long`             | wraps to low 32 bits: `l2i` shim (vector needed first); ELK's `(int) Math.round(x)` is this case                                                                                                                               |
| `Math.round`                  | shim per Javadoc (closest long, ties → +∞; NaN → 0)                                                                                                                                                                            |
| integer division / `%`        | truncating `Int32.div`/`Int32.rem` (throw on zero, no `-0`); `floorDiv`/`floorMod` have no in-scope caller                                                                                                                     |
| `char`                        | UTF-16 code unit as `number`; strings via `charAt`                                                                                                                                                                             |
| `String`                      | `string` (UTF-16, same as Java)                                                                                                                                                                                                |
| `Comparator` / `compareTo`    | `(a, b) => number`; `Double.compare` shim for NaN                                                                                                                                                                              |
| `Linked*` / `Enum*` / `Hash*` | per AD-10: `Map`/`Set`; ordinal-ordered; enum keys are identity-hashed; `JavaHashMap` only for value-hashed keys (KVector-derived `TEdge`/`TTriangle`, e.g. `NaiveMinST`); identity-hashed → insertion order, journal the site |
| Guava                         | small local helpers; never a dependency                                                                                                                                                                                        |
| EMF (ElkGraph)                | plain classes, Java accessor names (AD-11)                                                                                                                                                                                     |
| `assert`                      | dev-only check helper, no production cost                                                                                                                                                                                      |
| checked exceptions            | `Error` subclasses with the Java parent chain (`Exception`, `RuntimeException`; AD-16); keep throw sites                                                                                                                       |

Hazards: Java `int` arithmetic wraps at 32 bits; field defaults are zero/null/
false, not `undefined`; `Random` draws (`nextInt`, `nextDouble`, `nextFloat`,
`nextBoolean`, `nextLong`, `setSeed`) must match the JVM sequence exactly.
The one-argument `Collections.shuffle` has one in-scope caller
(`RandomGraphGenerator.sample`, unseeded, invariants only); the two-argument
form stays vector-proven.

**Never read or copy OpenJDK source (AD-9).** OpenJDK is GPLv2+CE; reading or
copying it into an EPL-2.0 codebase is forbidden. Implement `src/java/` shims
only from the Javadoc-specified algorithms, and prove them against JVM-generated
vectors (`tools/vectors/JavaVectors.java`).

## Layout & Naming (AD-7)

- `src/` mirrors Java packages minus `org/eclipse/elk/`:
  `org.eclipse.elk.alg.layered.p1cycles.GreedyCycleBreaker` →
  `src/alg/layered/p1cycles/GreedyCycleBreaker.ts`.
- **One class per file, named exactly as the Java class (PascalCase).** This
  deviates from kebab-case on purpose, for traceability to the Java.
- Java runtime shims live in `src/java/<package>/` (e.g. `src/java/util/Random.ts`).
- Tests are colocated as `<Name>.test.ts`; shared helpers go in `test/helpers/`.
- Every ported symbol carries `/** @see <bundle>/src/<path>.java */`; shims cite
  the Javadoc spec URL.
- Symbols keep Java names (`camelCase` methods, `PascalCase` classes,
  `UPPER_SNAKE_CASE` constants).

## Boundaries

- Fitness functions (AD-8) in `test/architecture/` enforce: bundle dependency
  direction from `test/architecture/bundle-deps.json` (derived from
  `Require-Bundle`; an algorithm never imports another algorithm unless the
  Java does); SPDX headers; no module-level mutable `let` outside the allowlist.
  `src/java` imports nothing from ELK directories.
- **Browser-safe `src/`**: no Node built-ins, no `process.env`, ES modules only.
  If the Java reads a file, take the data as a parameter.
- **Zero runtime dependencies.** Dev dependencies must be EPL-2.0 compatible
  (no GPL-3.0-only).
- **YAGNI, strictly**: add no APIs, options, or patterns the Java does not
  have. The public contract is the ElkGraph object model plus `ElkGraphUtil`
  factories; ELK JSON is an I/O adapter; idiomatic wrappers are a separate later
  layer (AD-14). `src/java/*` is internal; `src/index.ts` exports nothing yet.
- Architecture overview: [`docs/architecture/overview.md`](docs/architecture/overview.md).
  Conformance detail: [`docs/conformance.md`](docs/conformance.md).

## ELK Source Map (`$ELK_SOURCE_DIR/plugins/org.eclipse.elk.<bundle>`)

**In scope** (bundle → purpose, from `Bundle-Name`):

- `core` — core components: layout engine, options, metadata, math, utilities
- `core.debug.grandom` — ELK Random Graph Generator (grammar `GRandom.xtext`;
  seeded `Random`; `BlindTextGenerator` is unseeded, keep it out of goldens)
- `graph` — ElkGraph model (EMF-generated; plain classes here)
- `graph.json` — ELK JSON import/export
- `graph.text` — ELK Textual Graph Format (`.elkt`; grammar `ElkGraph.xtext`)
- `graph.json.text` — ELK Textual JSON Graph Format (grammar `ElkGraphJson.xtext`)
- `alg.common` — algorithms shared across layouts
- `alg.layered` — layered (Sugiyama-style) layout
- `alg.mrtree` — Mr. Tree tree layout
- `alg.radial` — radial tree layout
- `alg.force` — force-directed layout
- `alg.disco` — disconnected components compaction
- `alg.rectpacking` — rectangle packing
- `alg.spore` — SPOrE overlap removal and compaction
- `alg.topdownpacking` — top-down packing
- `alg.vertiflex` — VertiFlex tree layout

**Deferred** (roadmap decides): `alg.libavoid` (drives an external C++ process),
`alg.graphviz.dot` / `alg.graphviz.layouter` (DOT I/O + external `dot`;
candidate for delegating to dot-engine); `graph.text.ide`, `graph.json.text.ide`,
`core.debug.grandom.ide` (Xtext generic IDE services: content assist; needs a
browser-editor host decision).

**Reference only** (read for design ideas; never ported line by line, no
`@see` to them): `core.debug` (layout graph view, execution-time tree, image
export: model for the parity dashboard and a later debug viewer),
`alg.disco.debug` (polyomino/compaction renderer: model for disco divergence
visualization).

**Out of scope**: `core.service` (Eclipse/JFace/Guice runtime), `core.ui`,
`core.meta`, `core.meta.ui`, `conn.gmf`, `graph.text.ui`, `graph.json.text.ui`,
`core.debug.grandom.ui` (Eclipse editors; require Eclipse UI, `core.ui`/`core.service`).

Third-party `Require-Bundle` entries (Guava, EMF, Gson, Xtend/Xbase, Xtext, ANTLR)
are not TS directories; AD-10, AD-11, and the translation rules cover them. The
`.xtext` grammars are ported as hand-written parsers implementing each rule; no
Xtext or ANTLR dependency (zero runtime dependencies). The hand-written Xtend
(value converters, naming, scoping, linking, validation, formatting) is ported
like any other source.

## External Directories

Defaults are relative to the repo root (AD-15); never hardcode absolute paths.

| Variable         | Default                        | Holds                                                                   |
| ---------------- | ------------------------------ | ----------------------------------------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | ELK Java source at the pinned commit                                    |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | detached worktree + built oracle                                        |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | corpus, pinned `ac5af2ba…` in `test/corpus/manifest.json`, not vendored |

Only `tools/` and `test/` read these variables. Library code in `src/` never
reads env vars. The oracle needs Maven ≥ 3.9 and JDK 21 (fallback JDK 17).

## License

EPL-2.0 (same as upstream). Every code file carries an SPDX header:
`// SPDX-License-Identifier: EPL-2.0` (`#` for sh/yml, `<!-- -->` for md) —
enforced by a fitness test. Do not add dependencies incompatible with EPL-2.0.
