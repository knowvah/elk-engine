<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Xtext declarative-validation subset and resource validator

**Agent:** typescript-pro · **Commit:** `feat(T11): port xtext declarative validation and resource validator`

## Context
`ElkGraphValidator extends AbstractElkGraphValidator extends AbstractDeclarativeValidator` (six `@Check`
methods; `AbstractElkGraphValidator.java` is generated and only names the EPackage). The oracle reports
validator issues through `IResourceValidator.validate(resource, CheckMode.ALL, ...)` (T4), so the port must
reproduce what `AbstractDeclarativeValidator`, `CompositeEValidator`, EMF's `Diagnostician` traversal and
`ResourceValidatorImpl`/`DiagnosticConverterImpl` do around those methods. T20 writes `ElkGraphValidator.ts`
on this base; T18/T22 call the resource validator; T15 provides the line positions. Layout `src/xtext/**`:
the mapping rule of [T7](../batch-2a/T7-xtext-converters.md); sources `XT` (Xtext jar) as there; `EMF` =
`org/eclipse/emf/ecore/**` in `~/.m2/repository/p2/osgi/bundle/org.eclipse.emf.ecore.source/2.37.0.v20240721-0802/*.jar`.

## Task
1. `validation/AbstractDeclarativeValidator.ts` (XT `validation/AbstractDeclarativeValidator.java`). The
   reflective `@Check` scan (`collectMethods` 181-240, `MethodWrapper` 92-163, `methodsForType` 254-265) becomes
   an explicit registration: the subclass calls `this.addCheck(guard, method, checkType = CheckType.FAST)` in
   its constructor, where `guard` is the TS type guard standing for the declared parameter type
   (`isMatching` 111-113: `ElkPropertyToValueMapEntryImpl`, `EMapPropertyHolder`, `ElkGraphElement`, `ElkEdge`,
   `ElkEdgeSection` are *interfaces/impl classes* in Java; the guard must accept exactly their runtime
   instances). Keep: per-object check order = registration order, journaling that Java's
   `getDeclaredMethods` order is unspecified and that T4 sorts issues by `(line, severity, code, message)`
   so the vectors do not pin it; `internalValidate` 317-345 (state per call, `hasErrors`, `checkMode.shouldCheck`
   in `invoke` 115-142); `handleExceptionDuringValidation` 689-696 — swallows `GuardException` and
   null-pointer failures (**D10: Java `NullPointerException` is `TypeError` in this port**; swallow `TypeError`),
   rethrows everything else. This matters: `checkAlgorithmSupport` dereferences `algorithm.id` on a null
   (`ElkGraphValidator.xtend:145-150`) and the oracle swallows the NPE. `guard`/`checkDone` 562-575.
   Message API actually called by `ElkGraphValidator.xtend`: `error(msg, feature)` 432-434,
   `error(msg, source, feature)` 451-453, `warning(msg, feature)` 394-396, `warning(msg, feature, code)` 402-405,
   `warning(msg, null)` (feature null); port those and the overloads they delegate to (`error`/`warning`
   with index/code/data 436-470, 398-430) and `acceptError`/`acceptWarning` 577-617 incl.
   `checkIsFromCurrentlyCheckedResource` 588-603 (root-container equality; resource rule of
   [T8](../batch-2a/T8-xtext-naming.md)). `info` overloads: not reached (`ElkGraphValidator` never calls
   them) — port only if a delegate needs them; `addIssue*` family 472-543 and the `offset/length`
   (`RangeBasedDiagnostic`) variants 516-543, 619-652: not reached, skip and list in the journal.
2. `validation/CheckMode.ts`, `CheckType.ts`, `Check.ts` (the default `CheckType.FAST`, XT `Check.java:20`),
   `GuardException.ts`, `ValidationMessageAcceptor.ts` (`INSIGNIFICANT_INDEX = -1`), `FeatureBasedDiagnostic.ts`
   (+ the shared `AbstractValidationDiagnostic.ts`: severity, message, object, feature, index, code, data,
   checkType; EMF `Diagnostic.data` = `[object, feature]`, the converter's `getCauser`/feature lookup 185-190,
   212-218), `diagnostics/Severity.ts` (XT `diagnostics/Severity.java`; also used by T16).
3. `validation/CompositeEValidator.ts` (XT 36-190): the delegate list is `[EObjectValidator(defaults),
   languageValidator]` in that order (`initDefaults` 94-111, `addValidator` 113-127). `validate(EClass,
   EObject, chain, ctx)` 146-161 **catches every `Throwable` from a delegate and adds an `Error executing
   EValidator` error diagnostic** (`createExceptionDiagnostic` 183-186) — so a non-NPE exception rethrown by
   `handleExceptionDuringValidation` becomes a visible issue, not an abort. Port exactly.
4. `validation/EObjectValidator` subset (EMF `org/eclipse/emf/ecore/util/EObjectValidator.java`, **evidence
   driven**): Xtext's composite always includes EMF's `EObjectValidator` with `validate_EveryProxyResolves`
   and `validate_NoCircularContainment` disabled. Read the remaining constraint methods
   (`validate_EveryMultiplicityConform`, `_EveryDataValueConforms`, `_UniqueID`, `_EveryReferenceIsContained`,
   `_EveryBidirectionalReferenceIsPaired`, `_EveryKeyUnique`, `_EveryMapEntryUnique`) against the ELK ecore
   (`../elk/plugins/org.eclipse.elk.graph/model/elkgraph.ecore`: `lowerBound="1"` on primitive doubles
   `x/y/width/height/startX…`, map-entry class `ElkPropertyToValueMapEntry`, opposites) and decide per
   constraint whether it can produce a diagnostic for a model that the parser or `ElkGraphUtil` builds.
   Port exactly the constraints that can; for each one that cannot, write the one-line proof (type or
   lower-bound reason) in the class comment. If any T4 row contains an issue that no `@Check` method explains,
   that is the constraint to port. This is the single place where "minimal faithful subset" is not
   known in advance (MEDIUM): do not guess — verify with the vectors and journal.
5. `validation/ResourceValidatorImpl.ts` (XT 40-207, reduced): `validate(resource, mode, ...)` 70-103 in
   order: `resolveProxies` (a no-op for eager linking: journal), `collectResourceDiagnostics` 106-119 (resource
   **errors first, then warnings**, each via `issueFromXtextResourceDiagnostic`), then per content root
   `validate(resource, element, mode, ...)` 121-160 (options: `CheckMode.KEY`, concrete-syntax validation
   disabled; `diagnostician.validate(element, options)`; children of the returned diagnostic are converted one
   by one, else the diagnostic itself; a `RuntimeException` anywhere in the content pass is **logged and
   swallowed, discarding all content issues** — port the `catch`). Cancellation: dropped (no cancel indicator in
   the port; note it). The `Diagnostician` traversal is EMF's (`org/eclipse/emf/ecore/util/Diagnostician.java`
   `validate`/`doValidateContents`): the validator for an object runs, then `eContents()` children in order,
   depth-first pre-order — port that traversal here (`validation/Diagnostician.ts`, with
   `CancelableDiagnostician.validate` 14-40 reduced to the pass-through).
6. `validation/DiagnosticConverterImpl.ts` (XT 40-258, reduced to `convertResourceDiagnostic` 63-87 and
   `convertValidatorDiagnostic` 89-119 with `getSeverity` 172-183, `getIssueCode` 160-167,
   `getLocationData(obj, feature, index)` 230-258). Location is the **hook to T15** (file `validation/IssueLocator.ts`):
   ```ts
   export interface IssueLocator {                    // implemented from T15's `positions`
     objectStartLine(obj: EObject): number | null;    // NodeModelUtils.findActualNodeFor(obj) start line (null: no node)
     featureStartLines(obj: EObject, featureName: string): readonly number[]; // findNodesForFeature, source order
   }
   ```
   Resolution mirrors `getLocationData(obj, feature, index)` 230-258 (validator diagnostics are
   `FeatureBasedDiagnostic`, 209-211): start from the object's node (`NodeModelUtils.getNode`); when the
   feature is non-null and `findNodesForFeature` has more than `index` entries (index -1 counts as 0, 235-236)
   use that feature node instead; with no node for the object, recurse to `eContainer()` using the object's
   containing feature and its index in that feature's list (241-247); with no container the Java returns a
   fresh *empty* `IssueLocation` (line `0`, lines 249-257: the prepared start-of-document location is dropped by
   the `return new IssueLocation()`) — keep that.
   The line is the start line of the node's text region (`getLocationForNode` 262-267), i.e. the line of its
   first non-hidden character. Output type `Issue = { severity: Severity; message: string; code: string | null;
   data: readonly string[]; lineNumber: number; syntaxError: boolean }`; G4's `ElkTextIssue` is built from it by
   T20/T22 (`info` severity does not occur in ELK; assert it never leaves this layer unconverted).

## Write-set
`src/xtext/validation/**`, `src/xtext/diagnostics/Severity.ts` (colocated `*.test.ts` implicit; T16 owns the
rest of `src/xtext/diagnostics/`). If `src/java/lang/` lacks an exception you need (only
`UnsupportedOperationException`-style shims exist), prefer a plain `Error` subclass inside `src/xtext/validation`.

## Read-set
- `../elk/plugins/org.eclipse.elk.graph.text/src/.../validation/ElkGraphValidator.xtend:49-250` and `src-gen/.../validation/AbstractElkGraphValidator.java`
- XT `validation/{AbstractDeclarativeValidator.java:92-345,394-470,577-617,654-696,CompositeEValidator.java:36-190,ResourceValidatorImpl.java:40-207,DiagnosticConverterImpl.java:40-258,CancelableDiagnostician.java,CheckMode.java,CheckType.java,Check.java,FeatureBasedDiagnostic.java,AbstractValidationDiagnostic.java,GuardException.java,ValidationMessageAcceptor.java}`, XT `diagnostics/Severity.java`
- EMF `ecore/util/{Diagnostician,EObjectValidator}.java`, `ElkGraph.ecore` (`elkgraph.ecore:99-117,258-276,359`)
- `test/golden/refs/java/graph-text-validate.json` (`issues`, `covers`), `plans/graph-text/batch-1/T4-validator-vectors.md`
- `src/emf/ecore/EObject.ts` (D4 surface), `src/graph/ElkGraphPackage.ts` (feature ids)

## Decisions
- [G5](../decisions.md#g5--diagnostic-fidelity) · [G4](../decisions.md#g4--entry-point) · [G3](../decisions.md#g3--option-registry-for-refs)
- AD-13 (T4 rows are frozen), D10 (NPE is `TypeError`), mission-2 D4 (EObject surface)

## Interface contract
Produced for T20/T22:
```ts
abstract class AbstractDeclarativeValidator { protected addCheck<T>(guard: (o: EObject) => o is T,
  check: (o: T) => void, type?: CheckType): void; protected error(...)/warning(...) as above }
class ResourceValidatorImpl { validate(contents: readonly EObject[], resourceDiagnostics:
  { errors: readonly ResourceDiagnostic[]; warnings: readonly ResourceDiagnostic[] }, mode: CheckMode,
  locator: IssueLocator): Issue[] }
```
`ResourceDiagnostic = { message: string; line: number; syntax: boolean }` (the converted syntax/linking/conversion
diagnostics of `load`, G4). Issue order = emission order; T20 sorts for comparison with T4.

## Acceptance criteria
- Given a test-local validator with checks registered on two object types, when `ResourceValidatorImpl.validate`
  runs on a small tree, then diagnostics appear parent-before-children in `eContents()` order and per object in
  registration order, resource errors precede resource warnings precede content issues.
- Given a check that throws `TypeError`, then it is swallowed and later checks still run; given one that throws
  a plain `Error`, then an `Error executing EValidator` error issue appears (CompositeEValidator) and the
  traversal continues.
- Given a `warning(msg, null)` on an object without a feature, then the line is the object's start line; given
  `error(msg, obj, feature)` with two values for the feature, then index -1 selects the first value's line.
- Given the T4 rows, then every row's raw issue set is reproducible once T20 supplies the checks (replayed in T20),
  and the `EObjectValidator` decision of step 4 is recorded in the journal.

## Quality bar
README gates; TDD from the Java source; `npm run complexity` clean; no reflection, no decorators, no `process`.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No `src/graph/**` imports (boundary rule T6); no ELK validator logic here (T20). Do not port Xtext's concrete
syntax validator, `NamesAreUniqueValidator`, configurable issue codes, or the `IssueSeverities` provider
(`addIssue` with codes is unreached). The agent does not commit; the orchestrator commits per task.
