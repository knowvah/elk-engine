// SPDX-License-Identifier: EPL-2.0
// Port import of ElkGraphImporter (mission 7a, T11c): each case replays a row of
// test/golden/refs/java/layered-sites.json (group S14) on the port and asserts the Java values of the fields
// its branch produces.
import { describe, expect, it } from 'vitest';
import { at, xy } from '../../../../../test/helpers/transform-site-dump.js';
import { runSiteRow } from '../../../../../test/helpers/transform-site-rows.js';

describe('ElkGraphImporterPorts (oracle site rows)', () => {
  it('imports the labels with text and layout of a port and skips empty and noLayout ones', () => {
    // oracle: site/transform/misc/port-labels; ElkGraphImporter.java:1047-1050 (transformPort, labels)
    const run = runSiteRow('site/transform/misc/port-labels');
    const d = run.dump;
    const elk = run.elk;
    expect(d.port('g0/n0/p0').labels.length).toBe(1);
    expect(d.label('g0/n0/p0/l0').text).toBe('one');
    expect(xy(d.label('g0/n0/p0/l0').size)).toEqual([20, 8]);
    expect(d.port('g0/n0/p1').labels.length).toBe(1);
    expect(d.label('g0/n0/p1/l0').text).toBe('two');
    expect(at(elk, 'children/0/ports/0/labels/0/text')).toEqual('one');
    expect(at(elk, 'children/0/ports/0/labels/0/x')).toEqual(8);
    expect(at(elk, 'children/0/ports/1/labels/0/x')).toEqual(-24);
  });
});
