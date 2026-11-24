<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: close-out

## Task

1. **Final regeneration (gate 7).** After `uptime` (wait above 12), run each of the three scripts cold under `nice -n 10`
   into `test/golden/refs/java/`:
   `ELK_VECTORS_CACHE=off bash tools/vectors/{radial,vertiflex,mrtree}-vectors.sh test/golden/refs/java`. Then run
   `git diff --exit-code <base> -- test/golden/refs/` apart from the three added files, which `git status` lists as added.
   Also run the three scripts once with the cache on, to warm it and prove the cached copy is identical. Journal each run's
   time and its `strict JSON parse ok` line.
2. **Queue gates 1-7** in order, after every subagent has finished (D8):
   ```bash
   npm run format:check && npm run typecheck && npm run complexity   # read the report; never trust plain lizard's exit code
   npm run coverage                                                  # 90/90/90/90, the full suite; start detached, poll ≤ 9 min
   npm run docs:build                                                # journal the typedoc warning count (200 at the base)
   npm run codeql                                                    # the java suite scans tools/vectors; journal any new accepted entry
   git diff --exit-code <base> -- test/golden/refs/                  # only the three added files differ
   ```
   If the sweep dirs slow the coverage run, set the `*_SWEEP_DIR=/nonexistent` variables as `plans/vector-recorder-debts/`
   does. Journal each gate's result.
3. `plans/roadmap.md`: append `## Revision <date> (tree-recorder-gaps)` in the style of the last revision: what landed,
   outcomes per bundle, docs, issues filed, gates. Never edit an earlier line.
4. `.agent-notes/tree-recorder-gaps.md` for anything novel (template in `~/.claude/rules/memory.md`). Or journal that there is
   nothing novel.
5. README: tick the batches, and add `## Mission summary (<date>)` in the style of `plans/vector-recorder-debts/README.md`.
6. Squash per the README's Landing section. Then confirm `git diff tree-recorder-gaps/pre-squash HEAD` is empty and
   `git log --oneline -2` shows one commit on the base.

## Write-set

`plans/roadmap.md`, `.agent-notes/tree-recorder-gaps.md`, this brief's README, items and journal.

## Acceptance criteria

- Given the final regeneration, when gate 7 runs, then only `radial-extra.json`, `vertiflex-extra.json` and
  `mrtree-extra2.json` differ from the base, all three as added files.
- Given gates 1-6, when run on the final tree, then each passes, with results journaled.
- Given the squash, when `git log` is read, then there is one commit on the base with footer `Refs: #66`, and the
  pre-squash tag holds the per-task history.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible (revert the one commit).
