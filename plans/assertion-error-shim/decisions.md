<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: assertion-error-shim (issue #114)

These decisions are locked for this mission. A contradiction found during execution fires stop 5
([stop-conditions.md](stop-conditions.md)).

## D0: what done means

#114's "Done when" applies: "no site in `src/` builds an `AssertionError` by hand, the hierarchy fitness test lists the parent
chain, and the gates pass". Also from #114: "No expected value of an existing test may change (AD-13); a test that pins the old
plain `Error` class is a stop". The fitness row `[CyclicLinkingException, Error]` is the one exception: #114 names its edit (D4).

## D1: DefaultLinkingService throws the shim

**Context.** `DefaultLinkingService.ts:53-60` builds `new Error(msg)` and sets `name = 'AssertionError'`. The Java is
`throw new AssertionError("Scope provider … must not return null …")`, an unconditional `throw`, not an `assert`.
**Decision.** `throw new AssertionError(<the same message template>)`. The comment at `:53` stays (the type excludes null; JS
callers may not). The message text is unchanged.
**Tests.** `DefaultLinkingService.test.ts:64-71` stays as written: it matches `name` and the message, and the shim gives both.
One new `it` asserts that the thrown error is `instanceof AssertionError`, with the exact message for a context and reference of
the test.
**Consequences.** `e.name` and `String(e)` are unchanged. The error is now also `instanceof AssertionError`.

## D2: CyclicLinkingException extends AssertionError and names itself

**Context.** Java `LazyLinkingResource.CyclicLinkingException extends AssertionError` (`LazyLinkingResource.java:62-71`, cited at
`LazyLinkingResourceTypes.ts:47`). The port extends `Error` and sets `name = 'AssertionError'` (`:49-57`). #114 leaves the `name`
as "a behaviour question … check the callers and the ported tests first".
**Decision.** `class CyclicLinkingException extends AssertionError`, with `this.name = 'CyclicLinkingException'` after
`super(detailMessage)`. The `triple` field is unchanged. The class comment drops "whose JS counterpart is `Error`".
**Consequences.**
- `String(e)` changes from `AssertionError: …` to `CyclicLinkingException: …`.
- The error is caught by an `instanceof AssertionError` test, as in Java.
- No caller or test reads the name (see the evidence below).

## D3: SplinesMath gets its private constructor

**Context.** The Java is `private SplinesMath() { throw new AssertionError("Instantiating utility class SplinesMath."); }`
(`SplinesMath.java:51-55`). The port has no constructor, and its class comment (`SplinesMath.ts:54-56`) says why. The Translation
rules ask to keep method boundaries.
**Decision.**
- Port it: `private constructor() { throw new AssertionError('Instantiating utility class SplinesMath.'); }`, with the Java's
  Javadoc ("Private default constructor to prevent instantiating this class.") and `@see SplinesMath.java:53`.
- It is an unconditional `throw`, not `devAssert`. The Java `throw`s, while `HyperEdgeCycleDetector.java:43-44` uses `assert false`
  (which is why that port uses `devAssert`).
- Rewrite the class comment's sentence to say the private constructor is ported and throws.
**Tests.** A new `describe` in `SplinesMath.test.ts` builds the class with
`Reflect.construct(SplinesMath as unknown as new () => object, [])`, as `DrawingUtil.test.ts:100-103` does. It asserts that the
thrown error is `instanceof AssertionError`, with `message` `'Instantiating utility class SplinesMath.'`.
**Consequences.** No caller exists (`grep "new SplinesMath\|extends SplinesMath"`: none), so no layout changes. The constructor
counts as a covered function.

## D4: the hierarchy fitness test lists the parent chain

**Context.** `exception-hierarchy.fitness.test.ts` has the row `[CyclicLinkingException, Error]` (`:110`). Its comment (`:108-109`)
says "neither AssertionError nor Error is shimmed (D10)", and the row comment at `:81-82` is about `AssertionError` itself. The
third case ("puts every Java exception under Exception") skips any row whose parent is JS `Error`. `[CyclicLinkingException, Error]`
is skipped today.
**Decision.**
1. The row becomes `[CyclicLinkingException, AssertionError]`, the edit #114 names.
2. The comment at `:108-109` keeps only `OperationCanceledError`'s reason (`java.lang.Error`, not shimmed, dev-assert D3). A short
   comment on the moved row cites `LazyLinkingResource.java:62-71`.
3. The third case also skips classes in the `AssertionError` family (`cls === AssertionError || cls.prototype instanceof
   AssertionError`), because in Java they are `java.lang.Error`s, outside `Exception`. This loosens nothing: the case checks the
   same set of rows as before, because `CyclicLinkingException` was skipped through its `Error` parent.
4. The case gains one additive assertion: `CyclicLinkingException.prototype instanceof Exception` is `false`. That pins the Java
   fact that a `catch (Exception e)` does not catch it.
**AD-13.** Row 1 is the only changed expected value, and #114 asks for it by name. No other assertion changes.

## D5: docs

`docs/translation-rules.md:670` (the `CyclicLinkingException`, `OperationCanceledError` row) will say that `CyclicLinkingException`
extends the `AssertionError` shim and that `OperationCanceledError` extends JS `Error` (no `java.lang.Error` class, dev-assert D3).
No earlier `plans/` file is edited. T1 runs `grep -rn "AssertionError" docs` and fixes any other sentence that says these sites
build their own stand-in.

## D6: no oracle run, no ref regeneration

This mission changes only the classes of exceptions:
- `SplinesMath`'s constructor has no caller.
- `DefaultLinkingService` throws only for a null scope, which no language's scope provider returns.
- `CyclicLinkingException` is caught by its own class.

No recorder input changes, so gate 7 must show `test/golden/refs/` untouched against the base.

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on 2026-11-24. `next` resolved to #114: it is the
lowest-numbered open `queue:ready` issue, no issue is `queue:planned`, it has no "Blocked by" line, and it has no `needs-ruling`
label.

| Decision | Taken | Rejected | Evidence |
| -------- | ----- | -------- | -------- |
| D2 `name` | `'CyclicLinkingException'` | (a) keep `'AssertionError'`; (b) set no name, which inherits `'AssertionError'` from the shim, so it is the same as (a) | See the evidence list below the table. |
| D3 form | `throw new AssertionError(...)` in a private constructor | (a) `devAssert(() => false)` as `HyperEdgeCycleDetector`; (b) no constructor, keeping the comment | (a) is a different Java construct: `assert false` runs only under `-ea`, while `throw` always runs. (b) is what #114 asks to replace ("or state why not"), and there is no reason not to: the constructor is private, has no caller, and costs no test change. |
| D4 third case | widen the skip to the `AssertionError` family, plus an additive `false` assertion | (a) leave the case as it is, which then fails on the moved row; (b) drop the case | (a) is not possible: the moved row would be checked against `Exception` and fail, though Java agrees it is not one. (b) loosens a fitness function. The widened skip checks the same rows as today (D4.3). |

Evidence for D2:

- Of the 42 `this.name = '…'` sites in `src/`, the 41 other than `CyclicLinkingException` each set their own
  simple class name. They include the shim, the nested `Spacings.UnspecifiedSpacingException`, and `OperationCanceledError`,
  the sibling of `CyclicLinkingException`.
- Java's `Throwable.toString()` prints the runtime class name, not the parent's
  (https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Throwable.html#toString()).
- No test pins the name: the `CyclicLinkingException` assertions are `LazyLinkingResource.test.ts:316-318` and `:337-338`, by
  instance and `triple`.
- The only catch site matches by `instanceof` (`LazyLinkingResource.ts:255`).
