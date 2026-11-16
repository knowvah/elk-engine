<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions — alg-trees (auto-confirmed at planning, 2026-11-10)

Queue form: a stop that blocks **only some rows or one task's part** is filed with `gh issue create --label needs-ruling` naming
the exact rows or files, journaled as a `ruling` row, and those rows are left as they are while the rest is finished. A stop that
blocks **the whole mission** halts it: journal, commit the work, and end with the halted line the driver prompt names. A write
outside a task's write-set is not a stop: journal why.

1. **Outside the worktree:** a change needs `../elk`, `../elk-end-label-*`, `$ELK_MODELS_DIR`, `~/.claude`, the main checkout or a
   new or changed oracle patch → `needs-ruling`.
2. **Repeated failure:** the same gate check fails twice in a row (timeout-only failures at high load excepted), or one location is
   edited three times in a row for the same check → halt that task with the diagnosis so far.
3. **AD-13:** a byte diff in a landed ref, vector or golden; a test that can only pass by changing its assertion; a hand-derived
   numeric expectation; a recorded row needing re-recording after its recorder task committed (a recorder `fix` before any TS for
   that algorithm exists is push-forward, journaled, as 7h T1 did) → `needs-ruling` naming the rows; halt if the mission depends
   on them.
4. **Locked decisions:** a change would contradict TR1–TR10, earlier missions' rows or AD-1…AD-16.
5. **Randomness:** a scenario seed is 0, or a ported class draws randomness (none of the three bundles draws at the pin; mrtree's
   `InternalProperties.RANDOM` is declared and unused).
6. **Recursion:** a TR7 probe overflows in TS where the oracle completes and the AC6 conversion's verbatim-reference comparison
   diverges.
7. **Unreachable branch** that no scenario reaches and that is not provably dead from the Java (a provable one is `U` with its Java
   line, in `unreached.md`).
8. **Coverage:** below 90/90/90/90 after T19, except shortfalls journaled as `U`; any of the three bundles below 90 % branches.
9. **Suite time:** `npm test` (every sweep dir `/nonexistent`) more than baseline + 20 s at similar load (baseline at planning: 75 s
   at load 5–40; re-measure at mission start), or any one `*Vectors.test.ts` replay over 30 s alone.
10. **Byte-identity:** `regen-goldens.sh` (default, `algorithms`, `layered`), a landed vector script or `melk:generate Core Labels
    Polyomino Layered` changes a landed file.
11. **Size:** a ref file exceeds 16 MiB, or a recorder launcher exceeds 5,000 lines.
12. **Temporal dead zone:** the per-module import smoke fails after a wiring task and `NON_LEAF_DEFAULT_TYPES` plus a section split
    do not resolve it. An entry-order import is never the fix.
13. **Box provenance:** a Java `==`/`!=` on boxed values (`Integer`, `Double` from maps such as `gloFanMap`, or
    `entry.getKey().getDefault() != entry.getValue()` at `M/ComponentsProcessor.java:249`) whose operands cannot be proven fresh or
    shared → journal the proof or `needs-ruling`.
14. **Divergence:** a coordinate differs from the oracle by more than 1e-6 with the mechanism traced outside this mission's classes;
    a last-ulp `Math.atan2/sin/cos/acos` flip of a discrete decision (translation rules §1.9; e.g. `DoubleMath.fuzzyCompare` at
    `R/RadialUtil.java:178`); or a difference traced to an identity-hashed container's order (TR3) → `needs-ruling` naming the rows.
    A difference with no stated mechanism halts (driver rule).
15. **Landed-code defect:** a mismatch traced to landed `core`, `graph`, `alg.common` (`NodeMicroLayout`) or a shim is a port defect:
    diagnose (mechanism, origin, causal chain, ruled out), fix in place, journal. A fix that changes a landed ref's replay is stop 3.
16. **Java baseline drift:** the start or end run of [java-baseline.md](java-baseline.md) differs.
17. **Upstream:** an ELK defect the port copies: draft it in the journal and file `needs-ruling`. Never a fix branch, never upstream.
18. **Mission end:** squash as TR10; the driver verifies one commit on the base and a clean tree.

## Push-forward (decide and journal)

Splits (sections behind a facade, helpers at Java boundaries) where the 500-line / 30-NLOC / CCN-10 limits force them; scenario
shapes, counts and trims to fit 16 MiB; the option-value enumeration of TR2 and each golden's input; recorder `fix`es before any TS
of that algorithm exists; AD-10 insertion order with a twin where iteration is observable; `NON_LEAF_DEFAULT_TYPES` entries; sweep
filters, timeouts and out-of-scope counts; `U` rows with their Java line; prose typos per CLAUDE.md; agent prompts, scratch
directories, test organisation; 1–3 line pre-existing fixes; timeout-only reruns; `.agent-notes/alg-trees.md`; `follow-up` issues
for defects outside the mission.
