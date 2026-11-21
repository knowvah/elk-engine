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
import { runSteps } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { runOrderPrefix } from '../../../../test/helpers/layered-order-replay-ops.js';
import { loadOrderRows, type OrderRow } from '../../../../test/helpers/layered-order-replay-rows.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { ORDER_PHASE_FACTORIES } from '../../../../test/helpers/layered-replay-factories.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const STOP = 'INVERTED_PORT_PROCESSOR';
const ID_PATTERN = /^models\/ptolemy-[^/]+\/[^/]+\/INVERTED_PORT_PROCESSOR\/default$/;

const rows = loadOrderRows(ROWS_FILE).filter((row) => ID_PATTERN.test(row.id) && row.prefix?.at(-1) === STOP);

/** Runs the Java assertions; returns the number of edges that reached an assertion. */
function testValidNodeOrder(lGraph: LGraph): number {
  let asserted = 0;
  for (const layer of lGraph) {
    for (const node of layer) {
      // outgoing edges left
      for (const edge of node.getOutgoingEdges()) {
        if (edge.getSource()!.getSide() === PortSide.WEST) {
          asserted++;
          const target = edge.getTarget()!.getNode()!;

          // dummy in same layer
          expect(target.getType() === NodeType.LONG_EDGE).toBe(true);
          expect(target.getLayer()!.getIndex() === layer.getIndex()).toBe(true);
        }
      }
      // incoming edges right
      for (const edge of node.getIncomingEdges()) {
        if (edge.getTarget()!.getSide() === PortSide.EAST) {
          asserted++;
          const source = edge.getSource()!.getNode()!;

          // dummy in same layer
          expect(source.getType() === NodeType.LONG_EDGE).toBe(true);
          expect(source.getLayer()!.getIndex() === layer.getIndex()).toBe(true);
        }
      }
    }
  }
  return asserted;
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

// Non-ptolemy rows ending at INVERTED_PORT_PROCESSOR (the row list of InvertedPortProcessor.test.ts), where the
// assertions can execute (mission layered-evidence-gaps, T1, D1). The Java test runs after the processor in a whole
// pipeline, where PORT_SIDE_PROCESSOR has run before it (GraphConfigurator.java:214-218), so a node with free
// ports has no EAST input or WEST output. A step row whose chain omits PORT_SIDE_PROCESSOR is outside that contract:
// `sites/InvertedPortProcessor/freePorts` probes the skip of InvertedPortProcessor.java:117-119 with a free-port node
// whose reversed edge enters an EAST port, for which the processor (and the oracle's recorded row) has no dummy.
const PORT_SIDES = 'PORT_SIDE_PROCESSOR';
const OUTSIDE_PIPELINE: readonly string[] = ['sites/InvertedPortProcessor/freePorts'];

function entriesOf(row: OrderRow): readonly string[] {
  return row.prefix !== null
    ? row.prefix
    : row.steps!.filter(([op]) => op === 'runProcessor' || op === 'runPhase').map((step) => step.slice(1).join('/'));
}

const otherRows = loadOrderRows(ROWS_FILE).filter((row) => !ID_PATTERN.test(row.id) && entriesOf(row).at(-1) === STOP);
const pipelineRows = otherRows.filter((row) => entriesOf(row).includes(PORT_SIDES));

function replay(row: OrderRow): LGraph {
  return row.steps === null ? runOrderPrefix(row, ORDER_PHASE_FACTORIES) : runSteps(row, ORDER_PHASE_FACTORIES);
}

function sideFixed(node: LNode): boolean {
  return node.getProperty(LayeredOptions.PORT_CONSTRAINTS).isSideFixed();
}

/**
 * True when an edge of the imported input leaves a WEST port or enters an EAST port of a node with side-fixed port
 * constraints. Read from the row's recorded input (import only, no processor ran), not from the port's output.
 */
function inputHasInvertedEdge(row: OrderRow): boolean {
  return importRow(row)
    .graph.getLayerlessNodes()
    .some(
      (node) =>
        sideFixed(node) &&
        ([...node.getOutgoingEdges()].some((edge) => edge.getSource()!.getSide() === PortSide.WEST) ||
          [...node.getIncomingEdges()].some((edge) => edge.getTarget()!.getSide() === PortSide.EAST)),
    );
}

describe('InvertedPortProcessorTest on the non-ptolemy rows', () => {
  it('selects the other INVERTED_PORT_PROCESSOR rows', () => {
    expect(pipelineRows.length).toBeGreaterThan(0);
  });

  it('leaves out only the rows whose chain omits PORT_SIDE_PROCESSOR', () => {
    expect(otherRows.filter((row) => !pipelineRows.includes(row)).map((row) => row.id)).toEqual(OUTSIDE_PIPELINE);
  });

  it('runs assertions on at least five rows', () => {
    expect(pipelineRows.filter(inputHasInvertedEdge).length).toBeGreaterThanOrEqual(5);
  });

  it.each(pipelineRows.map((row) => [row.id, row] as const))('%s: testValidNodeOrder', (_id, row) => {
    const asserted = testValidNodeOrder(replay(row));
    // Only positivity is derivable from the input: P1 may reverse an edge, which can bring an edge to a WEST source or
    // EAST target that the input does not have (528_violatedNodeOrder), so a false predicate asserts nothing.
    if (inputHasInvertedEdge(row)) {
      expect(asserted).toBeGreaterThan(0);
    }
  });
});
