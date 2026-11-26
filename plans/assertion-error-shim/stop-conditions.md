<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions and push-forward: assertion-error-shim (issue #114)

The queue rules in the system prompt win over this file where they disagree.

## Stop (journal the stop, then act as stated)

1. **AD-13.** An existing test would need a changed expected value other than the fitness row of D4. This includes a test that
   pins the plain `Error` class or the `'AssertionError'` name of a `CyclicLinkingException`. STOP for that site: leave its code
   and the test as they are, file `needs-ruling` naming the test and the rows, and finish the other sites.
2. **Name reader.** An `AbstractScope.ts:159`, `RegionTraceMissingException.ts:23` or other `src/` read of a caught error's `name`
   can receive a `CyclicLinkingException`. D2 then changes observable text. Halt D2's `name` line only, file `needs-ruling` with
   the path, and keep `name = 'AssertionError'` while still extending the shim.
3. **Upstream drift.** `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.layered` lists a
   commit that touches `SplinesMath.java`. Journal it, and port the pin's constructor anyway (D3 measures at the pin).
4. **Write-set.** A file outside the README's table needs a change. Stop that part, file a `follow-up`, and finish the rest.
5. **Decision contradicted.** The Java contradicts a decision. For example, `SplinesMath.java:53-55` does not throw, or
   `CyclicLinkingException` does not extend `AssertionError` in Xtext 2.36.0. Halt with the evidence.
6. **Gates.** The same gate check fails twice after two fix attempts. Halt with the diagnosis artifact in the journal.

## Push-forward (decide, journal, continue)

- The wording of comments, test titles and the journal rows.
- The exact form of the enumeration of hand-built `AssertionError`s, as long as it has a positive control. For example, it can run
  first against the base, where it must find the two `name = 'AssertionError'` sites.
- Which context and reference D1's new test uses to pin the exact message.
- Formatting changes made by prettier in the touched files.
- A new CodeQL finding in a touched line: fix it. Accept it only as a proven false positive, journaled.
