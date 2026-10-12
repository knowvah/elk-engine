<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — ElkGraph interfaces, type guards, ElkGraphPackage constants, base impls

**Agent:** typescript-pro · **Commit:** `feat(graph): add the elkgraph interfaces and base model classes`

## Context
AD-11: the EMF-generated model becomes plain classes keeping Java accessor names. D3 keeps the
interface/impl split and the factory. This task lays the interfaces for every element plus the
impl classes that need no edge/port logic; T9 completes the model. Everything observable is
checked against `graph.json` in T9, so this task's tests derive expected values from the Java
`*Impl.java` bodies and `elkgraph.ecore` (D2/D4 order rules).

## Task
TDD. Port, keeping Java method order and `switch` bodies on `ElkGraphPackage` feature ids:
1. `src/graph/ElkGraphPackage.ts`: **constants only** — the `ELK_*__*` feature ids and the
   class-name strings used by `eClass().getName()` (`ElkNode`, …); no metamodel.
2. Interfaces: `EMapPropertyHolder` (`getProperties(): EcoreEMap<IProperty<unknown>, unknown>` +
  `IPropertyHolder`), `ElkGraphElement`, `ElkShape`, `ElkLabel`, `ElkConnectableShape`, `ElkNode`,
  `ElkPort`, `ElkEdge`, `ElkBendPoint`, `ElkEdgeSection`, `ElkGraphFactory` (with
  `eINSTANCE: ElkGraphFactory` declared; the impl assigns it in T9 — use a mutable holder that
  the module-globals fitness allowlist accepts, or a getter resolved in T9; journal the choice).
  Each interface file exports its type guard (`isElkNode(o): o is ElkNode` …) implemented via
  `instanceof` on the impl class (D3); for the guards whose impl lands in T9 (`ElkNode`, `ElkPort`,
  `ElkEdge`, `ElkEdgeSection`, `ElkConnectableShape`) declare the guard here against a registry
  the impl registers into, so T8 compiles alone — journal the mechanism.
3. Impls: `EMapPropertyHolderImpl` (`EcoreEMap` on `PROPERTY`, `setProperty`/`getProperty`/
  `hasProperty`/`copyProperties`/`getAllProperties` exactly as Java incl. proxy resolution),
  `ElkGraphElementImpl` (`labels` containment list, `identifier`, `eInverseAdd/Remove`,
  `toString` per D10), `ElkShapeImpl` (`x/y/width/height` default 0, `setDimensions`,
  `setLocation`, `toString` per D10), `ElkLabelImpl` (`parent` with the recursive-containment
  check, `text` default `""`, `toString` `ElkLabel "text" (x,y | w,h)`), `ElkBendPointImpl`
  (`set`, `toString` per D10), `ElkPropertyToValueMapEntryImpl` (key/value/`toString`
  `id -> value`; `getHash` = key `hashCode`).

## Write-set
`src/graph/{EMapPropertyHolder,ElkGraphElement,ElkShape,ElkLabel,ElkConnectableShape,ElkNode,ElkPort,ElkEdge,ElkBendPoint,ElkEdgeSection,ElkGraphFactory,ElkGraphPackage}.ts`,
`src/graph/impl/{EMapPropertyHolderImpl,ElkGraphElementImpl,ElkShapeImpl,ElkLabelImpl,ElkBendPointImpl,ElkPropertyToValueMapEntryImpl}.ts`,
colocated `.test.ts` for the six impl files and for `ElkGraphPackage.ts`.

## Read-set
- `../decisions.md#d3--interfaces-and-implementations`, `#d4--eobject-surface`, `#d5--property-maps`, `#d10--divergences-accepted-up-front`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph/model/elkgraph.ecore` (features, opposites, defaults)
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph/src/org/eclipse/elk/graph/{EMapPropertyHolder,ElkGraphElement,ElkShape,ElkLabel,ElkConnectableShape,ElkNode,ElkPort,ElkEdge,ElkBendPoint,ElkEdgeSection,ElkGraphFactory}.java` (method lists)
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphPackage.java` (the `int` constants only)
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/{EMapPropertyHolderImpl,ElkGraphElementImpl,ElkShapeImpl,ElkLabelImpl,ElkBendPointImpl,ElkPropertyToValueMapEntryImpl}.java`
- `docs/translation-rules.md:299-338` (§5 EMF)
- T6 contract (`src/emf/**`), T3 interfaces, `src/java/lang/DoubleToString.ts` (Java double text)

## Interface contract (consumed by T9, T10, mission 3+)
The AD-11 interfaces with Java names (`getChildren()`, `getX()`, `setX()`, `getProperty()`,
`isHyperedge()` …), `ElkGraphFactory.eINSTANCE.createElkNode()` etc., the type guards, and
`ElkGraphPackage.ELK_NODE__CHILDREN`-style constants with Java's values. `EList<E>` from
`src/emf` is the list type on every multi-valued feature. Constructors are public (D3).

## Acceptance criteria
- Given a label, when `setParent(element)`, then `element.getLabels()` contains it and
  `eContainer()` is the element; when set to a label contained below it, then
  `IllegalArgumentException('Recursive containment not allowed for ' + toString())`.
- Given `EMapPropertyHolderImpl`, when `setProperty(p, null)`, then the key is removed; when
  `setProperty(a); setProperty(b); setProperty(a, v2)`, then `getAllProperties()` iterates `a, b`.
- Given `ElkLabelImpl` with text `x` at `(1,2)` size `(3,4)`, then `toString()` is
  `ElkLabel "x" (1.0,2.0 | 3.0,4.0)`; with empty text, `ElkLabel (1.0,2.0 | 3.0,4.0)`.
- Given `new ElkBendPointImpl().set(1, 2)`, then `getX()` 1, `getY()` 2; a new label's `getText()`
  is `''` and `getIdentifier()` is `null`.
- Given an element with two labels each with a label, when `eAllContents()`, then the order is
  `l1, l1a, l2, l2a` (properties entries first when present, per D4).
- Given `ElkGraphPackage`, then `ELK_NODE__CHILDREN` equals the Java value and
  `eClass().getName()` of a label is `ElkLabel`.

## Quality bar
README gates; ≥ 90% coverage (100% target); functions ≤ 30 NLOC, CCN ≤ 10; files ≤ 500 lines.
`@see` on every symbol; comments mark dropped EMF methods (`eGet`, `eSet`, …) as "not ported (D4)".

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No `ElkConnectableShapeImpl`, `ElkNodeImpl`, `ElkPortImpl`, `ElkEdgeImpl`, `ElkEdgeSectionImpl`,
`ElkGraphFactoryImpl`, `ElkGraphUtil` (T9). Do not add methods the Java interfaces lack beyond the
guards (STOP 9). No change to `src/emf/**`.
