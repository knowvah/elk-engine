<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — tree-recorder-gaps (issue #66, 2026-11-23)

## Observation: a "no row reaches this arm" claim from an earlier mission was wrong twice

- **Context**: T1 baseline of M-b (`EdgeRouter.java:368`, empty bend list) and M-c (ties in `NodeOrderer.java:250-254`).
- **Finding**: 8a's journal said no pipeline row reaches the `:368` false arm and that ties of out-of-bound constraints were
  unrecorded. Scoped coverage of `MrTreeVectors.test.ts` alone takes the arm 3 times (three `cycle/cycPar` DOWN rows of
  `mrtree-extra.json`), and `orderer/starRangeEdge` holds a tie that kills a tie-reversing mutant. Both were confirmed on the
  oracle or by a mutant before any search started.
- **Impact**: before searching for an input, rerun the landed replay alone with scoped coverage (`--coverage.reporter=json`,
  read `coverage-final.json` per branch arm) and check the claim; an arm attribution made by a scratch agent is not evidence.
- **Confidence**: High

## Observation: `jdb` on the oracle jars answers "did the Java take this line" without a patch

- **Context**: confirming M-b, G1-G4 and M-d on the oracle.
- **Finding**: the oracle jars carry line numbers and local variables. A scratch single-file probe (import ELK JSON, run
  `RecursiveGraphLayoutEngine`), compiled with `javac`, runs under
  `jdb -classpath … -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 Probe <input>` with commands fed from a paced pipe
  (`stop at <class>:<line>`, `run`, then `eval <expr>` and `cont` with a pause between them). `Breakpoint hit` lines count the hits.
  Commands piped without pauses are lost ("Nothing suspended"), and 0.3 s per `cont` undercounted 10 hits as 7; 0.8 s did not.
  A breakpoint on a multi-line condition reports the line of the sub-expression that ran (`:271` for the `if` at `:270-272`).
- **Impact**: an oracle patch or a branch-coverage agent is not needed to attribute a row to a Java line.
- **Confidence**: High

## Observation: a throw probe names the rows that reach an arm

- **Context**: finding which landed rows take an arm, and proving G3 where coverage cannot.
- **Finding**: the port merges two Java copies of the side counters into one function indexed by axis
  (`EdgeRouterSpecialEdges.ts:316-331` for `EdgeRouter.java:265-284`), so v8 coverage cannot say which copy ran. A one-line
  scratch mutant through the mutation harness (`if (<condition>) throw new Error('TAG');` before the statement) makes the
  replay's failure list name every row that reaches it; the harness restores the file.
- **Impact**: use it where a TS arm stands for several Java arms, and to shrink inputs from the rows that already reach an arm.
- **Confidence**: High

## Observation: a comparator mutant that turns a tie's 0 into a positive value cannot be killed under V8

- **Context**: M-c (`compareInts` `a < b ? -1` → `a <= b ? -1`, used negated in one sort).
- **Finding**: the mutant changes only ties (`-0` becomes `+1`). 300,000 seeded arrays of keyed objects with ties sort to the same
  object order under both comparators on node v26.3.1. ECMAScript leaves the order unspecified for an inconsistent comparator,
  so this is a property of V8's sort, not of the language.
- **Impact**: classify such mutants as equivalent on the replay runtime; a mutant that turns a tie into a negative value
  (`: 0` → `: 1` before the negation) is the one that tests tie order.
- **Confidence**: High

## Observation: `RecursiveGraphLayoutEngine` validates no option bounds

- **Context**: M-d needed `spacing.nodeNode < 0`.
- **Finding**: `LayoutOptionValidator` is called only from `core.service` (`DiagramLayoutEngine.java:618`) and `core.ui`. Negative
  spacings and a negative `radial.radius` reach the algorithms through ELK JSON and the oracle lays them out.
- **Impact**: out-of-bound option values are legitimate oracle inputs for arms that need them.
- **Confidence**: High

## Observation: recipes for exact ties in the three tree algorithms

- **Context**: R-c, R-d, V-a, V-b.
- **Finding**:
  - radial: a single child of the root sits on the axis through it. Its `r * sin(π)` offset (about `1.22e-16 * r`) rounds away
    when it is below half an ulp of the coordinate, and a negative RADIUS puts the child on +x. Integer sizes, spacing and
    step keep every contraction step exact. `LEAF_NUMBER` wedges keep a smaller descendant on the axis (`NODE_SIZE` scales
    its wedge). `AbstractRadiusExtensionCompaction.java:140-152` reports no overlap for exactly equal tops or left edges
    (upstream defect, noted on #65).
  - radial polar sorter: only the first level is sorted with radial offset 0 (`PolarCoordinateSorter.java:37`). To kill both
    twins of a comparator mutant the special node must be passed in both argument positions, which depends on the sort's
    comparison sequence: screen list orders under the mutant.
  - vertiflex outlines: a `>` or `>=` tie changes the distance only when both outlines have a horizontal run at the tie Y,
    which needs `spacing.nodeNode = 0`.
  - vertiflex BEND: explicit node margins reach the phases only with `omitNodeMicroLayout`; the bend height differs from the
    router's reference by the child's `margins.top`; siblings share a bend height (minimum), so use one child per row.
- **Impact**: starting points for later mutant rows in these bundles.
- **Confidence**: High

## Observation: the user-level complexity hook reports recorder files

- **Context**: every edit of `tools/vectors/*Vectors.java` by the subagents.
- **Finding**: `~/.claude/hooks/check-complexity.py` reports the recorders' file length (1,530 to 1,759 lines against 500). The
  edits land. The recorders are single-file JDK launchers, and `npm run complexity` covers `src/` only.
- **Impact**: expect the report on recorder edits; it is not the project gate.
- **Confidence**: High
