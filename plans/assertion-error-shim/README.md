<!-- SPDX-License-Identifier: EPL-2.0 -->

# assertion-error-shim: mission brief (issue #114)

## Objective

Mission `dev-assert` (#45) added `src/java/lang/AssertionError.ts` (`class AssertionError extends Error`, `name = 'AssertionError'`,
constructor `(detailMessage?: string)`; dev-assert D3). Three older sites still stand in for `java.lang.AssertionError` by hand.
This mission moves all three onto the shim, as #114 asks:

1. `src/xtext/linking/impl/DefaultLinkingService.ts:53-60` builds a plain `Error` and sets `name = 'AssertionError'` for a null
   scope. It will throw `new AssertionError(message)` ([D1](decisions.md#d1-defaultlinkingservice-throws-the-shim)).
2. `src/xtext/linking/lazy/LazyLinkingResourceTypes.ts:43-57`, `CyclicLinkingException extends Error` with
   `name = 'AssertionError'`. It will extend `AssertionError` (Java `LazyLinkingResource.java:62-71`), with `name` set to the
   class name ([D2](decisions.md#d2-cycliclinkingexception-extends-assertionerror-and-names-itself)).
3. `src/alg/layered/p5edges/splines/SplinesMath.ts` has no constructor (class comment `:54-56`). The Java private constructor
   (`SplinesMath.java:53-55`) throws `new AssertionError("Instantiating utility class SplinesMath.")`. It will be ported as a
   `private constructor()` with that throw ([D3](decisions.md#d3-splinesmath-gets-its-private-constructor)).

`test/architecture/exception-hierarchy.fitness.test.ts` will then list the Java parent chain
([D4](decisions.md#d4-the-hierarchy-fitness-test-lists-the-parent-chain)).

Exit (#114, "Done when"):

- No file in `src/` other than `src/java/lang/AssertionError.ts` builds an `AssertionError` by hand. That means no
  `name = 'AssertionError'` assignment, and no `Error` that stands in for one. An `ast-grep` and `grep` enumeration in the journal,
  with a positive control, shows it.
- The fitness test has the row `[CyclicLinkingException, AssertionError]`, and its comments no longer say that `AssertionError`
  is not shimmed.
- No expected value of an existing test changes, apart from the fitness edit that #114 names (D4). New assertions are additive.
- Queue gates 1-7 are green and journaled. There is one squashed commit on the base, with `Refs: #114`. `plans/roadmap.md` gains
  `## Revision <date> (assertion-error-shim)`.

**Not in this mission:**

- `OperationCanceledError` (Java parent `java.lang.Error`) keeps `extends Error`. dev-assert D3 rules out a `java.lang.Error`
  class (YAGNI).
- Any change to `devAssert`, to `AssertionError.ts`, or to a site that already uses the shim.
- Any change to a ref, vector, golden, oracle patch or `ELK_COMMIT`, and any edit to an earlier `plans/` file (they are
  archaeology).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md) and
   `.agent-notes/assertion-error-shim-planning.md`. Then run `gh issue view 114 --comments`.
3. Check that `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed, run
   `git add plans/assertion-error-shim .agent-notes/assertion-error-shim-planning.md`, then
   `git -c commit.gpgsign=false commit -m "docs(plans): add assertion-error-shim mission brief"`. Record the squash base in the
   journal. That is the driver's base if the prompt names one; otherwise it is that commit's parent (`d8a1acc0` at planning).
4. Oracle: none is run (D6). Journal the state of `oracle-build.json` anyway, and the output of
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.layered` (stop 3).
5. Baseline: see the journal's `plan` row. Rerun it only if the base sha differs from `d8a1acc0`.
6. Find the first task in [batch-1/overview.md](batch-1/overview.md) marked `[ ]` and resume there.

## Blast radius

- **Data model and API contracts.** None of the three classes is exported from `src/index.ts`, so the public surface is
  unchanged (`docs/architecture/public-api.md`). Two things change:
  - `String(e)` and `e.name` of a `CyclicLinkingException` change from `AssertionError` to `CyclicLinkingException`.
  - A `CyclicLinkingException` is now `instanceof AssertionError`, as in Java.
- **Who could see those changes.** No `src/` code reads them: the one catch site tests `instanceof CyclicLinkingException`
  (`LazyLinkingResource.ts:255`), and no `src/` code tests `instanceof AssertionError`. The two places where `src/` prints the
  name of an error it caught are `AbstractScope.ts:159` and `RegionTraceMissingException.ts:23`. T1 shows that neither can
  receive a `CyclicLinkingException`.
- **Service dependencies.** None.

| File | Action | Task |
| ---- | ------ | ---- |
| `src/xtext/linking/impl/DefaultLinkingService.ts` | Modify (`:53-60`, import) | T1 |
| `src/xtext/linking/impl/DefaultLinkingService.test.ts` | Modify (one additive `it`) | T1 |
| `src/xtext/linking/lazy/LazyLinkingResourceTypes.ts` | Modify (`:43-57`, import) | T1 |
| `src/xtext/linking/lazy/LazyLinkingResource.test.ts` | Modify (additive assertions in a new `it`) | T1 |
| `src/alg/layered/p5edges/splines/SplinesMath.ts` | Modify (class comment `:54-56`, constructor, import) | T1 |
| `src/alg/layered/p5edges/splines/SplinesMath.test.ts` | Modify (one additive `describe`) | T1 |
| `test/architecture/exception-hierarchy.fitness.test.ts` | Modify (`:81-83`, `:108-110`, the `Exception` case) | T1 |
| `docs/translation-rules.md` | Modify (row `:670`) | T1 |
| This mission's journal, the README's batch table and summary | Modify | T1, T2 |
| `plans/roadmap.md` (appended section), `.agent-notes/assertion-error-shim.md` | Modify / Create | T2 |

No package, env var or database change.

## Quality gates

- After T1, run `npm run typecheck`, `npx prettier --check <changed files>` and the scoped suite:
  `npx vitest run test/architecture/exception-hierarchy.fitness.test.ts src/xtext/linking src/alg/layered/p5edges/splines/SplinesMath.test.ts src/java/lang`.
  At planning it ran 44 files and 428 tests; after T1 the counts are the same or higher, with new tests only.
- T2 runs queue gates 1-7 ([T2](batch-1/T2-close-out.md)). Start `npm run coverage` detached with `nohup ... ; echo "exit $?"`
  and poll it for at most 9 minutes at a time.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likeliest to fire is stop 1: an existing assertion that pins the old plain
`Error` class or the `'AssertionError'` name of a `CyclicLinkingException`. Planning found none.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Migrate the three stand-ins; gates, roadmap and squash | T1, T2 | — | [x] |

## Execution model

Recommended executor: `fable`. The orchestrator owns both tasks, every commit and every `gh` call. There are no subagents: the
work is about eight small edits in files that depend on one another (the fitness test imports all three classes).

**Time:** about 1 h 15 min: 30 min for T1, and 45 min for T2, most of it the coverage run.

## Landing

1. Tag the tip `assertion-error-shim/pre-squash`.
2. Run `git reset --soft <base>`, then make one commit with `git -c commit.gpgsign=false commit -F <file>`, using T2's message.
   The footer is `Refs: #114`, with no attribution lines.
3. Never push.

## Reference

- [decisions.md](decisions.md) holds D0-D6 and the auto-confirmed record.
- [diagrams/component-map.md](diagrams/component-map.md) and [diagrams/data-flow.md](diagrams/data-flow.md).
- Precedents:
  - `plans/dev-assert/decisions.md` D3 (the shim's parent).
  - `src/alg/layered/p5edges/orthogonal/HyperEdgeCycleDetector.ts:19-32`: a ported private constructor. Its Java is
    `assert false`, so it uses `devAssert`; `SplinesMath`'s Java uses `throw` (D3).
  - `src/alg/rectpacking/util/DrawingUtil.test.ts:100-103`: a hidden constructor tested through `Reflect.construct`.

## Mission summary (2026-11-25)

Completed 2026-11-25: 2 of 2 tasks. No halt. One gate rerun (coverage, a wall-clock timeout under machine load).

- **Result.** No file in `src/` other than `src/java/lang/AssertionError.ts` builds an `AssertionError` by hand, and no plain
  `Error` stands in for one. The enumeration and its positive control are in [decision-journal.md](decision-journal.md) (the
  T1 `evidence` and `gate` rows).
- **Landed.**
  - `DefaultLinkingService` throws the shim, with the same message (D1).
  - `CyclicLinkingException extends AssertionError`, with `name = 'CyclicLinkingException'` (D2).
  - `SplinesMath` has its private constructor with the Java `throw` (D3).
  - The fitness test has the row `[CyclicLinkingException, AssertionError]`, the family skip and the additive `false`
    assertion (D4). The `docs/translation-rules.md` row is updated (D5).
  - Four additive tests. The fitness row is the only changed expected value.
  - The roadmap revision, `.agent-notes/assertion-error-shim.md`, and a comment on #114 (labels unchanged).
- **Not as planned.**
  - **A fourth site.** `LazyLinkingResource.getDiagnosticList` threw a plain `Error` where `LazyLinkingResource.java:423`
    throws an `AssertionError`. The brief's searches look for the name and could not find it; the Java enumeration did. It is
    migrated like D1, in `src/xtext/linking/lazy/LazyLinkingResource.ts`, a file outside the README's table. Its `name` changes
    from `Error` to `AssertionError`; no shipped language reaches the arm.
  - More name readers exist than the two the brief lists (`ExceptionDiagnostic.ts:33`, the validator logs and others). None
    can receive a `CyclicLinkingException`, so stop 2 did not fire.
  - The first coverage run failed on one timeout (`phase-sweep.test.ts`, 933 s against 900 s, `mismatches=0`, load 57 to
    141). The rerun passed with nothing changed.
- **Decisions.** D0-D6 as planned. One deviation (the fourth site) and one diagnosis of a fixture fault in a new test
  (`DiagnosticMessage` rejects `INFO`; the test uses `IGNORE`).
- **Gates.** Queue gates 1-7 green:
  - format, typecheck and complexity (no violation);
  - coverage: 1,257 files, 51,947 tests, 98.85 / 97.02 / 98.63 / 98.9;
  - docs build, and CodeQL with no new accepted entry;
  - `test/golden/refs/` untouched against the base.
- **Open.** #180 (`follow-up`): the constructor of `InternalNodeModelUtils` omits the Java `throw new AssertionError()`. It
  builds no stand-in, so it is outside #114. No `needs-ruling` issue was filed.
