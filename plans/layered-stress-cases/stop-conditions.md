<!-- SPDX-License-Identifier: EPL-2.0 -->

# layered-stress-cases: stop conditions and push-forward

A **halt** stops the mission with the question as the final line. A **partial** files a `needs-ruling` issue naming
the exact part, leaves it as it is, and finishes the rest. Every stop caused by a discrepancy is journaled with the
diagnosis artifact (mechanism, origin `file:line`, causal chain, ruled out).

| # | Condition | Action |
| - | --------- | ------ |
| 1 | The recorded label metrics differ from the ref by anything other than the D5 append, or a new value differs from the ruling's four | Halt (the ruling names this a STOP). Keep the scratch output in `$TMPDIR`, restore both files from HEAD, journal the diff |
| 2 | A ref other than `layered-label-metrics.json` changes (`git diff --exit-code test/golden/refs/`) | Halt (ruling boundary) |
| 3 | A suite case fails with `elk.stress` registered, in any D7 mode | Diagnosis mode: instrument the oracle and the port and find the first divergence. A fix would touch stress, force or layered sources, which the ruling forbids. So with the mechanism stated, halt with a `needs-ruling` issue that names the case and the artifact. Never restore the filter |
| 4 | Registering force and stress in the runner changes the result or case count of any other runner suite | Diagnose (registration order, a duplicated category, an option-suffix clash). If the mechanism is found and a probe or guard in the runner fixes it with no assertion change, proceed. Otherwise halt |
| 5 | A test or vector other than those D3 and D4 name can pass only by changing an expected value (AD-13) | Partial: `needs-ruling` naming the rows; finish the rest. Halt before the squash if gate 4 cannot go green |
| 6 | A model in the pinned checkout (`ac5af2ba`) is missing, or the D7 oracle counts are not 1/0 and 4/0 | Halt |
| 7 | `oracle-build.json` does not name `8bca22f4` + 0001-0004 | Rebuild with `tools/oracle/build.sh` and journal it; if it fails twice, halt |
| 8 | A needed write lies in an earlier mission's `plans/` files other than the one new 7h journal row, in `~/git/knowvah/elk`, `~/.claude` or the main checkout | Halt with the question. A write elsewhere in the worktree outside the blast radius is allowed when the work needs it (driver rule); journal why |
| 9 | A queue gate fails after 2 fix attempts on that check | Halt |

## Push-forward (decide and journal)

- The helper's name and where in `layout-test-runner.ts` it sits, and which option ids or algorithm ids the probes use.
- Whether the runner's direct-provider `layout()` helper (`layout-test-runner.ts:444`) also registers. It lays out with
  `LayeredLayoutProvider` only, so it needs no stress. Leave it unless a test needs it.
- Wording of docs and comments; whether a stale passage gets an inline update or a dated "Update (layered-stress-cases)"
  sentence.
- Re-running a tool after a tool failure that changes no ref.
- Filing `follow-up` issues (never `queue:ready`) for stale text outside D6's list.
