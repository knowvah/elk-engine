<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8: the outcome section, conformance, hand-off closures

## Steps

1. Append `## Search outcomes (issue #59, layered-arm-search)` to `plans/layered-compound/unreached.md`, after the
   file's last section. Do not edit § Open or any other earlier line. Give one row per arm, 25 in all, with these
   columns:
   - arm (TS line; mark a moved line);
   - Java line;
   - outcome (1, 2, 3, 4, or E for taken by landed evidence since 7h, from T1);
   - evidence: the row id; or, for outcome 2, the note on whether a real layout could produce the state; or the proof
     (Java lines and invariant); or, for outcome 4, what was tried and the closest approach.
   Close with the counts per outcome. List any D9 arm outside the 25 that a new row takes, with the earlier map's line.
2. `docs/conformance.md`, § "alg.layered, part i: compound graphs (mission 7h)". The paragraph
   **Open arms (issue #59, `needs-ruling`)** (`:1764-1765` at planning) describes a state this mission ends. Replace
   it with the outcome counts and a list of every outcome-3 and outcome-4 arm, with its class and reason, as the issue
   asks. Link the new `unreached.md` section, and name the new row ids by group. The coverage-map line (`:1734`,
   "open 26") is history: add a sentence that says the 25 arms were settled by this mission. Do not rewrite the count.
3. The D8 journal rows, one appended to each journal: `plans/layered-crossing-min-tests/decision-journal.md` (closes
   C3), `plans/layered-loops-wrapping-compaction/decision-journal.md` (closes the 7g hand-off), and
   `plans/layered-compound/decision-journal.md` (stop 8, #59). Each row has a date, `layered-arm-search`, the outcome
   counts for its arms, and a link to the new section.
4. `docs/architecture/alg-layered-compound.md`: edit it only if it states that the 25 arms are open (grep at T8).
5. `npm run docs:build`: exit 0, no dead link, the same typedoc warning count as the base.

## Acceptance criteria

- Given the new section, then each of the 25 arms has exactly one outcome, and the counts add up to 25.
- Given `docs/conformance.md`, then every outcome-3 and outcome-4 arm is listed with its class and reason, and no
  sentence still calls the 25 arms open.
- Given `git diff <base> -- plans/layered-compound/unreached.md`, then it shows only added lines at the end of the
  file.

## Observability

N/A.

## Rollback

Reversible.
