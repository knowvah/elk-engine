// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { CANONICAL_NAN_HEX, NEGATIVE_NAN } from './double-hex.js';
import {
  AVERAGE_GROUP,
  buildGraph,
  buildOrderBalanceGraph,
  CYRUS_BECK_GROUP,
  EDGE_ROUTER_GROUP,
  hexOf,
  loadUnitRows,
  ORDER_BALANCE_GROUP,
  parseUnitRows,
  unhex,
  unitRowsOf,
  type AverageRow,
  type GraphRow,
  type OrderBalanceRow,
} from './mrtree-unit-vectors.js';
import { InternalProperties } from '../../src/alg/mrtree/options/InternalProperties.js';
import { MrTreeOptions } from '../../src/alg/mrtree/options/MrTreeOptions.js';

describe('mrtree-units.json loader', () => {
  it('has the recorded row counts per group and unique ids', () => {
    const { rowCounts, rows } = loadUnitRows();
    expect(rowCounts).toEqual({ edgeRouter: 422, cyrusBeck: 46, orderBalance: 18, average: 2170 });
    expect(rows.length).toBe(2656);
    expect(new Set(rows.map((r) => r.id)).size).toBe(2656);
    expect(unitRowsOf(AVERAGE_GROUP).length).toBe(2170);
  });

  it('rejects an envelope whose rowCounts disagree with the rows', () => {
    const text = JSON.stringify({
      rowCounts: { edgeRouter: 1, cyrusBeck: 0, orderBalance: 0, average: 0 },
      rows: [],
    });
    expect(() => parseUnitRows(text)).toThrow('rowCounts.edgeRouter is 1, found 0');
    expect(() => parseUnitRows('[]')).toThrow('unexpected envelope');
  });

  it('decodes and encodes raw double bits', () => {
    expect(unhex('3ff0000000000000')).toBe(1);
    expect(unhex('8000000000000000')).toBe(-0);
    expect(Object.is(unhex('8000000000000000'), -0)).toBe(true);
    expect(unhex('7ff0000000000000')).toBe(Infinity);
    expect(Number.isNaN(unhex('7ff8000000000000'))).toBe(true);
    expect(hexOf(1)).toBe('3ff0000000000000');
    expect(hexOf(-0)).toBe('8000000000000000');
    expect(hexOf(0.1)).toBe('3fb999999999999a');
  });

  it('builds the graph of a recorded graph row as the recorder does', () => {
    const row = unitRowsOf<GraphRow['input'], GraphRow['expected']>(EDGE_ROUTER_GROUP)[0]!;
    const { graph, edges } = buildGraph(row.input);
    expect(graph.getNodes().size()).toBe(row.input.nodes.length);
    expect(edges.length).toBe(row.input.edges.length);
    expect(graph.getProperty(MrTreeOptions.SPACING_EDGE_NODE)).toBe(row.input.spacing);
    expect(graph.getProperty(InternalProperties.GRAPH_XMIN)).toBe(row.input.bounds[0]);
    const root = row.input.nodes.findIndex((n) => n.root === true);
    expect(graph.getNodes().get(root).getProperty(InternalProperties.ROOT)).toBe(true);
    const [s, t] = row.input.edges[0]!;
    expect(edges[0]!.getSource()).toBe(graph.getNodes().get(s!));
    expect(edges[0]!.getTarget()!.getIncomingEdges().get(0)).toBeDefined();
    expect(t).toBeDefined();
    expect(unitRowsOf(CYRUS_BECK_GROUP).length).toBe(46);
  });

  it('builds the state OrderBalance starts from', () => {
    const row = unitRowsOf<OrderBalanceRow['input'], OrderBalanceRow['expected']>(ORDER_BALANCE_GROUP)[0]!;
    const { graph, nodes } = buildOrderBalanceGraph(row.input, row.expected);
    expect(nodes.length).toBe(row.input.parents.length);
    expect(graph.getNodes().size()).toBe(nodes.length);
    expect(nodes[0]!.getProperty(InternalProperties.ROOT)).toBe(true);
    expect(nodes[0]!.getProperty(InternalProperties.FAN)).toBe(row.expected.props[0]![0]);
    expect(nodes[0]!.getProperty(InternalProperties.LEFTSIBLING)).toBe(nodes[0]);
  });

  it('records inputs of the average group as hex of the raw bits', () => {
    const row = unitRowsOf<AverageRow['input'], AverageRow['expected']>(AVERAGE_GROUP)[0]!;
    expect(row.input.length).toBeGreaterThan(0);
    expect(row.input.every((h) => /^[0-9a-f]{16}$/.test(h))).toBe(true);
    expect(row.expected.bits).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('NaN sign (issue #72)', () => {
  it('encodes both NaN signs as the one canonical NaN', () => {
    expect(hexOf(NEGATIVE_NAN)).toBe(CANONICAL_NAN_HEX);
    expect(hexOf(NaN)).toBe(CANONICAL_NAN_HEX);
  });
});
