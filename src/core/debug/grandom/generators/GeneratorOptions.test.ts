// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import { PortConstraints } from '../../../options/PortConstraints.js';
import { EdgeDetermination } from './EdgeDetermination.js';
import { FileFormat } from './FileFormat.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { GraphType } from './GraphType.js';
import { RandVal } from './RandVal.js';

const f = Math.fround;
const nil = (): object => ({ min: 0, max: 0, mean: 0, stddv: 0, exact: 0, kind: 'gaussian' });
const ex = (exact: number): object => ({ min: 0, max: 0, mean: 0, stddv: 0, exact, kind: 'exact' });

/** [field, id, default (enums by name, RandVal as the recorded descriptor)] in Java declaration order. */
const TABLE: readonly (readonly [string, string, unknown])[] = [
  ['NUMBER_OF_GRAPHS', 'randomWizard.numberOfGraphs', 1],
  ['FILE_NAME', 'randomWizard.filename', 'random.kgt'],
  ['FILE_FORMAT', 'randomWizard.fileFormat', 'XTEXT'],
  ['GRAPH_TYPE', 'basic.graphType', 'CUSTOM'],
  ['NUMBER_OF_NODES', 'basic.numNodes', ex(10)],
  ['EDGE_DETERMINATION', 'basic.edgeDetermination', 'ABSOLUTE'],
  ['EDGES_ABSOLUTE', 'basic.numberOfEdges', ex(20)],
  ['RELATIVE_EDGES', 'basic.relEdges', nil()],
  ['DENSITY', 'basic.density', nil()],
  ['ENABLE_HIERARCHY', 'basic.enableHierarchy', false],
  ['HIERARCHY_CHANCE', 'basic.hierarchyChance', f(0.05)],
  ['MAX_HIERARCHY_LEVEL', 'basic.maxHierarchyLevel', ex(3)],
  ['HIERARCHY_NODES_FACTOR', 'basic.hierarchyNodesFactor', 0.5],
  ['HYPERNODE_CHANCE', 'basic.hypernodeChance', 0],
  ['ENABLE_PORTS', 'basic.ports', false],
  ['USE_EXISTING_PORTS_CHANCE', 'basic.useExistingPortsChance', ex(0.3)],
  ['CROSS_HIERARCHY_EDGES', 'basic.crossHierarchyEdges', false],
  ['TIME_BASED_RANDOMIZATION', 'basic.timeBasedRandomization', true],
  ['RANDOMIZATION_SEED', 'basic.randomizationSeed', 0],
  ['SET_NODE_SIZE', 'basic.setNodeSize', true],
  ['NODE_WIDTH', 'basic.minNodeWidth', ex(30)],
  ['NODE_HEIGHT', 'basic.minNodeHeight', ex(30)],
  ['CREATE_NODE_LABELS', 'basic.createNodeLabels', false],
  ['SET_PORT_SIZE', 'basic.setPortSize', true],
  ['PORT_WIDTH', 'basic.portWidth', ex(4)],
  ['PORT_HEIGHT', 'basic.portHeight', ex(4)],
  ['CREATE_PORT_LABELS', 'basic.createPortLabels', false],
  ['PORT_CONSTRAINTS', 'layout.portConstraints', 'UNDEFINED'],
  ['INCOMING_NORTH_SIDE', 'layout.incomingNorthSide', 10],
  ['INCOMING_EAST_SIDE', 'layout.incomingEastSide', 5],
  ['INCOMING_SOUTH_SIDE', 'layout.incomingSouthSide', 10],
  ['INCOMING_WEST_SIDE', 'layout.incomingWestSide', 75],
  ['OUTGOING_NORTH_SIDE', 'layout.outgoingNorthSide', 10],
  ['OUTGOING_EAST_SIDE', 'layout.outgoingEastSide', 75],
  ['OUTGOING_SOUTH_SIDE', 'layout.outgoingSouthSide', 10],
  ['OUTGOING_WEST_SIDE', 'layout.outgoingWestSide', 5],
  ['OUTGOING_EDGES', 'basic.minOutgoingEdges', nil()],
  ['SELF_LOOPS', 'basic.selfLoops', false],
  ['MULTI_EDGES', 'basic.multiEdges', true],
  ['CYCLES', 'basic.cycles', true],
  ['ISOLATED_NODES', 'basic.isolatedNodes', true],
  ['EDGE_LABELS', 'basic.edgeLabels', false],
  ['MAX_WIDTH', 'basic.maxWidth', 0],
  ['MAX_DEGREE', 'basic.maxDegree', 0],
  ['PLANAR', 'basic.planar', false],
  ['PARTITION_FRAC', 'basic.minPartitionFraction', ex(f(0.4))],
  ['SMALL_HIERARCHY', 'basic.SMALL_HIERARCHY', false],
  ['NUMBER_HIERARCHICAL_NODES', 'basic.HIERARCH_NODE', nil()],
  ['CROSS_HIER', 'basic.CROSS_HIER', nil()],
  ['EXACT_RELATIVE_HIER', 'basic.EXACT_RELATIVE_HIER', null],
];

function describeValue(v: unknown): unknown {
  if (v instanceof RandVal) {
    const kind = v.defaultVal() !== 0 ? 'exact' : 'gaussian';
    return { min: v.min(), max: v.max(), mean: 0, stddv: 0, exact: v.defaultVal(), kind };
  }
  if (
    v instanceof FileFormat ||
    v instanceof GraphType ||
    v instanceof EdgeDetermination ||
    v instanceof PortConstraints
  ) {
    return v.name();
  }
  return v;
}

const VECTORS_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../test/golden/refs/java/grandom-generate.json',
);

describe('GeneratorOptions property table', () => {
  const statics = GeneratorOptions as unknown as Record<string, IProperty<unknown>>;

  it('declares every property in Java order', () => {
    const declared = Object.keys(GeneratorOptions).filter((k) => statics[k] !== undefined && 'getId' in statics[k]);
    expect(declared).toEqual(TABLE.map(([field]) => field));
  });

  it.each(TABLE)('%s has id %s and its Java default', (field, id, expected) => {
    const property = statics[field]!;
    expect(property.getId()).toBe(id);
    expect(describeValue(new GeneratorOptions().getProperty(property))).toEqual(expected);
  });

  it('bounds on the float chances', () => {
    expect(GeneratorOptions.HIERARCHY_CHANCE.getLowerBound().compareTo(0)).toBe(0);
    expect(GeneratorOptions.HIERARCHY_CHANCE.getUpperBound().compareTo(1)).toBe(0);
    expect(GeneratorOptions.HIERARCHY_CHANCE.getUpperBound().compareTo(2)).toBeLessThan(0);
    expect(GeneratorOptions.HIERARCHY_NODES_FACTOR.getUpperBound().compareTo(1e9)).toBeGreaterThan(0);
  });

  it('PORT_CONSTRAINTS default is the shared PortConstraints.UNDEFINED', () => {
    expect(new GeneratorOptions().getProperty(GeneratorOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.UNDEFINED);
  });

  it('agrees with the defaults-seeded row where the parser leaves them', () => {
    const data = JSON.parse(readFileSync(VECTORS_PATH, 'utf8')) as {
      rows: { id: string; configs?: { options: { key: string; value: unknown }[] }[] }[];
    };
    const options = data.rows.find((row) => row.id === 'defaults-seeded')!.configs![0]!.options;
    expect(options.map((o) => o.key)).toEqual(TABLE.map(([field]) => field));
    const holder = new GeneratorOptions();
    for (const { key, value } of options) {
      const mine = describeValue(holder.getProperty(statics[key]!));
      if (typeof value === 'object' && value !== null) {
        expect(mine).toMatchObject({
          exact: (value as { exact: number }).exact,
          kind: (value as { kind: string }).kind,
        });
      } else {
        // Float.toString text: the stored float widens to a double, so compare after fround.
        expect(mine).toBe(typeof value === 'number' ? Math.fround(value) : value);
      }
    }
  });
});
