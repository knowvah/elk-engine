// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { LGraph } from '../../graph/LGraph.js';
import { NeighborhoodInformation } from './NeighborhoodInformation.js';

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('NeighborhoodInformation', () => {
  it('releases its arrays on cleanup', () => {
    const graph = new LGraph();
    const [a, b] = [addNode(graph), addNode(graph)] as const;
    a.setLayer(addLayer(graph));
    b.setLayer(addLayer(graph));
    connect(addPort(a), addPort(b));
    const ni = NeighborhoodInformation.buildFor(graph);
    ni.cleanup();
    expect(ni.layerIndex).toBeNull();
    expect(ni.nodeIndex).toBeNull();
    expect(ni.leftNeighbors).toEqual([]);
    expect(ni.rightNeighbors).toEqual([]);
    expect(ni.neighborComparator).toBeNull();
  });
});
