<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — Validator JVM vectors (`graph-text-validate.json`)

**Agent:** java-architect · **Commit:** `test(T4): record elkt validator issues from the jvm`

## Context
`ElkGraphValidator` (T20) and the `IResourceValidator` plumbing (T11) are verified against these recordings
(AD-13, G5): `message`, `severity`, `line` and `code` of every issue must match exactly. Written before any
TS. Scenarios whose outcome depends on the `fixed`, `box` or `random` algorithms (registered by the core-only
oracle, deferred in TS: G3, `src/graph/json/JsonMetaDataConverter.test.ts:30-38`) are tagged
`deferred: "mission5"`; T20 skips them through a named filter whose test fails once mission 5 registers them.

## Task
1. **Read `ElkGraphValidator.xtend` fully** (250 lines; line numbers below refer to it). One scenario per
   `@Check` method and per branch, under `tools/vectors/elkt-validate-scenarios/<check>-<what>.elkt`. Each file
   starts with directive comments the recorder parses: `// @covers <lines>` (required) and optionally
   `// @deferred mission5`. Branch inventory (every item needs ≥ 1 scenario; mark unreachable-from-`.elkt`
   branches in the Java header instead of skipping silently):
   - `checkPropertyKey` (52-58): unknown key → warning `'<id>' is not a layout option.` on the key feature;
     known key by full id and by suffix; the message uses `entry.key.id`.
   - `checkPropertyValue` (60-122):
     - unknown option → nothing more (line 63); container kinds `ElkNode` / `ElkEdge` / `ElkPort` / `ElkLabel`
       (66-75) with an option applicable and not applicable to each (`checkOptionTarget`, 131-135: message
       `The layout option '<id>' is not applicable to <nodes|edges|ports|labels>.`, code `OPTION_NOT_APPLICABLE`,
       `IssueCodes.xtend:7`); `NODES` vs `PARENTS` targets on a leaf and on a parent node (68); a property
       whose container is an `ElkEdgeSection` (not an `ElkGraphElement`, so lines 65-80 are skipped but 81-120
       run) and on the root node.
     - algorithm support (76-79, `checkAlgorithmSupport` 137-154 and `ElkGraphTextUtil.getAlgorithm`
       `ElkGraphTextUtil.xtend:23-48`): algorithm taken from the node, port (`parent.parent ?: parent`), edge
       (`containingNode`), label chain; option known / unknown to the algorithm; an ancestor that knows it
       (`foundMatch`, 143-148); **the quirk to record, not fix:** the loop reassigns `algorithm` (145), so when
       the last ancestor has no algorithm the message at 150 dereferences null; whatever the JVM does (an
       exception reported by Xtext's check wrapper) is the vector. These all need an algorithm in the core-only
       registry, i.e. `fixed`/`box`/`random` → tag `deferred: "mission5"`.
     - value handling (81-103): a `LayoutOptionProxy` that resolves (`entry.value = value`, line 101: record the
       value class before and after in the row) and one that does not, for each `option.type` branch
       (`STRING`, `BOOLEAN`, `INT`, `DOUBLE`, `ENUMSET`, default with and without `optionClass`):
       `Expected value of type <String|Boolean|Integer|Double|EnumSet|<optionClass.simpleName>>.` (156-158).
       Pick CoreOptions options of each type (read `LayoutMetaDataService`'s option list in the core-only
       registry); a `null` value (`value === null` skips 104-120).
     - `LayoutOptionValidator.checkProperty` (104-114; `LayoutOptionValidator.java:60-98`): type mismatch
       (`does not match the type`), below lower bound, above upper bound, within bounds; `ERROR` and `WARNING`
       severities map to `error`/`warning` on the value feature.
     - `CoreOptions.ALGORITHM` (115-119): unknown algorithm → `No layout algorithm with identifier '<v>' can be
       found.`; suffix and full-id forms of a known one (`fixed`; tag deferred); a non-string `algorithm` value.
   - `checkUniqueProperties` (160-176) and `propertyAlreadyAssigned` (178-181): a key twice, three times,
     interleaved with other keys, same option via suffix and full id, unknown keys twice (`Property` equality),
     on node/port/label/edge/section; message `Property is already assigned.` on the key feature of **each**
     duplicate (both first and later ones; the 3rd occurrence is the `usedProperties.put(property, null)` path).
   - `checkUniqueNames` (183-204) and `nameAlreadyUsed` (206-212): duplicate identifiers among nodes, ports,
     labels, edges, and edge sections inside one container (mixed kinds too), three-way duplicates, null
     identifiers ignored (unnamed edges/labels), duplicates at different nesting levels (no error); message
     `Identifier is already used.` on `identifier` of each offender.
   - `checkEdgeContainer` (214-225; `ElkGraphUtil.findBestEdgeContainment`, `org.eclipse.elk.graph/…/ElkGraphUtil.java:334`):
     edge in its best container (no issue); declared too deep or too shallow → `This edge should be declared in
     the root node of this graph.` / `This edge should be declared in node <id>.` (warning, no feature: line of
     the edge); endpoints with no common container; the empty sources/targets branch (216) is unreachable from
     `.elkt` (grammar needs ≥ 1) — note it in the header.
   - `checkEdgeSection` (227-248): incoming/outgoing shape that is not a source/target (error text with
     `incomingShape.eClass.name` = `ElkNode`/`ElkPort` and its identifier), shape that is an unresolved proxy
     (skipped, 231/240), `incomingSections`/`outgoingSections` non-empty together with a shape (235/244, text
     `An edge section cannot be connected to an <class> and other sections at the same time.`), valid cases.
   - Plus: a scenario with syntax errors and one with linking errors, so the recorded `issues` show how
     `ResourceValidatorImpl` folds parser/linker diagnostics (`validation/ResourceValidatorImpl.java`) into the list.
2. **`tools/vectors/ElktValidateVectors.java`** (self-contained, schema in the header). First statement
   `LayoutMetaDataService.getInstance(new ClassLoader(null) { })`. Load each scenario like
   `ElkModelReader.java:44-64`, then
   `resource.getResourceServiceProvider().getResourceValidator().validate(resource, CheckMode.ALL, CancelIndicator.NullImpl)`.
   Per case record `{id, input, covers, deferred?, issues:[{severity, message, line, code}], mutations:[{path,
   key, valueClassBefore, valueClassAfter}]}` where `severity` is `error|warning|info`, `line` =
   `Issue.getLineNumber()` (1-based), `code` = `Issue.getCode()` or `null`, and `mutations` lists property
   entries whose value changed class during validation (proxy resolution, line 101). Check execution order of
   `@Check` methods per object comes from `getDeclaredMethods` (`AbstractDeclarativeValidator.java:181-236`) and
   is not specified by the JVM: record `issues` sorted by `(line, severity, code ?? "", message)` and journal
   whether two runs also agree in raw emission order.
3. Output `<outDir>/graph-text-validate.json`: `{ elkCommit, xtextVersion, registry: "core", cases: [ … ] }`,
   one compact case per line, cases sorted by id, trailing newline. Run twice; byte-identical.

## Write-set
`tools/vectors/ElktValidateVectors.java`, `tools/vectors/elkt-validate-scenarios/*`,
`test/golden/refs/java/graph-text-validate.json`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/`: `validation/ElkGraphValidator.xtend:1-250`, `validation/IssueCodes.xtend`, `ElkGraphTextUtil.xtend:23-48`
- `org.eclipse.elk.core/src/org/eclipse/elk/core/validation/{LayoutOptionValidator,GraphIssue}.java`, `data/LayoutAlgorithmData.java:125-127`
- `org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java:300-380`
- `tools/oracle/harness/ElkModelReader.java:44-64`, `tools/vectors/GraphJsonVectors.java:1-40`
- Xtext 2.36.0 EPL source: `validation/{AbstractDeclarativeValidator,ResourceValidatorImpl,Issue,CheckMode}.java`

## Decisions
- [G5](../decisions.md#g5--diagnostic-fidelity), [G3](../decisions.md#g3--option-registry-for-refs), [G7](../decisions.md#g7--evidence-layout)
- AD-13; C8 for the core-only registry (`plans/core-metadata/decisions.md`)

## Interface contract (consumed by T11, T20, T22)
`graph-text-validate.json` as in step 3. `deferred: "mission5"` rows are skipped by T20's named filter; every
other row must match exactly (T20 sorts its issues with the same key).

## Acceptance criteria
- Given `ElkGraphValidator.xtend`, then every `@Check` method (52, 60, 160, 183, 214, 227) and every branch
  listed above has a scenario whose `@covers` cites its line range; unreachable branches are listed in the header.
- Given the algorithm-dependent scenarios, then each carries `deferred: "mission5"` and nothing else does.
- Given the proxy scenarios, then `mutations` shows the value class change at line 101.
- Given two runs of `elkt-vectors.sh`, then `graph-text-validate.json` is byte-identical; existing refs unchanged.

## Quality bar
README gates; lizard clean on the Java (≤ 500 lines, CCN ≤ 10; data lives in scenario files).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No OpenJDK/Guava/ANTLR-runtime source. Do not edit `elkt-vectors.sh`, other tasks' programs or any existing
ref. Do not "fix" the line-145/150 quirk or any other validator oddity in the recorder. Agents never commit;
the orchestrator commits per task.
