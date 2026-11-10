<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions — layered-loops-wrapping-compaction (auto-confirmed at planning, 2026-11-10)

Queue form (driver prompt and `.claude/queue-policy.md`): a stop that blocks **only some rows or one task's part** is filed with
`gh issue create --label needs-ruling` naming the exact rows or files, journaled as a `ruling` row, those rows left as they are,
and the rest finished. A stop that blocks **the whole mission** halts it: journal, commit the work, end with the halted line the driver prompt names. A write outside a task's write-set is not a stop (the driver's rule): journal why.

1. **Outside the worktree (W12):** a change needs `../elk`, `../elk-end-label-*`, `$ELK_MODELS_DIR`, `~/.claude`, the main
   checkout or a new oracle patch → `needs-ruling`.
2. **Repeated failure:** the same gate check fails twice in a row (timeout-only at high load excepted), or one location is edited
   three times in a row for the same check → halt that task with the diagnosis so far.
3. **AD-13:** a byte diff in a landed ref, vector or golden; a test that can only pass by changing its assertion unless W9 lists
   it; a hand-derived numeric expectation (L4); a `full`, `models` or `scenarios` row needing re-recording after T1 lands →
   `needs-ruling` naming the rows; halt if the mission depends on them.
4. **Locked decisions:** a change would contradict W1–W14, G1–G12, F1–F16, FX1–FX8, earlier missions' rows or AD-1…AD-16.
5. **Refusal:** a planned row's whole plan names a member outside the ported sets and outside 7h's categories.
6. **Randomness:** a row's seed is 0, or a 7g class draws from anything but `InternalProperties.RANDOM`
   (`J/intermediate/loops/routing/RoutingSlotAssigner.java:64` is the one draw site).
7. **Recursion:** a deep-path case overflows under `--jitless` after the explicit-stack rewrite, or a twin comparison diverges.
8. **Unreachable branch** no scenario can reach and not provably dead from the Java (a provable one is U with its Java line).
9. **Scenario count:** T18 finds more than about 40 site scenarios.
10. **Coverage:** below 90/90/90/90 after T21, except shortfalls journaled as U.
11. **Suite time:** `npm test` more than baseline + 20 s at similar load, or `LayeredLoopsVectors.test.ts` over 30 s alone.
12. **Byte-identity:** `regen-goldens.sh`, the landed vector scripts or `melk:generate` change a landed file.
13. **Size:** a ref file exceeds 16 MiB, or `LayeredLoopsVectors.java` exceeds 5,000 lines.
14. **Mission end:** squash as W11 says; the driver verifies one commit on the base and a clean tree.
15. **Temporal dead zone (F10):** the entry-point fitness test fails after wiring and the E1 recipe does not resolve it; an
    entry-order import is never the fix.
16. **Box provenance (C6):** a Java `==`/`!=` on boxed values whose operands cannot be proven fresh or shared.
17. **Divergence:** a coordinate differs from the oracle by more than 1e-6 with the mechanism traced outside this mission's
    classes, a last-ulp difference the sweep's exact hash rejects, or a difference traced to a hashed container's order (W6, W7)
    → `needs-ruling` naming the rows. A difference with no stated mechanism halts (driver).
18. **Java baseline drift:** the start or end run of a suite in [java-baseline.md](java-baseline.md) differs.
19. **Unpinned row:** the formerly pinned row (W4) cannot replay its recorded expectation for a reason other than a plain port
    defect. Landed rows and their assertions stay frozen → `needs-ruling`.
20. **Label metrics:** a suite or row needs a label text missing from `layered-label-metrics.json`: append it under G8's
    append-only proof (push-forward); an existing entry changing is a stop.
21. **Allocation shift:** a suite of [java-baseline.md](java-baseline.md) cannot be ported in this mission, or its oracle run count
    cannot be reproduced over its inputs.
22. **Upstream:** an ELK defect the port copies: draft in the journal and file `needs-ruling` (W12); never a fix branch.
