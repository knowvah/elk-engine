<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions and push-forward: self-loop-assert-arms (issue #115)

The queue rules in the system prompt win over this file where they disagree.

## Stop (journal the stop, then act as stated)

1. **AD-13.** An existing test, golden, vector or sweep row depends on one of the six throws, for example by expecting
   an `Error` or one of the messages. STOP for that row: leave its code and the test as they are, file `needs-ruling`
   naming the test and the row, and finish the other rows.
2. **Counter-example mismatch.** D5 finds a valid graph that reaches an arm, and the oracle's output for it (run without
   `-ea`, `tools/oracle/run.sh`) differs from the port's after the change. Diagnosis mode applies. If the mechanism lies
   outside the three files, stop that row, file a `follow-up` with the diagnosis artifact, and finish the rest.
3. **Upstream drift.** `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.layered`
   lists a commit that touches `OrthogonalSelfLoopRouter.java`, `RoutingDirector.java`, `SelfHyperLoop.java` or
   `SelfLoopType.java`. Journal it and keep porting the pin (AD-2).
4. **Write-set.** A file outside the README's table needs a change, such as a caller of a widened signature in another
   directory. Journal it. If the change is a type-only edit in `src/alg/layered/intermediate/loops/`, make it and journal
   it. Otherwise stop that part, file a `follow-up`, and finish the rest.
5. **Decision contradicted.** The Java at the pin contradicts a decision. For example, an arm is not followed by the
   statement D1 names, or `SelfLoopType.fromPortSides` accepts `UNDEFINED`. Halt with the evidence.
6. **Gates.** The same gate check fails twice after two fix attempts. Halt with the diagnosis artifact in the journal.

## Push-forward (decide, journal, continue)

- The local form of D3's null check at the `switch` of `determineThreeSideLoopRoutes`, within D3's limits.
- How each test reaches a private method (a typed view, `vi.spyOn` on the prototype), and the fixtures it builds.
- Whether row 105's spy observes `assignLeftmostRightmostPorts` or the `setLeftmostPort` calls it makes, as long as the
  test pins `(null, null)` as the Java passes it.
- The wording of comments, test titles and journal rows.
- Formatting changes made by prettier in the touched files.
- A complexity split forced by a touched function, following the file's existing helper-split pattern (dev-assert D5.6).
- A new CodeQL finding on a touched line: fix it. Accept it only as a Java-faithful quirk or a proven false positive,
  journaled.
