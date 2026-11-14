<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: surface proposal and candidate entry

Everything later (typedoc, examples, pack rehearsal) consumes the candidate module and the `@knowvah/elk-engine` mapping,
so this batch runs first and alone.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T1](T1-surface-proposal.md) | Proposal doc, candidate entry, its test, the package-name mapping | orchestrator | `docs/architecture/public-api.md`, `test/public-api/candidate-index.ts`, `test/public-api/candidate-index.test.ts`, `tsconfig.json`, `vitest.config.ts` | — | [x] |

Gate after the batch: `npm run typecheck`, `npx vitest run test/public-api`, `npm run format:check`; `src/index.ts` is
byte-identical to the base.
