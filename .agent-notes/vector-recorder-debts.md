<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: vector-recorder-debts (issue #50, 2026-11-21)

Journal: `plans/vector-recorder-debts/decision-journal.md`. Follow-ups: #143 (split the other recorders), #144 (the
values `dumpLGraph` still leaves as `{ class }`).

## Observation: the pin fitness test fixes the shape of a launch wrapper

- **Context**: T1, routing the three `java` launches of `tools/vectors/vector-cache.sh` through a helper.
- **Finding**: `test/architecture/elk-pin.fitness.test.ts` counts the lines of `vector-cache.sh` that match
  `java\s+-<option>` (3) and requires `-Delk.commit=` on each. A helper with its own argument order
  (`launch <program> <cp> …`) leaves no such line, and the test's expected count may not change (AD-13). So `jp_run` of
  `tools/vectors/java-program.sh` takes the source-launcher command line itself: `jp_run java -Delk.commit=… -cp "$cp"
"$program" …`. A single-file program runs `"$@"` unchanged, which also makes "the argv is word for word as before"
  true by construction.
- **Impact**: any new launch site writes the plain `java …` line and prefixes it with `jp_run`. `jp_run` reads JVM
  options as one word each, except `-cp`/`-classpath`/`--class-path`.
- **Confidence**: High

## Observation: recorders tell their own stack frames from ELK's by class-name prefix

- **Context**: T4, before naming the helper classes of `LayeredLoopsVectors`.
- **Finding**: `elkFrame` returns "not thrown inside ELK" at the first stack frame whose class name
  `startsWith("LayeredLoopsVectors")`. A helper class under any other name would let an exception thrown by recorder code
  that ELK calls (the plan listener, the label manager, a lambda) be recorded as an oracle throw with an ELK `frame`.
  Nine other recorders hold the same test with their own name (`DiscoVectors`, `ForceVectors`, `LayeredCompoundVectors`,
  `RectPackingVectors`, `RadialVectors`, `MrTreeVectors`, `VertiFlexVectors`, `SporeLayoutVectors`,
  `TopdownPackingVectors`). The brief's known trap was only the binary name `LayeredLoopsVectors$ShrinkWidthManager`
  in the ref.
- **Impact**: every helper class of a split recorder is named `<Recorder><Section>`. Grep a recorder for
  `getClassName()`, `getName()` and `getClass()` before cutting it.
- **Confidence**: High

## Observation: a chain of superclasses keeps a split recorder's static initialization order

- **Context**: T4. The single file had about 60 static fields, several initialized by calls (`gj(…)`, `ints(…)`,
  `graphs(…)`), spread over 4,300 lines, and code everywhere that names them without a qualifier.
- **Finding**: with the helpers declared as one chain of superclasses in the file's order, ending in the entry class,
  the JVM initializes them root first (JLS 12.4.1), which is the single file's textual order, before `main`; and every
  inherited static member and member type still resolves unqualified. The cut of 3,983 body lines needed 123
  insertions, all at positions `javac` reported: 77 `LayeredLoopsVectors.` (the nested classes and constants that stay
  in the entry), 6 references to a later helper, and 40 `()` because a record's private component field is visible
  only inside the top-level class that declares the record (`s.id` becomes `s.id()` in another file). Scopes only
  shrink, so a name either resolves to the same member or fails to compile.
- **Impact**: the method for #143. It was done with a throwaway script: copy line ranges verbatim into the helper files
  (imports filtered by use), compile, read each `cannot find symbol` and `has private access` error, insert the
  qualifier or `()` at the caret, repeat (three rounds); then prove the result by comparing the reassembled bodies with
  the original (insert-only differences). The ref (1,627 rows) and the sweep (3,073 cases) were byte-identical on the
  first cut.
- **Confidence**: High

## Observation: what differs between the source launcher and a `javac` build of the same recorder

- **Context**: T4 and T5, `LayeredLoopsVectors` (pinned to `-XX:hashCode=2`) run both ways on the same oracle.
- **Finding**: no recorded byte differs: `layered-loops.json`, the sweep's `results.jsonl` and four `--dump` files are
  equal. On stderr, an exception that leaves `main` prints five more frames at the bottom of its trace under the
  `javac` build (the launcher cuts the trace), and javac's own `Picked up JAVA_TOOL_OPTIONS` banner appears once more.
  `javac` of the 11 files takes 1.2 s; the recorder's cold run took 17 s single-file and 18 s multi-file.
- **Impact**: a watcher or test that counts stderr lines of a multi-file recorder sees one more banner. The compile
  needs no cache.
- **Confidence**: High

## Observation: `dumpLGraph` leaves five more classes as `{ class }`

- **Context**: T3, instrumenting `dumpWithPropertyValues` (`test/helpers/layered-site-replay-dump.ts`) after
  `dumpLGraph` learned `KVectorChain`.
- **Finding**: over the 62 test files that import a `layered-site-replay*` helper (10,038 tests) the module still
  patches `Random` 1,870 values, `Spacings` 1,870, `LayeredLabelsVectors$ShrinkWidthManager` 170, `LayoutOptionProxy`
  28 and `LPort` (outside the dumped graph) 8; `KVectorChain` 0 (2,307 before, on the 56 direct importers). Planning
  expected only `KVectorChain` and listed 10 importers; `grep` finds 56.
- **Impact**: the patch module stays (#144). A count of importers taken from one `grep` pattern at planning is a lower
  bound.
- **Confidence**: High

## Observation: a `LayoutOptionData` stub with an array default must freeze it

- **Context**: T2, a recorder test that registers an `OBJECT` option with the default `[1, 2]`.
- **Finding**: `getDefault` clones the default through `ElkReflect`, and a plain array fails with "Couldn't clone
  property"; `Object.freeze([...])` passes, which is what the generated provider does for an Xtend `#[…]` literal.
  `JavaClass` has no `List` member: use `javaInterface('List')`.
- **Impact**: test fixtures for list-valued options.
- **Confidence**: High (reported by the T2 subagent, test green)

## Observation: the loops sweep dir was stale at the base

- **Context**: T1 step 1, taking the before-side of the loops sweep.
- **Finding**: `loops-sweep.sh` without `--force` did not print "fresh": the oracle had been rebuilt with patch 0004
  after the directory's stamp (#139 describes the same staleness for the corpus sweep cache). The run at the base
  (3,073 results) became the before-side.
- **Impact**: take a before-side by running the sweep, never by copying the directory.
- **Confidence**: High
