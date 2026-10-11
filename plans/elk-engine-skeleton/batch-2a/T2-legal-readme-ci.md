<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — LICENSE, NOTICE, README, CI

**Agent:** documentation-engineer · **Commit:** `docs(repo): add license, notice, readme, and ci workflow`

## Context
elk-engine (`@knowvah/elk-engine`, GitHub `knowvah/elk-engine`) is a
faithful TypeScript port of the Eclipse Layout Kernel, licensed EPL-2.0
like upstream ELK and the sibling port dot-engine. The scaffold (T1)
exists. Directory will be renamed — repo-relative paths only.

## Task
Add the legal files, a README describing the project and its status, and
the GitHub Actions CI workflow.

## Write-set
`LICENSE`, `NOTICE.md`, `README.md`, `.github/workflows/ci.yml`.

## Read-set
- `$ELK_SOURCE_DIR/LICENSE.md` (EPL-2.0 text), `$ELK_SOURCE_DIR/NOTICE.md`
  (attribution style), `$ELK_SOURCE_DIR/README.md`
- `~/git/knowvah/dot-engine/LICENSE` (same EPL-2.0 text — compare)
- `~/git/knowvah/dot-engine/.github/workflows/ci.yml` (structure)
- `../decisions.md` table (AD-1, AD-2, AD-6, AD-14, AD-15, Bundle scope)

## Specification
- `LICENSE`: the EPL-2.0 license text, byte-identical body to dot-engine's
  `LICENSE` (plain text). If ELK's `LICENSE.md` text differs in substance
  (e.g. Secondary Licenses notice), keep EPL-2.0 standard text and journal
  the difference.
- `NOTICE.md`: elk-engine is a derivative work of Eclipse ELK
  (https://www.eclipse.org/elk, https://github.com/eclipse-elk/elk);
  ported from commit `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`; test
  models from `eclipse-elk/elk-models` `ac5af2ba511c0037e4f347e8bd91f013950951c7`;
  copyright holders per upstream NOTICE; SPDX `EPL-2.0`; trademark note
  that "Eclipse" and "ELK" are Eclipse Foundation marks and this project is
  not affiliated.
- `README.md`: name `elk-engine`; one-paragraph description; **status:
  pre-alpha skeleton, no layout algorithms yet**; goals (faithful port,
  oracle-verified, browser-safe, zero runtime deps); public contract
  (AD-14) in one sentence; development commands (`npm ci`,
  `npm run typecheck`, `npm test`, `npm run coverage`, `npm run build`);
  external dirs table (`ELK_SOURCE_DIR`, `ELK_ORACLE_DIR`,
  `ELK_MODELS_DIR` with defaults); links to `CLAUDE.md`,
  `docs/architecture/overview.md`, `docs/conformance.md`,
  `docs/translation-rules.md`, `plans/roadmap.md` (some created later in
  this mission — link anyway); license section. No badges for services
  that do not exist yet.
- `ci.yml`: on push/PR to `main`; `permissions: contents: read`; one job
  on ubuntu-latest: checkout, setup-node 26, `npm ci`,
  `npm run typecheck`, `npm run coverage`. No JVM, no GitHub Packages
  registry (no `@knowvah` deps). Pin action major versions as dot-engine
  does.
- SPDX: Markdown files start with `<!-- SPDX-License-Identifier: EPL-2.0 -->`;
  `ci.yml` starts with `# SPDX-License-Identifier: EPL-2.0`. `LICENSE` has none.

## Acceptance criteria
- Given `LICENSE`, then its body matches dot-engine's EPL-2.0 `LICENSE`
  (`diff` empty or differences journaled).
- Given `NOTICE.md`, then it names Eclipse ELK, ELK commit `8aaa3c14…`,
  and elk-models `ac5af2ba…`.
- Given `ci.yml`, then it runs `npm ci`, `npm run typecheck`,
  `npm run coverage` on Node 26 with no JVM step.
- Given README.md, then it contains no absolute filesystem paths and states
  pre-alpha status.

## Quality bar
Gates in README.md (brief). Lines ≤ 100 chars in Markdown where practical.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No release/publish workflow, no semantic-release config, no docs site.
Never push or create the GitHub repo.
