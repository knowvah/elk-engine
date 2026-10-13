<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — `core.util.Maybe`

**Agent:** typescript-pro · **Commit:** `feat(T2): add maybe`

## Context
`ElkGraphJson.ImportBuilder.rememberImporter(Maybe<JsonImporter>)` (`ElkGraphJson.java:90-93`) and
the transfer tests hand back the importer through a `Maybe`. Not yet ported.

## Task
TDD. Port `org.eclipse.elk.core.util.Maybe` with every member (factories, `get`, `set`,
`isPresent`/equivalents, `equals`/`hashCode`/`toString`, iterator if any) and every branch,
including its behaviour on an empty instance.

## Write-set
`src/core/util/Maybe.ts`, `src/core/util/Maybe.test.ts`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/util/Maybe.java`
- `src/core/util/Pair.ts` (style: generic holder, `equals`/`hashCode` helpers, identity hash shim)

## Interface contract (consumed by T15, T16, T19)
`class Maybe<T>` with the Java's method names and nullability (`T | null` where the Java allows null).

## Acceptance criteria
- Given each Java method, then the TS behaves as the Java does (including the empty case).
- Given the test, then coverage of `Maybe.ts` is 100%.

## Quality bar
README gates; `@see` on the class.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No other `core.util` classes.
