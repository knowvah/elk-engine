<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — Gson façade

**Agent:** typescript-pro · **Commit:** `feat(T10): add the gson and gsonbuilder facade`

## Context
`ElkGraphJson` calls exactly: `new Gson().getAdapter(JsonElement.class)` + `read(JsonReader)`
(`ElkGraphJson.java:108,122`), `new GsonBuilder()`, `disableHtmlEscaping()`, `setPrettyPrinting()`,
`create()`, `gson.toJson(JsonElement)` (`:230-239`); tests also call `new Gson().toJson(...)`
(`SectionsTest`). J1: only this surface.

## Task
TDD. `Gson` (`getAdapter(JsonElement)` → a `TypeAdapter<JsonElement>` whose `read` uses T7's element
reader and `write` uses T8's `Streams.write`; `toJson(JsonElement): string` with the writer settings
2.11 applies — lenient/strictness, `serializeNulls` false, html-safe unless disabled, indent from
pretty printing — exactly as the `write` vectors show), `GsonBuilder` (the three methods + `create`),
`TypeAdapter` (abstract `read`/`write`). The `Class<?>` argument is the `JsonElement` class object.

## Write-set
`src/gson/{Gson,GsonBuilder,TypeAdapter}.ts`, colocated tests.

## Read-set
- `test/golden/refs/java/gson.json` (`write` with builder settings, `parse` via `reader`)
- Gson 2.11.0 Javadoc (`Gson`, `GsonBuilder`, `TypeAdapter`); `src/gson/**` (T6–T8)

## Interface contract (consumed by T15, T16, T18, T19)
`new GsonBuilder().disableHtmlEscaping().setPrettyPrinting().create().toJson(el)`;
`new Gson().getAdapter(JsonElement).read(reader)`; `new Gson().toJson(el)`.

## Acceptance criteria
- Given every `write` row, when written through the matching builder settings, then byte-identical.
- Given every `parse` row with `via: reader`, when read through `getAdapter(JsonElement).read`, then
  the tree or exception matches.

## Quality bar
README gates; 100% coverage; `@see` Javadoc URLs.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No other Gson features (no reflection-based serialisation, no type tokens beyond `JsonElement`).
