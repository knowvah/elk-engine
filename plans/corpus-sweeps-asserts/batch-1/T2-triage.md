<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: triage each firing site (dev-assert D7)

## Context

#116: "Triage each site as #45 did (D7 of `plans/dev-assert/decisions.md`)". The rule is
[D4](../decisions.md#d4-triage-per-dev-assert-d7). If T1's census is `none`, append one journal row (`T2 | note | no
firing site; nothing to triage`) and go to T3.

## Read-set

- T1's `census` rows.
- For each site: its `src/` file, around the `devAssert` and its `@see` Java file and line under
  `~/git/knowvah/elk/plugins/…` (read only).
- `plans/dev-assert/inventory.md` (the site's row), and `gh issue view 112 --comments` (the issue form and the
  comment wording precedent).
- An existing comment site for the form: `grep -rn "Not a devAssert yet" src`.

## Write-set (only for a firing site)

- The site's `src/` file, and its colocated `<Name>.test.ts`: a new test only. No existing assertion changes.
- `plans/corpus-sweeps-asserts/decision-journal.md`.
- No other file. Anything else is stop 5.

## Steps, per site

1. **Diagnosis.** Instrument the port on one representative case (temporary logging, not committed). Capture the
   values the assert checks and where they came from.
2. **Oracle with assertions on.** `uptime` (wait above 12), then `nice -n 10` with
   `JAVA_TOOL_OPTIONS=-ea:org.eclipse.elk...` through the family's `tools/oracle/<family>-sweep.sh --dump <case>` (read
   the script's usage first), or `tools/oracle/run.sh "$TMPDIR/ea" <input>` for a whole-model case. Output goes only to
   `$TMPDIR`. Journal the command and the first Java frames.
3. **Decide (D4):**
   - **Same `AssertionError` at the same Java line.** It is Java-faithful. Shrink the input to a minimal `.elkt` that
     still fails on the oracle under `-ea`. File `needs-ruling` with #112's form: the rows, the input, the Java stack,
     what was checked, and the pin with patches 0001-0004 and JDK 21.0.1. Put the site back to a comment naming the
     issue, using the wording of the existing `Not a devAssert yet` comments. If the site has a test that pins its
     `AssertionError` (as #127's ten do), that test now fails. That is stop 2: leave the site live, file the
     `needs-ruling`, and journal it.
   - **Java does not throw.** It is a port defect. Use the oracle as the reference (a probe there, not committed) and
     find the first value that differs, with the origin `file:line`. If the fix is inside the site's directory and
     changes no expected value: write the test first and watch it fail, then fix, then rerun the sweep, which must be
     green with assertions on and off. Otherwise stop 3.
4. Journal the diagnosis artifact (mechanism, origin, causal chain, ruled out) and the outcome (`fix`, `needs-ruling #N`
   or `follow-up #N`).
5. Rerun each sweep that a change touched, with assertions on. It must be green, or red only on sites that now have
   an issue (stop 1 or 2).

## Acceptance criteria

- Given T1's census, when T2 ends, then every site has exactly one outcome in the journal: fixed, filed
  (`needs-ruling` or `follow-up`, with the number), or shown Java-faithful.
- Given a fix, when its new test runs before the fix, then it fails, and after the fix it passes. The touched sweep
  is green with assertions on and with them off.
- Given a Java-faithful site, when its issue is filed, then it holds a minimal input that fails on the oracle under
  `-ea`, and the site is a comment naming it (unless stop 2 applies).
- Given the finished T2, when `git diff <base> -- test/golden/refs tools/vectors tools/oracle` runs, then it is empty.

## Observability / rollback

N/A: this task adds no new observable operations. It is reversible. A comment or fix commit in `src/` reverts
cleanly.
