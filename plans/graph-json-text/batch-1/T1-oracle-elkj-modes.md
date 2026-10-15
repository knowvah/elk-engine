<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Oracle: `.elkj` reader, `parse-elkj` and `convert` modes, D12 seam patch

**Agent:** java-architect · **Commit:** `test(T1): add elkj parse and convert modes to the oracle harness`

## Context
The harness (`tools/oracle/harness/`) picks a reader by extension (`ElkModelReader.java:19-50`: `.elkt` through
Xtext, everything else through the JSON importer) and has case modes `layout`, `parse`, `generate`
(`CaseSpec.java:16-35`). D2 needs three more capabilities: read `.elkj` files (tier 1), read a `.json` file through
the `.elkj` language (tier 2), and produce ELK-native `.elkj` exactly as ELK's `ConvertGraphHandler` does
(`graph.json.text.ui/.../ConvertGraphHandler.xtend:140-180`). The graph.json.text jar is already in the oracle
build (`tools/oracle/build.sh:24`). D12: the converter's `GraphIdentifierGenerator.assertUnique` draws from an
unseeded `Random` (`GraphIdentifierGenerator.java:352-363`); 48 `.elkt` models have duplicate identifiers.

## Task
1. `ElkModelReader`: a `.elkj` branch that loads through `ElkGraphJsonStandaloneSetup.doSetup()` (lazily, once, like
   the `.elkt` branch) and a `readAsElkj(path)` that loads any file's bytes through the `.elkj` language (create the
   resource with a `.elkj` URI and `load(InputStream)`). Load errors surface as the `.elkt` branch surfaces them.
2. `CaseSpec`/`CaseRunner`: modes `parse-elkj` (= `parse`, but `readAsElkj`) and `convert` (read by extension, then
   `ElkjConverter.transform` + save; output `<outDir>/<id>.elkj`, result line as for `parse`). `parse` of a `.elkj`
   input uses the new branch. Parse output is the same parse-only JSON export the `.elkt` parse mode writes.
3. `ElkjConverter.java`: `transform` = `EcoreUtil.copy`, then for an `ElkNode`
   `GraphIdentifierGenerator.forGraph(g).assertValid().assertExists().assertUnique().execute()`; `save` = a fresh
   `ResourceSetImpl`, `createResource(<uri>.elkj)`, `contents.add`, `save(Collections.EMPTY_MAP)` (no formatter). Cite
   the Xtend lines. The commented-out `removeInvalidProperties`/`removeUnnecessaryLayouts` stay out.
4. D12 patch `0002-graph-seedable-GraphIdentifierGenerator-random.patch` (format and commit metadata as `0001`): when
   the system property `org.eclipse.elk.graph.util.identifierSeed` is set, `fourDigitPaddedRandomNumber` uses
   `new Random(<seed>)` created once per generator; unset, behaviour is unchanged. `convert` mode sets it to `1`
   (via `run.sh` or the harness, journal which). Rebuild with `tools/oracle/build.sh`.
5. `ElkOracle` usage text lists the new modes.

## Write-set
`tools/oracle/harness/{CaseSpec,CaseRunner,ElkModelReader,ElkOracle,ElkjConverter}.java`,
`tools/oracle/patches/0002-graph-seedable-GraphIdentifierGenerator-random.patch`, `tools/oracle/run.sh`.

## Read-set
`tools/oracle/harness/*.java`, `tools/oracle/patches/0001-*.patch`, `tools/oracle/build.sh`,
`ConvertGraphHandler.xtend:120-180`, `GraphIdentifierGenerator.java:40-80,340-370`, `decisions.md#d2`, `#d12`.

## Interface contracts (outputs)
- Case line `{"id","input","mode":"parse-elkj"|"convert"|"parse"}`; `convert` writes `<id>.elkj` (UTF-8 bytes of the
  saved resource). Consumed by T6 and T17.
- System property `org.eclipse.elk.graph.util.identifierSeed` (integer). Consumed by T17.

## Acceptance criteria
- Given any `.elkt` corpus model with duplicate identifiers, when `convert` runs twice, then both `.elkj` outputs are
  byte-identical.
- Given the same model, when `convert` runs without the property (patch inert), then only the `_gNNNN` suffixes may
  differ — and every existing ref regenerates byte-identical after the rebuild (README gate).
- Given a converted `.elkj`, when `parse` runs on it, then the export has the `.elkt` parse mode's JSON shape and the
  graph has the converted identifiers.
- Given a realworld `.json`, when `parse-elkj` runs, then it is read by the `.elkj` language (a lenient-only input,
  e.g. a bare key, parses; the JSON importer would reject it).

## Quality bar / boundaries
Never read OpenJDK/Guava source (AD-9). No change to `layout`/`generate` behaviour. Stop 7 if Xtext ≠ 2.36.0 or
`convert` is not deterministic with the seed.

## Observability
N/A — no new observable operations (tooling only).

## Rollback
Reversible: revert the commit and rebuild the oracle (the patch is inert unless the property is set).
