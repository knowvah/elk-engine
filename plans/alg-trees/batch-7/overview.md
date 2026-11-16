<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 7 — Goldens test and tree sweep; recursion probe and coverage closure

Two tasks **in parallel** after batch 6, disjoint write-sets. T19 may edit any `src/alg/{mrtree,radial,vertiflex}` file only for an
AC6 conversion (TR7); T18 writes no `src/` file.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T18 | `tree-goldens.test.ts`; the three registrations in `ts-layout-compare.ts`; the TR6 sweep ([brief](T18-goldens-and-sweep.md)) | typescript-pro | test/golden/tree-goldens.test.ts, tools/corpus/ts-layout-compare.ts, test/corpus/ts-layout-compare.test.ts | T4, T11, T13, T17 | [x] |
| T19 | Recursion probe (TR7), coverage closure, `unreached.md` ([brief](T19-recursion-coverage.md)) | typescript-pro | plans/alg-trees/unreached.md, new `*.test.ts` under src/alg/{mrtree,radial,vertiflex}, AC6 conversions | T11, T13, T17 | [x] |
