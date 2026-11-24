<!-- SPDX-License-Identifier: EPL-2.0 -->

# tree-recursion-depth: stop conditions and push-forward

A **halt** stops the mission with the question as the final line. A **partial** files a `needs-ruling` issue (or the
`follow-up` named below) for the exact part, leaves that part as it is, and finishes the rest. Every stop caused by a
discrepancy is journaled with the diagnosis artifact: mechanism, origin `file:line`, causal chain, ruled out.

| # | Condition | Action |
| - | --------- | ------ |
| 1 | A twin test (D4) shows any difference between a converted site and its verbatim twin | Diagnosis mode on the conversion. Fix within the 2-fix cap; otherwise revert that site to the recursion (it stays verbatim), journal the artifact, and the shape becomes a partial (`follow-up`) |
| 2 | At `D_oracle` the port differs from the oracle beyond 1e-6 | Diagnosis mode. If the unconverted port on a raised stack (D5) gives the same output, the divergence is pre-existing: `follow-up` with the artifact, and the shape counts as done if D5 byte identity holds. If not, the conversion caused it: treat as stop 1 |
| 3 | The converted port's output at depth is not byte-identical to the unconverted port's (D5) | As stop 1, for the site the bisection (revert conversions one by one) names |
| 4 | Any landed replay, golden or vector test fails, or a test can pass only by changing its expected value (AD-13) | Halt that track; restore the site. A needed expected-value change is `needs-ruling` naming the rows. Halt before the squash if gate 4 cannot go green |
| 5 | A conversion cannot keep the Java's visit, side-effect or accumulation order (D3), or needs a changed signature | Partial: keep the recursion, `needs-ruling` naming the site and what blocks it |
| 6 | A decision in [decisions.md](decisions.md) proves wrong | Journal it. If the fix stays inside the task's write-set and changes no expected value, push forward. Otherwise halt with the question |
| 7 | A track's budget runs out (mrtree 2 h 15 min, radial 1 h 15 min, vertiflex 1 h 15 min) with a shape below D1 | Push-forward: land the finished conversions; the close-out `follow-up` lists the shape, the depth reached and the next overflow site |
| 8 | A probe overflows in a frame outside `src/alg/{mrtree,radial,vertiflex}/` (core, graph, json, alg.common) | The track stops at that shape and reports the frame. The orchestrator decides after batch 2: convert it serially (one site, a file no track wrote) or partial (`follow-up`) if it touches a shared primitive used by other algorithms' landed refs beyond what the replays cover |
| 9 | `oracle-build.json` does not name `8bca22f4` + 0001-0004 | Rebuild with `tools/oracle/build.sh` and journal it. If the rebuild fails twice, halt |
| 10 | A queue gate fails after 2 fix attempts on that check | Halt |
| 11 | A needed write lies outside the write-sets, in an earlier mission's `plans/` file other than the appended closing row, in `~/.claude`, `~/git/knowvah/elk` or the main checkout | Halt with the question |

## Push-forward (decide and journal)

- Frame layout, helper names and whether a helper moves to a sibling file (D3).
- Seeds, tree sizes and shape mix of the twin tests; the deep depth if 10,000 is impractically slow at method level (never
  below 3 x the old TS limit).
- The probe's grid refinement (e.g. 250 steps near a bracket), timeouts and the raised stack size of D5.
- The order of conversions when two shapes of a bundle name different first sites.
- Filing `follow-up` issues (never `queue:ready`) for divergences and defects met on the way.
- Wording of docs, journal rows and the follow-up issue.
