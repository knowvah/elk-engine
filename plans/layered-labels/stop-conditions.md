<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions — layered-labels (confirmed at planning, 2026-11-05)

Halt, journal, wait for the user.

1. **Write-set:** a file outside the task's write-set needs changing (colocated `.test.ts` files count as the task's). Off limits:
   everything under the README's "Never edit", `src/core/**`, `src/graph/**`, `src/alg/common/**`, `src/java/**`,
   `src/alg/layered/{graph,p1cycles,p2layers,p3order,p4nodes,p5edges,components,compound}/**`, the 7b–7f processors and the
   driver (`ElkLayered*`, `GraphConfigurator`). G11's files are the only exception, in T9 and T11 only.
2. **Repeated failure:** the same gate check fails twice in a row (timeout-only at high load excepted), or one location is edited
   three times in a row for the same check.
3. **AD-13:** a byte diff in a landed ref, vector or golden (G8's added keys excepted, with every old entry proven byte-identical);
   a test that can only pass by changing its assertion, unless G11 lists it; a hand-derived numeric expectation (L4); a `full`,
   `models` or `scenarios` row needing re-recording after T1 lands.
4. **Locked decisions:** a change would contradict G1–G12, F1–F16, FX1–FX8, earlier missions' rows or AD-1…AD-16.
5. **Refusal:** a planned row's whole plan names a member outside the ported sets and it is not a 7g category (self loops,
   wrapping, compaction) or 7h (`INCLUDE_CHILDREN`, `HIERARCHICAL_NODE_RESIZER`).
6. **Randomness:** a row's seed is 0, or a 7f2 class draws from anything but `InternalProperties.RANDOM`.
7. **Recursion:** a deep-path case overflows under `--jitless` after the explicit-stack rewrite, or a twin comparison diverges.
8. **Unreachable branch** that no scenario can reach and that is not provably dead from the Java (a provable one is U with its
   Java line, journaled, not a stop).
9. **Scenario count:** T14 finds more than about 30 site scenarios.
10. **Coverage:** below 90/90/90/90 after T17, except shortfalls journaled as U.
11. **Suite time:** `npm test` more than baseline + 20 s at similar load, or `LayeredLabelsVectors.test.ts` over 30 s alone.
12. **Byte-identity:** `regen-goldens.sh`, the landed vector scripts or `melk:generate` change a landed file.
13. **Size:** a ref file exceeds 16 MiB, or `LayeredLabelsVectors.java` exceeds 5,000 lines.
14. **Mission end:** regroup into at most 5 commits as the README says, then stop and hand over the landing commands.
15. **Temporal dead zone (F10):** the entry-point fitness test fails after wiring and the E1 recipe does not resolve it; an
    entry-order import is never the fix.
16. **Box provenance (C6):** a Java `==`/`!=` on boxed values whose operands cannot be proven fresh or shared.
17. **Divergence:** a coordinate differs from the oracle by more than 1e-6 with the mechanism traced outside the write-sets, a
    last-ulp difference the sweep's exact hash rejects, or a difference traced to the iteration order of a hashed container,
    FX2's scenario included. G3's debug-JSON property order is pre-decided and is not a stop.
18. **Java baseline drift:** the start or end run of a suite in [java-baseline.md](java-baseline.md) differs.
19. **Unpinned row:** a row whose pin T11 deletes (FX6, FX7) cannot replay its recorded expectations for a reason other than a
    plain port defect. Landed rows and their assertions stay frozen; the user decides.
20. **Label metrics (G8):** an existing entry of `layered-label-metrics.json` would change, or a suite needs a size the JVM measures
    differently than the table records.
21. **Allocation shift:** more than about a third of the 12 suites of [java-baseline.md](java-baseline.md) leave this mission, or
    a suite's oracle run count cannot be reproduced over its inputs.
22. **Outside the repo (G10):** creating, pushing or opening anything outside this repository and local `../elk` worktree branches.
    Pushing branches, opening PRs and filing issues are the user's.
