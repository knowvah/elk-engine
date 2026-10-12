// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderElkSvg, type ElkGraphJson } from '../../docs-site/.vitepress/theme/elkSvg.js';

function loadGolden(name: string): ElkGraphJson {
  const url = new URL(`../golden/refs/elk/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as ElkGraphJson;
}

function countDescendants(node: ElkGraphJson): number {
  return (node.children ?? []).reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

function countSections(node: ElkGraphJson): number {
  const own = (node.edges ?? []).reduce((sum, edge) => sum + (edge.sections?.length ?? 0), 0);
  return own + (node.children ?? []).reduce((sum, child) => sum + countSections(child), 0);
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

const BASE: ElkGraphJson = { id: 'root', width: 100, height: 50 };

describe('renderElkSvg', () => {
  it('renders one group per descendant node inside the svg', () => {
    const graph = loadGolden('ptolemy-scrambler');
    const svg = renderElkSvg(graph);
    const expected = countDescendants(graph);
    expect(expected).toBe(11);
    expect(count(svg, '<g class="elk-node" data-id="')).toBe(expected);
    const first = svg.indexOf(`<g class="elk-node" data-id="${graph.children?.[0]?.id}"`);
    expect(first).toBeGreaterThan(svg.indexOf('<svg'));
    expect(first).toBeLessThan(svg.lastIndexOf('</svg>'));
  });

  it('renders one polyline per section with absolute points', () => {
    const graph = loadGolden('ptolemy-scrambler');
    const svg = renderElkSvg(graph);
    const expected = countSections(graph);
    expect(expected).toBe(12);
    expect(count(svg, '<polyline')).toBe(expected);
    const edge = svg.slice(svg.indexOf('<g class="elk-edge" data-id="E1"'));
    expect(edge).toContain('points="163,231.5 173,231.5 173,123.5 339.5,123.5"');
  });

  it('nests grandchildren inside their parent with accumulated offsets', () => {
    const graph = loadGolden('ptolemy-clockdrift-hierarchy');
    const parent = (graph.children ?? []).find((c) => (c.children ?? []).length > 0);
    const grand = parent?.children?.[0];
    if (parent === undefined || grand === undefined) throw new Error('golden lacks depth 3');
    const svg = renderElkSvg(graph);
    const open = svg.indexOf(`<g class="elk-node" data-id="${parent.id}">`);
    const gIdx = svg.indexOf(`<g class="elk-node" data-id="${grand.id}">`);
    const close = svg.indexOf('</g>', gIdx);
    expect(open).toBeGreaterThanOrEqual(0);
    expect(gIdx).toBeGreaterThan(open);
    expect(close).toBeGreaterThan(gIdx);
    const rectAttr = '<rect x="';
    const rectAt = svg.indexOf(rectAttr, gIdx) + rectAttr.length;
    const rectX = svg.slice(rectAt, svg.indexOf('"', rectAt));
    expect(rectX).toBe(String((parent.x ?? 0) + (grand.x ?? 0)));
  });

  it('places node, label and port geometry at absolute positions', () => {
    const graph: ElkGraphJson = {
      ...BASE,
      children: [
        {
          id: 'n1',
          x: 10,
          y: 20,
          width: 30,
          height: 10,
          labels: [{ text: 'a<b', x: 2, y: 3, width: 20, height: 10 }],
          ports: [{ id: 'p1', x: 28, y: 4, width: 4, height: 4 }],
        },
      ],
    };
    const svg = renderElkSvg(graph);
    expect(svg).toContain('<rect x="10" y="20" width="30" height="10"');
    expect(svg).toContain('<text class="elk-label" x="12" y="33">a&lt;b</text>');
    expect(svg).toContain('<rect class="elk-port" data-id="p1" x="38" y="24" width="4" height="4"');
  });

  it('ignores unknown keys', () => {
    const graph = {
      ...BASE,
      layoutOptions: { algorithm: 'layered' },
      children: [{ id: 'n', x: 1, y: 1, width: 2, height: 2, properties: { a: 1 } }],
    } as unknown as ElkGraphJson;
    const svg = renderElkSvg(graph);
    expect(svg).not.toContain('layoutOptions');
    expect(count(svg, '<g class="elk-node"')).toBe(1);
  });

  it('computes the viewBox from the padding', () => {
    expect(renderElkSvg(BASE, { padding: 20 })).toContain('viewBox="-20 -20 140 90"');
    expect(renderElkSvg(BASE)).toContain('viewBox="-8 -8 116 66"');
  });

  it('renders every section of a hyperedge and tolerates missing sections', () => {
    const section = (x: number) => ({ startPoint: { x, y: 0 }, endPoint: { x, y: 10 } });
    const svg = renderElkSvg({
      ...BASE,
      edges: [{ id: 'h', sections: [section(1), section(2)] }, { id: 'none' }],
    });
    expect(count(svg, '<polyline')).toBe(2);
    const none = svg.slice(svg.indexOf('<g class="elk-edge" data-id="none"'));
    expect(none.slice(0, none.indexOf('</g>'))).not.toContain('<polyline');
  });

  it('escapes special characters in text', () => {
    const svg = renderElkSvg({ ...BASE, children: [{ id: 'n', labels: [{ text: 'a&b>"c' }] }] });
    expect(svg).toContain('>a&amp;b&gt;&quot;c</text>');
  });
});
