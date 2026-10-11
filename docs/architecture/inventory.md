<!-- SPDX-License-Identifier: EPL-2.0 -->

# ELK bundle inventory

All 32 directories under `$ELK_SOURCE_DIR/plugins` (ELK commit
`8aaa3c145c2a18a38aabbc725aa3791ddc517a76`), plus `pom.xml` (the Tycho aggregator listing every
bundle as a module). Scope is the authoritative classification in
`plans/elk-engine-skeleton/decisions.md` ("Bundle scope"). Prefix `org.eclipse.elk.` omitted.

## Plugins

LOC = hand-written Java + Xtend lines (`wc -l`), excluding `src-gen/` and `xtend-gen/`.
Generated = sources produced by a generator: `.melk` (ELK metadata, compiled by `core.meta`),
`src-gen` (EMF or Xtext output, committed), `xtext` grammar.

| Bundle | Purpose | LOC | Generated | Scope | Rationale |
|--------|---------|----:|-----------|-------|-----------|
| `core` | Layout engine, metadata service, options, math, utils | 20,414 | `.melk` x2 | In | Runtime kernel; every algorithm requires it |
| `graph` | ElkGraph model (nodes, edges, ports, labels, properties) | 11,449 | Ecore model; EMF code committed in `src` | In | Public contract (AD-11, AD-14) |
| `graph.json` | ELK JSON to/from ElkGraph | 1,971 | none | In | I/O adapter, required for the oracle round-trip (AD-14) |
| `alg.common` | Shared algorithm infrastructure (compaction, packing, utils) | 14,677 | `.melk` | In | Required by all algorithms |
| `alg.layered` | Layered (Sugiyama) layout | 64,082 | `.melk` | In | Flagship algorithm |
| `alg.mrtree` | Tree layout | 5,790 | `.melk` | In | Algorithm in scope |
| `alg.radial` | Radial layout | 2,752 | `.melk` | In | Algorithm in scope |
| `alg.force` | Force-directed layout | 2,236 | `.melk` x2 | In | Algorithm in scope |
| `alg.disco` | Disconnected-components compaction | 2,409 | `.melk` | In | Algorithm in scope |
| `alg.rectpacking` | Rectangle packing | 4,688 | `.melk` | In | Algorithm in scope |
| `alg.spore` | SPOrE overlap removal and compaction | 1,326 | `.melk` | In | Algorithm in scope |
| `alg.topdownpacking` | Top-down packing | 1,113 | `.melk` | In | Algorithm in scope |
| `alg.vertiflex` | VertiFlex tree layout | 1,693 | `.melk` | In | Algorithm in scope |
| **In-scope total** | 13 bundles | **134,600** | | | |
| `alg.libavoid` | Libavoid connector routing integration | 1,548 | `.melk` | Deferred | Drives an external C++ process |
| `alg.graphviz.dot` | Graphviz DOT language parser | 2,728 | Xtext/Ecore, 40 `src-gen` files | Deferred | DOT I/O; candidate to delegate to dot-engine |
| `alg.graphviz.layouter` | Bridge to external Graphviz `dot` | 1,743 | `.melk` | Deferred | Needs external `dot` binary |
| `core.service` | Layout service layer (Eclipse/JFace/Guice) | 2,676 | none | Out | Platform runtime, not layout |
| `core.ui` | Core UI components | 4,177 | none | Out | Eclipse UI |
| `core.meta` | `.melk` language (Xtext) and generator | 1,859 | Xtext, 39 `src-gen` files | Out | Build-time tool; AD-12 replaces it with a TS generator |
| `core.meta.ui` | `.melk` editor UI | 271 | Xtext, 11 `src-gen` files | Out | Editor |
| `core.debug` | Debugging utilities (view, tools) | 3,683 | none | Out | Debug tooling |
| `core.debug.grandom` | Random graph generator (Xtext DSL) | 2,543 | Xtext/Ecore, 40 `src-gen` files | Out | Debug tooling |
| `core.debug.grandom.ide` | grandom generic IDE services | 53 | 5 `src-gen` files | Out | Editor |
| `core.debug.grandom.ui` | grandom UI | 311 | 5 `src-gen` files | Out | Editor |
| `alg.disco.debug` | DisCo debugging utilities | 2,868 | none | Out | Debug tooling |
| `conn.gmf` | GMF layout connector | 3,091 | `.melk` | Out | Eclipse GMF integration |
| `graph.text` | Textual ElkGraph format (Xtext) | 1,232 | Xtext, 11 `src-gen` files | Out | Editor |
| `graph.text.ide` | Textual format IDE services | 281 | 5 `src-gen` files | Out | Editor |
| `graph.text.ui` | Textual format UI | 836 | 4 `src-gen` files | Out | Editor |
| `graph.json.text` | Textual ELK JSON format (Xtext) | 801 | Xtext, 12 `src-gen` files | Out | Editor |
| `graph.json.text.ide` | Textual JSON IDE services | 243 | 5 `src-gen` files | Out | Editor |
| `graph.json.text.ui` | Textual JSON UI | 629 | 5 `src-gen` files | Out | Editor |
| `pom.xml` | Tycho aggregator, lists the 32 modules | n/a | n/a | n/a | Build file, not a bundle |

Classification counts: 13 In, 3 Deferred, 16 Out (= 32).

## Test plugins

Under `$ELK_SOURCE_DIR/test` (aggregator `pom.xml` lists 14 modules). "Test files" = Java files
whose name contains `Test` (plugin file totals differ only for `alg.test`).

| Test plugin | Test files | Tests bundle |
|-------------|-----------:|--------------|
| `alg.common.test` | 8 | `alg.common` |
| `alg.disco.test` | 1 | `alg.disco` |
| `alg.force.test` | 1 | `alg.force` |
| `alg.layered.test` | 97 | `alg.layered` |
| `alg.mrtree.test` | 1 | `alg.mrtree` |
| `alg.radial.test` | 1 | `alg.radial` |
| `alg.rectpacking.test` | 3 | `alg.rectpacking` |
| `alg.spore.test` | 2 | `alg.spore` |
| `alg.topdown.test` | 3 | `alg.topdownpacking` |
| `core.test` | 20 | `core` |
| `graph.test` | 1 | `graph` |
| `graph.json.test` | 9 | `graph.json` |
| `alg.test` | 17 (46 Java files) | Shared algorithm-test framework (`LayoutTestRunner`, `ExperimentRunner`, white-box recorder); requires core, graph, graph.text, alg.* and `core.debug.grandom` |
| `shared.test` | 4 | Cross-bundle layout tests (`DirectLayoutTest`, `PlainLayoutTest`, `ElkReflectTest`, `ElkLiveExamplesTest`) |

## Reproducing the numbers

```sh
# per bundle LOC (run from $ELK_SOURCE_DIR)
find plugins/<bundle> -type f \( -name '*.java' -o -name '*.xtend' \) \
  -not -path '*/src-gen/*' -not -path '*/xtend-gen/*' -not -path '*/target/*' \
  | xargs cat | wc -l
# test files per plugin
find test/<plugin> -type f -name '*Test*.java' | wc -l
```

Notes:

* `graph` LOC includes the EMF implementation classes (`impl/`, `ElkGraphPackage`), which ELK
  commits under `src`, not `src-gen`. Hand-written in the repo sense, generated in origin.
* `core` and the algorithm bundles reference classes generated from `.melk` at build time
  (`CoreOptions`, `LayeredOptions`, metadata providers); those sources are not in the checkout and
  are not counted. AD-12 covers their TS replacement.
* Xtend appears in `graph.json` (5 files) among in-scope bundles; Xtend sources in Out-of-scope
  bundles are counted in their LOC.

See also: [overview](overview.md), [component-map](component-map.md), [port-map](port-map.md).
