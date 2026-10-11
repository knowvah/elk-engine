<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — CLAUDE.md (project instructions)

**Agent:** documentation-engineer · **Commit:** `docs(claude): add project instructions and port rules`

## Context
Every future session and subagent on elk-engine loads `CLAUDE.md`. It
must encode the port discipline the way dot-engine's CLAUDE.md does for
the Graphviz port, adapted from C to Java. Directory will be renamed —
repo-relative paths only.

## Task
Write `CLAUDE.md` (< 200 lines).

## Write-set
`CLAUDE.md`.

## Read-set
- `~/git/knowvah/dot-engine/CLAUDE.md` (structure and tone; adapt, do not copy C specifics)
- `../decisions.md` (all ADs + Bundle scope)

## Required sections
1. **Mission** — faithful TS port of Eclipse ELK; Java at
   `$ELK_SOURCE_DIR` (default `../elk`) pinned `8aaa3c14…` is the
   canonical spec; consumed as a library; must run in a browser. Keep
   `plans/` (archaeology).
2. **The Java is sacred** — AD-1 rules: no optimizing/simplifying, port
   every branch, keep method boundaries, keep side-effect order, port the
   JUnit tests. On divergence instrument the oracle first.
3. **Verification** — oracle = ELK built from source by
   `tools/oracle/build.sh` (worktree + patch series, AD-3); conformance bar
   AD-4; goldens AD-5; gates: `npm run typecheck`, `npm run coverage`
   (90×4), golden suite green; journal fixes in the active mission's
   `decision-journal.md`.
4. **Tests are immutable** — AD-13 verbatim intent, including the STOP rule.
5. **Translation rules** — compact Java→TS table: `int` (wrap via
   `src/java/lang/Int32`), `long` (`bigint` only beyond 2^53), `double`,
   `(int)` cast (saturating `d2i`), `Math.round` (shim), integer division
   (truncation), `char`, `String`, `Comparator`/`compareTo`,
   `Linked*`/`Enum*`/`Hash*` collections per AD-10, Guava (local helpers),
   EMF (plain classes, AD-11), `assert` (dev-only check), checked
   exceptions. Point to `docs/translation-rules.md` for the full list.
   State: **never read or copy OpenJDK source** (AD-9).
6. **Layout & naming** — AD-7 (PascalCase one-class-per-file mirror of Java
   packages minus `org/eclipse/elk/`; colocated `.test.ts`; `@see` tag on
   every ported symbol), deviation from kebab-case is intentional.
7. **Boundaries** — AD-8 fitness functions; browser-safe `src/` (no Node
   built-ins, no `process.env`); zero runtime dependencies; only EPL-2.0
   compatible dev deps; YAGNI — no APIs the Java does not have; idiomatic
   wrappers are a separate later layer (AD-14).
8. **ELK source map** — in-scope bundles with one-line purpose each, plus
   deferred/out-of-scope lists (from decisions.md Bundle scope).
9. **External directories** — `ELK_SOURCE_DIR`, `ELK_ORACLE_DIR`,
   `ELK_MODELS_DIR` with defaults; library code never reads env vars.
10. **License** — EPL-2.0; SPDX header on every code file
    (`// SPDX-License-Identifier: EPL-2.0`; `#` for sh/yml; `<!-- -->`
    for md).

## Acceptance criteria
- Given CLAUDE.md, then sections 1–10 are present and it is < 200 lines.
- Given CLAUDE.md, then it states the AD-13 STOP rule and the AD-9
  OpenJDK prohibition explicitly.
- Given CLAUDE.md, then `grep -n '/Users/' CLAUDE.md` finds nothing.

## Quality bar
Imperative, scoping language (no `CRITICAL`/`MUST` escalation). Gates in
README.md (brief).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.
