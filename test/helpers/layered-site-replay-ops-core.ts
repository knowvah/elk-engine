// SPDX-License-Identifier: EPL-2.0
// Ops of the layered site replay, part 1 (tools/vectors/LayeredSiteVectors.java: registerConstruction,
// registerGeometry, registerProperties, registerState, registerGraphOps, registerNodeOps, registerSharedOps,
// registerPortOps, registerEdgeOps). Each entry carries the Java call it replays.
import { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LNodeAdapter, LPortAdapter } from '../../src/alg/layered/graph/LGraphAdapters.js';
import { LLabel } from '../../src/alg/layered/graph/LLabel.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { LPort } from '../../src/alg/layered/graph/LPort.js';
import { Layer } from '../../src/alg/layered/graph/Layer.js';
import { ElkMargin } from '../../src/core/math/ElkMargin.js';
import { ElkPadding } from '../../src/core/math/ElkPadding.js';
import { KVector } from '../../src/core/math/KVector.js';
import type { Spacing } from '../../src/core/math/Spacing.js';
import type { IPropertyHolder } from '../../src/graph/properties/IPropertyHolder.js';
import { MapPropertyHolder } from '../../src/graph/properties/MapPropertyHolder.js';
import { Args, type Op } from './layered-site-replay-args.js';
import { Handle, Raw, ReplayBug, dyn, isAdapter } from './layered-site-replay-context.js';

function sizeOf(o: unknown): KVector {
  return dyn(o).getSize!() as KVector;
}

function positionOf(o: unknown): KVector {
  return dyn(o).getPosition!() as KVector;
}

function marginOf(o: unknown): Spacing {
  if (o instanceof LNode || o instanceof LPort) {
    return o.getMargin();
  }
  throw new ReplayBug('no margin on the receiver');
}

function paddingOf(o: unknown): Spacing {
  if (o instanceof LNode || o instanceof LGraph) {
    return o.getPadding();
  }
  throw new ReplayBug('no padding on the receiver');
}

function setSides(s: Spacing, a: Args): void {
  s.top = a.d(0);
  s.right = a.d(1);
  s.bottom = a.d(2);
  s.left = a.d(3);
}

function setVector(v: KVector, a: Args): null {
  v.x = a.d(0);
  v.y = a.d(1);
  return null;
}

function elkMargin(a: Args): ElkMargin {
  return new ElkMargin(a.d(0), a.d(1), a.d(2), a.d(3));
}

/** Java `Collection.remove(Object)` on an `ArrayList`. */
function listRemove<T>(list: T[], element: T): boolean {
  const index = list.indexOf(element);
  if (index >= 0) {
    list.splice(index, 1);
  }
  return index >= 0;
}

export const CONSTRUCTION_OPS: Readonly<Record<string, Op>> = {
  // new LGraph()
  newLGraph: () => new LGraph(),
  // new LNode(LGraph)
  newLNode: (a) => new LNode(a.gOrNull(0)),
  // new LPort()
  newLPort: () => new LPort(),
  // new LEdge()
  newLEdge: () => new LEdge(),
  // new LLabel(String) (the text may be null)
  newLLabel: (a) => new LLabel(a.isNull(0) ? (null as unknown as string) : a.s(0)),
  // new LLabel()
  newLLabelDefault: () => new LLabel(),
  // new Layer(LGraph)
  newLayer: (a) => new Layer(a.g(0)),
  // new MapPropertyHolder() <h>
  newPropertyHolder: () => new Handle(new MapPropertyHolder()),
};

export const GEOMETRY_OPS: Readonly<Record<string, Op>> = {
  // GraphElementAdapter.setSize(KVector) | getSize().x/y =
  setSize: (a) => {
    const o = a.onObject();
    if (isAdapter(o)) {
      dyn(o).setSize!(new KVector(a.d(0), a.d(1)));
      return null;
    }
    return setVector(sizeOf(o), a);
  },
  // GraphElementAdapter.setPosition(KVector) | LShape.getPosition().x/y =
  setPosition: (a) => {
    const o = a.onObject();
    if (isAdapter(o)) {
      dyn(o).setPosition!(new KVector(a.d(0), a.d(1)));
      return null;
    }
    return setVector(positionOf(o), a);
  },
  // LGraph.getOffset().x/y =
  setOffset: (a) => setVector(a.onG().getOffset(), a),
  // LPort.getAnchor().x/y =
  setAnchor: (a) => setVector(a.onP().getAnchor(), a),
  // NodeAdapter/PortAdapter.setMargin(ElkMargin) | LNode/LPort.getMargin() sides =
  setMargin: (a) => {
    const o = a.onObject();
    if (o instanceof LNodeAdapter || o instanceof LPortAdapter) {
      o.setMargin(elkMargin(a));
    } else {
      setSides(marginOf(o), a);
    }
    return null;
  },
  // NodeAdapter.setPadding(ElkPadding) | LNode/LGraph.getPadding() sides =
  setPadding: (a) => {
    const o = a.onObject();
    if (o instanceof LNodeAdapter) {
      o.setPadding(new ElkPadding(a.d(0), a.d(1), a.d(2), a.d(3)));
    } else {
      setSides(paddingOf(o), a);
    }
    return null;
  },
  // getSize() (LGraph, LShape, Layer, adapters)
  getSize: (a) => sizeOf(a.onObject()),
  // getPosition() (LShape, adapters)
  getPosition: (a) => positionOf(a.onObject()),
  // LGraph.getOffset()
  getOffset: (a) => a.onG().getOffset(),
  // LPort.getAnchor()
  getAnchor: (a) => a.onP().getAnchor(),
  // NodeAdapter/PortAdapter.getMargin() | LNode/LPort.getMargin()
  getMargin: (a) => {
    const o = a.onObject();
    return o instanceof LNodeAdapter || o instanceof LPortAdapter ? o.getMargin() : marginOf(o);
  },
  // NodeAdapter.getPadding() | LNode/LGraph.getPadding()
  getPadding: (a) => {
    const o = a.onObject();
    return o instanceof LNodeAdapter ? o.getPadding() : paddingOf(o);
  },
  // LGraph.getActualSize()
  getActualSize: (a) => a.onG().getActualSize(),
  // LEdge.getBendPoints().add(new KVector(x, y))
  bendPointsAdd: (a) => {
    a.onE()
      .getBendPoints()
      .add(new KVector(a.d(0), a.d(1)));
    return null;
  },
  // LEdge.getBendPoints()
  getBendPoints: (a) => a.onE().getBendPoints(),
};

function holder(a: Args): IPropertyHolder {
  return a.onObject() as IPropertyHolder;
}

export const PROPERTY_OPS: Readonly<Record<string, Op>> = {
  // IPropertyHolder.setProperty(IProperty, value)
  setProperty: (a) => {
    holder(a).setProperty(a.prop(0), a.c.decode(a.raw(1)));
    return null;
  },
  // IPropertyHolder.hasProperty(IProperty) (holders and adapters)
  hasProperty: (a) => dyn(a.onObject()).hasProperty!(a.prop(0)),
  // getProperty(IProperty) (holders and adapters): the C4 value
  getProperty: (a) => new Raw(a.c.encode(dyn(a.onObject()).getProperty!(a.prop(0)), 0)),
  // GraphAdapter/GraphElementAdapter.getVolatileId()
  getVolatileId: (a) => dyn(a.onObject()).getVolatileId!(),
  // GraphAdapter/GraphElementAdapter.setVolatileId(int)
  setVolatileId: (a) => {
    dyn(a.onObject()).setVolatileId!(a.i(0));
    return null;
  },
};

export const GRAPH_OPS: Readonly<Record<string, Op>> = {
  // getLayerlessNodes().add(node)
  layerlessAdd: (a) => {
    a.onG().getLayerlessNodes().push(a.n(0));
    return null;
  },
  // getLayerlessNodes().remove(node) (boolean)
  layerlessRemove: (a) => listRemove(a.onG().getLayerlessNodes(), a.n(0)),
  // getLayers().add(layer)
  layersAdd: (a) => {
    a.onG().getLayers().push(a.y(0));
    return null;
  },
  // getLayers()
  getLayers: (a) => a.onG().getLayers(),
  // getLayerlessNodes()
  getLayerlessNodes: (a) => a.onG().getLayerlessNodes(),
  // setParentNode(node|null)
  setParentNode: (a) => {
    a.onG().setParentNode(a.nOrNull(0));
    return null;
  },
  // getParentNode()
  getParentNode: (a) => a.onG().getParentNode(),
  // GraphAdapter.getNodes() | Layer.getNodes()
  getNodes: (a) => dyn(a.onObject()).getNodes!(),
  // Layer/NodeAdapter/LNode.getGraph()
  getGraph: (a) => dyn(a.onObject()).getGraph!(),
  // getLayerlessNodes().get(i) <h>
  layerlessAt: (a) => new Handle(a.onG().getLayerlessNodes()[a.i(0)]),
  // (on LNode) getPorts().get(i) <h>
  portAt: (a) => new Handle(a.onN().getPorts()[a.i(0)]),
};

function portList(ports: Iterable<LPort>): LPort[] {
  return [...ports];
}

export const NODE_OPS: Readonly<Record<string, Op>> = {
  // setLayer(Layer)
  setLayer: (a) => {
    a.onN().setLayer(a.yOrNull(0));
    return null;
  },
  // setLayer(int, Layer)
  setLayerAt: (a) => {
    a.onN().setLayer(a.i(0), a.yOrNull(1));
    return null;
  },
  // getLayer()
  getLayer: (a) => a.onN().getLayer(),
  // setType(NodeType)
  setType: (a) => {
    a.onN().setType(a.nodeType(0));
    return null;
  },
  // getType()
  getType: (a) => a.onN().getType(),
  // getPorts(PortType)
  getPortsOfType: (a) => portList(a.onN().getPorts(a.type(0)!)),
  // getPorts(PortSide)
  getPortsOfSide: (a) => portList(a.onN().getPorts(a.side(0)!)),
  // getPorts(PortType, PortSide)
  getPortsOfTypeAndSide: (a) => portList(a.onN().getPorts(a.type(0)!, a.side(1)!)),
  // cachePortSides()
  cachePortSides: (a) => {
    a.onN().cachePortSides();
    return null;
  },
  // getPortSideView(side) the sublist
  getPortSideView: (a) => a.onN().getPortSideView(a.side(0)!),
  // getPortSideView(side).get(i)
  portSideViewGet: (a) => a.onN().getPortSideView(a.side(0)!)[a.i(1)],
  // getPortSideView(side).size()
  portSideViewSize: (a) => a.onN().getPortSideView(a.side(0)!).length,
  // getPortSideView(side).set(i, port) (returns the old port)
  portSideViewSet: (a) => {
    const view = a.onN().getPortSideView(a.side(0)!);
    const old = view[a.i(1)];
    view[a.i(1)] = a.p(2);
    return old;
  },
  // getNestedGraph()
  getNestedGraph: (a) => a.onN().getNestedGraph(),
  // setNestedGraph(graph|null)
  setNestedGraph: (a) => {
    a.onN().setNestedGraph(a.gOrNull(0));
    return null;
  },
  // isInlineEdgeLabel()
  isInlineEdgeLabel: (a) => a.onN().isInlineEdgeLabel(),
  // borderToContentAreaCoordinates(boolean, boolean)
  borderToContentAreaCoordinates: (a) => {
    a.onN().borderToContentAreaCoordinates(a.b(0), a.b(1));
    return null;
  },
  // getInteractiveReferencePoint() (a point or null)
  getInteractiveReferencePoint: (a) => a.onN().getInteractiveReferencePoint(),
};

export const SHARED_OPS: Readonly<Record<string, Op>> = {
  // LNode.getPorts() | NodeAdapter.getPorts()
  getPorts: (a) => dyn(a.onObject()).getPorts!(),
  // getLabels() (LNode, LPort, LEdge, NodeAdapter, PortAdapter, EdgeAdapter)
  getLabels: (a) => dyn(a.onObject()).getLabels!(),
  // getLabels().add(label) (LNode, LPort, LEdge)
  labelsAdd: (a) => {
    (dyn(a.onObject()).getLabels!() as LLabel[]).push(a.l(0));
    return null;
  },
  // getIncomingEdges() (LNode, LPort, PortAdapter, NodeAdapter)
  getIncomingEdges: (a) => dyn(a.onObject()).getIncomingEdges!(),
  // getOutgoingEdges() (LNode, LPort, PortAdapter, NodeAdapter)
  getOutgoingEdges: (a) => dyn(a.onObject()).getOutgoingEdges!(),
  // getConnectedEdges() (LNode, LPort)
  getConnectedEdges: (a) => dyn(a.onObject()).getConnectedEdges!(),
  // getIndex() (LNode, LPort, Layer)
  getIndex: (a) => dyn(a.onObject()).getIndex!(),
  // getSide() (LPort, PortAdapter, LabelAdapter)
  getSide: (a) => dyn(a.onObject()).getSide!(),
};

export const PORT_OPS: Readonly<Record<string, Op>> = {
  // setNode(node|null)
  setNode: (a) => {
    a.onP().setNode(a.nOrNull(0));
    return null;
  },
  // getNode()
  getNode: (a) => a.onP().getNode(),
  // setSide(side|null)
  setSide: (a) => {
    a.onP().setSide(a.side(0) as never);
    return null;
  },
  // setExplicitlySuppliedPortAnchor(boolean)
  setExplicitlySuppliedPortAnchor: (a) => {
    a.onP().setExplicitlySuppliedPortAnchor(a.b(0));
    return null;
  },
  // isExplicitlySuppliedPortAnchor()
  isExplicitlySuppliedPortAnchor: (a) => a.onP().isExplicitlySuppliedPortAnchor(),
  // setConnectedToExternalNodes(boolean)
  setConnectedToExternalNodes: (a) => {
    a.onP().setConnectedToExternalNodes(a.b(0));
    return null;
  },
  // isConnectedToExternalNodes()
  isConnectedToExternalNodes: (a) => a.onP().isConnectedToExternalNodes(),
  // getAbsoluteAnchor()
  getAbsoluteAnchor: (a) => a.onP().getAbsoluteAnchor(),
  // getName()
  getName: (a) => a.onP().getName(),
  // getDegree()
  getDegree: (a) => a.onP().getDegree(),
  // getNetFlow()
  getNetFlow: (a) => a.onP().getNetFlow(),
  // getPredecessorPorts()
  getPredecessorPorts: (a) => a.onP().getPredecessorPorts(),
  // getSuccessorPorts()
  getSuccessorPorts: (a) => a.onP().getSuccessorPorts(),
  // getConnectedPorts()
  getConnectedPorts: (a) => a.onP().getConnectedPorts(),
};

export const EDGE_OPS: Readonly<Record<string, Op>> = {
  // setSource(port|null)
  setSource: (a) => {
    a.onE().setSource(a.pOrNull(0));
    return null;
  },
  // setTarget(port|null)
  setTarget: (a) => {
    a.onE().setTarget(a.pOrNull(0));
    return null;
  },
  // setTargetAndInsertAtIndex(port|null, int)
  setTargetAndInsertAtIndex: (a) => {
    a.onE().setTargetAndInsertAtIndex(a.pOrNull(0), a.i(1));
    return null;
  },
  // getSource()
  getSource: (a) => a.onE().getSource(),
  // getTarget()
  getTarget: (a) => a.onE().getTarget(),
  // reverse(LGraph, boolean)
  reverse: (a) => {
    a.onE().reverse(a.g(0), a.b(1));
    return null;
  },
  // isSelfLoop()
  isSelfLoop: (a) => a.onE().isSelfLoop(),
  // isInLayerEdge()
  isInLayerEdge: (a) => a.onE().isInLayerEdge(),
  // getOther(LPort)
  getOtherPort: (a) => a.onE().getOther(a.p(0)),
  // getOther(LNode)
  getOtherNode: (a) => a.onE().getOther(a.n(0)),
};
