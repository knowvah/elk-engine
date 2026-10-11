<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14 — Port map (Java package → TS module)

**Agent:** documentation-engineer · **Commit:** `docs(architecture): add java package to typescript module port map`

## Context
AD-7 fixes the mapping rule; future missions need the explicit table to
size work and assign write-sets — the analogue of graphviz's
`typescript-port.md` used by dot-engine.

## Task
Write `docs/architecture/port-map.md`.

## Write-set
`docs/architecture/port-map.md`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/<in-scope bundle>/src/**` (package dirs, file
  counts, LOC; `.melk` / `.xtend` / EMF `impl/` locations)
- `$ELK_SOURCE_DIR/test/*/src/**` (JUnit test packages)
- `../decisions.md#ad-7…`, `#ad-11…`, `#ad-12…`, `#bundle-scope…`

## Specification
- Summary table first: per in-scope bundle → TS root dir, Java files,
  LOC, test plugin, test files.
- Then per bundle: table of every Java package → TS directory → file
  count → LOC → port strategy (`hand port` | `EMF → plain class (AD-11)` |
  `melk codegen (AD-12)` | `Xtend → hand port` | `not ported` + reason).
  Mark generated-at-build artifacts (`*Options.java`,
  `*MetaDataProvider.java`) as produced by AD-12, listing which `.melk`
  produces them.
- JUnit mapping: test package → colocated `*.test.ts` target dir.
- Note Java packages that span bundles (e.g. `org.eclipse.elk.core.*` in
  `core` vs `core.service`) and how longest-prefix resolution handles them.
- SPDX HTML comment first line.

## Acceptance criteria
- Given every package directory with `.java`/`.xtend` sources in the
  in-scope bundles, then it appears in port-map.md with a TS dir and
  strategy (verify with a `find` count and state the count in the doc).
- Given each `.melk` file in scope, then its generated classes and target
  TS paths are listed.
- Given the doc, then no absolute filesystem paths appear.

## Quality bar
Gates in README.md (brief). If > 500 lines, split into
`port-map.md` (summary + index) and `port-map-<bundle>.md` for `alg.layered`
only — that extra file is pre-approved for this write-set.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.
