<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: the melk recorder encodes `List<Integer>` defaults

## Context

D4. `RecordingRegistry.encodeNumber` (`test/melk/recorder.ts`) throws on a bare number unless the option type is INT
or DOUBLE. So the `cmEnforcedGroupOrders` default (`#[…]`, a `List<Integer>`) is unencodable. Two tests filter its
`registerOption` record and (in `layered-registry.test.ts`) its `addOptionSupport` record out of the dump comparison.
The Java dump (`MetaDataVectors.encode`) gives `{t:"list", c:"UnmodifiableRandomAccessList", items:[{t:"int", v:…}…]}`.

## Write-set

- `test/melk/recorder.ts`
- `test/melk/recorder.test.ts`: create it if absent, or add to whichever test covers `RecordingRegistry` today (find
  it with `grep -l RecordingRegistry test/melk/*.test.ts`)
- `test/melk/layered-options.test.ts`
- `test/melk/layered-registry.test.ts`
- `decision-journal.md`

`tools/melk/**` is read-only here. If the declared type is not reachable from the parsed model without a change
there, that is stop 5.

## Read-set

- `test/melk/recorder.ts`
- `test/melk/helpers.ts` (`parseVendored`, `MELK_NAMES`)
- `tools/melk/imports.ts` (`nestedClassPaths`, the pattern to copy)
- `tools/melk/model-options.ts` or wherever the option's declared type string lives
  (`test/melk/model-options.test.ts:312` shows the mapping)
- `test/melk/layered-options.test.ts:1-110`
- `test/melk/layered-registry.test.ts:1-190`
- `tools/vectors/MetaDataVectors.java:240-300` (read-only)

## Steps

1. **Red.** Write recorder tests with a stub `LayoutOptionData` of type `OBJECT`, default `[1, 2]`:
   - with the id mapped to `INT`, the default encodes as `int` items with class `UnmodifiableRandomAccessList`;
   - mapped to `DOUBLE`, as `double` items through `DoubleToString`;
   - unmapped, it still throws "cannot tell whether".
   - Also a `RecorderNames` default test: the derived map contains `cmEnforcedGroupOrders` mapped to `INT`, and no id
     whose declared element type is not `Integer`/`Double`.
2. **Green.** Add the optional `listElementNumbers` (name at discretion) to `RecorderNames`, with its default derived
   from `parseVendored` over `MELK_NAMES`. `shapeOf` falls back to it.
3. **Both melk tests.**
   - Remove the `ENFORCED_GROUP_ORDERS` filters that exist only because of the recorder, and compare against the
     unfiltered dump.
   - Change the `unencodable`/`unencodableSupports` expectations to `[]`, or drop the `ShapePrimer` try/catch if
     nothing else needs it.
   - Keep the frozen-default assertion.
   - For each filter at `layered-registry.test.ts:115-145` (framework service dump), decide whether it exists because
     of this recorder. Keep the ones that do not, and journal each.
4. **Mutation proof (D4).** Temporarily change one item of the TS default (in a local copy or by monkey-patching in a
   scratch test, never committed), and show the full comparison fails naming the record. Journal the failure text.
5. `npx vitest run test/melk` green. Commit.

## Acceptance criteria

- Given an `OBJECT` option whose `.melk` type is `List<Integer>`, when its default `[1, 2]` is recorded, then the
  record equals the Java dump's encoding (`int` items).
- Given `layered-options.test.ts` and `layered-registry.test.ts`, when they run, then the `cmEnforcedGroupOrders`
  option record and its support record are compared by `diffCalls` with the unfiltered dump and pass.
- Given a wrong default item, when the tests run, then the full comparison fails.
- Given every other melk test, then none changed an expected value.

## Observability

N/A: test tooling.

## Rollback

Reversible: revert the commit.
