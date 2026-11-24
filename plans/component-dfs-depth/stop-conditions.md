<!-- SPDX-License-Identifier: EPL-2.0 -->

# component-dfs-depth: stop conditions and push-forward

A **halt** stops the mission, with the question as the final line. A **partial** files a `needs-ruling` issue (or the
`follow-up` named below) for the exact part, leaves that part as it is, and finishes the rest. Journal every stop caused by a
discrepancy with the diagnosis artifact: mechanism, origin `file:line`, causal chain, and what was ruled out.

| # | Condition | Action |
| - | --------- | ------ |
| 1 | A twin test (D4) shows any difference between a converted site and its verbatim twin | Enter diagnosis mode on the conversion. Fix it within the 2-fix cap. Otherwise revert the site to the recursion, journal the artifact, and make the algorithms that need it a partial (`follow-up`) |
| 2 | At `D_oracle` the port differs from the oracle beyond 1e-6, or the oracle fails at a depth for a reason other than the stack (heap, timeout) | Enter diagnosis mode. If the unconverted reference (D5) gives the same output, the divergence is pre-existing: file a `follow-up` with the artifact. The algorithm counts as done if D5 byte identity holds. If the reference differs, the conversion caused it: treat it as stop 1. A non-stack oracle failure is journaled, and that depth leaves the grid (D1) |
| 3 | The converted port's output at depth is not byte-identical to the D5 reference | Treat it as stop 1, for the site that reverting one conversion at a time names |
| 4 | Any landed replay, golden or vector test fails, or a test can pass only by changing its expected value (AD-13) | Restore the site. A needed expected-value change is `needs-ruling`, naming the rows. Halt before the squash if gate 4 cannot go green |
| 5 | A conversion cannot keep the Java's visit or side-effect order (D3), or needs a changed signature | Partial: keep the recursion, and file `needs-ruling` naming the site and what blocks it |
| 6 | A decision in [decisions.md](decisions.md) proves wrong | Journal it. Push forward if the fix stays inside the task's write-set and changes no expected value. Otherwise halt with the question |
| 7 | A budget runs out: T1 at 90 min, T2 or T3 at 45 min, T4 at 60 min | Push forward: land the finished work. The close-out `follow-up` names the algorithm, the depth reached and the next overflow site |
| 8 | A probe overflows in a frame outside `src/alg/{force,disco}/` (core, graph, json, alg.common) | The orchestrator converts it in T4 only if it is one method, called by no algorithm other than force, stress and disco (check with find-references), and every landed replay of its callers stays green. Otherwise it is a partial (`follow-up` naming the frame and the depth) |
| 9 | `oracle-build.json` does not name `8bca22f4` + 0001-0004 | Rebuild with `tools/oracle/build.sh` and journal it. Halt if the rebuild fails twice |
| 10 | A queue gate fails after 2 fix attempts on that check | Halt |
| 11 | A needed write lies outside the write-sets: in an earlier mission's `plans/` file (other than the appended closing row), in `~/.claude`, in `~/git/knowvah/elk` or in the main checkout | Halt with the question |

## Push-forward (decide and journal)

- Frame layout, helper names and step encoding (D3).
- Seeds, graph sizes and the shape mix of the twin tests, and the deep depth if 20,000 is impractically slow at method level
  (never below 16,000).
- Grid refinement between two grid depths, timeouts, the heap of a stress run, and the raised stack (or `Worker`) of D5.
- Dropping a grid depth that would need more than 48 GB of heap in either runtime, journaled with the estimate.
- Filing `follow-up` issues (never `queue:ready`) for divergences and defects met on the way.
- Wording of docs, journal rows, the #167 comment and the close-out issue.
