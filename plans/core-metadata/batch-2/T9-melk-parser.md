<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — `.melk` lexer, parser, AST

**Agent:** typescript-pro · **Commit:** `feat(T9): add the melk parser`

## Context
First stage of the generator (AD-12). The grammar is `MetaData.xtext` (Xbase-based); the parser is
hand-written (CLAUDE.md: no Xtext/ANTLR), implements every grammar rule, and only the Xbase
expression forms the 13 pinned files use (C5). It is dev tooling under `tools/`, typechecked by
`tsconfig.json`, tested from `test/melk/` (vitest does not collect `tools/`). This task also adds
`tools/melk/**` to coverage (C7).

## Task
TDD.
1. **Lexer**: Xtext terminals — `ID` (with `^` escape: `^labels` → `labels`), `STRING` (single and
   double quoted, escapes, multi-line), `INT`/decimal literals with `f`/`d`/`l` suffixes and
   exponents, `ML_COMMENT`, `SL_COMMENT`, whitespace; keywords from the grammar. Track line/column.
2. **Parser** for the 13 rules of `MetaData.xtext:19-111` — `MdModel`, `MdBundle`, `MdBundleMember`,
   `MdGroupOrOption`, `MdGroup`, `MdOption`, `MdOptionDependency`, `MdAlgorithm`, `MdCategory`,
   `MdOptionSupport`, `Path`, `MdOptionTargetType`, `MdGraphFeature` — including the `&`
   unordered groups (each clause at most once, any order), modifiers (`deprecated`, `advanced` |
   `programmatic` | `output` | `global`), `XImportSection` (`import a.b.C`, nested `a.b.C.D`),
   `QualifiedName`, `JvmTypeReference` (qualified or simple names, generics such as
   `EnumSet<SizeConstraint>`, nested `Outer.Inner`, primitives).
3. **Expressions**: scan all 13 sources, enumerate every distinct Xbase form used in `default`,
   `lowerBound`, `upperBound`, `requires … ==` and `supports … =`, and parse exactly those into a
   small tagged AST (literal, unary minus, feature/static-field reference, `new T(args)`, static or
   member call, `#[…]` list, `null`). Record the enumerated set as a table in `tools/melk/ast.ts`
   doc comments. Any other form → `MelkSyntaxError` with file, line, column and form.
4. `vitest.config.ts`: coverage `include: ['src/**', 'tools/melk/**']`; keep test-file excludes.

## Write-set
`tools/melk/lexer.ts`, `tools/melk/parser.ts`, `tools/melk/ast.ts`, `test/melk/parser.test.ts`,
`vitest.config.ts`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core.meta/src/org/eclipse/elk/core/meta/MetaData.xtext` (whole)
- `tools/melk/sources/*.melk` (T6) — scan, do not read all in full
- `../decisions.md#c5--parser-scope`, `#c7--coverage-scope`
- `tsconfig.json` (confirm `tools/**` is typechecked), `vitest.config.ts`

## Interface contract (consumed by T11, T12)
```ts
export function parseMelk(text: string, fileName: string): MelkFile;   // throws MelkSyntaxError
interface MelkFile { fileName; packageName: string | null; imports: string[]; bundle: MdBundle | null; members: MdBundleMember[] }
interface MdOption { kind: 'option'; name; deprecated; modifier: 'advanced'|'programmatic'|'output'|'global'|null;
  type: TypeRef | null; label; description; documentation; defaultValue: Expr | null; lowerBound; upperBound;
  targets: string[]; legacyIds: string[]; dependencies: { target: string; value: Expr | null }[]; line: number }
// MdGroup { kind:'group'; name; documentation; children }, MdAlgorithm { kind:'algorithm'; name; provider: TypeRef;
// parameter; label; targetClass; description; documentation; category; previewImage; supportedFeatures; validator;
// supportedOptions: { option: string; value: Expr | null; documentation }[] }, MdCategory, MdBundle { label;
// targetClass; documentationFolder; idPrefix }
```
Strings are kept raw (unescaped content, original whitespace) — description shrinking is T11's job.

## Acceptance criteria
- Given each of the 13 vendored sources, when parsed, then no error, and the counts of options,
  groups, categories, algorithms and `supports` clauses equal a grep count of the source (asserted
  per file).
- Given `Core.melk`, then the `fixed`, `box`, `random` algorithms carry providers
  `FixedLayoutProvider`, `BoxLayoutProvider`, `RandomLayoutProvider`, and the `topdown` group's
  `sizeCategories` option has a `requires … == TopdownSizeApproximator.FIXED_INTEGER_RATIO_BOXES`
  dependency.
- Given `Labels.melk`, then the package is `org.eclipse.elk.core.labels` (the `^labels` escape).
- Given a clause repeated inside an unordered group, or an unsupported expression (e.g. a lambda),
  then `MelkSyntaxError` names file, line and column.
- Given `npm run coverage`, then `tools/melk/**` is included and ≥ 90% on all four metrics.

## Quality bar
README gates; `tools/melk/**` ≤ 500 lines per file, ≤ 30 NLOC and CCN ≤ 10 per function (table-driven
dispatch keeps the parser within limits); SPDX headers.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No name resolution, id computation or emission (T11–T13). Do not modify `tools/melk/sources/`.
