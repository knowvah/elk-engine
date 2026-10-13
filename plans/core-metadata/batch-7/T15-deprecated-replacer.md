<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — `DeprecatedLayoutOptionReplacer`

**Agent:** typescript-pro · **Commit:** `feat(T15): add the deprecated layout option replacer`

## Context
An `IGraphElementVisitor` that rewrites two deprecated core options
(`portLabels.nextToPortIfPossible`, `nodeSize.options` `SPACE_EFFICIENT_PORT_LABELS`) into
`portLabels.placement`. Its JUnit test (2 cases) is ported unchanged.

## Task
TDD. Port the class: the two `Consumer<ElkGraphElement>` rules (arrow functions, §6.4), the public
static `RULES` map (`IProperty` → rule, `ImmutableMap` order kept via `src/guava/ImmutableMap.ts`),
and `visit` (every branch). Port `DeprecatedLayoutOptionReplacerTest` with its `@Before`
(`LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new CoreOptions())`) as
`beforeEach`, assertions unchanged.

## Write-set
`src/core/data/DeprecatedLayoutOptionReplacer.ts`, `src/core/data/DeprecatedLayoutOptionReplacer.test.ts`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/data/DeprecatedLayoutOptionReplacer.java`
- `$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core/data/DeprecatedLayoutOptionReplacerTest.java`
- `src/guava/ImmutableMap.ts`, `src/core/util/IGraphElementVisitor.ts`, `src/core/options/CoreOptions.ts` (constants only)

## Interface contract
`class DeprecatedLayoutOptionReplacer implements IGraphElementVisitor { static readonly RULES; visit(element) }`.

## Acceptance criteria
- Given the two ported JUnit cases, then they pass with assertions unchanged.
- Given an element with neither deprecated option, then `visit` changes nothing (asserted on the
  property map).
- Given `RULES`, then it has exactly the two Java keys in Java order.

## Quality bar
README gates; 100% coverage; `@see` on the class and in the test header (`Ported from …`).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No edits to `CoreOptions.ts` (generated) or the service.
