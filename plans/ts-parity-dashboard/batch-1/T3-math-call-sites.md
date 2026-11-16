<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: the list of non-strict `Math.*` call sites

Decision: TP7 ([decisions.md](../decisions.md)). Agent: typescript-pro (sonnet). Read [agent-rules.md](../agent-rules.md) first.

## Context

AD-4 sends last-ulp differences between the JVM's and V8's `Math.*` to a known-divergences list, and roadmap row 9 asks for that
list for every non-strict call site. Java's `Math.sin` and its kin may use HotSpot intrinsics that differ from `StrictMath`
(fdlibm) in the last bit. V8's results equaled `StrictMath` on every input 8b measured (`docs/conformance.md`, § Known
divergences (mission 8b)). `src/java/lang/JavaMath.ts:97-106` `log` is the bit-exact `StrictMath.log` used by `Random.ts` and
`EadesModel.ts` (8b FD3). At planning, `src/` had 36 transcendental calls in 14 files: `Math.acos` 3, `asin` 3, `atan2` 6, `cos` 7,
`exp` 1, `log` 2, `log10` 1, `pow` 7, `sin` 6 (`grep -o` count; some lines hold two calls). Find them with
`grep -rnE "Math\.(sin|cos|tan|asin|acos|atan|atan2|exp|log|log10|log1p|expm1|pow|sinh|cosh|tanh|hypot|cbrt)\(" src --include=*.ts --exclude=*.test.ts`.

## Task

1. `test/architecture/math-call-sites.json`: one entry per call site, `{ file, fn, javaSite }`. `file` is the repo-relative
   path, `fn` the function name, `javaSite` the Java `file:line` the call ports (read the `@see` and the Java). Sort the
   entries by file and then by function.
2. `test/architecture/math-call-sites.fitness.test.ts`: scan `src/**/*.ts` (excluding `*.test.ts`) with the regular expression
   above and compare the multiset of `(file, fn)` with the JSON in both directions. A new call site, or a removed one, fails and
   names the file. Follow the scanning pattern of the existing fitness tests in `test/architecture/`.
3. `docs/conformance.md`: a new section `### Non-strict Math call sites (AD-4 known-divergences list)
   {#math-call-sites}`, placed directly after the "Concrete entries" table of § 2. It holds one table row per site: TS
   `file:line`, Java site, function, whether the Java calls `Math` or `StrictMath`, the evidence that reaches the site (refs,
   goldens or sweep algorithms that exercise it, from the existing conformance sections), and the observed last-ulp divergence
   with a link to its existing entry (for example the 8b `getOrthogonalPoints` `sin`/`cos`), or `none observed`. Then one
   paragraph on why there is no `StrictMath.ts` (TP7) and a pointer to #74 for the 0.01 px audit. Edit no other line of the
   file.

## Write-set

New `test/architecture/math-call-sites.json`, new `test/architecture/math-call-sites.fitness.test.ts`, `docs/conformance.md`
(the new section only).

## Read-set

The 14 files the grep lists (only the lines it shows and their `@see`), the Java files those `@see` lines name, `docs/conformance.md`
§ 2 (`:117-192`) and the Known-divergences sections (`:1698-1730`, `:1832-1868`, `:1984-2053`), `src/java/lang/JavaMath.ts:90-110`,
and one existing fitness test in `test/architecture/` for its pattern.

## Acceptance criteria

- Given the tree at planning, when the fitness test runs, then it passes, and the JSON has 36 entries (or as many as the grep
  finds at the task's start; journal the difference).
- Given a scratch copy of a `src` file with one more `Math.sin(` call (the test takes its root as a parameter or works on
  an in-memory fixture), when the comparison runs, then it fails and names that file and `sin`.
- Given `docs/conformance.md`, when `npm run docs:build` runs, then it builds, and every row of the new table has a Java site
  and an evidence cell (no blank cell).
- Given `git diff docs/conformance.md`, then only added lines appear.

## Quality bar

`npx vitest run test/architecture`, typecheck, `npx prettier --check` for the new files and `docs/conformance.md`.

**Observability:** N/A — no new observable operations.
**Rollback:** reversible.
