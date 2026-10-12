<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — Translation lint

One task; the last piece of infrastructure the locale batches rely on.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T9](T9-translation-lint.md) | Mechanical translation checks + fixtures | typescript-pro | `test/helpers/docs.ts`, `test/docs/translation-lint.test.ts`, `test/docs/fixtures/lint/**` | T7 | [x] |

Batch done when T9's criteria pass with zero registered locales and the README gates are green.
