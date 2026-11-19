<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: site inventory

## Context

#45 asks for every omitted `assert` site to be found by searching `src/` for the omission comments and matching them
against `assert` in the Java. The Java side is complete at planning: 143 statements, all in ported files (see
`.agent-notes/dev-assert-planning.md`). Some sites have a comment (≈ 90 found at planning by
`grep -rnE '//.*\bassert\b' src`), some were dropped silently, and some already have a substitute (`throw new Error`).
This task writes the table that batch 2 works from.

## Write-set

- Create `plans/dev-assert/inventory.md`

## Read-set

- The Java: `grep -rnE '^\s*assert[ (]' $ELK_SOURCE_DIR/plugins/org.eclipse.elk.{core,core.debug.grandom,alg.common,alg.layered,alg.mrtree,alg.force}/src --include=*.java --include=*.xtend`
  (multi-line asserts: read to the `;`)
- The TS: the `@see` tags (`grep -rn "@see .*<Class>.java" src`) to find the TS function that ports each Java method,
  then the omission comment near the site
- [decisions.md D5](../decisions.md#d5-site-convention) (lanes, statuses)

## Inventory format

One row per Java statement, grouped by lane (T3-T6, by the TS file's directory per batch-2 overview), sorted by Java
path and line:

`| # | Java file:line | Expression (verbatim, trimmed) | TS file:line (site) | Found as | Lane | Status |`

- **Found as:** `comment`, `silent` (no trace in TS), `throw` (substituted), `ported` (already a check), `no-arm`.
- **Status:** `todo` at T2. Batch 2 sets `restored`, `restored (throw kept)` or `not-portable: <reason>`; T7 may set
  `not-portable: pending #N`.

Front-load a summary table: counts per lane and per "found as". Keep the file under 500 lines (143 rows fit).

## Acceptance criteria

- Given the Java grep, when the inventory is written, then it has exactly one row per Java `assert` statement and the
  total matches the grep (143 at planning; journal any other count with the reason).
- Given each row, then its TS cite names the TS function that ports the Java method, and its lane matches the
  directory ownership table in `batch-2/overview.md`.
- Given a `src/` omission comment that no row references, then it is journaled (a comment about a non-`assert` such
  as "assert that the port side is set" in `SweepCopy.ts:93` is not a site).

## Quality bar

Spot-check 10 rows against Java and TS. Commit `docs(t2): add the dev-assert site inventory` (unsigned).

## Observability

N/A: no new observable operations.

## Rollback

Reversible: a plans file.
