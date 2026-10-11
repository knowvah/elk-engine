<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — Bundle-dependency fitness test

**Agent:** typescript-pro · **Commit:** `test(architecture): enforce elk bundle dependency direction`

## Context
ELK is split into OSGi bundles whose `META-INF/MANIFEST.MF`
`Require-Bundle` headers define allowed dependencies (e.g. `alg.layered`
→ `core`, `graph`, `alg.common`; `core` → `graph`; `graph` → nothing
ELK). AD-7 maps Java packages to `src/` directories; AD-8 requires the TS
imports to respect the same direction. CI has no ELK checkout, so the
derived table is committed.

## Task
1. `tools/bundle-deps.ts` (run via `npx tsx`): read
   `$ELK_SOURCE_DIR` (default `../elk` relative to repo root; also accept
   a CLI arg) `plugins/*/META-INF/MANIFEST.MF` for the **in-scope bundles**
   (decisions.md "Bundle scope"), parse multi-line `Require-Bundle`
   (strip `;bundle-version=…`, `;visibility:=…`, `;resolution:=…`), keep
   only in-scope ELK bundles, map each bundle to its tsDir, emit sorted,
   stable JSON to stdout or `--write`.
2. Commit the generated `test/architecture/bundle-deps.json`.
3. `module-boundaries.fitness.test.ts`:
   - parse every non-test `src/**/*.ts` import specifier that is relative;
     resolve to a target file; determine source and target bundle by
     **longest tsDir prefix**; fail if target bundle ∉ source's `requires`
     ∪ {itself}; `src/java/**` is importable by all and may import only
     `src/java/**`; files under `src/` that belong to no bundle and are not
     `src/java` or `src/index.ts` fail ("unmapped directory").
   - if `ELK_SOURCE_DIR` resolves and its HEAD equals the `elkCommit` in
     the JSON, regenerate and assert equality with the committed file;
     otherwise `it.skip` with a reason naming the missing dir / sha.
   - self-check: a synthetic import `src/alg/force/X.ts` →
     `src/alg/layered/Y.ts` is reported.

## Write-set
`tools/bundle-deps.ts`, `test/architecture/bundle-deps.json`,
`test/architecture/module-boundaries.fitness.test.ts`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/<bundle>/META-INF/MANIFEST.MF` for in-scope bundles
- `../decisions.md#ad-7-module-layout-and-naming`, `#ad-8-fitness-functions`, `#bundle-scope-refines-phase-2-scope-used-by-t5-t13-t14-t18`

## Interface contract (output; consumed by T13 and future missions)
```ts
// test/architecture/bundle-deps.json
interface BundleDeps {
  elkCommit: string;                 // full sha of $ELK_SOURCE_DIR HEAD
  bundles: Record<string /* tsDir, e.g. "src/alg/layered" */, {
    bundle: string;                  // "org.eclipse.elk.alg.layered"
    requires: string[];              // tsDirs, sorted
  }>;
}
```
Mapping: strip `org.eclipse.elk.`, dots → `/`, prefix `src/`
(`org.eclipse.elk.graph.json` → `src/graph/json`).

## Acceptance criteria
- Given `ELK_SOURCE_DIR` at `8aaa3c14…`, when `npx tsx tools/bundle-deps.ts`,
  then output equals the committed JSON byte-for-byte; when absent, the
  regeneration check is skipped with a reason.
- Given a file in `src/alg/force/` importing from `src/alg/layered/`, then
  the boundary test fails naming both files.
- Given `src/graph/json/A.ts` importing `src/graph/B.ts`, then bundle
  resolution is `graph.json` → `graph` (longest prefix) and it passes.
- Given the committed JSON, then `src/graph` requires `[]` and
  `src/alg/layered` requires `["src/alg/common","src/core","src/graph"]`.

## Quality bar
Gates in README.md (brief). Parsing as pure exported functions in
`tools/bundle-deps.ts`, imported by the test. No new deps. Script never
writes outside the repo.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.
