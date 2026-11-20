// SPDX-License-Identifier: EPL-2.0
// Port of InvertedPortProcessorTest (mission 7c, T8): `testValidNodeOrder`, @TestAfterProcessor(InvertedPortProcessor).
//
// Row selection: the Java graph set is the ptolemy models with one configurator, EDGE_ROUTING = ORTHOGONAL, which is
// the layered default (LayeredOptions.EDGE_ROUTING_DEFAULT) and so needs no option on the rows. The rows are the
// `models/ptolemy-*` rows of test/golden/refs/java/layered-order.json whose last replayed entry is
// INVERTED_PORT_PROCESSOR with the default options (configuration label `default`; the recorder keeps the processor
// only on graphs that ask for it, NON_FREE_PORTS). Other model families, `scenarios/*` and `sites/*` are excluded.
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/InvertedPortProcessorTest.java
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runOrderPrefix } from '../../../../test/helpers/layered-order-replay-ops.js';
import { loadOrderRows } from '../../../../test/helpers/layered-order-replay-rows.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LGraph } from '../graph/LGraph.js';
import { ORDER_PHASE_FACTORIES } from '../../../../test/helpers/layered-replay-factories.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const STOP = 'INVERTED_PORT_PROCESSOR';
const ID_PATTERN = /^models\/ptolemy-[^/]+\/[^/]+\/INVERTED_PORT_PROCESSOR\/default$/;

const rows = loadOrderRows(ROWS_FILE).filter((row) => ID_PATTERN.test(row.id) && row.prefix?.at(-1) === STOP);

function testValidNodeOrder(lGraph: LGraph): void {
  for (const layer of lGraph) {
    for (const node of layer) {
      // outgoing edges left
      for (const edge of node.getOutgoingEdges()) {
        if (edge.getSource()!.getSide() === PortSide.WEST) {
          const target = edge.getTarget()!.getNode()!;

          // dummy in same layer
          expect(target.getType() === NodeType.LONG_EDGE).toBe(true);
          expect(target.getLayer()!.getIndex() === layer.getIndex()).toBe(true);
        }
      }
      // incoming edges right
      for (const edge of node.getIncomingEdges()) {
        if (edge.getTarget()!.getSide() === PortSide.EAST) {
          const source = edge.getSource()!.getNode()!;

          // dummy in same layer
          expect(source.getType() === NodeType.LONG_EDGE).toBe(true);
          expect(source.getLayer()!.getIndex() === layer.getIndex()).toBe(true);
        }
      }
    }
  }
}

describe('InvertedPortProcessorTest on the replayed rows', () => {
  it('selects the ptolemy INVERTED_PORT_PROCESSOR rows', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: testValidNodeOrder', (_id, row) => {
    const graph = runOrderPrefix(row, ORDER_PHASE_FACTORIES);
    expect([...graph].length).toBeGreaterThan(0);
    testValidNodeOrder(graph);
  });
});
