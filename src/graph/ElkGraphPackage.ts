// SPDX-License-Identifier: EPL-2.0
import type { EClass } from '../emf/ecore/EClass.js';

/** An `EClass` reduced to its name (decision D4: `eClass().getName()` is the only metamodel read). */
function eClassNamed(name: string): EClass {
  return { getName: () => name };
}

/**
 * The `Literals` of the generated package: one `EClass` per ElkGraph class, carrying only the
 * name (D3: no metamodel). The `EReference`/`EAttribute`/`EDataType` literals are not ported (D3).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphPackage.java
 */
const LITERALS = {
  IPROPERTY_HOLDER: eClassNamed('IPropertyHolder'),
  EMAP_PROPERTY_HOLDER: eClassNamed('EMapPropertyHolder'),
  ELK_GRAPH_ELEMENT: eClassNamed('ElkGraphElement'),
  ELK_SHAPE: eClassNamed('ElkShape'),
  ELK_LABEL: eClassNamed('ElkLabel'),
  ELK_CONNECTABLE_SHAPE: eClassNamed('ElkConnectableShape'),
  ELK_NODE: eClassNamed('ElkNode'),
  ELK_PORT: eClassNamed('ElkPort'),
  ELK_EDGE: eClassNamed('ElkEdge'),
  ELK_BEND_POINT: eClassNamed('ElkBendPoint'),
  ELK_EDGE_SECTION: eClassNamed('ElkEdgeSection'),
  ELK_PROPERTY_TO_VALUE_MAP_ENTRY: eClassNamed('ElkPropertyToValueMapEntry'),
} as const;

/**
 * The generated package interface, ported as constants only (decision D3): the classifier ids and
 * structural feature ids with Java's `int` values and the same defining expressions, so the
 * generated `switch` bodies of the impl classes stay 1:1, plus {@link ElkGraphPackage.Literals}.
 * `eINSTANCE`, the `get*()` metamodel accessors and the feature literals are not ported (D3).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphPackage.java
 */
export abstract class ElkGraphPackage {
  static readonly eNAME: string = 'graph';
  static readonly eNS_URI: string = 'http://www.eclipse.org/elk/ElkGraph';
  static readonly eNS_PREFIX: string = 'graph';
  static readonly IPROPERTY_HOLDER: number = 0;
  static readonly IPROPERTY_HOLDER_FEATURE_COUNT: number = 0;
  static readonly EMAP_PROPERTY_HOLDER: number = 1;
  static readonly EMAP_PROPERTY_HOLDER__PROPERTIES: number = ElkGraphPackage.IPROPERTY_HOLDER_FEATURE_COUNT + 0;
  static readonly EMAP_PROPERTY_HOLDER_FEATURE_COUNT: number = ElkGraphPackage.IPROPERTY_HOLDER_FEATURE_COUNT + 1;
  static readonly ELK_GRAPH_ELEMENT: number = 2;
  static readonly ELK_GRAPH_ELEMENT__PROPERTIES: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER__PROPERTIES;
  static readonly ELK_GRAPH_ELEMENT__LABELS: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER_FEATURE_COUNT + 0;
  static readonly ELK_GRAPH_ELEMENT__IDENTIFIER: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER_FEATURE_COUNT + 1;
  static readonly ELK_GRAPH_ELEMENT_FEATURE_COUNT: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER_FEATURE_COUNT + 2;
  static readonly ELK_SHAPE: number = 3;
  static readonly ELK_SHAPE__PROPERTIES: number = ElkGraphPackage.ELK_GRAPH_ELEMENT__PROPERTIES;
  static readonly ELK_SHAPE__LABELS: number = ElkGraphPackage.ELK_GRAPH_ELEMENT__LABELS;
  static readonly ELK_SHAPE__IDENTIFIER: number = ElkGraphPackage.ELK_GRAPH_ELEMENT__IDENTIFIER;
  static readonly ELK_SHAPE__HEIGHT: number = ElkGraphPackage.ELK_GRAPH_ELEMENT_FEATURE_COUNT + 0;
  static readonly ELK_SHAPE__WIDTH: number = ElkGraphPackage.ELK_GRAPH_ELEMENT_FEATURE_COUNT + 1;
  static readonly ELK_SHAPE__X: number = ElkGraphPackage.ELK_GRAPH_ELEMENT_FEATURE_COUNT + 2;
  static readonly ELK_SHAPE__Y: number = ElkGraphPackage.ELK_GRAPH_ELEMENT_FEATURE_COUNT + 3;
  static readonly ELK_SHAPE_FEATURE_COUNT: number = ElkGraphPackage.ELK_GRAPH_ELEMENT_FEATURE_COUNT + 4;
  static readonly ELK_LABEL: number = 4;
  static readonly ELK_LABEL__PROPERTIES: number = ElkGraphPackage.ELK_SHAPE__PROPERTIES;
  static readonly ELK_LABEL__LABELS: number = ElkGraphPackage.ELK_SHAPE__LABELS;
  static readonly ELK_LABEL__IDENTIFIER: number = ElkGraphPackage.ELK_SHAPE__IDENTIFIER;
  static readonly ELK_LABEL__HEIGHT: number = ElkGraphPackage.ELK_SHAPE__HEIGHT;
  static readonly ELK_LABEL__WIDTH: number = ElkGraphPackage.ELK_SHAPE__WIDTH;
  static readonly ELK_LABEL__X: number = ElkGraphPackage.ELK_SHAPE__X;
  static readonly ELK_LABEL__Y: number = ElkGraphPackage.ELK_SHAPE__Y;
  static readonly ELK_LABEL__PARENT: number = ElkGraphPackage.ELK_SHAPE_FEATURE_COUNT + 0;
  static readonly ELK_LABEL__TEXT: number = ElkGraphPackage.ELK_SHAPE_FEATURE_COUNT + 1;
  static readonly ELK_LABEL_FEATURE_COUNT: number = ElkGraphPackage.ELK_SHAPE_FEATURE_COUNT + 2;
  static readonly ELK_CONNECTABLE_SHAPE: number = 5;
  static readonly ELK_CONNECTABLE_SHAPE__PROPERTIES: number = ElkGraphPackage.ELK_SHAPE__PROPERTIES;
  static readonly ELK_CONNECTABLE_SHAPE__LABELS: number = ElkGraphPackage.ELK_SHAPE__LABELS;
  static readonly ELK_CONNECTABLE_SHAPE__IDENTIFIER: number = ElkGraphPackage.ELK_SHAPE__IDENTIFIER;
  static readonly ELK_CONNECTABLE_SHAPE__HEIGHT: number = ElkGraphPackage.ELK_SHAPE__HEIGHT;
  static readonly ELK_CONNECTABLE_SHAPE__WIDTH: number = ElkGraphPackage.ELK_SHAPE__WIDTH;
  static readonly ELK_CONNECTABLE_SHAPE__X: number = ElkGraphPackage.ELK_SHAPE__X;
  static readonly ELK_CONNECTABLE_SHAPE__Y: number = ElkGraphPackage.ELK_SHAPE__Y;
  static readonly ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES: number = ElkGraphPackage.ELK_SHAPE_FEATURE_COUNT + 0;
  static readonly ELK_CONNECTABLE_SHAPE__INCOMING_EDGES: number = ElkGraphPackage.ELK_SHAPE_FEATURE_COUNT + 1;
  static readonly ELK_CONNECTABLE_SHAPE_FEATURE_COUNT: number = ElkGraphPackage.ELK_SHAPE_FEATURE_COUNT + 2;
  static readonly ELK_NODE: number = 6;
  static readonly ELK_NODE__PROPERTIES: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__PROPERTIES;
  static readonly ELK_NODE__LABELS: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__LABELS;
  static readonly ELK_NODE__IDENTIFIER: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__IDENTIFIER;
  static readonly ELK_NODE__HEIGHT: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__HEIGHT;
  static readonly ELK_NODE__WIDTH: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__WIDTH;
  static readonly ELK_NODE__X: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__X;
  static readonly ELK_NODE__Y: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__Y;
  static readonly ELK_NODE__OUTGOING_EDGES: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES;
  static readonly ELK_NODE__INCOMING_EDGES: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__INCOMING_EDGES;
  static readonly ELK_NODE__PORTS: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE_FEATURE_COUNT + 0;
  static readonly ELK_NODE__CHILDREN: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE_FEATURE_COUNT + 1;
  static readonly ELK_NODE__PARENT: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE_FEATURE_COUNT + 2;
  static readonly ELK_NODE__CONTAINED_EDGES: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE_FEATURE_COUNT + 3;
  static readonly ELK_NODE__HIERARCHICAL: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE_FEATURE_COUNT + 4;
  static readonly ELK_NODE_FEATURE_COUNT: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE_FEATURE_COUNT + 5;
  static readonly ELK_PORT: number = 7;
  static readonly ELK_PORT__PROPERTIES: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__PROPERTIES;
  static readonly ELK_PORT__LABELS: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__LABELS;
  static readonly ELK_PORT__IDENTIFIER: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__IDENTIFIER;
  static readonly ELK_PORT__HEIGHT: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__HEIGHT;
  static readonly ELK_PORT__WIDTH: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__WIDTH;
  static readonly ELK_PORT__X: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__X;
  static readonly ELK_PORT__Y: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__Y;
  static readonly ELK_PORT__OUTGOING_EDGES: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES;
  static readonly ELK_PORT__INCOMING_EDGES: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE__INCOMING_EDGES;
  static readonly ELK_PORT__PARENT: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE_FEATURE_COUNT + 0;
  static readonly ELK_PORT_FEATURE_COUNT: number = ElkGraphPackage.ELK_CONNECTABLE_SHAPE_FEATURE_COUNT + 1;
  static readonly ELK_EDGE: number = 8;
  static readonly ELK_EDGE__PROPERTIES: number = ElkGraphPackage.ELK_GRAPH_ELEMENT__PROPERTIES;
  static readonly ELK_EDGE__LABELS: number = ElkGraphPackage.ELK_GRAPH_ELEMENT__LABELS;
  static readonly ELK_EDGE__IDENTIFIER: number = ElkGraphPackage.ELK_GRAPH_ELEMENT__IDENTIFIER;
  static readonly ELK_EDGE__CONTAINING_NODE: number = ElkGraphPackage.ELK_GRAPH_ELEMENT_FEATURE_COUNT + 0;
  static readonly ELK_EDGE__SOURCES: number = ElkGraphPackage.ELK_GRAPH_ELEMENT_FEATURE_COUNT + 1;
  static readonly ELK_EDGE__TARGETS: number = ElkGraphPackage.ELK_GRAPH_ELEMENT_FEATURE_COUNT + 2;
  static readonly ELK_EDGE__SECTIONS: number = ElkGraphPackage.ELK_GRAPH_ELEMENT_FEATURE_COUNT + 3;
  static readonly ELK_EDGE__HYPEREDGE: number = ElkGraphPackage.ELK_GRAPH_ELEMENT_FEATURE_COUNT + 4;
  static readonly ELK_EDGE__HIERARCHICAL: number = ElkGraphPackage.ELK_GRAPH_ELEMENT_FEATURE_COUNT + 5;
  static readonly ELK_EDGE__SELFLOOP: number = ElkGraphPackage.ELK_GRAPH_ELEMENT_FEATURE_COUNT + 6;
  static readonly ELK_EDGE__CONNECTED: number = ElkGraphPackage.ELK_GRAPH_ELEMENT_FEATURE_COUNT + 7;
  static readonly ELK_EDGE_FEATURE_COUNT: number = ElkGraphPackage.ELK_GRAPH_ELEMENT_FEATURE_COUNT + 8;
  static readonly ELK_BEND_POINT: number = 9;
  static readonly ELK_BEND_POINT__X: number = 0;
  static readonly ELK_BEND_POINT__Y: number = 1;
  static readonly ELK_BEND_POINT_FEATURE_COUNT: number = 2;
  static readonly ELK_EDGE_SECTION: number = 10;
  static readonly ELK_EDGE_SECTION__PROPERTIES: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER__PROPERTIES;
  static readonly ELK_EDGE_SECTION__START_X: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER_FEATURE_COUNT + 0;
  static readonly ELK_EDGE_SECTION__START_Y: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER_FEATURE_COUNT + 1;
  static readonly ELK_EDGE_SECTION__END_X: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER_FEATURE_COUNT + 2;
  static readonly ELK_EDGE_SECTION__END_Y: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER_FEATURE_COUNT + 3;
  static readonly ELK_EDGE_SECTION__BEND_POINTS: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER_FEATURE_COUNT + 4;
  static readonly ELK_EDGE_SECTION__PARENT: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER_FEATURE_COUNT + 5;
  static readonly ELK_EDGE_SECTION__OUTGOING_SHAPE: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER_FEATURE_COUNT + 6;
  static readonly ELK_EDGE_SECTION__INCOMING_SHAPE: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER_FEATURE_COUNT + 7;
  static readonly ELK_EDGE_SECTION__OUTGOING_SECTIONS: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER_FEATURE_COUNT + 8;
  static readonly ELK_EDGE_SECTION__INCOMING_SECTIONS: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER_FEATURE_COUNT + 9;
  static readonly ELK_EDGE_SECTION__IDENTIFIER: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER_FEATURE_COUNT + 10;
  static readonly ELK_EDGE_SECTION_FEATURE_COUNT: number = ElkGraphPackage.EMAP_PROPERTY_HOLDER_FEATURE_COUNT + 11;
  static readonly ELK_PROPERTY_TO_VALUE_MAP_ENTRY: number = 11;
  static readonly ELK_PROPERTY_TO_VALUE_MAP_ENTRY__KEY: number = 0;
  static readonly ELK_PROPERTY_TO_VALUE_MAP_ENTRY__VALUE: number = 1;
  static readonly ELK_PROPERTY_TO_VALUE_MAP_ENTRY_FEATURE_COUNT: number = 2;
  static readonly IPROPERTY: number = 12;
  static readonly PROPERTY_VALUE: number = 13;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphPackage.java */
  static readonly Literals: typeof LITERALS = LITERALS;
}

/** The interface names a type guard can ask for (decision D3). */
export type ElkGraphInterfaceName =
  | 'EMapPropertyHolder'
  | 'ElkGraphElement'
  | 'ElkShape'
  | 'ElkLabel'
  | 'ElkConnectableShape'
  | 'ElkNode'
  | 'ElkPort'
  | 'ElkEdge'
  | 'ElkBendPoint'
  | 'ElkEdgeSection'
  | 'ElkGraphFactory';

/** A (possibly abstract) implementation class. */
export type ImplConstructor = abstract new (...args: never[]) => object;

/**
 * Interface name → implementing class. Port-specific (D3, journaled): Java's `instanceof
 * <interface>` becomes a type guard doing `instanceof` on the implementing class; each impl module
 * registers itself at load, so an interface file needs no runtime import of its impl (and none
 * exists before T9 for five of them). Written once per class at module load; read by the guards.
 */
const IMPLS = new Map<ElkGraphInterfaceName, ImplConstructor>();

/**
 * Registers the class implementing `interfaceName`. Called by each impl module at load.
 *
 * @internal
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphPackage.java
 */
export function registerImpl(interfaceName: ElkGraphInterfaceName, ctor: ImplConstructor): void {
  IMPLS.set(interfaceName, ctor);
}

/**
 * Java `o instanceof <interfaceName>`: `instanceof` against the registered impl class; `false`
 * when no impl is registered.
 *
 * @internal
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphPackage.java
 */
export function isInstance(interfaceName: ElkGraphInterfaceName, o: unknown): boolean {
  const ctor = IMPLS.get(interfaceName);
  return ctor !== undefined && o instanceof ctor;
}
