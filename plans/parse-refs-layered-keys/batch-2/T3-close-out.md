<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: close-out

## Steps

1. **Gate 7.** Run `uptime` (wait while it is above 12). Copy the refs to scratch, then rerun
   `nice -n 10 tools/oracle/regen-parse-refs.sh`, and `cmp` the result against the committed refs. Then run
   `git diff --exit-code <base> -- test/golden/refs/ ':!test/golden/refs/elk-parse/'`. No other recorder's inputs
   changed. Journal both results.
2. **Queue gates 1-6**, in order, on the final tree:
   ```bash
   npm run format:check && npm run typecheck && npm run complexity   # read the report; never trust plain lizard's exit code
   npm run coverage                                                  # detached, polls of at most 9 min
   npm run docs:build
   npm run codeql                                                    # journal any new accepted entry
   ```
   Journal each result next to the planning baseline.
3. **Corpus hand-off (D4).** Confirm that `tools/corpus/ts-layout-compare.ts` goes through
   `tools/corpus/ts-layout-pipeline.ts`, whose `REGISTRATIONS` include layered (`:75`), and that
   `docs/conformance.md:724-730` still calls the hand-off open. Run
   `gh issue list --state open --search "conformance 724 OR ts-layout-compare in:body"` for a duplicate. If there is
   none, file one `follow-up` issue (not `queue:ready`): the doc text is stale on the code side, and restating the 497
   `layoutOptions`-only mismatches needs a core sweep rerun (related: #139). Journal the issue number.
4. **Hand-back on #63.** Comment with the D3 summary, the D1 registration, the docs changes, and the corpus hand-off
   state with its issue number.
5. `plans/roadmap.md`: append `## Revision <date> (parse-refs-layered-keys)` in the style of the last revision. Never
   edit an earlier line.
6. `.agent-notes/parse-refs-layered-keys.md` for anything novel (template in `~/.claude/rules/memory.md`), or a journal
   row saying there is nothing novel.
7. README: tick the batches, and add `## Mission summary (<date>)` in the style of `plans/compound-mutant-rows/README.md`.
8. Squash per the README's Landing section. Confirm that `git diff parse-refs-layered-keys/pre-squash HEAD` is empty
   and that `git log --oneline -2` shows one commit on the base.

## Write-set

`plans/roadmap.md`, `.agent-notes/parse-refs-layered-keys.md`, this brief's README and journal.

## Acceptance criteria

- Given the rerun, when gate 7 runs, then `elk-parse` is byte-identical to T1's commit, and no other ref differs from
  the base.
- Given gates 1-6, when run on the final tree, then each passes, with results journaled.
- Given the squash, then there is one commit on the base with footer `Refs: #63`, and the tag holds the per-task
  history.

**Observability:** N/A. **Rollback:** Reversible (revert the one commit).
