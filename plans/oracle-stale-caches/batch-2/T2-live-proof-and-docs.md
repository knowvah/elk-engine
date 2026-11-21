<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: live read-only proof and docs

## Context

T1 made `verify_worktree` accept the cache roots. This task shows the live oracle passes without writing to it
([D3](../decisions.md#d3-live-proof-is-read-only-never-run-buildsh-on-the-live-oracle)), then makes the docs say so
([D5](../decisions.md#d5-docs-scope)).

## Read-set

- `docs/conformance.md:53-61`, `:348-392`
- `docs/architecture/elk-upgrade.md:170-210`
- `docs/architecture/elk-json-text.md:316-326`
- `tools/oracle/README.md:30-50`
- `.agent-notes/text-sizing-seam.md:7-19`

## Write-set

`docs/conformance.md`, `docs/architecture/elk-upgrade.md`, `docs/architecture/elk-json-text.md`,
`tools/oracle/README.md` (only if needed), `plans/oracle-stale-caches/decision-journal.md`.

## Steps

1. "Before" side (read-only): run D3's porcelain pipeline with the **base** filter (copy it from
   `git show <base>:tools/oracle/build.sh`). Journal its output (`?? vector-cache/` at planning). If it lists any
   other entry, that is stop 3 for the live part.
2. "After" side: run D3's sourced `verify_worktree` block from the repo root, with the `shasum` check around it.
   Journal the output line, the exit code and both hashes. Expected: `existing oracle worktree verified`, exit 0,
   equal hashes. Never run `build.sh` itself (stop 1).
3. Edit the docs per D5. Keep each table row one line (the tables are prettier-formatted; run `npx prettier --write`
   on the edited files and check the diff stays inside the rows you meant). Do not touch `docs-site/`.
4. `grep -rn "census/\` and \`sweep/\|sweep/\` and \`census/" docs tools/oracle/README.md` prints no stale exempt
   list; `grep -n "#85\|excludes" docs/architecture/elk-upgrade.md` no longer points at the workaround.
5. `npx vitest run test/docs/elk-upgrade-runbook.test.ts` green; `npx prettier --check` the edited files. Journal a
   `fix` row listing each paragraph changed (file:line before → after, one line each); commit (batch overview).

## Acceptance criteria

- Given the live oracle, when D3's block runs, then it prints `existing oracle worktree verified`, exits 0, and
  `oracle-build.json`'s sha256 is the same before and after (journaled).
- Given `docs/conformance.md`, then §§ 1, 4 and 5 name `census/`, `sweep/` and `vector-cache/` as the exempt roots,
  § 5 says other untracked root directories give exit `2` and run output belongs under `sweep/`, and the § 5
  remove-the-worktree advice warns that it deletes the caches.
- Given `docs/architecture/elk-upgrade.md`, then the hazard no longer says an in-place rebuild needs the excludes
  workaround, and still says the vector cache runs cold after a rebuild.
- Given `git diff <base> -- docs-site/ tools/vectors/`, then it is empty.

## Observability

N/A: documentation and a read-only check.

## Rollback

Reversible: revert the commit. The live proof writes nothing.
