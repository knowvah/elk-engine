<!-- SPDX-License-Identifier: EPL-2.0 -->

# T17 — Conformance doc and oracle runbook

**Agent:** documentation-engineer · **Commit:** `docs(conformance): define oracle, tolerance, and runbook`

## Context
dot-engine's `docs/conformance.md` defines what "correct" means for its
port. elk-engine needs the same, plus the patch-series workflow that will
carry text-sizing normalization seams into the oracle.

## Task
Write `docs/conformance.md`.

## Write-set
`docs/conformance.md`.

## Read-set
- `~/git/knowvah/dot-engine/docs/conformance.md` (shape)
- `tools/oracle/README.md`, `build.sh`, `run.sh`, `regen-goldens.sh`
- `test/golden/compare-json.ts`, `test/golden/refs/elk/_meta.json`
- `../decisions.md#ad-3…`, `#ad-4…`, `#ad-5…`, `#ad-13…`
- Phase 4 failure modes (below)

## Specification
1. **Oracle** — definition (AD-3), pinned commit, patch series semantics,
   why not elkjs.
2. **Conformance bar** — AD-4 rules exactly as `compareLayout` implements
   them; known-divergences policy (ulp-level `Math.*`, nondeterministic
   identity-hash iteration per AD-10, time-seeded `Random` when
   `randomSeed = 0`).
3. **Goldens & corpus** — AD-5; how ids map to elk-models paths; when and
   how refs are regenerated; journaling rule.
4. **Seam patches** — workflow: edit in the oracle worktree → `git
   format-patch` to `tools/oracle/patches/NNNN-<slug>.patch` → matching TS
   seam → remove + rebuild worktree → `regen-goldens.sh` → journal entry
   naming the patch.
5. **Oracle operations (runbook)** — the three Phase 4 failure modes:

   | Failure | Detection | Mitigation |
   |---|---|---|
   | Tycho build fails (p2 unreachable / JDK) | `build.sh` non-zero; `.oracle-build.log` | retry with JDK 17 via `JAVA_HOME`; check network; else escalate |
   | Golden drift after a patch | `oracle-refs`/conformance tests fail with diff report | `regen-goldens.sh`, review diff, journal patch id; never hand-edit |
   | elk-models missing / wrong sha | corpus tests skip with named shas | `test/corpus/fetch.sh`; never move an existing clone's HEAD |
6. **Gates** — the commands a change must pass.

## Acceptance criteria
- Given the doc, then sections 1–6 exist and the runbook table covers all
  three failure modes.
- Given section 2, then the tolerance (1e-6) and exact-structure rules
  match `compare-json.ts` defaults.
- Given the doc, then no absolute filesystem paths appear.

## Quality bar
Gates in README.md (brief). < 300 lines.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.
