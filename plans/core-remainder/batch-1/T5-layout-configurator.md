<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — `LayoutConfigurator`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T5): port layout configurator`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core`.

## Context
Mission 5b (README). `LayoutConfigurator` is an `IGraphElementVisitor` that copies options onto graph elements, from
element-specific holders and from class-specific holders.
- `ElkSpacings` (T7) builds on it, as do the layout harness (T12, the exit criterion) and, later, many algorithm
  tests.
- `IGraphElementVisitor`, `ElkUtil.applyVisitors`, `MapPropertyHolder`, `ElkReflect` and `LayoutMetaDataService`
  have landed.

## Task
1. Port `J/LayoutConfigurator.java`, including:
   - the nested `IOptionFilter` and `IPropertyHolderOptionFilter`, as exported interfaces in the same file or in
     prefixed files (push-forward);
   - `ADD_LAYOUT_CONFIG`, `NO_OVERWRITE_HOLDER`, `NO_OVERWRITE`, `OPTION_TARGET_FILTER`;
   - `isClearLayout` and `setClearLayout`, `addFilter`, the `configure`/`getProperties` overloads, `visit`,
     `overrideWith`.
2. **Class keys.** `Class<? extends ElkGraphElement>` becomes an abstract constructor type
   (`abstract new (...args: never[]) => ElkGraphElement`).
   - The `configure` and `getProperties` overloads are told apart at run time: a function is a class and anything
     else is an element. Use TS overload signatures, per translation-rules §6.5.
3. **Maps.** `elementOptionMap` and `classOptionMap` become JS `Map` (inventory rows I28 and I29, identity keys; P2).
   Journal the two sites.
4. **`visit`, `applyProperties`, `findClassOptions`** (`:211-300`). Keep this exact order:
   1. If `clearLayout` is set, clear the element's properties.
   2. `findClassOptions` walks Java's `instanceof` ladder: `ElkGraphElement`, `ElkShape`, `ElkLabel` (return),
      `ElkConnectableShape`, `ElkNode` (return), `ElkPort` (return), `ElkEdge`. Keep the early returns.
   3. Copy the element-specific holder over the combined result.
   4. `applyProperties` checks each entry against all filters (`allMatch`, filters in insertion order). A `Cloneable`
      value is cloned through `ElkReflect.clone`, falling back to the value itself when the clone is `null`. Match how
      other landed ports decide `instanceof Cloneable`; grep `Cloneable` in `src/`.

   The `getAllProperties()` iteration at `:228` is inventory row V1. The landed `MapPropertyHolder` already
   reproduces it; do not reorder.
5. **`OPTION_TARGET_FILTER`** (`:104-127`) uses `LayoutMetaDataService.getInstance().getOptionData(id)` and its
   `getTargets()`. Port every branch.
6. Port `JT/LayoutConfiguratorTest.java` (5 cases) to `src/core/LayoutConfiguratorTest.test.ts` with the exact Java
   expectations. Call `LayoutMetaDataService.getInstance()` in `beforeAll` if the defaults need its cloners
   (`.agent-notes/core-engine.md`).

## Write-set
`src/core/LayoutConfigurator.ts` (plus prefixed filter-interface files if split), `src/core/LayoutConfiguratorTest.test.ts`,
and colocated unit tests for the filters, the clear-layout branch and `overrideWith`.

## Read-set
- `J/LayoutConfigurator.java`, `JT/LayoutConfiguratorTest.java`.
- `src/core/util/{IGraphElementVisitor,ElkUtil}.ts`, `src/core/data/{LayoutMetaDataService,LayoutOptionData}.ts`.
- `src/graph/properties/{MapPropertyHolder,Property,IPropertyHolder}.ts`, `src/graph/util/ElkReflect.ts`.
- `docs/translation-rules-collections.md` (rows V1, I28, I29).

## Interface contracts (outputs, consumed by T7 and T12)
- `new LayoutConfigurator()`.
- `configure(elementOrClass): IPropertyHolder` and `getProperties(elementOrClass): IPropertyHolder | null`.
- `addFilter(filter: IOptionFilter): this`, `setClearLayout(b): this`, `isClearLayout(): boolean`.
- `visit(element: ElkGraphElement): void`, `overrideWith(other): this`.
- Statics: `NO_OVERWRITE`, `NO_OVERWRITE_HOLDER`, `OPTION_TARGET_FILTER`, `ADD_LAYOUT_CONFIG`.
- `IOptionFilter.accept(element: ElkGraphElement, property: IProperty<unknown>): boolean`.
- `IPropertyHolderOptionFilter.accept(holder: IPropertyHolder, property: IProperty<unknown>): boolean`.

## Acceptance criteria
- Given the 5 `LayoutConfiguratorTest` cases, when run, then all pass with the Java expectations.
- Given options configured for both `ElkShape` and `ElkNode` that set the same property, when a node is visited,
  then the `ElkNode` value wins (Java combination order), and an element-specific value beats both.
- Given `addFilter(NO_OVERWRITE)` and an element that already has the property, when visited, then its value is
  kept.
- Given `setClearLayout(true)`, when an element is visited, then its properties are cleared first, as `visit` does.
- Given options configured for `ElkConnectableShape` and an `ElkLabel`, when the label is visited, then it does not
  get them: the `ElkLabel` early return applies.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
