<!-- SPDX-License-Identifier: EPL-2.0 -->

# layered-loops-evidence: stop conditions and push-forward

There are two kinds of stop:

- A **halt** stops the mission, with the question as the final line.
- A **partial** files a `needs-ruling` issue naming the exact part, leaves that part as it is, and finishes the rest.

Every stop caused by a discrepancy is journaled with the diagnosis artifact: mechanism, origin `file:line`, causal
chain, and what was ruled out.

| # | Condition | Action |
| - | --------- | ------ |
| 1 | The D3 id-keyed diff shows a base row changed or removed, or a ref other than `layered-loops.json` changes | Halt that task. Restore the ref from HEAD and keep the evidence in `$TMPDIR`. Diagnose: recorder non-determinism, or a recorder edit leaking into other rows. If the mechanism is found and the recorder is fixed so that base rows are byte-equal, proceed. Otherwise halt |
| 2 | The TS replay does not match a new row at the AD-4 bar, or D5's oracle probe or TS trace disagrees with the plan | Enter diagnosis mode: instrument the oracle and the port, and find the first divergence. A D9 fix with a stated mechanism lets the mission proceed. With no mechanism after 2 fix attempts, it is a partial: file a `needs-ruling` issue naming the rows, and drop those rows from the recorder so the ref holds no red row |
| 3 | A test or vector can pass only by changing an expected value of an existing row (AD-13) | Partial: file a `needs-ruling` issue naming the test and the rows, and leave them unchanged. Finish the rest. Halt before the squash if gate 4 cannot go green |
| 4 | After T2/T3's search budget, a mutant has neither a killing oracle row nor a D4 proof | Partial: one `needs-ruling` issue listing every `open` mutant, with the candidates tried and the partial argument (in [mutants.md](mutants.md) and [unreached.md](unreached.md)). Finish the rest. This stop is expected for some of M3-M6 and M10 |
| 5 | New rows would pass D3's 250 KB budget after D3's drop order, or the recorder's 16 MiB cap | Partial for the rows that do not fit: file a `needs-ruling` issue asking for a second launcher or ref |
| 6 | `oracle-build.json` does not name `8bca22f4` + 0001-0004 | Rebuild with `tools/oracle/build.sh` and journal it. If `build.sh` fails twice: halt |
| 7 | A needed write lies outside the README's blast radius, in an earlier mission's `plans/` files, in `~/git/knowvah/elk`, in `~/.claude`, or in the main checkout | Halt with the question |
| 8 | A queue gate fails after 2 fix attempts on that check | Halt |

## Search budget (stop 4)

- Per open mutant (M3, M4/M5 together, M6, M7-M9 together, M10): at most about 25 TS-screened candidates plus the oracle
  probes D4 names.
- A candidate that reaches the arm but does not discriminate the mutant counts toward the budget, and its shape is
  journaled.
- The budget bounds the search, not the diagnosis. A D4 proof found at any point ends the search for that mutant.

## Push-forward (decide and journal)

- Exact row ids, option values and graph sizes inside the D2/D7 shapes, and extra rows of the same shape within the
  D3 budget.
- Which candidate of several kills a mutant, and whether one row serves several mutants.
- Whether a search task runs as a subagent, and the scratch layout.
- Whether `evidenceSites()` lives in `LayeredLoopsVectorsSites.java` or the new helper (D2's 500-line rule).
- Recorder reruns after a tool failure that changes no ref.
- Filing `follow-up` issues (never `queue:ready`), for example the 7g `unreached.md` wording that D10 leaves uncorrected.
