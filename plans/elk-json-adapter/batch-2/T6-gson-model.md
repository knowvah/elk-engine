<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — Gson element model

**Agent:** typescript-pro · **Commit:** `feat(T6): add the gson element model`

## Context
`graph.json` manipulates Gson trees directly (`JsonAdapter.xtend`). J1: a Gson 2.11.0 subset,
specified by Javadoc + `test/golden/refs/java/gson.json` (T1); never Gson source. J2: numbers keep
their raw literal text.

## Task
TDD.
1. `src/gson/`: `JsonElement` (abstract: `isJsonObject/Array/Primitive/Null`, `getAsJsonObject/
   Array/Primitive`, `getAsString/Double/Int/Number/Boolean` default throws, `toString`),
   `JsonNull` (`INSTANCE`), `JsonPrimitive` (ctor from `string | number-text | boolean`; `isNumber`,
   `isString`, `isBoolean`, accessors per the vectors; `equals`/`hashCode`), `LazilyParsedNumber`
   (raw text; `doubleValue` via `JavaDouble.parseDouble`, `intValue`/`longValue` per the vectors,
   `toString` = raw text), `JsonObject` (insertion-ordered members; `add`, `addProperty`
   (string/number/boolean), `remove`, `has`, `get`, `entrySet`, `keySet`, `size`, `equals`
   (order-insensitive), `hashCode`), `JsonArray` (`add`, `get`, `size`, iterator, `equals`,
   `hashCode`). A JS `number` added via `addProperty`/`new JsonPrimitive` is a Java `Number`: its
   text is `DoubleToString` for doubles — the caller says int vs double (journal the API you pick,
   e.g. `JsonPrimitive.ofDouble`/`ofInt`, as a TS-forced overload split, §6.5).
2. `test/architecture/module-boundaries.fitness.test.ts`: `src/gson` may import only `src/gson` and
   `src/java` (copy the `src/guava` rule); `src/graph/json` may import `src/gson`.
3. `src/gson/*.test.ts`: drive every `primitive` and `objectOps` row of `gson.json`, loading the
   file inside the colocated tests (no shared helper outside the write-set).

## Write-set
`src/gson/{JsonElement,JsonNull,JsonPrimitive,LazilyParsedNumber,JsonObject,JsonArray}.ts` and their
colocated tests, `test/architecture/module-boundaries.fitness.test.ts`.

## Read-set
- `test/golden/refs/java/gson.json` (schema in `tools/vectors/GsonVectors.java` header)
- Gson 2.11.0 Javadoc for these classes; `../decisions.md#j1--gson-subset`, `#j2--number-text`
- `src/java/lang/{JavaDouble,DoubleToString,JavaInteger,JavaString}.ts`, `src/guava/` (equals/hashCode
  helpers style), `test/architecture/module-boundaries.fitness.test.ts:1-80`

## Interface contract (consumed by T7–T16)
Gson's class and method names (above). Members iterate in insertion order; re-add keeps position;
`remove` + `add` moves to the end. `JsonPrimitive.getAsString()` of a parsed number is its raw text.

## Acceptance criteria
- Given every `primitive` row, then the result text (Java `toString`) or thrown class + message
  matches.
- Given every `objectOps` row, then the resulting key order and `equals` result match.
- Given `new JsonPrimitive(null as unknown as string)`, then the recorded exception.
- Given a file in `src/gson` importing `src/graph`, then the fitness test fails (asserted with a
  synthetic edge as the existing rules do).

## Quality bar
README gates; 100% coverage of the new files; `@see` with the Gson Javadoc URL on every class.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No reader/writer (T7, T8). No Gson source (J1).
