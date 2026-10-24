<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-engine architecture overview

| Document                                           | Content                                                                 |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| [inventory.md](inventory.md)                       | Every ELK bundle: purpose, LOC, generated sources, scope                |
| [port-map.md](port-map.md)                         | Java packages to `src/` modules mapping                                 |
| [component-map.md](component-map.md)               | In-scope bundle dependencies; core runtime pieces                       |
| [../translation-rules.md](../translation-rules.md) | Java to TypeScript rules                                                |
| [../conformance.md](../conformance.md)             | Oracle comparison bar and procedure (arrives later in this mission)     |
| [elk-text.md](elk-text.md)                         | ELK Text (`.elkt`) port, the Xtext subset, runbook and deferrals        |
| [elk-json-text.md](elk-json-text.md)               | ELK Textual JSON (`.elkj`) port, lazy linking, runbook and deferrals    |
| [grandom.md](grandom.md)                           | grandom (`.elkr`) random graph generator port, evidence and runbook     |
| [core-engine.md](core-engine.md)                   | Layout engine and the fixed, box and random providers (mission 5a)      |
| [melk-codegen.md](melk-codegen.md)                 | The `.melk` generator, pending types, lazy constants, regeneration      |
| [complexity.md](complexity.md)                     | The complexity gate that measures every function (`npm run complexity`) |

## What elk-engine is

`@knowvah/elk-engine` is a faithful TypeScript port of the Eclipse Layout Kernel (ELK). The Java at
the pinned commit `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` is the specification (AD-1, AD-2). It
is a library: browser-safe, zero runtime dependencies, no Java or WASM. Its public contract is the
ElkGraph object model plus `ElkGraphUtil` factories; ELK JSON is an I/O adapter (AD-14). Thirteen
bundles totalling about 134,600 hand-written lines are in scope (see the inventory). Current state:
the layout engine (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) and the
three core providers `fixed`, `box` and `random` are ported and equal the oracle on the curated goldens
(mission 5a, [core-engine.md](core-engine.md)). The rest of `core` is ported too (mission 5b: processor pipeline, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, splines,
comment attachment; see [core-engine.md](core-engine.md#mission-5b)); no other
algorithm (layered, mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex) is
ported yet.

## Relation to ELK Java and the oracle

```plantuml
@startuml
component "ELK Java\n($ELK_SOURCE_DIR, pinned sha)" as elk
component "Patch series\n(tools/oracle/patches)" as patches
component "Oracle build\n(tools/oracle/build.sh)" as oracle
component "Oracle harness\n(ElkOracle.java)" as harness
component "Golden refs\n(test/golden/refs/elk)" as goldens
component "elk-engine\n(src/)" as ts
component "Conformance tests\n(test/golden)" as tests
elk --> oracle : detached git worktree
patches --> oracle : git am, lexical order
oracle --> harness : Maven/Tycho build
harness --> goldens : writes layout JSON
elk ..> ts : specification, ported by hand
goldens --> tests : expected values
ts --> tests : actual values
@enduml
```

The patch series is empty in this mission (AD-3). Goldens are committed, so CI needs no JVM
(AD-5). Comparison: structure exact, coordinates within 1e-6 (AD-4).

## Key flows

Layout in ELK, which elk-engine reproduces for `fixed`, `box` and `random` today (details in
[component-map.md](component-map.md) and [core-engine.md](core-engine.md#engine-flow)):

```plantuml
@startuml
participant "Caller / JSON adapter" as caller
participant RecursiveGraphLayoutEngine as engine
participant LayoutAlgorithmData as data
participant "AbstractLayoutProvider\nsubclass" as provider
caller -> engine : layout(ElkNode, monitor)
engine -> data : resolve algorithm per hierarchy level
data --> engine : provider from instance pool
engine -> provider : layout(ElkNode, monitor)
provider --> engine : coordinates written to ElkGraph
engine --> caller : laid-out ElkGraph
@enduml
```

JSON adapter (`graph.json`, `ElkGraphJson`): ELK JSON in becomes an ElkGraph via the importer
before layout; after layout, the computed coordinates and edge sections are transferred back into
JSON out. The oracle harness uses the Java adapter in the same two steps, so both sides share the
JSON contract.

Text adapter (`graph.text`, `ElkGraphText`): `.elkt` text loads into an ElkGraph through a hand-written
parser, linker and validator built on a small Xtext subset (`src/xtext`), and an ElkGraph serializes back
to `.elkt`. The entry point is internal; see [elk-text.md](elk-text.md).

Textual JSON adapter (`graph.json.text`, `ElkGraphJsonText`): `.elkj` text loads through the same Xtext subset
with a hand-written parser, and links lazily like Xtext's `LazyLinker`: edge endpoints are EMF proxies
(`src/emf`) that resolve when read. An ElkGraph serializes back to `.elkj` through a grammar-specific writer.
The entry point is internal; see [elk-json-text.md](elk-json-text.md).

Random graph generator (`core.debug.grandom`, `GRandomText`): `.elkr` text parses through a hand-written lexer
and parser on the same Xtext subset (`src/xtext`), and `RandomGraphGenerator` turns a configuration into
ElkGraphs with the exact JVM `Random` sequence. Seeded output is byte-exact against the oracle and reproduces
the nine `test/corpus/generated/*.json` files; unseeded paths (edge label text, cross-hierarchy shuffle, a
missing seed) are checked by invariants only. The entry point is internal; see [grandom.md](grandom.md).

## Tech stack

| Concern       | Choice                                                        |
| ------------- | ------------------------------------------------------------- |
| Language      | TypeScript 7.0.2 (native `tsc`), ES2022, NodeNext, `strict`   |
| Tests         | vitest 5.0.x with `@vitest/coverage-v8` (90% thresholds)      |
| Bundling      | esbuild 0.28.x                                                |
| Script runner | tsx                                                           |
| Runtime       | Node 22 or newer; `src/` itself is browser-safe               |
| Oracle only   | Maven 3.9+ and JDK 21 (JDK 17 fallback) for ELK's Tycho build |

## Fitness constraints (AD-8)

Bundle import direction follows `test/architecture/bundle-deps.json`; SPDX header on every code
file; no Node built-ins or `process.env` in `src/`; no module-level mutable `let` outside the
allowlist.
