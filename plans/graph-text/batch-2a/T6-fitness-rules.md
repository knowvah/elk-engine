<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — Boundary fitness rules for `src/xtext` and `src/graph/text`, prettier ignores

**Agent:** typescript-pro · **Commit:** `test(T6): add xtext boundary rules and ignore elkt vector fixtures`

## Context
Mission 4b adds `src/xtext/**` (an EPL subset of Xtext, ported under AD-9's rule that only EPL source
is read) and fills `src/graph/text`. AD-8 requires every architectural constraint to be a fitness
test before the code exists. Today `test/architecture/module-boundaries.fitness.test.ts` maps any
`src/` file outside a bundle dir, `src/java`, `src/guava`, `src/emf`, `src/gson` to "unmapped
directory", so the first `src/xtext` file would fail the gate; and `src/graph/text` can already
import `src/core`/`src/graph` (committed `bundle-deps.json`) but not `src/xtext`.

## Task
1. Read `../elk/plugins/org.eclipse.elk.graph.text/META-INF/MANIFEST.MF:9-16` (`Require-Bundle`) and
   write the mapping into a comment above the new constants:
   `org.eclipse.elk.core` -> `src/core` (incl. `src/core/util/internal`, which `bundleOf` already
   resolves to `src/core` by longest prefix), `org.eclipse.elk.graph` -> `src/graph`,
   `org.eclipse.xtext` and `org.eclipse.xtext.util` -> `src/xtext`, `org.eclipse.xtext.xbase.lib` and
   `org.eclipse.xtend.lib` -> no directory (Xtend library calls become plain TypeScript at the call
   site, `docs/translation-rules.md` section 8), `org.antlr.runtime` and `org.eclipse.equinox.common` ->
   no directory (G6: the lexer/parser are hand-written; nothing from equinox is reached).
   `test/architecture/bundle-deps.json` is *generated* from in-scope ELK manifests and compared
   byte-for-byte by the `regeneration` test, so it must not change: `src/graph/text` keeps
   `requires: [src/core, src/graph]`.
2. In `module-boundaries.fitness.test.ts` (existing helpers at lines 19-26 constants, 53-98 `bundleOf`/`violationFor`, 100-108 `checkFile`, 119-130 `unmappedFile`):
   - add `XTEXT_DIR`, defined like `GSON_DIR` (`${TS_ROOT}/xtext`);
   - add `const XTEXT_CLIENT_BUNDLES: readonly string[] = ['src/graph/text']` with the mapping comment
     (only the graph.text bundle requires Xtext; `src/index.ts` stays exempt, lines 100-103);
   - `violationFor`: a file under `src/xtext` may import only `src/xtext`, `src/java`, `src/emf`,
     `src/guava` (Guava is a real directory: the Xtext sources use `LinkedHashMultimap`,
     `Iterables`, `Joiner`, ...; message `src/xtext may import only src/xtext, src/java, src/emf and
     src/guava`); a bundle file may import `src/xtext` only when `bundleOf(file)` is in
     `XTEXT_CLIENT_BUNDLES` (message `<from> may not import src/xtext`); the existing `src/java`,
     `src/guava`, `src/emf`, `src/gson` branches already forbid importing `src/xtext` — keep them and
     add tests that pin it;
   - `unmappedFile`: exempt `src/xtext`.
3. New `describe` blocks (copy the style of the `src/gson boundary` block, lines 420-465):
   `src/xtext boundary (graph-text T6)` with the cases in the acceptance criteria, and
   `graph.text Require-Bundle mapping` asserting `committed.bundles['src/graph/text'].requires`
   equals `['src/core','src/graph']` and `bundleOf('src/core/util/internal/LayoutOptionProxy.ts')`
   is `'src/core'`.
4. `.prettierignore`: after the existing `tools/vectors/transfer-scenarios/` line add the four vector inputs
   that batch 1 created (their exact bytes are the test input): `tools/vectors/elkt-parse-scenarios/`,
   `tools/vectors/elkt-validate-scenarios/`, `tools/vectors/elkt-write-scenarios/` (directories, trailing
   slash) and `tools/vectors/elkt-lexer-cases.txt` (file), under the same comment style. Verify the landed
   names with `git ls-files tools/vectors | grep -i '^tools/vectors/elkt-'` and follow the repository if they
   differ. Note why the entries are still wanted: `.elkt`/`.txt` have no Prettier parser, and T5 keeps its `.json`
   scenarios Prettier-clean today, so the ignore keeps the recorded inputs byte-stable under future formatter
   upgrades (AD-13) rather than fixing a present failure. Do not ignore the Java or `.sh` files.

## Write-set
`test/architecture/module-boundaries.fitness.test.ts`, `.prettierignore`.

## Read-set
- `test/architecture/module-boundaries.fitness.test.ts:19-130,317-345,420-465`
- `test/architecture/bundle-deps.json` (the `src/graph/text`, `src/core` entries)
- `tools/bundle-deps.ts:62-140` (how requires are derived; why the JSON must not change)
- `../elk/plugins/org.eclipse.elk.graph.text/META-INF/MANIFEST.MF:9-16`
- `.prettierignore`, `git ls-files tools/vectors`

## Decisions
- [G8](../decisions.md#g8--size-and-landing) · AD-8 (fitness functions), AD-9 (EPL-only sources)
- `plans/elk-engine-skeleton/decisions.md` AD-7 (layout), AD-10 (collections)

## Interface contract
No runtime contract. Produces the rule every later `src/xtext` / `src/graph/text` task is checked by
(T7, T8, T11, T12, T14, T16 write `src/xtext`; T9, T13, T15, T17–T21 write `src/graph/text`).

## Acceptance criteria
- Given `src/xtext/util/Strings.ts` importing `../../java/lang/JavaString.js`, `../emf/...` or
  `../guava/...`, when the fitness test runs, then `checkFile` returns no violation.
- Given `src/xtext/X.ts` importing `../graph/ElkNode.js` or `../core/CoreOptions.js`, then it reports
  `src/xtext/X.ts -> src/graph/ElkNode.ts: src/xtext may import only src/xtext, src/java, src/emf and
  src/guava`.
- Given `src/graph/text/ElkGraphText.ts` importing `../../xtext/scoping/IScope.js` it passes; given
  `src/graph/json/JsonAdapter.ts`, `src/alg/layered/X.ts`, `src/core/X.ts`, `src/java/util/A.ts`,
  `src/emf/ecore/E.ts`, `src/guava/Lists.ts`, `src/gson/J.ts` importing `src/xtext`, each is reported.
- Given the committed `.prettierignore`, then `npm run format:check` ignores every `tools/vectors/elkt-*`
  fixture directory and still checks the Java/shell files.

## Quality bar
README gates (`npm run format:check`, `npm run typecheck`, `npm run complexity`; the orchestrator runs
`npm run coverage`). TDD: write the failing `checkFile` cases first. `bundle-deps.json` byte-identical.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not edit `tools/bundle-deps.ts` or `bundle-deps.json`, other architecture tests, or any `src/`
file. Do not add `src/xtext` sources here. The agent does not commit; the orchestrator commits per task.
