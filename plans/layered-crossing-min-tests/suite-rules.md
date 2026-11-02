<!-- SPDX-License-Identifier: EPL-2.0 -->

# Porting a Java suite — rules for T4–T8

Read with [decisions.md](decisions.md) (T1, T3, T5, T6, T7) and the [baseline](decisions.md#baseline).

1. **File.** `<JavaName>.test.ts` beside the class under test's TS file, SPDX header, a header comment
   `@see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/<package>/<JavaName>.java`. If the TS file
   would exceed about 1,500 lines, split along the Java file's own comment sections into `<JavaName>.<part>.test.ts`
   and journal the split; the run count is per Java suite.
2. **Setup.** Java `PlainJavaInitialization.initializePlainJavaLayout()` → `beforeAll(() =>
   LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider()))` (7a L5, as in
   `src/alg/layered/LayeredSpacingTest.test.ts`). `@Before` → `beforeEach` building a fresh creator; the test class's
   `extends TestGraphCreator` becomes `let creator: TestGraphCreator` (or the subclass) and `creator.` calls.
3. **Cases.** One `it` per Java `@Test`, in Java order, named by the Java method. `@Parameters` → `describe.each` over
   the same list in the same order, named with the Java pattern (e.g. `'%s'`). `@Ignore` methods → `it.skip` with the
   Java comment as the reason, body ported (it never runs; it keeps the Java test reviewable).
4. **Assertions.** Literals verbatim from the Java test. Graph elements (`LNode`, `LPort`, `LEdge`, `Layer`) by
   identity only: `expect(x).toBe(y)` or `expectSameElements(actual, expected)` (`test/helpers/junit-asserts.ts`);
   never `toEqual` on them. `assertThat(a, is(b))` on numbers or booleans → `toBe`. `assertEquals(msg, …)` keeps the
   message as the `expect` message argument where vitest allows, else as a comment.
5. **Randomness.** Only `MockRandom` (via the creator) or a seeded `Random`. A Java test that draws from an unseeded
   `new Random()` in a way its assertion depends on is stop 8; one that only times or benchmarks is ported as Java has
   it (typically `@Ignore`d).
6. **A failing case.** Never edit the literal, never skip a passing Java test. Stop the case and return a diagnosis
   artifact: mechanism, origin `file:line` (TS and Java), causal chain, what you ruled out with which evidence. The
   orchestrator fixes 7c production code (T7). Do not edit `src/` production files.
7. **Count check.** Before reporting, run the file(s) and confirm passed + skipped equal the baseline runs and
   `@Ignore` count for the suite; report both numbers.
8. **Quality.** `npm run typecheck`, `npx prettier --check <files>`, `npx vitest run <files>` all clean. Do not run
   `npm test`, `npm run coverage`, a JVM job or any `tools/` script; do not commit; do not write `.agent-notes/` or
   `plans/`.
9. **Report** (no preamble): files and case counts per suite (runs, skips); any diagnosis; any push-forward taken
   (TS idiom, overload mapping, split); observations for `.agent-notes/` in the memory template.
