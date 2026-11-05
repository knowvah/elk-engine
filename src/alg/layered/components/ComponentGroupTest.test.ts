// SPDX-License-Identifier: EPL-2.0
// Port of ComponentGroupTest.java (mission 7f, T4), with the Java's own cases and literals; two Java tests, two cases.
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { ImmutableSet } from '../../../guava/ImmutableSet.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { LGraph } from '../graph/LGraph.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { ComponentGroup } from './ComponentGroup.js';
import { toSideSet } from './ComponentGroupSides.js';

/**
 * Tests the {@link ComponentGroup} class.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/components/ComponentGroupTest.java
 */
describe('ComponentGroupTest', () => {
  // The enum is the entry point of the layered package (E1); hand-built graphs need the option registry.
  beforeAll(() => {
    IntermediateProcessorStrategy.values();
    LayoutMetaDataService.initElkReflect();
  });

  /**
   * Creates a new layered graph with its external port side connections property set to the given set of connections.
   * (The property holds an `EnumSet`; the `PortSide.SIDES_*` constants are `ImmutableSet`s, so the set is converted.)
   */
  const generateGraph = (connections: ImmutableSet<PortSide>): LGraph => {
    const graph = new LGraph();
    graph.setProperty(InternalProperties.EXT_PORT_CONNECTIONS, toSideSet(connections));
    return graph;
  };

  /** Tests some valid combinations of layered graphs in a single component group. */
  it('testValidConstraints', () => {
    // Add two N, E, W, S, and C components each to a single compound group
    let group = new ComponentGroup();
    expect(group.add(generateGraph(PortSide.SIDES_NORTH))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_SOUTH))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_SOUTH))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_WEST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_WEST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_EAST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_EAST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_NONE))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_NONE))).toBe(true);

    // Add a horizontal and two E, W, and C components each to a single compound group
    group = new ComponentGroup();
    expect(group.add(generateGraph(PortSide.SIDES_EAST_WEST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_EAST_WEST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_WEST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_WEST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_EAST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_EAST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_NONE))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_NONE))).toBe(true);

    // Add a vertical and two N, S, and C components each to a single compound group
    group = new ComponentGroup();
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_SOUTH))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_SOUTH))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_SOUTH))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_SOUTH))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_NONE))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_NONE))).toBe(true);

    // A connected component connected to all four port sides allows corner components
    group = new ComponentGroup();
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_EAST_SOUTH_WEST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_WEST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_EAST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_SOUTH_WEST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_EAST_SOUTH))).toBe(true);
  });

  /** Tests the invalid combinations of layered graphs in a single component group. */
  it('testInvalidConstraints', () => {
    // Add a horizontal and a vertical component to a single component group
    let group = new ComponentGroup();
    expect(group.add(generateGraph(PortSide.SIDES_EAST_WEST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_SOUTH))).toBe(false);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_SOUTH_WEST))).toBe(false);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_EAST_SOUTH))).toBe(false);

    // Do the reverse
    group = new ComponentGroup();
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_SOUTH))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_EAST_WEST))).toBe(false);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_EAST_WEST))).toBe(false);
    expect(group.add(generateGraph(PortSide.SIDES_EAST_SOUTH_WEST))).toBe(false);

    // Add graphs to each corner
    group = new ComponentGroup();
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_WEST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_EAST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_SOUTH_WEST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_EAST_SOUTH))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_EAST_SOUTH))).toBe(false);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_EAST_WEST))).toBe(false);
    expect(group.add(generateGraph(PortSide.SIDES_EAST_SOUTH_WEST))).toBe(false);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_SOUTH_WEST))).toBe(false);

    // A connected component connected to all four port sides collides with everything
    // except for corners
    group = new ComponentGroup();
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_EAST_SOUTH_WEST))).toBe(true);
    expect(group.add(generateGraph(PortSide.SIDES_NONE))).toBe(false);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_SOUTH))).toBe(false);
    expect(group.add(generateGraph(PortSide.SIDES_EAST_WEST))).toBe(false);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_EAST_SOUTH))).toBe(false);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_EAST_WEST))).toBe(false);
    expect(group.add(generateGraph(PortSide.SIDES_EAST_SOUTH_WEST))).toBe(false);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_SOUTH_WEST))).toBe(false);
    expect(group.add(generateGraph(PortSide.SIDES_NORTH_EAST_SOUTH_WEST))).toBe(false);
  });
});
