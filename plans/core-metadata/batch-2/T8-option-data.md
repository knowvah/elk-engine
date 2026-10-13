<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — `ILayoutMetaData`, `ILayoutMetaDataProvider`, `LayoutOptionData`

**Agent:** typescript-pro · **Commit:** `feat(T8): add layout option data and the metadata provider interfaces`

## Context
Every generated option registers a `LayoutOptionData` built through its `Builder`; the service (T14)
and content assist (T16) query it. `LayoutOptionData` implements `IProperty<Object>` (mission 2)
and carries a `Class<?>` the Java inspects reflectively (`isEnum`, `getEnumConstants`,
`IDataObject.class.isAssignableFrom`, `ElkReflect.newInstance`). It is the largest hand port of the
mission (724 Java lines with Javadoc; stop condition 10 if it cannot fit the limits).

## Task
TDD. Port `ILayoutMetaData`, `ILayoutMetaDataProvider` with its nested `Registry` interface (C3),
and `LayoutOptionData` with nested `Type`, `Target`, `Visibility` and `Builder`: every member —
`equals`/`hashCode`/`compareTo`/`toString`, `canParseValue`, `parseValue` (all `Type` branches,
including `enumSetForStringArray` and the `IDataObject` path), `getDefaultDefault`, `getChoices`,
`getEnumValueCount`, `getEnumValue`, getters/setters, `getDependencies`. `getDefault` clones through
`ElkReflect` as the Java does (D6).

**`Class<?>` representation (this task defines it; T13's emitter and T14 consume it).**
- ELK classes and enums: their TS class object (`ElkReflect`'s `ClassObject`). `isEnum` ⇔ the class
  has a static `values()`; `getEnumConstants()` ⇔ `values()`.
- `java.lang` boxed types and `Object`: tokens exported from a new `src/java/lang/JavaClass.ts`
  (`Boolean`, `Integer`, `Double`, `Float`, `String`, `Object`), each carrying its Java name.
- `IDataObject.class.isAssignableFrom(clazz)` ⇔ structural check: `clazz` is a class whose
  prototype has a `parse` function (`IDataObject` is a TS interface, so the check is structural,
  like every interface `instanceof` in the port, D3). No edits to `src/core/math`.
- Java **interfaces** used as `optionClass` (`ILabelManager`, `ITopdownSizeApproximator`) have no
  runtime value in TS: their files export a same-named value token next to the interface
  (declaration merging), created with `javaInterface('ILabelManager')` from `JavaClass.ts`.
  T10 adds those two tokens.
- `src/java` imports nothing from ELK directories (fitness test): `JavaClass.ts` declares its own
  class-object type (structurally equal to `ElkReflect`'s `ClassObject`).
- One helper `simpleNameOf(clazz)` returns the Java simple name (`Double`, `Direction`,
  `BoxLayoutProvider.PackingMode` style for nested) — the dump (C4 `{"t":"class"}`) compares it.

## Write-set
`src/core/data/{ILayoutMetaData,ILayoutMetaDataProvider,LayoutOptionData}.ts`,
`src/java/lang/JavaClass.ts`, `LayoutOptionData.test.ts`, `JavaClass.test.ts`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/data/{ILayoutMetaData,ILayoutMetaDataProvider,LayoutOptionData}.java`
- `src/graph/properties/IProperty.ts`, `src/graph/util/ElkReflect.ts:1-30,100-140`,
  `src/core/util/IDataObject.ts`, `src/core/math/KVector.ts` (parse/toString)
- `src/java/util/EnumSet.ts`, `src/core/util/Pair.ts` (T3)
- `docs/translation-rules.md` §6.3–§6.5, §6.7, §7

## Interface contract (consumed by T10, T13, T14, T16)
```ts
interface ILayoutMetaData { getId(): string; getName(): string; getDescription(): string }
interface ILayoutMetaDataProvider { apply(registry: ILayoutMetaDataProvider.Registry): void }
namespace ILayoutMetaDataProvider { interface Registry {
  register(data: LayoutAlgorithmData | LayoutOptionData | LayoutCategoryData): void;   // §6.5 dispatch
  addDependency(sourceOption: string, targetOption: string, requiredValue: unknown): void;
  addOptionSupport(algorithm: string, option: string, defaultValue: unknown): void } }
class LayoutOptionData implements ILayoutMetaData, IProperty<unknown> {
  static readonly Type; static readonly Target; static readonly Visibility; static readonly Builder; … }
// JavaClass.ts
export type JavaClassRef = ClassObject | JavaLangClass | JavaInterfaceToken;
export function simpleNameOf(c: JavaClassRef): string;  export function javaInterface(simpleName: string): JavaInterfaceToken;
```
`register` overloads: Java picks by static type; TS dispatches with `instanceof` (translation-rules
§6.5). Since `LayoutAlgorithmData`/`LayoutCategoryData` do not exist yet, type them through
`ILayoutMetaData` here and narrow in T10 — journal it.

## Acceptance criteria
- Given an option of `Type.ENUM` with `optionClass(Direction)`, when `parseValue("DOWN")`, then
  `Direction.DOWN`; with `"3"`, the ordinal branch result; with `"nonsense"`, the Java result
  (`null`).
- Given `Type.ENUMSET` with `SizeConstraint`, when `parseValue("[PORTS, MINIMUM_SIZE]")` and the
  other separators the Java accepts, then the matching `EnumSet`.
- Given `Type.OBJECT` with `KVector`, when `parseValue("(1,2)")`, then a `KVector(1,2)`; `canParseValue`
  is true; for a non-`IDataObject` class it is false.
- Given `Type.DOUBLE/INT/BOOLEAN/STRING`, then `parseValue` and `getDefaultDefault` follow every Java
  branch (invalid number text → `null`).
- Given two options with equal ids, then `equals` is true; `compareTo` orders by id; `simpleNameOf`
  of `JavaClass.Double` is `Double` and of `Direction` is `Direction`.

## Quality bar
README gates; ≥ 95% branch coverage of `LayoutOptionData`; functions ≤ 30 NLOC, CCN ≤ 10 (helper
extraction only as translation-rules §6 permits, journaled); `@see` on every class.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No `LayoutAlgorithmData` / `LayoutCategoryData` (T10). No change to `src/graph/**`.
