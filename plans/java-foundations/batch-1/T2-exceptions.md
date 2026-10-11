<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Java exception classes

**Agent:** typescript-pro · **Commit:** `feat(java): add java exception classes`

## Context
ELK throws and catches Java exceptions that JS raises differently or not at all (array bounds,
number parsing, integer division by zero). Shims and later ELK ports throw these classes so throw
sites and catch sites keep their types and messages (translation-rules §6.7).

## Task
Create six exception classes with tests (TDD: tests first).

## Write-set
`src/java/lang/IllegalArgumentException.ts`, `NumberFormatException.ts`,
`IndexOutOfBoundsException.ts`, `ArrayIndexOutOfBoundsException.ts`, `ArithmeticException.ts`,
`src/java/util/NoSuchElementException.ts`, and one colocated `.test.ts` per file.

## Read-set
- `../decisions.md#m5--exceptions`
- `docs/translation-rules.md:386-403` (§6.7)
- `src/java/lang/Int32.ts:1-45` (style: SPDX, `@see` Javadoc URL)

## Interface contract (consumed by T4, T6, T7, T10–T14)
`export class X extends Parent { constructor(message?: string) }`; `this.name = '<JavaSimpleName>'`;
`Object.setPrototypeOf` only if needed for `instanceof` under the project's ES2022 target.
Hierarchy: `NumberFormatException extends IllegalArgumentException extends Error`;
`ArrayIndexOutOfBoundsException extends IndexOutOfBoundsException extends Error`;
`ArithmeticException extends RangeError`; `NoSuchElementException extends Error`.
Each file carries `/** @see <Java SE 21 Javadoc URL> */`.

## Acceptance criteria
- Given `new NumberFormatException('m')`, then it is `instanceof NumberFormatException`,
  `IllegalArgumentException`, and `Error`, with `name === 'NumberFormatException'` and `message === 'm'`.
- Given `new ArrayIndexOutOfBoundsException()`, then it is `instanceof IndexOutOfBoundsException`
  and `message === ''`.
- Given `new ArithmeticException('/ by zero')`, then it is `instanceof RangeError`.
- Given each class, then `name` equals the Java simple name.

## Quality bar
README gates (agent: own tests + typecheck). 100% coverage of the new files.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not change `Int32.ts`/`JavaMath.ts` (T4 rewires the throws). No `RuntimeException` base (M5).
