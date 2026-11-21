<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: scripts for the two script-less recorders; runbook

## Context

`CoreJdkVectors.java` (5 refs) and `GuavaVectors.java` (`guava.json`) are run only by hand, from their header `Run:`
lines and runbook § 7.3; `GuavaVectors` needs two jars found in the p2 cache. D3 fixes the scripts' form and leaves
both Java sources unedited. The runbook also still tells a pin move to `sed` the 41 constants (§ 5 step 3), which T1
made obsolete.

## Write-set

`tools/vectors/core-jdk-vectors.sh`, `tools/vectors/guava-vectors.sh` (new; `chmod +x` before `git add`);
`docs/architecture/elk-upgrade.md`; `decision-journal.md`.

## Read-set

`tools/vectors/gson-vectors.sh`, `tools/vectors/java-vectors.sh` (forms to copy); headers of
`tools/vectors/CoreJdkVectors.java:1-21` and `tools/vectors/GuavaVectors.java:1-25`; runbook §§ 5 (lines 151-163 at
planning), 7 (235-250), 7.3 (322-344), 11 (the stamp list near line 521), 14; `test/docs/elk-upgrade-runbook.test.ts`.

## Steps

1. Write both scripts (D3). `bash -n`, `shellcheck` clean. Run each with a wrong argument count: usage error, exit 1.
2. Run `tools/vectors/core-jdk-vectors.sh "$TMPDIR/pm96-jdk"` and `tools/vectors/guava-vectors.sh "$TMPDIR/pm96-jdk"`
   (load below 12, `nice -n 10`), then `cmp` each of the six files with `test/golden/refs/java/`. All equal, or stop
   3/6. Journal wall times and the `using …` lines.
3. Runbook edits:
   - § 5 step 3: the recorders read the pin from `tools/oracle/ELK_COMMIT` through `-Delk.commit`, passed by their
     scripts (issue #96); nothing to edit. Keep the step number (push-forward if merging reads better; check every
     "section 5 step N" reference first).
   - § 5 step 3's cache remark and § 7's intro: the pin file change and the oracle rebuild already change every salt.
   - § 7.3 table: the two rows name `tools/vectors/core-jdk-vectors.sh "$REFS"` and
     `tools/vectors/guava-vectors.sh "$REFS"`; drop "(no script)"; replace the `GUAVA`/`FAILUREACCESS` block with a
     sentence that the script finds both jars and checks their versions.
   - Any other sentence that says the stamp comes from a recorder constant (grep `constant`, `ELK_COMMIT = `).
4. `npx vitest run test/docs/elk-upgrade-runbook.test.ts test/architecture/elk-pin.fitness.test.ts` green;
   `npx prettier --check docs/architecture/elk-upgrade.md` clean (run `--write` and review if not).

## Acceptance criteria

- Given the two scripts, when each runs into a fresh directory, then every file it writes is byte-equal (`cmp`) to
  `test/golden/refs/java/`.
- Given `git ls-files -s tools/vectors/core-jdk-vectors.sh tools/vectors/guava-vectors.sh`, then both are mode
  `100755`, and the runbook test passes with both listed by its `*-vectors.sh` inventory.
- Given `git diff <base> -- tools/vectors/CoreJdkVectors.java tools/vectors/GuavaVectors.java`, then it is empty.
- Given the runbook, then no sentence tells a pin move to edit a recorder constant.

## Observability

N/A: tooling only.

## Rollback

Reversible: `git revert`; the refs are untouched.
