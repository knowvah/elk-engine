// SPDX-License-Identifier: EPL-2.0
// Read helpers for the transform/provider site tests of mission 7a (T11c): look elements of a T1 LGraph dump up by
// their positional path, decode the dump's hex doubles and C4 property values to plain JS values, and read a value out
// of an exported ELK JSON object by a dotted path. The expected literals in the tests are the Java values of the rows
// of test/golden/refs/java/layered-sites.json (recorded by tools/vectors/LayeredSiteVectors.java).
import {
  decodeHex,
  type EdgeDump,
  type EncodedValue,
  type GraphDump,
  type Hex,
  type HexPair,
  type HexQuad,
  type LabelDump,
  type LGraphDump,
  type NodeDump,
  type PortDump,
} from './layered-framework-replay.js';

export type DumpElement = GraphDump | NodeDump | PortDump | EdgeDump | LabelDump;

/** The elements of a dump by positional path ("g0", "g0/n3", "g0/n3/p1", "g0/e2", "g0/n3/l0", "g0/e2/l0"). */
export class DumpIndex {
  private readonly byPath = new Map<string, DumpElement>();

  constructor(readonly dump: LGraphDump) {
    for (const graph of dump.graphs) {
      this.byPath.set(graph.path, graph);
      for (const node of graph.layerlessNodes) {
        this.addNode(node);
      }
      for (const edge of graph.edges) {
        this.byPath.set(edge.path, edge);
        edge.labels.forEach((label) => this.byPath.set(label.path, label));
      }
    }
  }

  private addNode(node: NodeDump): void {
    this.byPath.set(node.path, node);
    node.labels.forEach((label) => this.byPath.set(label.path, label));
    for (const port of node.ports) {
      this.byPath.set(port.path, port);
      port.labels.forEach((label) => this.byPath.set(label.path, label));
    }
  }

  graph(path: string): GraphDump {
    return this.get(path) as GraphDump;
  }
  node(path: string): NodeDump {
    return this.get(path) as NodeDump;
  }
  port(path: string): PortDump {
    return this.get(path) as PortDump;
  }
  edge(path: string): EdgeDump {
    return this.get(path) as EdgeDump;
  }
  label(path: string): LabelDump {
    return this.get(path) as LabelDump;
  }

  has(path: string): boolean {
    return this.byPath.has(path);
  }

  private get(path: string): DumpElement {
    const found = this.byPath.get(path);
    if (found === undefined) {
      throw new Error(`no element ${path} in the LGraph dump`);
    }
    return found;
  }
}

/** A hex pair as numbers. */
export function xy(pair: HexPair): [number, number] {
  return [decodeHex(pair[0]), decodeHex(pair[1])];
}

/** A hex quad (top, right, bottom, left) as numbers. */
export function quad(q: HexQuad): [number, number, number, number] {
  return [decodeHex(q[0]), decodeHex(q[1]), decodeHex(q[2]), decodeHex(q[3])];
}

/** A hex double as a number. */
export function num(hex: Hex): number {
  return decodeHex(hex);
}

/**
 * The value of a property of a dumped element (by its id, with or without the "org.eclipse.elk." prefix; the
 * internal properties such as "origin" and "graphProperties" have bare ids), decoded: booleans, strings and numbers as themselves, an enum as its
 * name, an EnumSet as its item names, a KVector as [x, y], a list as a list, an element reference as its path, an
 * ELK reference as "elk:<id>"; `undefined` when the property is not set.
 */
export function prop(element: DumpElement, name: string): unknown {
  const value = element.properties[name] ?? element.properties[`org.eclipse.elk.${name}`];
  return value === undefined ? undefined : decodeValue(value);
}

function decodeValue(value: EncodedValue): unknown {
  if (value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map(decodeValue);
  }
  const v = value as Exclude<EncodedValue, readonly EncodedValue[] | null>;
  if ('ref' in v) {
    return v.ref;
  }
  if ('elk' in v) {
    return `elk:${String(v.elk)}`;
  }
  if ('class' in v) {
    return `class:${v.class}`;
  }
  switch (v.t) {
    case 'enum':
      return v.n;
    case 'set':
      return [...v.items];
    case 'list':
      return v.items.map(decodeValue);
    case 'obj': {
      const x = decodeValue(v.fields['x'] ?? null);
      const y = decodeValue(v.fields['y'] ?? null);
      return v.c === 'KVector'
        ? [x, y]
        : Object.fromEntries(Object.entries(v.fields).map(([k, f]) => [k, decodeValue(f)]));
    }
    case 'double':
      return Number(v.v);
    default:
      return v.v;
  }
}

/** Reads `path` ("children/0/x"; a key may contain dots, e.g. "layoutOptions/port.side") from parsed JSON. */
export function at(json: unknown, path: string): unknown {
  let current: unknown = json;
  for (const key of path.split('/')) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

const NON_FINITE = /([:,[]\s*)(-?Infinity|NaN)(?=\s*[,\]}])/g;

/**
 * Parses ELK JSON text the way the recorder wrote it: the JsonWriter emits non-finite doubles as bare tokens, which
 * strict JSON cannot hold, so in number-token positions they become the strings "Infinity", "-Infinity" and "NaN".
 */
export function parseExportedElk(text: string): unknown {
  return JSON.parse(text.replace(NON_FINITE, '$1"$2"')) as unknown;
}

/** The geometry [x, y, width, height] of the ELK element at `path` of exported ELK JSON. */
export function geom(json: unknown, path: string): [unknown, unknown, unknown, unknown] {
  return [at(json, `${path}/x`), at(json, `${path}/y`), at(json, `${path}/width`), at(json, `${path}/height`)];
}

export interface SectionView {
  readonly start: [unknown, unknown];
  readonly bends: [unknown, unknown][];
  readonly end: [unknown, unknown];
}

/** The first edge section of the ELK edge at `path`, or `undefined` for an edge without sections. */
export function section(json: unknown, path: string): SectionView | undefined {
  const first = at(json, `${path}/sections/0`);
  if (first === undefined) {
    return undefined;
  }
  const point = (key: string): [unknown, unknown] => [at(first, `${key}/x`), at(first, `${key}/y`)];
  const bends = (at(first, 'bendPoints') as { x: unknown; y: unknown }[] | undefined) ?? [];
  return {
    start: point('startPoint'),
    bends: bends.map((b): [unknown, unknown] => [b.x, b.y]),
    end: point('endPoint'),
  };
}
