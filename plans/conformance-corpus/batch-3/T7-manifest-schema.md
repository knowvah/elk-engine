<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — Manifest schema: algorithm, variant, retarget

**Agent:** typescript-pro · **Commit:** `feat(corpus): record algorithm and variant on curated goldens`

## Context
Curated goldens (`test/corpus/manifest.json` `golden[]`, 4 today, `corpus.test.ts:95` caps them
at 3–5) carry only `{ id, path, note }`. Future algorithm missions add goldens per algorithm and
variant (D1, D6). T5 gave the oracle `algorithm` (retarget) and `variant` case fields.

## Task
Add `algorithm`, `variant`, and optional `retarget` to golden entries; make `regen-goldens.sh`
pass them to the oracle; keep the existing refs byte-identical.

## Write-set
`test/corpus/manifest.json`, `test/corpus/corpus.ts`, `test/corpus/corpus.test.ts` (append
tests only), `tools/oracle/regen-goldens.sh`.

## Read-set
- `../decisions.md#d1--conformance-unit`, `#d2--retarget`, `#d6--variants`
- `../batch-2/T5-oracle-retarget.md#interface-contract-extends-t3-consumed-by-t6-t7-t8`
- `test/corpus/corpus.ts:10-60` · `test/corpus/corpus.test.ts:90-120` ·
  `tools/oracle/regen-goldens.sh:1-109` · `docs/conformance.md:115-150`

## Interface contract
```ts
interface GoldenEntry {
  id: string; path: string; note: string;
  algorithm: string;   // effective root algorithm, full id (the dashboard row)
  variant: string;     // key in test/corpus/variants.json
  retarget?: string;   // present only when the oracle must override (D2); equals algorithm
}
```
`regen-goldens.sh` sends `algorithm` to the oracle **only** when `retarget` is present, and
always sends `variant`. `variant: "default"` applies no overlay.

## Acceptance criteria
- Given the four existing entries, then each has `algorithm: "org.eclipse.elk.layered"`,
  `variant: "default"`, and no `retarget`.
- Given `tools/oracle/regen-goldens.sh`, then `git diff --exit-code test/golden/refs` is clean
  (including `_meta.json`).
- Given an entry missing `algorithm` or `variant`, then the manifest guard rejects it; given
  `retarget` that differs from `algorithm`, then it is rejected.
- Given the existing tests in `corpus.test.ts`, then none changed (append-only diff).

## Quality bar
README gates plus oracle gates; `shellcheck tools/oracle/regen-goldens.sh` clean. If an existing
test fails because of the new required fields, STOP (AD-13) rather than editing it.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No new curated goldens (a 6th would break `corpus.test.ts:95`; STOP 4).
