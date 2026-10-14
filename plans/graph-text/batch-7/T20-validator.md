<!-- SPDX-License-Identifier: EPL-2.0 -->

# T20 — `ElkGraphValidator`, `IssueCodes`, `ElkGraphTextUtil`

**Agent:** typescript-pro · **Commit:** `feat(T20): port the elkgraph validator and text util`

## Context
Validation is not run on load (T18); T22 exposes it as `validate(root)`. This task ports all ELK-specific
`@Check` methods and the algorithm-lookup helper they use, on the T11 base (`src/xtext/validation/**`:
`AbstractDeclarativeValidator`-style check registration by receiver type, severity/message acceptor with
feature -> line). Evidence: T4 `issues[{severity,message,line,code}]` rows, exact (G5).

## Task
Paths under `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/`.
1. `validation/IssueCodes.ts` from `validation/IssueCodes.xtend:17-22`: `OPTION_NOT_APPLICABLE = 'OPTION_NOT_APPLICABLE'`.
2. `ElkGraphTextUtil.ts` from `ElkGraphTextUtil.xtend:28-63`: `getAlgorithm(element)`: the Xtend `switch`
   (`:38-56`) becomes an `instanceof` chain; branches: `ElkNode` -> itself; `ElkPort` ->
   `parent?.parent ?: parent` (`:42`); `ElkEdge` -> `containingNode` (`:44`); `ElkLabel` -> climb while the
   parent is an `ElkLabel` (`:46-49`), then `ElkNode` -> `parent.parent ?: parent`, `ElkPort` ->
   `parent.parent?.parent ?: parent.parent`, `ElkEdge` -> `containingNode` (`:50-54`); other -> `null` (no
   default in the switch). Then (`:57-61`): `getProperty(CoreOptions.ALGORITHM)` non-null and non-empty ->
   `LayoutMetaDataService.getInstance().getAlgorithmDataBySuffix(id)`; else `undefined`/`null` (Xtend returns
   null by falling off the method; keep the return type `LayoutAlgorithmData | null`). Private ctor equivalent: module of functions or a `final`-style class with a private constructor (Java shape: class with static method).
3. `validation/ElkGraphValidator.ts` from `validation/ElkGraphValidator.xtend:45-250`, one `@Check` per
   method keeping Java names and order (registration order decides issue order — read T11 / Xtext
   `AbstractDeclarativeValidator` for how checks are ordered per object and how objects are traversed;
   the T4 rows pin it):
   - `checkPropertyKey` (`:52-58`): `getOptionData(entry.key.id)` null -> warning
     `'<id>' is not a layout option.` on feature KEY;
   - `checkPropertyValue` (`:60-122`): `toLayoutOption` (`:124-129`; `LayoutOptionData` passes through, a non-null
     `IProperty` is looked up by id, null -> null); container is an `ElkGraphElement` -> target switch (`:66-75`):
     node -> `NODES`/`PARENTS`, edge -> `EDGES`, port -> `PORTS`, label -> `LABELS`; then (`:76-79`)
     node whose option targets `NODES` -> `checkAlgorithmSupport(option, node.parent)`, else
     `checkAlgorithmSupport(option, container)`; proxy resolution (`:81-104`): resolve with the option; null ->
     `expectPropertyType` by `option.type` (STRING/BOOLEAN/INT/DOUBLE/ENUMSET, default `optionClass` if non-null);
     non-null -> **replace `entry.value`** (mutation, as Java); `value !== null` -> `LayoutOptionValidator.checkProperty`
     issues re-emitted as error/warning on VALUE (`:106-115`), and for `CoreOptions.ALGORITHM` an unknown
     suffix -> error `No layout algorithm with identifier '<v>' can be found.` (`:116-121`).
   - `checkOptionTarget` (`:131-135`, code `OPTION_NOT_APPLICABLE`, text uses `targetTypes.head.toString.toLowerCase`),
     `checkAlgorithmSupport` (`:137-154`: skip for the ALGORITHM option itself; walk `parent` chain from
     `getContainerOfType(ElkNode)` until a match; the message uses the **last assigned** `algorithm` variable),
     `expectPropertyType` (`:156-158`, `type.simpleName` — map TS to the Java simple names Double/Integer/...).
   - `checkUniqueProperties` (`:160-176`, `propertyAlreadyAssigned` `:178-182`: first duplicate marks itself and,
     once, the earlier one, then the map holds null), `checkUniqueNames` (`:183-204`, `nameAlreadyUsed` `:206-212`,
     over `eContents`; `ElkGraphElement` and `ElkEdgeSection` identifiers), `checkEdgeContainer` (`:214-225`: only when
     the edge has a source or target; `ElkGraphUtil.findBestEdgeContainment`; the two warnings, root vs node,
     with **null feature**), `checkEdgeSection` (`:227-250`: four errors, skip proxies via `eIsProxy`).
   - `LayoutOptionValidator` (`$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/validation/LayoutOptionValidator.java:30-122`,
     `GraphIssue`) is injected at `:46-47`. Not yet in `src`: port it into `src/core/validation/LayoutOptionValidator.ts` (every branch; `GraphIssue`
     and `IValidatingGraphElementVisitor` already exist in `src/core/validation/`). Export the existing
     `findBestEdgeContainment` from `src/graph/util/ElkGraphUtil.ts:172` (Java visibility is `public static`).
4. G3 deferrals: T4 rows tagged `deferred: "mission5"` (outcome depends on `fixed`/`box`/`random`, absent from
   the TS registry) are skipped by a named filter `MISSION5_ALGORITHMS` (see `src/graph/json/JsonMetaDataConverter.test.ts:30-38`
   for the pattern). A sibling test asserts the filter is still needed: it fails once
   `LayoutMetaDataService.getInstance().getAlgorithmDataBySuffix('fixed')` (box, random) is non-null, with a
   message telling mission 5 to drop the filter and regenerate refs.
5. Tests (first): replay every non-deferred T4 row: issue count, order, severity, message, line, code, exact; plus
   loading scenarios through T18 `load` -> `validate`-equivalent (`new ElkGraphValidator(...)` run via the T11
   driver; T22 adds the entry point); branch tests for `ElkGraphTextUtil.getAlgorithm` (every case incl. nested labels).

## Write-set
`src/graph/text/validation/ElkGraphValidator.ts`, `src/graph/text/validation/IssueCodes.ts`,
`src/graph/text/ElkGraphTextUtil.ts`, `src/core/validation/LayoutOptionValidator.ts` (new port of
`LayoutOptionValidator.java:30-122`; `GraphIssue`/`IValidatingGraphElementVisitor` already exist in
`src/core/validation/`), and `src/graph/util/ElkGraphUtil.ts` **only** to export the existing
`findBestEdgeContainment` (`ElkGraphUtil.ts:172`; `public static` in `ElkGraphUtil.java:334`).
Colocated tests implicit. Added to the Phase 5 write-set by the orchestrator while writing the brief.

## Read-set
- `ElkGraphValidator.xtend:15-250`, `IssueCodes.xtend`, `ElkGraphTextUtil.xtend` (above), `LayoutOptionValidator.java:30-122`
- Xtext `validation/{AbstractDeclarativeValidator,CheckMode,ValidationMessageAcceptor,ResourceValidatorImpl,DiagnosticConverterImpl}.java` (via T11)
- `src/xtext/validation/**` (T11), `src/graph/text/ElkGraphText.ts` (T18), `src/core/data/*`, `src/core/options/CoreOptions.ts`
- `test/golden/refs/java/graph-text-validate.json` (T4), `src/graph/json/JsonMetaDataConverter.test.ts:30-38`

## Decisions
- [G5](../decisions.md#g5--diagnostic-fidelity) exact messages/lines/codes; [G3](../decisions.md#g3--option-registry-for-refs) deferral filter;
  AD-13 (assertions frozen; STOP 4 for deferrals excepted).

## Interface contract
Consumes T11 (`@Check` registration, severity acceptor, `ValidationIssue {severity, message, line, code}`) and T18 `load`.
Produces `ElkGraphValidator` (constructible without DI: `new ElkGraphValidator(new LayoutOptionValidator())`),
`getAlgorithm`, `OPTION_NOT_APPLICABLE` for T22's `validate`.

## Acceptance criteria
- Given each non-deferred T4 row, then the issues equal the vector in order with exact severity, message, line and code.
- Given a row tagged mission5, then it is skipped by `MISSION5_ALGORITHMS`; and given mission 5 registering `fixed`, `box`, `random`, then the filter's own test fails.
- Given a property value proxy that resolves, then `entry.value` is replaced by the resolved value after validation.

## Quality bar
README gates; TDD from T4; `npm run complexity` clean (split `checkPropertyValue` at the Java private-method boundaries `:124-158`); `@see` per check.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not weaken a T4 expectation (STOP 4). No edits to T11/T18 files other than the declared write-set. No
OpenJDK/Guava source. Do not commit.
