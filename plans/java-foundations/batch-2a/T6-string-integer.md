<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — JavaString + JavaInteger

**Agent:** typescript-pro · **Commit:** `feat(java): add string hash and integer helpers`

## Context
`String.hashCode` decides `HashMap<String,…>` order (collections V3/V4) and `Property.hashCode`
(`id.hashCode()`); `Integer.reverse` is part of `KVector.hashCode`; `Integer.valueOf` must reject
`"1.0"` (`core/.../data/LayoutOptionData.java:245`). Vectors: `hash.json`, `text.json` (T1).

## Task
TDD: vector-replay tests first, then `src/java/lang/JavaString.ts` and `JavaInteger.ts`.

## Write-set
`src/java/lang/JavaString.ts`, `JavaString.test.ts`, `JavaInteger.ts`, `JavaInteger.test.ts`.

## Read-set
- `docs/translation-rules.md:425-448` (§7)
- `test/golden/refs/java/hash.json` (`stringHash`, `integerReverse`), `text.json` (`integerValueOf`)
- `src/java/lang/Int32.ts` (int32 wrapping helpers to reuse)
- `../decisions.md#m5--exceptions`

## Interface contract (consumed by T11, T14)
- `JavaString.hashCode(s: string): number` — `s[0]*31^(n-1) + … + s[n-1]` over UTF-16 code units,
  int32 wrapping (Javadoc `String.hashCode`).
- `JavaInteger.reverse(i: number): number` (Javadoc `Integer.reverse`); `JavaInteger.hashCode(i) = i`;
  `JavaInteger.valueOf(s: string): number` per `Integer.parseInt` Javadoc (optional `+`/`-`, decimal
  digits, int range), else `NumberFormatException` with the JVM message.

## Acceptance criteria
- Given every `stringHash` row, then `hashCode(row[0]) === row[1]`.
- Given every `integerReverse` row, then equal.
- Given every `integerValueOf` accept row, then equal; reject row, then `NumberFormatException`
  with the vector's message.

## Quality bar
README gates; 100% coverage of both files.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No other file.
