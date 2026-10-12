<!-- SPDX-License-Identifier: EPL-2.0 -->

# T33 — Close-out

**Agent:** orchestrator · **Commit:** `docs(plans): record docs-site mission completion`

## Task
1. `test/docs/goldens-i18n.test.ts`: turn golden-description coverage into a hard 100% assertion
   for the ids present now, for every registered locale (a later-added id falls back to English).
2. Measure and journal: `time npm run docs:build` vs the T1 baseline; every locale's
   `@localSearchIndex<p>*.js` size vs English; `dist/` HTML count per locale.
3. `README.md`: the documentation section lists the languages served.
4. `.agent-notes/docs-site.md`: novel observations from the mission (facts only).
5. Mission summary at the bottom of `plans/docs-site/README.md`: tasks done vs planned,
   quarantined locales, decisions journaled (count, items for the user), gate results, build-time
   and index-size measurements, follow-ups (HTTPS enforcement after first deploy, TypeDoc at first
   publish, ESLint when typescript-eslint supports TS 7.1, playground with the core engine).
6. Final commit body carries the one-line stop summary. Do not push; report the PR instructions
   (push `feature/docs-site`, open the PR titled `feat(docs): add the documentation site with 24
   locales`, merge with a merge commit using admin bypass for the signature rule).

## Write-set
`test/docs/goldens-i18n.test.ts`, `README.md`, `.agent-notes/docs-site.md`,
`plans/docs-site/README.md`, `plans/docs-site/decision-journal.md`.

## Acceptance criteria
- Given every registered locale, when `npm test` runs, then the goldens coverage assertion passes
  at 100% of the current ids.
- Given the final tree, then `docs:build` ≤ 3× the T1 baseline and every locale index ≤ 3× English.
- Given the README summary, then it lists every quarantined locale (or states none).

## Observability / Rollback
Measurements are the deliverable. Reversible.
