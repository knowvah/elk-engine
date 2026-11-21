<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: bundle-deps-pinned-read (auto-confirmed at planning, 2026-11-20)

These use the queue form. A stop that blocks only part of the work: run `gh issue create --label needs-ruling` naming
the exact part, journal a `ruling` row, and finish the rest. A stop that blocks the whole mission: journal it, commit
the work as a temporary commit, and end with the driver's halted line, with the question in the final line.

## Halts (the whole mission)

1. **Writes outside the allowed set.** Any write in `../elk`, `$ELK_ORACLE_DIR`, `$ELK_MODELS_DIR`, `~/.claude`, the
   main checkout or another repository. Every git call this mission makes against an ELK checkout is read-only
   (`show`, `cat-file`, `rev-parse`, `log`); `sync-sources.sh` runs only with `--check`.
2. **Baseline red.** A queue gate fails on the untouched tree: journal the failing test names and halt as blocked.
3. **The committed table is wrong.** Once D2 lets the regeneration check run against a checkout that holds the pin,
   if it fails, `bundle-deps.json` would have to change to pass: that is AD-13, not a fix. Do not rewrite the file;
   diagnose (mechanism, origin, chain, ruled out), file `needs-ruling` with the diff, and halt.

## Partial stops (file and continue)

4. **`sync-sources.sh --check` reports a difference** against a checkout that holds the pin: the vendored `.melk`
   files or `manifest.json` would change. Do not run it without `--check`. File `needs-ruling` with the output; T1
   and the rest of T2 stand.
5. **More of a file would change than planned.** Any change to `buildBundleDeps`, the parsers, `IN_SCOPE_SUFFIXES`,
   the existing fitness assertions, or `sync-sources.sh` beyond D4's lines: do not make it; file `needs-ruling`.

## Mechanics

6. **Repeated failure.** The same gate fails twice in a row after fix attempts (a vitest "timed out in 5000ms" under
   load that passes when its file is rerun alone does not count): halt with the diagnosis so far. Any failing case
   after D1/D2 is a discrepancy: diagnosis mode before any edit.
7. **Load.** Before the full suite, check `uptime`; above 12, wait. Run it under `nice -n 10`.

## Push-forward (decide and journal, do not stop)

- Helper shape, constant names and test names, within the complexity limits (30 NLOC, CCN 10, 5 parameters).
- The minimal manifest text in the throwaway repo (a `Bundle-SymbolicName` and a `Require-Bundle` header suffice).
- The exact doc wording within D5.
- `follow-up` issues for anything else found on the way (not `queue:ready`).
