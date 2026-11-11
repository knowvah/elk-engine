<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions — alg-force-disco (auto-confirmed at planning, 2026-11-11)

Queue form: a stop that blocks **only some rows or one task's part** is filed with `gh issue create --label needs-ruling` naming
the exact rows or files, journaled as a `ruling` row, and those rows are left as they are while the rest is finished. A stop that
blocks **the whole mission** halts it: journal, commit the work, and end with the halted line the driver prompt names. A write
outside a task's write-set is not a stop: journal why.

1. **Outside the worktree:** a change needs `../elk`, `../elk-end-label-*`, `$ELK_MODELS_DIR`, `~/.claude`, the main checkout or a
   new or changed oracle patch → `needs-ruling`.
2. **Repeated failure:** the same gate check fails twice in a row (timeout-only failures at high load excepted), or one location is
   edited three times in a row for the same check → halt that task with the diagnosis so far.
3. **AD-13:** a byte diff in a landed ref, vector or golden; a test that can only pass by changing its assertion; a hand-derived
   numeric expectation. Leave the row, file it.
4. **Locked decisions:** a change would contradict FD1–FD10, earlier missions' rows or AD-1…AD-16.
5. **Randomness:** a scenario seed is 0, or a draw sequence differs from the recorded row.
6. **Recursion:** an FD7 probe overflows in TS where the oracle completes and the AC6 conversion's verbatim-reference comparison
   fails.
7. **Unreachable branch** that no scenario reaches and that is not provably dead from the Java (a provable one is `U` with its Java
   line) → list it in `unreached.md`.
8. **Coverage:** below 90/90/90/90 after T12, except shortfalls journaled as `U`; any of the two bundles below 90 % branches.
9. **Suite time:** `npm test` (every sweep dir `/nonexistent`) more than baseline + 20 s at similar load.
10. **Byte-identity:** `regen-goldens.sh` (default, `algorithms`, `layered`, `trees`), a landed vector script or `melk:generate` of
    the landed bundles differs.
11. **Size:** a ref file exceeds 16 MiB, or a recorder launcher exceeds 5,000 lines.
12. **Temporal dead zone:** the per-module import smoke fails after a wiring task and `NON_LEAF_DEFAULT_TYPES` plus a section split
    do not fix it.
13. **Box provenance:** a Java `==`/`!=` on boxed values. Prove the values from the Java, or model the identity; `uVector == vVector`
    is settled (FD9).
14. **Divergence:** a coordinate differs from the oracle by more than 1e-6. Trace the first differing stop. Mechanism in this
    mission's classes: fix at origin. Mechanism below the code (a disco contour coordinate that flips one cell because a last-ulp
    `Math.sin`, `cos` or `atan2` meets an exact tangency): prove it with a controlled experiment, add it to the known-divergences list
    (AD-4), and file `needs-ruling` with the row. Never loosen the bar.
15. **Landed-code defect:** a mismatch traced to landed `core`, `graph`, `alg.common` or a shim is a port defect: fix it at origin
    with a vector proving it, unless that means changing a landed expectation (stop 3).
16. **Java baseline drift:** the start or end run of [java-baseline.md](java-baseline.md) differs.
17. **Upstream:** an ELK defect the port copies: draft it in the journal and file `needs-ruling`. Never a fix branch, never upstream.
18. **Log proof:** a `JavaMath.log` row differs from the JVM (FD3). The shim is wrong; do not fall back to native `Math.log`.
19. **Mission end:** squash as FD10; the driver verifies one commit on the base and a clean tree.

## Push-forward (decide and journal)

Splits (sections behind a facade, helpers at Java boundaries) where the 500-line / 30-NLOC / CCN-10 limits force them; scenario
shapes, counts and trims to fit 16 MiB; the option-value enumeration of FD2 and each golden's input; recorder `fix`es before any TS
of that algorithm exists; AD-10 insertion order with a twin where iteration is observable; `NON_LEAF_DEFAULT_TYPES` entries; sweep
filters, timeouts and out-of-scope counts; `U` rows with their Java line; prose typos per CLAUDE.md; agent prompts, scratch
directories, test organisation; 1–3 line pre-existing fixes; timeout-only reruns; `.agent-notes/alg-force-disco.md`; `follow-up`
issues for defects outside the mission.
