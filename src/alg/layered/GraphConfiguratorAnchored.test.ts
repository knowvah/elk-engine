// SPDX-License-Identifier: EPL-2.0
// Structural case for the configurator (mission 7f, T16a): the layered arm of `copyPortContraints`, which an imported
// graph never reaches (the importer leaves every node layerless), so it needs a hand-built layered `LGraph`.
import { beforeAll, describe, expect, it } from 'vitest';
import { addLayer, addNode } from '../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { PortConstraints } from '../../core/options/PortConstraints.js';
import { GraphConfigurator } from './GraphConfigurator.js';
import { LGraph } from './graph/LGraph.js';
import { InternalProperties } from './options/InternalProperties.js';
import { LayeredOptions } from './options/LayeredOptions.js';

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('GraphConfigurator.copyPortContraints on a layered graph (GraphConfigurator.java:138-144)', () => {
  it('copies the port constraints of the nodes of every layer, as it does for the layerless nodes', () => {
    const graph = new LGraph();
    const layerless = addNode(graph);
    layerless.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    const layer = addLayer(graph);
    const layered = addNode(graph);
    graph.getLayerlessNodes().splice(graph.getLayerlessNodes().indexOf(layered), 1);
    layered.setLayer(layer);
    layered.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);

    new GraphConfigurator().prepareGraphForLayout(graph);

    expect(graph.getLayers()[0]!.getNodes()).toEqual([layered]);
    expect(layerless.getProperty(InternalProperties.ORIGINAL_PORT_CONSTRAINTS)).toBe(PortConstraints.FIXED_POS);
    expect(layered.getProperty(InternalProperties.ORIGINAL_PORT_CONSTRAINTS)).toBe(PortConstraints.FIXED_ORDER);
  });
});
