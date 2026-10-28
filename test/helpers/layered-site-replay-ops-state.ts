// SPDX-License-Identifier: EPL-2.0
// Ops of the layered site replay, part 1b (tools/vectors/LayeredSiteVectors.java: registerState): the observable
// fields of one element, named by the context.
import { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LGraphElement } from '../../src/alg/layered/graph/LGraphElement.js';
import { LLabel } from '../../src/alg/layered/graph/LLabel.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { LPort } from '../../src/alg/layered/graph/LPort.js';
import { Layer } from '../../src/alg/layered/graph/Layer.js';
import type { Args, Op } from './layered-site-replay-args.js';
import { Ctx, Raw, ReplayBug, compareStrings, dyn, pair, type Json } from './layered-site-replay-context.js';

function names(c: Ctx, items: Iterable<unknown>): unknown[] {
  return [...items].map((x) => c.value(x));
}

/** The C4 values of the properties set on the element, keys sorted, restricted to `only` (null: all set ones). */
function propsOf(c: Ctx, e: LGraphElement, only: ReadonlySet<string> | null): Record<string, Json> {
  const entries: [string, Json][] = [];
  for (const [property, value] of e.getAllProperties() as Iterable<[{ getId(): string }, unknown]>) {
    if (only === null || only.has(property.getId())) {
      entries.push([property.getId(), c.encode(value, 0)]);
    }
  }
  entries.sort(([x], [y]) => compareStrings(x, y));
  return Object.fromEntries(entries);
}

function graphState(c: Ctx, g: LGraph): Record<string, unknown> {
  return {
    size: pair(g.getSize()),
    padding: c.value(g.getPadding()),
    offset: pair(g.getOffset()),
    parentNode: c.value(g.getParentNode()),
    layerlessNodes: names(c, g.getLayerlessNodes()),
    layers: names(c, g.getLayers()),
  };
}

function nodeState(c: Ctx, n: LNode): Record<string, unknown> {
  return {
    type: n.getType().name(),
    pos: pair(n.getPosition()),
    size: pair(n.getSize()),
    margin: c.value(n.getMargin()),
    padding: c.value(n.getPadding()),
    graph: c.value(n.getGraph()),
    layer: c.value(n.getLayer()),
    ports: names(c, n.getPorts()),
    labels: names(c, n.getLabels()),
    nested: c.value(n.getNestedGraph()),
  };
}

function portState(c: Ctx, p: LPort): Record<string, unknown> {
  return {
    node: c.value(p.getNode()),
    side: p.getSide().name(),
    pos: pair(p.getPosition()),
    size: pair(p.getSize()),
    anchor: pair(p.getAnchor()),
    explicitAnchor: p.isExplicitlySuppliedPortAnchor(),
    connectedToExternalNodes: p.isConnectedToExternalNodes(),
    margin: c.value(p.getMargin()),
    labels: names(c, p.getLabels()),
    incoming: names(c, p.getIncomingEdges()),
    outgoing: names(c, p.getOutgoingEdges()),
  };
}

function edgeState(c: Ctx, e: LEdge): Record<string, unknown> {
  return {
    source: c.value(e.getSource()),
    target: c.value(e.getTarget()),
    bendPoints: c.value(e.getBendPoints()),
    labels: names(c, e.getLabels()),
  };
}

function labelState(l: LLabel): Record<string, unknown> {
  return { text: l.getText(), pos: pair(l.getPosition()), size: pair(l.getSize()) };
}

function layerState(c: Ctx, y: Layer): Record<string, unknown> {
  return { graph: c.value(y.getGraph()), size: pair(y.getSize()), nodes: names(c, y.getNodes()) };
}

function fieldsOf(c: Ctx, o: unknown): Record<string, unknown> {
  if (o instanceof LGraph) {
    return graphState(c, o);
  } else if (o instanceof LNode) {
    return nodeState(c, o);
  } else if (o instanceof LPort) {
    return portState(c, o);
  } else if (o instanceof LEdge) {
    return edgeState(c, o);
  } else if (o instanceof LLabel) {
    return labelState(o);
  } else if (o instanceof Layer) {
    return layerState(c, o);
  }
  throw new ReplayBug('no state for the receiver');
}

/** state(ids|null): path first (it names the element), then the fields in the Java order, then the properties. */
function state(a: Args): unknown {
  const o = a.onObject();
  const path = a.c.pathOf(o);
  const fields = fieldsOf(a.c, o);
  const only = a.isNull(0) ? null : new Set(a.list(0) as readonly string[]);
  return new Raw({ path, ...fields, properties: propsOf(a.c, o as LGraphElement, only) });
}

export const STATE_OPS: Readonly<Record<string, Op>> = {
  // state(ids|null)
  state,
  // Object.toString()
  toString: (a: Args) => dyn(a.onObject()).toString!(),
  // LGraphElement.getDesignation()
  getDesignation: (a) => a.onAs(LGraphElement).getDesignation(),
  // LabelAdapter.getText() | LLabel.getText()
  getText: (a) => dyn(a.onObject()).getText!(),
};
