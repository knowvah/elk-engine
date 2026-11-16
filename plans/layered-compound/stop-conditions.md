<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions — layered-compound (auto-confirmed at planning, 2026-11-10)

These are in the queue form (driver prompt and `.claude/queue-policy.md`). A stop that blocks **only some rows or one task's
part** is filed with `gh issue create --label needs-ruling` naming the exact rows or files and journaled as a `ruling` row. Those
rows are left as they are, and the rest is finished. A stop that blocks **the whole mission** halts it: journal, commit the work,
and end with the halted line the driver prompt names. A write outside a task's write-set is not a stop (the driver's rule):
journal why.

1. **Outside the worktree (H10):** a change needs `../elk`, `../elk-end-label-*`, `$ELK_MODELS_DIR`, `~/.claude`, the main
   checkout or a new oracle patch → `needs-ruling`.
2. **Repeated failure:** the same gate check fails twice in a row (timeout-only failures at high load excepted), or one location
   is edited three times in a row for the same check → halt that task with the diagnosis so far.
3. **AD-13:** a byte diff in a landed ref, vector or golden; a test that can only pass by changing its assertion unless H7 lists
   it; a hand-derived numeric expectation (L4); a `full`, `models` or `scenarios` row needing re-recording after T1 lands →
   `needs-ruling` naming the rows; halt if the mission depends on them.
4. **Locked decisions:** a change would contradict H1–H14, W1–W14, G1–G12, F1–F16, FX1–FX8, earlier missions' rows or
   AD-1…AD-16.
5. **Out-of-scope model:** a planned row's hierarchy names an algorithm other than layered that the recorder cannot register,
   beyond the `elk.stress` inputs of H13 → drop the row, count it, journal it; a suite input → extend H13's issue.
6. **Randomness:** a row's seed is 0, or a 7h class draws from anything but `InternalProperties.RANDOM` (the H1 classes have no
   draw site at the pin).
7. **Recursion:** a deep-hierarchy case overflows under `--jitless`, or a twin comparison diverges.
8. **Unreachable branch** that no scenario can reach and that is not provably dead from the Java (a provable one is U with its
   Java line).
9. **Scenario count:** T12 finds more than about 40 site scenarios.
10. **Coverage:** below 90/90/90/90 after T15, except shortfalls journaled as U.
11. **Suite time:** `npm test` more than baseline + 20 s at similar load, or `LayeredCompoundVectors.test.ts` over 30 s alone.
12. **Byte-identity:** `regen-goldens.sh` (default or `algorithms` set), the landed vector scripts or `melk:generate` change a
    landed file.
13. **Size:** a ref file exceeds 16 MiB, or `LayeredCompoundVectors.java` exceeds 5,000 lines.
14. **Mission end:** squash as H9 says; the driver verifies one commit on the base and a clean tree.
15. **Temporal dead zone (F10):** the entry-point fitness test fails after wiring and the E1 recipe does not resolve it. An
    entry-order import is never the fix.
16. **Box provenance (C6):** a Java `==`/`!=` on boxed values whose operands cannot be proven fresh or shared.
17. **Divergence:** a coordinate differs from the oracle by more than 1e-6 with the mechanism traced outside this mission's
    classes and the landed driver, a last-ulp difference the sweep's exact hash rejects, or a difference traced to a hashed
    container's order (H3) → `needs-ruling` naming the rows. A difference with no stated mechanism halts (driver).
18. **Java baseline drift:** the start or end run of a suite in [java-baseline.md](java-baseline.md) differs.
19. **Landed driver defect:** a row mismatch traced to the 7f-landed `ElkLayered`/`ElkLayeredHierarchy`/`GraphConfigurator`/
    `ElkGraphImporter`/`ElkGraphLayoutTransferrer` code is a port defect: diagnose (mechanism, origin, causal chain, ruled out),
    fix in place and journal. A fix that would change a landed ref's replay is stop 3.
20. **Label metrics:** a suite or row needs a label text missing from `layered-label-metrics.json`: append it under G8's
    append-only proof (push-forward). A change to an existing entry is a stop.
21. **Allocation shift:** a suite of [java-baseline.md](java-baseline.md) cannot be ported in this mission (beyond H13), or its
    oracle run count cannot be reproduced over its inputs.
22. **Upstream:** an ELK defect that the port copies: draft it in the journal and file `needs-ruling` (H10). Never a fix branch.

## H13 issue text

File at mission start with `gh issue create --label needs-ruling --title "7h: three layered test cases need elk.stress (8b)"`.
Body:

> Mission 7h (issue #36, brief `plans/layered-compound/README.md`, decision H13) cannot run three Java test cases in TypeScript,
> because a child node in each input uses `algorithm: elk.stress`. Stress belongs to roadmap 8b (#38) and has no TS port. The
> recorders register no stress provider either.
>
> - `issues.Issue665Test`: its only case, `tickets/layered/665_includeChildrenDoesntStop.elkt` (`:21`). The oracle gives
>   runs=1, failures=0.
> - `issues.Issue700Test`: 2 of 4 cases, the same file and `examples/hierarchy/hierarchicalLayoutMixing.elkt` (`:49`). The
>   other two cases (`700_brokenHierarchyHandling.elkt`, `examples/hierarchy/hierarchicalEdges.elkt`) are layered only. The
>   oracle gives runs=4, failures=0.
>
> Until you rule, both suite files are ported whole. The three inputs are left out by one filter `STRESS_PENDING` that cites this
> issue, and a test pins that filter to exactly these three inputs. No assertion is changed. Options: (1) accept the filter, and
> 8b removes it once stress is ported (recommended); (2) move both suites whole to 8b (FX1's strict F8), which ends 7h with 95 of
> 97 files; (3) port enough of stress inside 7h (outside row 7h).
