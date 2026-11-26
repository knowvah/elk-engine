<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: heading-slug-underscore (auto-confirmed at planning, 2026-11-24)

These use the queue form. A stop that blocks only part of the work: run `gh issue create --label needs-ruling` naming
the exact part, journal a `ruling` row, and finish the rest. A stop that blocks the whole mission: journal it, commit
the work as a temporary commit, and end with the driver's halted line, with the question in the final line.

## Halts (the whole mission)

1. **Writes outside the allowed set.** Any write in `../elk`, `../elk-oracle`, `$ELK_MODELS_DIR`, `~/.claude`, the
   main checkout or another repository.
2. **Baseline red.** A queue gate fails on the untouched tree: journal the failing test names and halt as blocked.

## Partial stops (file and continue)

3. **A second expected value would change (AD-13).** Any existing assertion other than `site-config.test.ts:74`, or
   any test elsewhere, fails after the regex change and passes only by editing its expected value: leave it, file
   `needs-ruling` naming the file, line, old and new value. The ruling allows exactly one change.
4. **A landed id changes.** The base-vs-final id inventory (T1) shows an id that changed on a page outside
   `reference/`, or `docs:linkcheck` reports a broken fragment: diagnosis mode first (which heading, which
   character); then file `needs-ruling` naming the page and id, and keep the rule change only if the maintainer's
   ruling already covers that id (a heading holding Pc is covered; anything else is not).
5. **A planned row's expected value disagrees with github-slugger** (non-whitespace rows) or with the base site
   (whitespace rows) when T1 re-measures it before the edit: the measurement wins only if it matches the ruling's
   words; otherwise leave the row out and file `needs-ruling`.

## Mechanics

6. **Repeated failure.** The same gate fails twice in a row after fix attempts (a vitest "timed out in 5000ms" under
   load that passes when its file is rerun alone does not count): halt with the diagnosis so far.
7. **Load.** Before the full suite or `docs:build`, check `uptime`; above 12, wait. Run the suite under `nice -n 10`.

## Push-forward (decide and journal, do not stop)

- The wording of the four prose sites of D1.
- Extra Pc rows in D3, each expected value from github-slugger, written before the edit.
- The text of the D4 `follow-up` issue, and a `follow-up` for any other defect found on the way.
- How the id inventory is extracted (any script under `$TMPDIR`; not committed).
