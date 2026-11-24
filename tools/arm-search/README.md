<!-- SPDX-License-Identifier: EPL-2.0 -->

# Arm search (issue #59)

Tools of the constructive search for the 25 branch arms that mission 7h left unreached
(`plans/layered-compound/unreached.md` § Open; brief `plans/layered-arm-search/`). They are test tooling: nothing here
is imported by `src/`, and nothing here changes the oracle.

## The arms

`arms.json` lists the 25 arms by group (`north-south`, `model-order`, `barycenter`): the TypeScript file, the line where
the branch starts, and the v8 arm (`if[0]` the consequent, `if[1]` the alternative, `binary-expr[k]` the k-th operand),
keyed as `tools/vectors/compound-site-arms.mjs` keys arms.

## Outcomes

Each arm ends with exactly one outcome:

1. **Reached through layout.** An order row whose steps are `importGraph`, `normalise`, real phases and the processors a
   pipeline runs, in `IntermediateProcessorStrategy` order up to the stop; or a compound `run` row (a full layout of an
   inline graph).
2. **Reached by site scenario only.** An order row whose steps build state (`layers`, `setProperty`, `reverseEdge`, a
   processor out of pipeline order). The record says whether a real layout could produce that state.
3. **Proven dead.** An argument from the Java text, with lines and the invariant that excludes the arm. A proof that
   rests on JVM sort order, hash order or float rounding says so, and must hold for the port as well.
4. **Unreached, not proven dead.** The budget is spent; what was tried and the closest approach are recorded.

## Rules

- The oracle worktree (`$ELK_ORACLE_DIR`), its jars and `$ELK_SOURCE_DIR` are only read. Instrumentation is a copy of a
  Java source in a scratch directory, compiled and put in front of the oracle jars on the classpath. An instrumentation
  patch kept here (`<group>/instrument/*.patch`) is not an oracle patch (AD-3); `instrument.sh apply` applies it to a
  scratch copy and nowhere else.
- Scratch output goes under `$TMPDIR/layered-arm-search/<group>/`. Corpus sweeps with instrumented classes write to a
  scratch directory, never to `test/corpus/.order-sweep` or `.compound-sweep`.
- A JVM sweep or recorder starts through `instrument.sh run`, which waits while the 1-minute load is above 12 and runs
  under `nice -n 10`. `instrument.sh probe` is for a single-graph probe of a few seconds.
- Probes are single-file `java` programs under `$TMPDIR`. They are not committed; the journal quotes their output.
- Generators are TypeScript (`npx tsx`), take an explicit seed and write candidates as JSON. Only the generators,
  scripts and instrumentation patches that produced a recorded row, or that back a proof or an outcome-4 record, are
  kept here.

## Scripts

| Script                                                          | Use                                                                                                                                                   |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coverage.sh [<test files>...]`                                 | Counts of the 25 arms under the landed evidence (default: every layered replay suite and ported JUnit suite). One v8 coverage run over the arm files. |
| `arm-counts.mjs <coverage-final.json>`                          | The counts of the 25 arms in a v8 coverage report.                                                                                                    |
| `screen.sh [--each] <candidates.json> [<id>]`                   | The TypeScript screen: replays candidates through the replay helpers (`screen.spec.ts`) and prints the arms they take.                                |
| `instrument.sh copy\|diff\|apply\|build\|classpath\|probe\|run` | Scratch instrumentation of the oracle and JVM runs on the instrumented classpath. Usage: the script's header.                                         |

## Screening a candidate in TypeScript

A candidates file is a JSON array (format: the header of `screen.spec.ts`):

```json
[
  {
    "id": "a",
    "kind": "order",
    "elk": { "id": "root" },
    "target": null,
    "steps": [["importGraph", null], ["normalise"]]
  },
  { "id": "b", "kind": "compound", "elk": { "id": "root" }, "options": {} }
]
```

An `order` candidate is a step row of `tools/vectors/LayeredOrderVectors.java` (steps: its header), replayed by
`runSteps` as `LayeredOrderVectors.test.ts` replays a `scenarios` or `sites` row. A `compound` candidate is a `run` row
of `SITE_ROWS` in `tools/vectors/LayeredCompoundVectors.java` (a full layout through the recursive engine), replayed by
`runRow` as `LayeredCompoundSites.test.ts` replays one.

```sh
tools/arm-search/screen.sh --each "$TMPDIR/layered-arm-search/<group>/candidates.json"
```

It prints every arm of `arms.json` with a non-zero count, per candidate with `--each`, and writes `results.jsonl` (the
final layers of an order candidate, the layout of a compound one, or the error) to a scratch directory.

## Confirming a candidate on the oracle

1. Copy the Java source that holds the arm, add a `System.err.println` in the arm, and build:

   ```sh
   scratch="$TMPDIR/layered-arm-search/<group>"
   tools/arm-search/instrument.sh copy "$scratch/src" org.eclipse.elk.alg.layered.p3order.ForsterConstraintResolver
   # edit the copy, then keep the change as a patch beside the generator that uses it:
   tools/arm-search/instrument.sh diff "$scratch/src" >tools/arm-search/<group>/instrument/forster.patch
   tools/arm-search/instrument.sh build "$scratch/src" "$scratch/classes"
   ```

2. Run the candidate with the instrumented classes in front of the oracle jars. A full layout of an ELK JSON file needs
   only a single-file probe that calls `RecursiveGraphLayoutEngine`:

   ```sh
   tools/arm-search/instrument.sh probe "$scratch/classes" "$scratch/LayoutProbe.java" candidate.json
   ```

   A step row runs through a scratch copy of the order recorder with the candidate appended to its `SCENARIOS`:

   ```sh
   ORDER_FILTER=sites/MyCandidate tools/arm-search/instrument.sh run "$scratch/classes" \
     "$scratch/LayeredOrderVectors.java" "$scratch/out" tools/vectors
   ```

3. A corpus sweep that logs a guard's inputs:

   ```sh
   tools/arm-search/instrument.sh run "$scratch/classes" tools/vectors/LayeredOrderVectors.java \
     --sweep "$ELK_MODELS_DIR" "$scratch/order-sweep" 2>"$scratch/order-sweep.log"
   ```

A candidate that takes its arm in both places is recorded by appending it to the recorder (`SCENARIOS` of
`LayeredOrderVectors.java`, `SITE_ROWS` of `LayeredCompoundVectors.java`) and regenerating the ref by script, with the
row's arms in an arm table that `tools/vectors/compound-site-arms.mjs` checks row by row.

## State of the rows

The ten rows of the 17 reached arms were recorded and replayed, and are withheld: three existing tests pin exact lists of
row ids that the rows join, and extending those lists waits for the ruling on issue #156.
`plans/layered-arm-search/withheld/record-rows.patch` holds the recorder entries, the arm tables, the flags that let
`compound-site-arms.mjs` check the order rows, and the list extensions. The outcome of each arm is in
`plans/layered-compound/unreached.md` § "Search outcomes (issue #59, layered-arm-search)".
