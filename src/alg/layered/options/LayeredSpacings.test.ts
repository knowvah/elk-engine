// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { LayoutOptionDataTarget } from '../../../core/data/LayoutOptionDataTarget.js';
import { MapPropertyHolder } from '../../../graph/properties/MapPropertyHolder.js';
import { LGraph } from '../graph/LGraph.js';
import { LNode } from '../graph/LNode.js';
import { LayeredMetaDataProvider } from './LayeredMetaDataProvider.js';
import { LayeredOptions } from './LayeredOptions.js';
import { LayeredSpacings, LayeredSpacingsBuilder } from './LayeredSpacings.js';

beforeAll(() => {
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
});

const EXPECTED_ORDER = [
  LayeredOptions.SPACING_NODE_NODE,
  LayeredOptions.SPACING_COMPONENT_COMPONENT,
  LayeredOptions.SPACING_EDGE_EDGE,
  LayeredOptions.SPACING_EDGE_LABEL,
  LayeredOptions.SPACING_EDGE_NODE,
  LayeredOptions.SPACING_LABEL_LABEL,
  LayeredOptions.SPACING_LABEL_NODE,
  LayeredOptions.SPACING_LABEL_PORT_HORIZONTAL,
  LayeredOptions.SPACING_LABEL_PORT_VERTICAL,
  LayeredOptions.SPACING_NODE_SELF_LOOP,
  LayeredOptions.SPACING_PORT_PORT,
  LayeredOptions.SPACING_EDGE_EDGE_BETWEEN_LAYERS,
  LayeredOptions.SPACING_EDGE_NODE_BETWEEN_LAYERS,
  LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS,
].map((p) => p.getId());

describe('LayeredSpacings', () => {
  it('has the base option and the 13 dependent options as factor keys', () => {
    const ids = [...LayeredSpacings.withBaseValue(33).getFactors().keys()].map((p) => p.getId());
    expect(ids).toHaveLength(EXPECTED_ORDER.length);
    expect([...ids].sort()).toEqual([...EXPECTED_ORDER].sort());
  });

  it('uses SPACING_NODE_NODE as the base option with factor 1', () => {
    expect(LayeredSpacingsBuilder.BASE_SPACING_OPTION).toBe(LayeredOptions.SPACING_NODE_NODE);
    expect(LayeredSpacings.withBaseValue(7).getFactors().get(LayeredOptions.SPACING_NODE_NODE)).toBe(1);
  });

  it('copies an explicit factor verbatim', () => {
    const builder = LayeredSpacings.withBaseValue(33).withFactor(LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS, 2);
    expect(builder.getFactors().get(LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS)).toBe(2);
  });

  it('withBaseValue returns a builder instance', () => {
    expect(LayeredSpacings.withBaseValue(1)).toBeInstanceOf(LayeredSpacingsBuilder);
  });

  it('OPTION_TARGET_FILTER accepts every option for a holder that is no layered graph element', () => {
    const holder = new MapPropertyHolder();
    expect(LayeredSpacings.OPTION_TARGET_FILTER(holder, LayeredOptions.SPACING_EDGE_EDGE)).toBe(true);
  });

  it('OPTION_TARGET_FILTER maps LGraph and LNode holders to the option targets', () => {
    const graph = new LGraph();
    const node = new LNode(graph);
    const id = LayeredOptions.SPACING_NODE_NODE.getId();
    const targets = LayoutMetaDataService.getInstance().getOptionData(id)!.getTargets();
    expect(LayeredSpacings.OPTION_TARGET_FILTER(graph, LayeredOptions.SPACING_NODE_NODE)).toBe(
      targets.contains(LayoutOptionDataTarget.NODES) || targets.contains(LayoutOptionDataTarget.PARENTS),
    );
    expect(LayeredSpacings.OPTION_TARGET_FILTER(node, LayeredOptions.SPACING_NODE_NODE)).toBe(
      targets.contains(LayoutOptionDataTarget.NODES),
    );
  });
});
