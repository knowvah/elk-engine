<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — Layered golden test per direction and hierarchy mode

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T10): compare layered goldens per direction and hierarchy mode`
Scratch: `$TMPDIR/7h/T10/`.

## Context

Mission 7h, H4. T3 recorded 24 refs in `test/golden/refs/elk-layered/` from `test/golden/layered.json`, whose inputs are
`test/golden/inputs/pipeline/**`. `test/golden/layered-goldens.test.ts` is the template (read ELK JSON, `applyOverlay`,
`RecursiveGraphLayoutEngine`, `exportLikeOracle`, `compareLayout`). `test/corpus/corpus.ts` exports the entry guard
`isGoldenEntry` and `loadVariantNames`, but its `loadManifest` reads only `test/corpus/manifest.json`.

## Task

1. `test/golden/layered-hierarchy-goldens.test.ts`: load `layered.json` with `isGoldenEntry` on each entry and assert the
   variants are known. Assert it has 24 entries, covering the 4 directions and the 2 hierarchy variants for each of the 4 models.
   Compare each ref at AD-4 (`compareLayout`, `formatDiffs` empty). Assert that `_meta.json` names `jvmFlags` `-XX:hashCode=2`
   and the pinned commit.
2. A mismatch enters diagnosis mode, as in T9. If T3's no-flag evidence showed a difference for that id, cite it.

## Write-set

`test/golden/layered-hierarchy-goldens.test.ts`.

## Read-set

`test/golden/layered-goldens.test.ts`, `test/corpus/corpus.ts:40-95`, `test/helpers/graph-overlay.ts`, T3's journal rows,
`decisions.md` H4.

## Acceptance criteria

- Given the 24 goldens, when laid out in TS, then each equals its ref at AD-4.
- Given `layered.json`, when loaded, then it has 24 entries covering every model × variant cell once.

## Observability / Rollback

N/A. Reversible.
