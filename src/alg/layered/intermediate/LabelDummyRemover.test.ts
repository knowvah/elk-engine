// SPDX-License-Identifier: EPL-2.0
// Proof of LabelDummyRemover (mission 7f2, T4a): every `scenarios/LabelDummyRemover/*` row and every `models` row that
// stops at `LABEL_DUMMY_REMOVER` of `layered-labels.json`, replayed with the class injected (the enum arm stays staged
// until T11). Every such plan also runs `LABEL_DUMMY_SWITCHER` and `LABEL_SIDE_SELECTOR` (siblings of mission 7f2); a row
// whose plan still holds a member with a staged enum arm is skipped and replays when that arm is wired (T12 replays all).
// The round-trip test restores the label order of an edge with several center labels. Expectations: rows only (L4, AD-13).
import { beforeAll, describe, expect, it } from 'vitest';
import {
  isStopRow,
  rowsByClass,
  rowsByLastPrefixEntry,
  type PipelineStopRow,
} from '../../../../test/helpers/layered-labels-replay-rows.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { EdgeLabelPlacement } from '../../../core/options/EdgeLabelPlacement.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { LEdge } from '../graph/LEdge.js';
import { LGraph } from '../graph/LGraph.js';
import { LLabel } from '../graph/LLabel.js';
import { LNode } from '../graph/LNode.js';
import { Layer } from '../graph/Layer.js';
import { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LabelDummyInserter } from './LabelDummyInserter.js';
import { replayDifferences, unportedMember } from './LabelDummyInserterReplay.test.js';
import { LabelDummyRemover } from './LabelDummyRemover.js';

const PROCESSOR = 'LABEL_DUMMY_REMOVER';

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows: PipelineStopRow[] = [
  ...rowsByClass('scenarios/LabelDummyRemover'),
  ...rowsByLastPrefixEntry(PROCESSOR).filter((row) => row.group === 'models'),
].filter(isStopRow);

describe('LabelDummyRemover (oracle rows)', () => {
  it('finds the recorded rows: 17 scenarios and 68 models stops', () => {
    expect(rows.filter((row) => row.group === 'scenarios')).toHaveLength(17);
    expect(rows.filter((row) => row.group === 'models')).toHaveLength(68);
  });

  for (const row of rows) {
    it(`replays ${row.id}`, (context) => {
      if (unportedMember(row) !== null) {
        context.skip();
      }
      expect(replayDifferences(row)).toEqual([]);
    });
  }
});

/** A two-node graph whose one edge carries `texts.length` center labels, laid out as source | dummy | target. */
function labelledGraph(texts: readonly string[]): { graph: LGraph; edge: LEdge; labels: LLabel[]; target: LPort } {
  const graph = new LGraph();
  const nodes = [new LNode(graph), new LNode(graph)];
  const [sourcePort, targetPort] = nodes.map((node, i) => {
    const port = new LPort();
    port.setSide(i === 0 ? PortSide.EAST : PortSide.WEST);
    port.setNode(node);
    return port;
  }) as [LPort, LPort];
  const edge = new LEdge();
  edge.setSource(sourcePort);
  edge.setTarget(targetPort);
  const labels = texts.map((text, i) => {
    const label = new LLabel(text);
    label.setProperty(LayeredOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.CENTER);
    label.getSize().x = 10 + i;
    label.getSize().y = 4 + i;
    edge.getLabels().push(label);
    return label;
  });
  graph.getLayerlessNodes().push(...nodes);
  return { graph, edge, labels, target: targetPort };
}

function layerOut(graph: LGraph): void {
  graph.getLayerlessNodes().forEach((node) => {
    const layer = new Layer(graph);
    graph.getLayers().push(layer);
    node.setLayer(layer);
  });
  graph.getLayerlessNodes().length = 0;
}

describe('LabelDummyInserter then LabelDummyRemover (round trip)', () => {
  const texts = ['first', 'second', 'third'];

  it('moves every center label to one dummy in order and takes the edge apart', () => {
    const { graph, edge, labels } = labelledGraph(texts);
    new LabelDummyInserter().process(graph, new BasicProgressMonitor());
    const dummies = graph.getLayerlessNodes().slice(2);
    expect(dummies).toHaveLength(1);
    expect(dummies[0]!.getProperty(InternalProperties.REPRESENTED_LABELS)).toEqual(labels);
    expect(dummies[0]!.getProperty(InternalProperties.ORIGIN)).toBe(edge);
    expect(edge.getLabels()).toEqual([]);
  });

  it('restores the original label order and the original edge', () => {
    const { graph, edge, labels, target } = labelledGraph(texts);
    new LabelDummyInserter().process(graph, new BasicProgressMonitor());
    layerOut(graph);
    new LabelDummyRemover().process(graph, new BasicProgressMonitor());
    expect(edge.getLabels()).toEqual(labels);
    expect(edge.getLabels().map((label) => label.getText())).toEqual(texts);
    expect(edge.getTarget()).toBe(target);
    expect(graph.getLayers().flatMap((layer) => layer.getNodes())).toHaveLength(2);
  });
});
