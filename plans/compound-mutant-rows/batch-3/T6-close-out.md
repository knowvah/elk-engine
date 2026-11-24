<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: close-out

## Task

1. **Final regeneration (gate 7).** After `uptime` (wait above 12), run `ELK_VECTORS_CACHE=off nice -n 10 bash
   tools/vectors/layered-compound-vectors.sh test/golden/refs/java` cold. Then `cmp` the result with the committed
   ref, run the D5 diff against the base, and run
   `git diff --exit-code <base> -- test/golden/refs/ ':!test/golden/refs/java/layered-compound.json'`. Run the script
   once more with the cache on, to warm it. Journal both runs.
2. **Queue gates 1-7**, in order, on the final tree:
   ```bash
   npm run format:check && npm run typecheck && npm run complexity   # read the report; never trust plain lizard's exit code
   npm run coverage                                                  # detached, polls of at most 9 min
   npm run docs:build
   npm run codeql                                                    # the java suite scans tools/vectors; journal any new accepted entry
   ```
   Journal each result.
3. **#156 hand-off.** Comment on #156: this mission changed `LayeredCompoundVectors.java` (a new `EVIDENCE_ROWS`
   array after `SITE_ROWS`), `DIFFERING_ROWS` and `layered-compound.json`. So `withheld/record-rows.patch` needs a
   three-way apply, and its two SHA-256 values no longer hold. Give the new compound ref's size and SHA-256.
4. `plans/roadmap.md`: append `## Revision 2026-MM-DD (compound-mutant-rows)` in the style of the last revision.
   Never edit an earlier line.
5. `.agent-notes/compound-mutant-rows.md` for anything novel (template in `~/.claude/rules/memory.md`), or journal
   that there is nothing novel.
6. README: tick the batches, and add `## Mission summary (<date>)` in the style of `plans/tree-recorder-gaps/README.md`.
7. Squash per the README's Landing section. Confirm `git diff compound-mutant-rows/pre-squash HEAD` is empty and that
   `git log --oneline -2` shows one commit on the base.

## Write-set

`plans/roadmap.md`, `.agent-notes/compound-mutant-rows.md`, this brief's README, items and journal.

## Acceptance criteria

- Given the final regeneration, when gate 7 runs, then only `layered-compound.json` differs from the base among the
  refs, and only by appended rows and `rowCounts`.
- Given gates 1-6, when run on the final tree, then each passes, with results journaled.
- Given the squash, then there is one commit on the base with footer `Refs: #60`, and the tag holds the per-task
  history.

**Observability:** N/A, no new observable operations. **Rollback:** Reversible (revert the one commit).
