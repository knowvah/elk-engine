<!-- SPDX-License-Identifier: EPL-2.0 -->

# parse-refs-layered-keys: stop conditions and push-forward

A **halt** stops the mission with the question as the final line. A **partial** files a `needs-ruling` issue for the
exact part, leaves it as it is, and finishes the rest. Every stop caused by a discrepancy is journaled with the
diagnosis artifact: mechanism, origin `file:line`, causal chain, ruled out.

| # | Condition | Action |
| - | --------- | ------ |
| 1 | `oracle-build.json` does not name `8bca22f4` + 0001-0004 | Rebuild with `tools/oracle/build.sh` and journal it. If the rebuild fails twice, halt |
| 2 | The D3 check finds a difference outside kinds (a) and (b), or `_meta.json` differs outside `transform` and `strippedSha256` | Halt. Restore the refs with `git checkout <base> -- test/golden/refs/elk-parse`, keep the scratch output, and journal the D3 output with the diagnosis. The ruling covers nothing else |
| 3 | The port's export is not byte-identical to the regenerated refs, and D1's push-forward does not apply | Diagnose to the first divergence (instrument both sides). A fix needs `src/`, so halt with the artifact (D5) |
| 4 | Any test, vector or golden other than `json-roundtrip.test.ts` and `elk-parse` fails, or would need its expected value changed (AD-13) | Halt with the rows named |
| 5 | Any other ref changes (gate 7) | Halt. Restore it, journal the diff |
| 6 | A queue gate fails after 2 fix attempts on that check | Halt |
| 7 | A needed write lies outside the README's blast radius (another mission's `plans/` file, `~/.claude`, the main checkout, `~/git/knowvah/elk`, the oracle worktree other than through `tools/oracle/`) | Halt with the question |

## Push-forward (decide and journal)

- The wording of the docs, the comments and the journal rows.
- Renaming `isResolvedAlgorithmKey` / `stripResolvedAlgorithm` in the test: keep the names. They fit the one key
  that is left.
- D1's fallback to the oracle's full provider set, if diagnosis shows the registry is the cause.
- A reorder count that differs from the planning probe's, when every difference is of kind (a) or (b).
- Filing the corpus hand-off `follow-up`, and any other `follow-up` met on the way (never `queue:ready`).
