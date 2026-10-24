// SPDX-License-Identifier: EPL-2.0
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import { CoreOptions } from '../options/CoreOptions.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { Property } from '../../graph/properties/Property.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { GraphFeature } from '../../graph/properties/GraphFeature.js';
import { LayoutAlgorithmData } from '../data/LayoutAlgorithmData.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { ElkGraphAdapters } from './adapters/ElkGraphAdapters.js';
import { IndividualSpacings } from './IndividualSpacings.js';
import { PropertyConstantsDelegator } from './PropertyConstantsDelegator.js';

const ALGORITHM_ID = 'test.delegator.stubalgo';
const UNKNOWN_ID = 'test.delegator.unknown';
const ALGORITHM_NODE_NODE = 77;
const ALGORITHM_PORT_PORT = 5;

function algorithmData(): LayoutAlgorithmData {
  const data = new LayoutAlgorithmData.Builder()
    .id(ALGORITHM_ID)
    .name(ALGORITHM_ID)
    .supportedFeatures(EnumSet.noneOf(GraphFeature))
    .create();
  data.addKnownOption(CoreOptions.SPACING_NODE_NODE, ALGORITHM_NODE_NODE);
  data.addKnownOption(CoreOptions.SPACING_PORT_PORT, ALGORITHM_PORT_PORT);
  return data;
}

describe('PropertyConstantsDelegator', () => {
  beforeAll(() => {
    const service = LayoutMetaDataService.getInstance();
    service.registerLayoutMetaDataProviders({ apply: (registry) => registry.register(algorithmData()) });
  });

  it('createEmpty returns the property itself', () => {
    const delegator = PropertyConstantsDelegator.createEmpty();
    expect(delegator.getPropertyOrDelegate(CoreOptions.SPACING_NODE_NODE)).toBe(CoreOptions.SPACING_NODE_NODE);
  });

  it('addDelegate chains and a different Property object with the same id hits', () => {
    const delegate = new Property<number>(CoreOptions.SPACING_NODE_NODE.getId(), 123);
    const delegator = PropertyConstantsDelegator.createEmpty();
    expect(delegator.addDelegate(delegate)).toBe(delegator);
    expect(delegator.getPropertyOrDelegate(CoreOptions.SPACING_NODE_NODE)).toBe(delegate);
    expect(delegator.getPropertyOrDelegate(CoreOptions.SPACING_PORT_PORT)).toBe(CoreOptions.SPACING_PORT_PORT);
  });

  it('createForLayoutAlgorithmData delegates every known option in order with the algorithm default', () => {
    const data = algorithmData();
    const delegator = PropertyConstantsDelegator.createForLayoutAlgorithmData(data);
    const holder = ElkGraphUtil.createNode(null);
    expect(delegator.getProperty(holder, CoreOptions.SPACING_NODE_NODE)).toBe(ALGORITHM_NODE_NODE);
    expect(delegator.getProperty(holder, CoreOptions.SPACING_PORT_PORT)).toBe(ALGORITHM_PORT_PORT);
    expect(holder.getProperty(CoreOptions.SPACING_NODE_NODE)).toBe(CoreOptions.SPACING_NODE_NODE.getDefault());
    expect(CoreOptions.SPACING_NODE_NODE.getDefault()).not.toBe(ALGORITHM_NODE_NODE);
  });

  it('createForLayoutAlgorithmWithId uses the registered algorithm default for an unset holder', () => {
    const delegator = PropertyConstantsDelegator.createForLayoutAlgorithmWithId(ALGORITHM_ID);
    const holder = ElkGraphUtil.createNode(null);
    expect(delegator.getProperty(holder, CoreOptions.SPACING_NODE_NODE)).toBe(ALGORITHM_NODE_NODE);
    holder.setProperty(CoreOptions.SPACING_NODE_NODE, 9);
    expect(delegator.getProperty(holder, CoreOptions.SPACING_NODE_NODE)).toBe(9);
  });

  it('createForLayoutAlgorithmWithId with an unregistered id returns an empty delegator', () => {
    const delegator = PropertyConstantsDelegator.createForLayoutAlgorithmWithId(UNKNOWN_ID);
    expect(delegator.getPropertyOrDelegate(CoreOptions.SPACING_NODE_NODE)).toBe(CoreOptions.SPACING_NODE_NODE);
  });

  it('getProperty delegates through a graph element adapter', () => {
    const delegator = PropertyConstantsDelegator.createForLayoutAlgorithmWithId(ALGORITHM_ID);
    const adapter = ElkGraphAdapters.adaptSingleNode(ElkGraphUtil.createNode(null));
    expect(delegator.getProperty(adapter, CoreOptions.SPACING_NODE_NODE)).toBe(ALGORITHM_NODE_NODE);
  });

  it('getIndividualOrInheritedProperty uses the delegate for nodes: parent value, then none', () => {
    const delegator = PropertyConstantsDelegator.createForLayoutAlgorithmWithId(ALGORITHM_ID);
    const root = ElkGraphUtil.createGraph();
    const child = ElkGraphUtil.createNode(root);
    expect(delegator.getIndividualOrInheritedProperty(child, CoreOptions.SPACING_NODE_NODE)).toBe(ALGORITHM_NODE_NODE);
    root.setProperty(CoreOptions.SPACING_NODE_NODE, 11);
    expect(delegator.getIndividualOrInheritedProperty(child, CoreOptions.SPACING_NODE_NODE)).toBe(11);
  });

  it('getIndividualOrInheritedProperty prefers the individual spacing and works for adapters', () => {
    const delegator = PropertyConstantsDelegator.createForLayoutAlgorithmWithId(ALGORITHM_ID);
    const root = ElkGraphUtil.createGraph();
    const child = ElkGraphUtil.createNode(root);
    const individual = new IndividualSpacings();
    individual.setProperty(CoreOptions.SPACING_NODE_NODE, 3);
    child.setProperty(CoreOptions.SPACING_INDIVIDUAL, individual);
    expect(delegator.getIndividualOrInheritedProperty(child, CoreOptions.SPACING_NODE_NODE)).toBe(3);

    const adapter = ElkGraphAdapters.adaptSingleNode(child);
    expect(delegator.getIndividualOrInheritedProperty(adapter, CoreOptions.SPACING_NODE_NODE)).toBe(3);
    expect(delegator.getIndividualOrInheritedProperty(adapter, CoreOptions.SPACING_PORT_PORT)).toBe(
      ALGORITHM_PORT_PORT,
    );
  });
});
