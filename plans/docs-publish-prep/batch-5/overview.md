<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5: pack rehearsal; CI wiring

T7 and T8 have disjoint write-sets. T8 needs only the script names fixed in this brief (`docs:linkcheck` from T5,
`pack:smoke` from T7, `publish:check` from T6), so they may run in parallel; T8's final check runs after T7 lands.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T7](T7-pack-smoke.md) | Pack, install in a clean project, lay out with the bundled candidate | typescript-pro (sonnet); orchestrator edits `package.json` | `tools/release/pack-smoke.ts`, `tools/release/pack-contents.ts`, `test/release/pack-contents.test.ts`, `package.json` (script) | T6 | [x] |
| [T8](T8-ci.md) | CI steps for typedoc, link check, examples, publish check, pack rehearsal | orchestrator | `.github/workflows/ci.yml`, `.github/workflows/docs.yml` | T6 | [x] |

Gate after the batch: `npm run pack:smoke` and `npm run pack:smoke -- --entry test/public-api/candidate-index.ts` exit 0;
the new tool files pass an explicit lizard run; `npx vitest run test/release` passes; format, typecheck.
