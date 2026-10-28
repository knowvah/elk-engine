// SPDX-License-Identifier: EPL-2.0
// Port side inference and minimum graph size of ElkGraphImporter (mission 7a, T11c): each case replays a row of
// test/golden/refs/java/layered-sites.json (group S14) on the port and asserts the Java values of the fields
// its branch produces.
import { describe, expect, it } from 'vitest';
import { at, geom, prop } from '../../../../../test/helpers/transform-site-dump.js';
import { runSiteRow } from '../../../../../test/helpers/transform-site-rows.js';

describe('ElkGraphImporterEntryPoints (oracle site rows)', () => {
  it('infers the side of an undefined port from its position and falls back to the direction side for a corner port', () => {
    // oracle: site/transform/misc/undefined-port-side-fixed; ElkGraphImporter.java:146-178 (ensureDefinedPortSide)
    const run = runSiteRow('site/transform/misc/undefined-port-side-fixed');
    const d = run.dump;
    const elk = run.elk;
    expect(at(elk, 'ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(at(elk, 'ports/1/layoutOptions/port.side')).toEqual('EAST');
    expect(at(elk, 'ports/2/layoutOptions/port.side')).toEqual('WEST');
    expect(at(elk, 'ports/3/layoutOptions/port.side')).toEqual('NORTH');
    expect(at(elk, 'ports/4/layoutOptions/port.side')).toEqual('SOUTH');
    expect(at(elk, 'ports/3/x')).toEqual(9.6);
    expect(at(elk, 'ports/4/y')).toEqual(22);
    expect(prop(d.graph('g0'), 'graphProperties')).toEqual(['NON_FREE_PORTS', 'NORTH_SOUTH_PORTS']);
    expect(prop(d.graph('g0'), 'direction')).toEqual('RIGHT');
    expect(geom(elk, 'children/0')).toEqual([12, 12, 30, 30]);
  });

  it('defines the side of a root port of a graph without size under FIXED_SIDE and moves it to infinity', () => {
    // oracle: site/transform/misc/undefined-port-side-zero-size-graph; ElkGraphImporter.java:146-178 (ensureDefinedPortSide)
    const run = runSiteRow('site/transform/misc/undefined-port-side-zero-size-graph');
    const d = run.dump;
    const elk = run.elk;
    expect(at(elk, 'ports/0/layoutOptions/port.side')).toEqual('EAST');
    expect(at(elk, 'ports/0/x')).toEqual(34);
    expect(at(elk, 'ports/0/y')).toEqual('Infinity');
    expect(geom(elk, 'children/0')).toEqual([12, 12, 20, 20]);
    expect(prop(d.graph('g0'), 'portConstraints')).toEqual('FIXED_SIDE');
  });

  it('assigns the side of a root port by net flow when the port constraints are free', () => {
    // oracle: site/transform/misc/undefined-port-side-free; ElkGraphImporter.java:146-178 (ensureDefinedPortSide)
    const run = runSiteRow('site/transform/misc/undefined-port-side-free');
    const d = run.dump;
    const elk = run.elk;
    expect(at(elk, 'ports/0/layoutOptions/port.side')).toEqual('WEST');
    expect(at(elk, 'ports/1/layoutOptions/port.side')).toEqual('WEST');
    expect(at(elk, 'ports/1/x')).toEqual(98);
    expect(at(elk, 'ports/1/y')).toEqual(6);
    expect(geom(elk, 'children/0')).toEqual([12, 12, 20, 20]);
    expect(prop(d.graph('g0'), 'portConstraints')).toBeUndefined();
  });

  it('keeps the node size of a target with a fixed graph size although a minimum size is configured', () => {
    // oracle: site/transform/misc/node-size-minimum-fixed-graph-size; ElkGraphImporter.java:180-232 (shouldCalculateMinimumGraphSize, calculateMinimumGraphSize)
    const run = runSiteRow('site/transform/misc/node-size-minimum-fixed-graph-size');
    const d = run.dump;
    const elk = run.elk;
    expect(prop(d.graph('g0'), 'nodeSize.constraints')).toEqual(['MINIMUM_SIZE']);
    expect(prop(d.graph('g0'), 'nodeSize.minimum')).toEqual([120, 90]);
    expect(prop(d.graph('g0'), 'nodeSize.fixedGraphSize')).toEqual(true);
    expect(geom(elk, 'children/0')).toEqual([0, 0, 80, 60]);
  });

  it('resizes the node of a target to the minimum size and re-places its ports when the graph size is not fixed', () => {
    // oracle: site/transform/misc/node-size-minimum-free-graph-size; ElkGraphImporter.java:180-232 (shouldCalculateMinimumGraphSize, calculateMinimumGraphSize)
    const run = runSiteRow('site/transform/misc/node-size-minimum-free-graph-size');
    const d = run.dump;
    const elk = run.elk;
    expect(prop(d.graph('g0'), 'nodeSize.constraints')).toEqual(['PORT_LABELS', 'MINIMUM_SIZE']);
    expect(prop(d.graph('g0'), 'nodeSize.minimum')).toEqual([120, 90]);
    expect(prop(d.graph('g0'), 'nodeSize.fixedGraphSize')).toBeUndefined();
    expect(geom(elk, 'children/0')).toEqual([0, 0, 120, 90]);
    expect(at(elk, 'children/0/ports/0/x')).toEqual(80);
    expect(at(elk, 'children/0/ports/0/y')).toEqual(15);
    expect(at(elk, 'children/0/ports/0/layoutOptions/port.side')).toEqual('WEST');
  });
});
