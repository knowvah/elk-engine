<!-- SPDX-License-Identifier: EPL-2.0 -->

# Real Graphviz output fixtures (graphviz-dot mission, D6)

Each `<scenario>.<alg>.dot` file is what the local Graphviz wrote for the DOT text that ELK's Graphviz layouter sends
for `tools/vectors/dot-export-scenarios/<scenario>.elkt` with command `<alg>`. The fixtures are **inputs**: the JVM
recorders read them (`DotExportVectors` feeds them to `DotExporter.transferLayout`; `DotParseVectors` and
`DotWriteVectors` parse and write every `*.dot` here) and record what ELK does with them. The Graphviz version enters
no comparison; do not regenerate them for a new Graphviz.

Graphviz: `dot - graphviz version 16.1.2 (20261121.0218)` (`dot -V`), Homebrew, macOS arm64, 2026-11-24.

## Input

The input of `<scenario>.<alg>.dot` is the `text` of row `export/<scenario>/layouter-<alg>` of
`test/golden/refs/java/graphviz-dot-export.json` followed by one `\n` (`GraphvizLayoutProvider.writeDotGraph` saves the
model without validation, then writes `'\n'`). That row runs `DotExportVectors`' copy of `LayoutDotExporter` with
`DotExporter.COMMAND = <alg>` and no other option set, so it is the layouter's request for that graph.

## Command

The arguments `GraphvizTool.initialize` passes (`-q -y -K<alg>`, no `-T`, so the default `dot` output format), one run
per file, the input on stdin:

| Fixture                 | Command                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `flat-basic.dot.dot`    | `dot -q -y -Kdot < input > flat-basic.dot.dot`                                                                        |
| `flat-basic.neato.dot`  | `dot -q -y -Kneato < input > flat-basic.neato.dot`                                                                    |
| `flat-basic.fdp.dot`    | `dot -q -y -Kfdp < input > flat-basic.fdp.dot`                                                                        |
| `flat-basic.twopi.dot`  | `dot -q -y -Ktwopi < input > flat-basic.twopi.dot`                                                                    |
| `flat-basic.circo.dot`  | `dot -q -y -Kcirco < input > flat-basic.circo.dot`                                                                    |
| `ports-sides.dot.dot`   | `dot -q -y -Kdot < input > ports-sides.dot.dot`                                                                       |
| `ports-sides.neato.dot` | `dot -q -y -Kneato < input > ports-sides.neato.dot`                                                                   |
| `hierarchy.dot.dot`     | `dot -q -y -Kdot < input > hierarchy.dot.dot` (HIERARCHY on: the scenario sets `hierarchyHandling: INCLUDE_CHILDREN`) |
| `hierarchy.fdp.dot`     | `dot -q -y -Kfdp < input > hierarchy.fdp.dot` (top level only)                                                        |
| `edge-labels.dot.dot`   | `dot -q -y -Kdot < input > edge-labels.dot.dot`                                                                       |
| `edge-labels.circo.dot` | `dot -q -y -Kcirco < input > edge-labels.circo.dot`                                                                   |
| `edge-labels.twopi.dot` | `dot -q -y -Ktwopi < input > edge-labels.twopi.dot`                                                                   |
| `self-loops.dot.dot`    | `dot -q -y -Kdot < input > self-loops.dot.dot`                                                                        |
| `self-loops.neato.dot`  | `dot -q -y -Kneato < input > self-loops.neato.dot`                                                                    |

`hierarchy.dot.dot` contains Graphviz's backslash-newline line continuations inside quoted `pos` values, which
`DotExporter.transferLayout` does not join: the point split across the continuation (`120.29,\` + newline + `31.241` in
edge5) fails `KVector.parse` and is dropped (row `transfer/hierarchy/layouter-dot/hierarchy.dot`).
