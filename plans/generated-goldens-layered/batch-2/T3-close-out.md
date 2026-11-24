<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: close-out

## Steps

1. **Gate 7.** T1's D5 regen of `layered` and `trees` is the rerun for the two recorders whose inputs changed. If any
   commit after T1 touched `test/golden/` or `tools/oracle/`, rerun both (load ≤ 12, `nice -n 10`). Then
   `git diff -M --stat <base> -- test/golden/refs/`: the three 100% renames only. Journal.
2. **Queue gates 1-6**, in order, on the final tree:
   ```bash
   npm run format:check && npm run typecheck && npm run complexity   # read the report; never trust plain lizard's exit code
   npm run coverage                                                  # detached, polls of at most 9 min
   npm run docs:build
   npm run codeql                                                    # journal any new accepted entry
   ```
   Journal each result next to the planning baseline. Test counts move by the D3 edits only (the trees runner loses 3
   layout tests, the layered runner gains 3 plus the pin test); state the delta.
3. **Hand-back on #68.** Comment: old → new ids, the proof (renames at 100%, both sets regenerate byte-identically,
   `_meta.json` unchanged and why), D2's input resolution, D3's test changes, the docs, and that items A and B need no
   further work here (B's audit is #74).
4. `plans/roadmap.md`: append `## Revision <date> (generated-goldens-layered)` in the style of the last revision. Never
   edit an earlier line.
5. `.agent-notes/generated-goldens-layered.md` for anything novel (template in `~/.claude/rules/memory.md`), or a journal
   row saying there is nothing novel.
6. README: tick the batches, and add `## Mission summary (<date>)` in the style of
   `plans/parse-refs-layered-keys/README.md`.
7. Squash per the README's Landing section. Confirm that `git diff generated-goldens-layered/pre-squash HEAD` is empty
   and that `git log --oneline -2` shows one commit on the base.

## Write-set

`plans/roadmap.md`, `.agent-notes/generated-goldens-layered.md`, this brief's README and journal.

## Acceptance criteria

- Given gate 7, then no ref differs from the base except the three 100% renames.
- Given gates 1-6, when run on the final tree, then each passes, with results journaled.
- Given the squash, then there is one commit on the base with footer `Refs: #68`, and the tag holds the per-task
  history.

**Observability:** N/A. **Rollback:** Reversible (revert the one commit).
