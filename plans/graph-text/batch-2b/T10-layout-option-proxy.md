<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — `core.util.internal.LayoutOptionProxy`

**Agent:** typescript-pro · **Commit:** `feat(T10): port layoutoptionproxy for lazily resolved option values`

## Context
`.elkt` property values are parsed before their option's type is known to the value converter:
`PropertyValueValueConverter.toValue` returns `new LayoutOptionProxy(unquotedString)` when the typed parse
fails or no node is present (`PropertyValueValueConverter.xtend:67-79`), and the validator resolves the proxy
later (`ElkGraphValidator.xtend:82-103`). The class lives in `org.eclipse.elk.core` (`util/internal`), is the
only unported dependency of the graph.text converters, and is also used by `EMapPropertyHolderImpl` through
`IPropertyValueProxy`. T13 (converters), T20 (validator) and the writer (T19, `toString`) consume it.

## Task
1. Port `LayoutOptionProxy.java:27-97` to `src/core/util/internal/LayoutOptionProxy.ts` (`src/core/util/internal`
   belongs to the `src/core` bundle by longest prefix; T6 pins it):
   - `implements IPropertyValueProxy` (`src/graph/properties/IPropertyValueProxy.ts`); field `value: string | null`
     (the Java constructor accepts `null`; keep both arms of `equals`/`hashCode`).
   - `static setProxyValue(propertyHolder, key, value)` (48-53): `new Property<LayoutOptionProxy>(key)`,
     `new LayoutOptionProxy(value)`, `propertyHolder.setProperty(property, proxy)`.
   - `resolveValue<T>(property)` (55-73): `property != null`; `instanceof LayoutOptionData` (the class in
     `src/core/data/LayoutOptionData.ts`) else `LayoutMetaDataService.getInstance().getOptionData(property.getId())`
     (the by-id overload, `LayoutMetaDataService.ts:391`); `optionData != null` -> `optionData.parseValue(value)`
     else `null`. Keep the unchecked `(T)` cast as a typed assertion with a comment (TS cannot check it).
   - `toString()` returns `value` (75-78; `null` stays `null`-valued — return type `string`, the Java method
     returns the field verbatim, so type the field `string | null` and the method accordingly);
     `equals(object)` (80-87: `instanceof LayoutOptionProxy`, null-safe value comparison);
     `hashCode()` (89-95: `JavaString.hashCode`, `0` for null). Use the `equals/hashCode/toString` pattern of
     `src/core/util/Pair.ts:109-129` and `JavaObjects`.
2. Check, and record in the test, the two existing proxy consumers so the new class actually satisfies them:
   `isPropertyValueProxy(new LayoutOptionProxy('x'))` is `true` (`IPropertyValueProxy.ts` type guard), and
   `EMapPropertyHolderImpl.getProperty` (`src/graph/impl/EMapPropertyHolderImpl.ts:92`, Java
   `EMapPropertyHolderImpl.java:108-118`) replaces a resolvable proxy by the resolved value (put back into
   the map) and keeps an unresolvable one. `ElkPropertyToValueMapEntryImpl` has no proxy logic (its Java
   `eIsProxy` is the EMF proxy notion, unrelated).
3. Tests (from the Java source and T3 `valueClass` rows): for `CoreOptions` options of each value type
   present in the core-only registry (double, int, boolean, string, enum, `EnumSet`, `KVector`, `ElkPadding`)
   `resolveValue` equals `optionData.parseValue(text)`; an unparseable text resolves to `null`; unknown
   property id resolves to `null`; `property == null` resolves to `null`; `equals`/`hashCode` incl. both-null
   values. Replay the `properties[].valueClass == "LayoutOptionProxy"` rows of
   `test/golden/refs/java/graph-text-parse.json` only for the `value` text (class replay belongs to T13/T15).

## Write-set
`src/core/util/internal/LayoutOptionProxy.ts` (colocated `*.test.ts` implicit).

## Read-set
- `../elk/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/util/internal/LayoutOptionProxy.java:27-97`
- `src/graph/properties/{IPropertyValueProxy,Property,IPropertyHolder}.ts`, `src/graph/impl/EMapPropertyHolderImpl.ts:80-170`
- `src/core/data/LayoutOptionData.ts:200-260` (`parseValue`), `src/core/data/LayoutMetaDataService.ts:221,385-400`
- `src/core/util/Pair.ts:100-130` (equals/hashCode idiom), `docs/translation-rules.md` 6.1
- `test/golden/refs/java/graph-text-parse.json` (`properties` rows with `valueClass` `LayoutOptionProxy`)

## Decisions
- [G3](../decisions.md#g3--option-registry-for-refs) (tests use the CoreOptions-only registry) · mission-3 C8
- AD-7 (one class per file, Java name), D10 NPE -> `TypeError` convention where applicable

## Interface contract
```ts
export class LayoutOptionProxy implements IPropertyValueProxy {
  constructor(value: string | null);
  static setProxyValue(holder: IPropertyHolder, key: string, value: string | null): void;
  resolveValue<T>(property: IProperty<T>): T | null;
  toString(): string | null; equals(object: unknown): boolean; hashCode(): number;
}
```
Consumed by T13 (`PropertyValueValueConverter`), T19 (value text), T20 (validator) via `isPropertyValueProxy`.

## Acceptance criteria
- Given a proxy `"2"` and `CoreOptions.SPACING_NODE_NODE`-like double/int options, when `resolveValue` runs, then
  it returns the parsed number; given text that the option cannot parse, then `null`.
- Given a property whose id is not registered, then `resolveValue` is `null`; given `null`, then `null`.
- Given two proxies with equal text, then `equals` is true and `hashCode` equal; null vs non-null is false.
- Given a map holder with an unresolvable proxy value, then `getProperty` leaves the proxy in place.

## Quality bar
README gates; TDD; `npm run complexity` clean. Do not widen `IPropertyValueProxy`.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not edit `src/graph/**` or `src/core/data/**`. No `ElkGraphXMIHelper` or persistence port (out of scope).
The agent does not commit; the orchestrator commits per task.
