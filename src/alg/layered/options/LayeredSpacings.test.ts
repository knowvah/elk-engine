// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { LayoutOptionDataTarget } from '../../../core/data/LayoutOptionDataTarget.js';
import type { IPropertyHolder } from '../../../graph/properties/IPropertyHolder.js';
import { MapPropertyHolder } from '../../../graph/properties/MapPropertyHolder.js';
import { Property } from '../../../graph/properties/Property.js';
import { LEdge } from '../graph/LEdge.js';
import { LGraph } from '../graph/LGraph.js';
import { LLabel } from '../graph/LLabel.js';
import { LNode } from '../graph/LNode.js';
import { LPort } from '../graph/LPort.js';
import { Layer } from '../graph/Layer.js';
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

/** The 13 option ids probed by the site/layeredSpacings/targetFilter rows, in row order. */
const FILTER_OPTION_IDS = [
  'org.eclipse.elk.bendPoints',
  'org.eclipse.elk.noLayout',
  'org.eclipse.elk.priority',
  'org.eclipse.elk.layered.considerModelOrder.groupModelOrder.componentGroupId',
  'org.eclipse.elk.edgeLabels.inline',
  'org.eclipse.elk.nodeLabels.placement',
  'org.eclipse.elk.position',
  'org.eclipse.elk.labelManager',
  'org.eclipse.elk.alignment',
  'org.eclipse.elk.hierarchyHandling',
  'org.eclipse.elk.algorithm',
  'org.eclipse.elk.layered.allowNonFlowPortsToSwitchSides',
  'origin',
];

const A = true;
const _ = false;

// oracle: site/layeredSpacings/targetFilter/<kind>; one boolean per FILTER_OPTION_IDS entry (the JVM's answers).
const FILTER_MATRIX: [string, boolean[]][] = [
  ['graph', [_, A, A, A, _, A, A, A, A, A, A, _, A]],
  ['node', [_, A, A, A, _, A, A, _, A, A, _, _, A]],
  ['edge', [A, A, A, A, _, _, _, _, _, _, _, _, A]],
  ['port', [_, A, _, A, _, _, A, _, _, _, _, A, A]],
  ['label', [_, A, _, _, A, A, A, A, _, _, _, _, A]],
  ['layer', [A, A, A, A, A, A, A, A, A, A, A, A, A]],
  ['plain', [A, A, A, A, A, A, A, A, A, A, A, A, A]],
];

function holderOfKind(kind: string): IPropertyHolder {
  const graph = new LGraph();
  switch (kind) {
    case 'graph':
      return graph;
    case 'node':
      return new LNode(graph);
    case 'edge':
      return new LEdge();
    case 'port':
      return new LPort();
    case 'label':
      return new LLabel();
    case 'layer':
      return new Layer(graph);
    default:
      return new MapPropertyHolder();
  }
}

describe('LayeredSpacings.OPTION_TARGET_FILTER site rows', () => {
  it.each(FILTER_MATRIX)('site/layeredSpacings/targetFilter/%s', (kind, expected) => {
    const holder = holderOfKind(kind);
    const actual = FILTER_OPTION_IDS.map((id) =>
      LayeredSpacings.OPTION_TARGET_FILTER(holder, new Property<unknown>(id)),
    );
    expect(actual).toEqual(expected);
  });
});
