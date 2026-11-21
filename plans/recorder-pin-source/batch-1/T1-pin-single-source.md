<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: one source for the pin

## Context

41 recorders declare `ELK_COMMIT = "8bca22f4…"` and use it once, in the stamp line
(`git grep -n ELK_COMMIT -- tools/vectors`). D1 moves the value to `-Delk.commit`, passed by the shell from
`tools/oracle/ELK_COMMIT`; D2 replaces each constant with a lazy checked accessor; D4 adds the fitness test, written
first.

## Write-set

- The 41 files `git grep -l 'String ELK_COMMIT = ' -- tools/vectors` lists (and nothing else under `tools/vectors/*.java`).
- `tools/vectors/vector-cache.sh` (`vc_elk_commit`, the three `java` lines at 98, 121, 139, the header comment).
- `tools/vectors/graph-vectors.sh`, `graph-json-vectors.sh`, `metadata-vectors.sh`, `transfer-vectors.sh` (one
  `java` line each, plus a header line saying the script passes the pin).
- `test/architecture/elk-pin.fitness.test.ts` (new).
- `decision-journal.md`.

## Read-set

`decisions.md` D1, D2, D4; `tools/vectors/vector-cache.sh`; `test/docs/elk-upgrade-runbook.test.ts`
(`PROGRAM_TOKEN`, `scriptNames`: the program-name rule D4 item 3 can reuse); one existing
`test/architecture/*.fitness.test.ts` for shape; `.agent-notes/recorder-identity-hash.md`.

## Steps

1. **Red.** Write `elk-pin.fitness.test.ts` (D4). Run `npx vitest run test/architecture/elk-pin.fitness.test.ts`:
   items 1 and 2 fail, each naming the 41 recorders. Journal the counts.
2. Apply D2 to the 41 files with one transformation (a throwaway script in `$TMPDIR`). For each file confirm by
   reading the vector path that the first `elkCommit()` call precedes the first recorded row; add the early call
   where the stamp is written last. `git diff --stat` shows only these 41 Java files.
3. Apply D1 to `vector-cache.sh` and the four direct scripts. `bash -n` and `shellcheck` on each edited script
   (journal shellcheck's output; compare with the base file's own output, never introduce a new warning).
4. **Green.** The fitness test passes; `npx vitest run test/docs/elk-upgrade-runbook.test.ts` passes.
5. Smoke, early warning only (T3 is the proof): run `tools/vectors/metadata-vectors.sh "$TMPDIR/pm96-smoke"` (direct
   path) and `tools/vectors/comment-vectors.sh "$TMPDIR/pm96-smoke"` (cached path) and `cmp` each output with
   `test/golden/refs/java/`. A difference here is stop 3 already: diagnose before going on.
6. Journal the transformation (counts: declarations removed, accessors added, early calls added, by file).

## Interface contracts

- Output (consumed by T3): every stamping recorder reads `System.getProperty("elk.commit")` through `elkCommit()`;
  every script that runs one passes `-Delk.commit=<40 hex>` equal to `tools/oracle/ELK_COMMIT`. A recorder run
  without it exits non-zero before writing an output file.

## Acceptance criteria

- Given the base tree, when the new fitness test runs, then items 1 and 2 fail listing 41 files (red journaled).
- Given T1's tree, when `git grep -c 8bca22f4afa3371562d2f702d59929818f7f7b71 -- tools` runs, then it lists only
  `tools/oracle/ELK_COMMIT` and `tools/melk/sources/manifest.json`, and the fitness test passes.
- Given any of the 41 recorders, when its vector path is read, then the stamp comes from `elkCommit()` and the first
  call precedes the first recorded row; no other line of the file changed.
- Given `vector-cache.sh`, when cache is off, whole or per-row, then the `java` command carries `-Delk.commit`, and the
  salt formula (`vc_salt`) is byte-unchanged.

## Observability

N/A: tooling only. The recorders' stderr gains no line; the D2 message appears only on a misuse.

## Rollback

Reversible: `git revert`. Edited sources change cache salts; the next run refills the cache (cost: one cold run).
