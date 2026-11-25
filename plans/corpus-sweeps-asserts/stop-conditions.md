<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions and push-forward: corpus-sweeps-asserts (issue #116)

The queue rules in the system prompt win over this file where they disagree.

## Stop (journal the stop, then act as stated)

1. **Java-faithful site.** The oracle under `-ea` throws the same `AssertionError` at the same line (D4). Stop that
   site: put it back to a comment naming a new `needs-ruling` issue (#112's form), then finish the rest.
2. **AD-13.** A sweep, test, golden or vector can go green only by changing its expected value, its pass rule or a
   recorded ref, or by wrapping cases with assertions off. STOP for those rows: leave them as they are, file
   `needs-ruling` naming the rows, and finish the rest.
3. **A port defect outside reach.** A site fires, the oracle does not throw, and the mechanism is outside the site's
   directory or its fix would change an expected value. Put the site back to a comment naming a `follow-up` issue that
   carries the full diagnosis artifact, then finish the rest. A fix without a stated mechanism is a halt.
4. **A sweep cannot run.** It skips, or fails for a reason that is not an assert (a non-`AssertionError` mismatch, a
   crash, a timeout). Refresh it only through its script (D5). If it still cannot run: journal it, file a `follow-up`,
   and finish the other sweeps. If it is red without assertions as well (`ELK_DEV_ASSERTIONS=off`), the baseline is
   red: halt.
5. **Write-set.** A file outside the README's table needs a change. Journal it. If the change is within D4's fix rule
   (the site's directory, no expected value changes), make it. Otherwise stop that part and file a `follow-up`.
6. **Gates.** The same gate check fails twice after two fix attempts. Halt with the diagnosis artifact in the journal.
7. **Oracle drift.** `oracle-build.json` does not name `8bca22f4…` with patches 0001-0004, or
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/` is not empty. Rebuild with
   `tools/oracle/build.sh` and journal it (queue rules), or journal the drift and keep using the pin.

## Push-forward (decide, journal, continue)

- The order in which the sweeps run, and whether two light sweeps run back to back in one detached job, as long as
  each sweep's own exit code and summary are captured.
- The probe's shape (D3): which helper it calls, how it reads the stack, where it writes its table. Delete it before
  T3.
- How each triage case is minimised for a `needs-ruling` or `follow-up` issue. #112's form is preferred: a minimal
  `.elkt` repro run on the oracle, the Java stack, and what was checked.
- The wording of comments, issue bodies, journal rows and the #116 comment.
- A `follow-up` for anything else found on the way. Examples: the presence-only throws rule of `loops`/`compound`
  (D3), refused or timeout cases a sweep never lays out, or a sweep without a stride or report variable. Not
  `queue:ready`.
- Formatting changes made by prettier in touched files. A complexity split forced by a touched function, following the
  file's existing pattern.
- A new CodeQL finding on a touched line: fix it. Accept it only as a Java-faithful quirk or a proven false positive,
  and journal it.
