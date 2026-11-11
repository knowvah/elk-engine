// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import { TEdge } from '../graph/TEdge.js';
import { TGraph } from '../graph/TGraph.js';
import { TNode } from '../graph/TNode.js';
import { InternalProperties } from './InternalProperties.js';

/** [field, id, default] as declared in InternalProperties.java:36-123 (the Java constructor arguments). */
const DECLARED: readonly (readonly [keyof typeof InternalProperties, string, unknown])[] = [
  ['ORIGIN', 'origin', null],
  ['RANDOM', 'random', null],
  ['DEPTH', 'DEPTH', 0],
  ['FAN', 'FAN', 0],
  ['DESCENDANTS', 'DESCENDANTS', 0],
  ['ROOT', 'ROOT', false],
  ['LEFTNEIGHBOR', 'LEFTNEIGHBOR', null],
  ['RIGHTNEIGHBOR', 'RIGHTNEIGHBOR', null],
  ['LEFTSIBLING', 'LEFTSIBLING', null],
  ['RIGHTSIBLING', 'RIGHTSIBLING', null],
  ['DUMMY', 'DUMMY', false],
  ['LEVEL', 'LEVEL', 0],
  ['XCOOR', 'XCOOR', 0],
  ['YCOOR', 'YCOOR', 0],
  ['LEVELHEIGHT', 'LEVELHEIGHT', 0],
  ['LEVELMIN', 'LEVELMIN', 0],
  ['LEVELMAX', 'LEVELMAX', 0],
  ['GRAPH_XMIN', 'GRAPH_XMIN', 0],
  ['GRAPH_YMIN', 'GRAPH_YMIN', 0],
  ['GRAPH_XMAX', 'GRAPH_XMAX', 0],
  ['GRAPH_YMAX', 'GRAPH_YMAX', 0],
  ['COMPACT_LEVEL_ASCENSION', 'COMPACT_LEVEL_ASCENSION', false],
  ['ID', 'ID', ''],
  ['POSITION', 'POSITION', 0],
  ['PRELIM', 'PRELIM', 0],
  ['MODIFIER', 'MODIFIER', 0],
  ['BB_UPLEFT', 'boundingBox.upLeft', null],
  ['BB_LOWRIGHT', 'boundingBox.lowRight', null],
];

const property = (field: keyof typeof InternalProperties): IProperty<unknown> =>
  InternalProperties[field] as IProperty<unknown>;

describe('InternalProperties', () => {
  beforeAll(() => {
    // the clone of a list default goes through ElkReflect, which the metadata service seeds (as ELK's static block does)
    LayoutMetaDataService.initElkReflect();
  });

  it.each(DECLARED)('%s has the id and the default of the Java declaration', (field, id, defaultValue) => {
    expect(property(field).getId()).toBe(id);
    expect(property(field).getDefault()).toEqual(defaultValue);
  });

  it('declares exactly the 30 properties of the Java class (28 plain, REMOVABLE_EDGES and COMPACT_CONSTRAINTS below)', () => {
    expect(DECLARED).toHaveLength(28);
    const fields = Object.getOwnPropertyNames(InternalProperties).filter((name) => {
      const value = (InternalProperties as unknown as Record<string, unknown>)[name];
      return typeof value === 'object' && value !== null && 'getId' in value;
    });
    expect(fields).toHaveLength(30);
    expect(fields.sort()).toEqual([...DECLARED.map(([f]) => f), 'REMOVABLE_EDGES', 'COMPACT_CONSTRAINTS'].sort());
  });

  it('REMOVABLE_EDGES defaults to an empty LinkedList, a fresh copy per read (InternalProperties.java:65-66)', () => {
    const first = InternalProperties.REMOVABLE_EDGES.getDefault();
    expect(first).toBeInstanceOf(LinkedList);
    expect(first.size()).toBe(0);
    first.add(new TEdge(null, null));
    expect(InternalProperties.REMOVABLE_EDGES.getDefault().size()).toBe(0);
    expect(InternalProperties.REMOVABLE_EDGES.getId()).toBe('REMOVABLE_EDGES');
  });

  it('COMPACT_CONSTRAINTS defaults to an empty ArrayList (an array), a fresh copy per read (InternalProperties.java:104-105)', () => {
    const first = InternalProperties.COMPACT_CONSTRAINTS.getDefault();
    expect(first).toEqual([]);
    first.push(new TNode(0, new TGraph()));
    expect(InternalProperties.COMPACT_CONSTRAINTS.getDefault()).toEqual([]);
    expect(InternalProperties.COMPACT_CONSTRAINTS.getId()).toBe('COMPACT_CONSTRAINTS');
  });

  it('a holder reads the default until a value is set, then the value', () => {
    const node = new TNode(0, new TGraph(), 'n');
    expect(node.getProperty(InternalProperties.LEVELHEIGHT)).toBe(0);
    node.setProperty(InternalProperties.LEVELHEIGHT, 31.5);
    expect(node.getProperty(InternalProperties.LEVELHEIGHT)).toBe(31.5);
    const other = new TNode(1, new TGraph(), 'm');
    node.setProperty(InternalProperties.RIGHTNEIGHBOR, other);
    expect(node.getProperty(InternalProperties.RIGHTNEIGHBOR)).toBe(other);
  });

  it('a list default mutated through getProperty does not leak into other holders', () => {
    const a = new TGraph();
    const b = new TGraph();
    a.getProperty(InternalProperties.REMOVABLE_EDGES).add(new TEdge(null, null));
    expect(b.getProperty(InternalProperties.REMOVABLE_EDGES).size()).toBe(0);
  });
});
