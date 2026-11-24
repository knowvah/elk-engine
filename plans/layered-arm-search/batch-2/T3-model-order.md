<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: model-order comparators (arms 7-17)

## Context

There are 11 arms in the model-order comparators:

- 8 in the two-long-edge path of the node comparator (`handleTwoLongEdges`,
  `ModelOrderNodeComparator.java:384-483`);
- `ModelOrderPortComparator.ts:148 if[1]` (a port without `MODEL_ORDER`);
- `ModelOrderPortComparatorIncoming.ts:157 if[1]` (the reference layer decides on ports that are not both `EAST`);
- `ModelOrderPortComparatorOutgoing.ts:107 if[1]` (an outgoing edge without `MODEL_ORDER`).

7c's random budgets found no input. Guards and leads: [arms.md](../arms.md) § Model-order comparators.

## Method (D4: proof first, then construct)

1. **Elements without `MODEL_ORDER` (arms 15, 17, and 16 if it applies).**
   - List every place that sets `InternalProperties.MODEL_ORDER`: the importer, `copyProperties`, and the
     long-edge splitter.
   - List every `new LEdge`/`new LPort`/`new LNode` in the processors a pipeline runs before
     `SORT_BY_INPUT_ORDER_OF_MODEL` and P3: `CompoundGraphPreprocessor`, `NorthSouthPortPreprocessor`,
     `InvertedPortProcessor`, label and self-loop processors.
   - Each creator that does not copy the property is a constructive lead. A creator that needs a nested graph makes a
     compound `run` row (D1).
   - If every creator copies it, the arm is outcome 3, with the list as the proof.
2. **Arms 7-14.**
   - Instrument a copy of `ModelOrderNodeComparator.java` (D2). At `:384` and `:434`, log the two dummies, their
     feedback flags, the reference nodes and `beforePorts`.
   - Run the order and compound corpus sweeps with scratch output directories (`ORDER_SWEEP_DIR`,
     `COMPOUND_SWEEP_DIR`) and the vendored order inputs.
   - From the log, find which conjunct never holds: same reference node, both source feedback, (source, target),
     (target, source). Construct an input that meets it. 7c's lead: two dummies unconnected to the previous layer and a
     same-reference pair.
   - If a conjunct is excluded by an invariant (for example, `beforePorts` is set only where feedback dummies cannot be
     on one node), that is outcome 3 with the lines.
3. **Arm 16:** a `WEST` port whose incoming edge comes from the same layer, or another way for
   `checkReferenceLayer` to decide on ports that are not both `EAST`. Instrument `ModelOrderPortComparator.java:174`.
4. Screen in TS (a pseudo-row through `runSteps`, with coverage of the arm), then confirm on the oracle with a probe or
   a filtered order recorder build in scratch. Keep the smallest graph per arm.

## Deliverable (report to the orchestrator)

For each of arms 7-17:

- the outcome (D3);
- the inline ELK JSON and the steps of the order row (`scenarios/` or `sites/`, D3) or of the compound `run` row, or
  the proof;
- for outcome 4, the closest approach;
- the instrumented log lines that back it.

Commit-ready files go in `tools/arm-search/model-order/`.

## Write-set

`tools/arm-search/model-order/**`, `$TMPDIR/layered-arm-search/model-order/`.

## Read-set

`J/intermediate/preserveorder/*.java`, `J/intermediate/SortByInputModelProcessor.java`, `J/p3order/*` (callers of the
comparators), `J/graph/transform/ElkGraphImporter.java` (`MODEL_ORDER`); the TS twins under
`src/alg/layered/intermediate/preserveorder/` (read only); `tools/vectors/LayeredOrderVectors.java:60-140` (row and
step format) and `:2081` (`SCENARIOS`); `plans/layered-crossing-min/unreached.md` (7c's attempts).

## Acceptance criteria

- Given each of arms 7-17, when the task ends, then the report gives exactly one outcome with its evidence.
- Given the `MODEL_ORDER` creator list, then every creator before P3 is classified "copies" or "does not copy", with
  `file:line`.
- Given a claimed outcome-1 or outcome-2 input, when the orchestrator replays it on the oracle and in TS, then the arm
  is taken on both sides.

## Observability

N/A. Search logs stay in scratch.

## Rollback

Reversible: new tool files only.
