// SPDX-License-Identifier: EPL-2.0
// Replays test/golden/refs/java/graph-text-write.json (T5) through the sequencer. The oracle's `unformatted` text is
// the output of the full ElkGraphFormatter (see the T12 finding: every hidden region of a string-built region
// access is undefined), so it cannot be reproduced without the formatter (T21/T22). What the sequencer owns is
// the token sequence: the recorded text, lexed and stripped of whitespace, must equal the concatenated tokens of
// the sequencer; error rows must throw.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { LayoutOptionProxy } from '../../../core/util/internal/LayoutOptionProxy.js';
import { ElkGraphFactory } from '../../ElkGraphFactory.js';
import '../../impl/ElkGraphFactoryImpl.js';
import { ElkGraphJson } from '../../json/ElkGraphJson.js';
import type { ElkEdge } from '../../ElkEdge.js';
import type { ElkNode } from '../../ElkNode.js';
import type { IProperty } from '../../properties/IProperty.js';
import { Property } from '../../properties/Property.js';
import { ElkGraphUtil } from '../../util/ElkGraphUtil.js';
import { ElkGraphText } from '../ElkGraphText.js';
import { tokenize } from '../parser/ElkGraphLexer.js';
import { ElkGraphSerializationError } from './ElkGraphSerializationError.js';
import { ElkGraphSerializer } from './ElkGraphSerializer.js';

const REF = fileURLToPath(new URL('../../../../test/golden/refs/java/graph-text-write.json', import.meta.url));
const SCENARIOS = new URL('../../../../tools/vectors/elkt-write-scenarios/', import.meta.url);
const JAVA_PREFIX = 'java-';

interface RecordedCase {
  readonly id: string;
  readonly source: 'elkt' | 'json' | 'java';
  readonly unformatted: string | { readonly error: { readonly cls: string } };
}

const cases = (JSON.parse(readFileSync(REF, 'utf8')) as { cases: RecordedCase[] }).cases;

function scenario(file: string): string {
  return readFileSync(new URL(file, SCENARIOS), 'utf8');
}

/** The T5 JAVA SCENARIOS, rebuilt through the public API (ElktWriteVectors.java header). */
const JAVA_SCENARIOS: Readonly<Record<string, () => ElkNode>> = {
  'java-node-without-identifier': () => {
    const r = graph();
    ElkGraphUtil.createNode(r);
    return r;
  },
  'java-port-without-identifier': () => {
    const n = node(graph(), 'n');
    ElkGraphUtil.createPort(n);
    return n.getParent() as ElkNode;
  },
  'java-label-without-text': () => {
    const n = node(graph(), 'n');
    ElkGraphUtil.createLabel(n).setIdentifier('l');
    return n.getParent() as ElkNode;
  },
  'java-section-without-identifier': () => {
    const r = graph();
    const edge = connect(r, node(r, 'a'), node(r, 'b'));
    ElkGraphUtil.createEdgeSection(edge).setIdentifier('s1');
    ElkGraphUtil.createEdgeSection(edge).setStartLocation(1, 2);
    return r;
  },
  'java-edge-endpoint-outside-graph': () => {
    const r = graph();
    const z = ElkGraphUtil.createGraph();
    z.setIdentifier('z');
    connect(r, node(r, 'a'), z);
    return r;
  },
  'java-edge-without-endpoints': () => {
    const r = graph();
    ElkGraphUtil.createEdge(r).setIdentifier('e');
    return r;
  },
  'java-property-null-key': () => withProperty(null, 'v'),
  'java-property-null-value': () => withProperty(new Property<unknown>('my.custom'), null),
  'java-property-proxy-resolvable': () => withProperty(CoreOptions.PRIORITY, new LayoutOptionProxy('5')),
  'java-property-key-keyword': () => withProperty(new Property<unknown>('my.node.k'), 'v'),
};

function graph(): ElkNode {
  const root = ElkGraphUtil.createGraph();
  root.setIdentifier('g');
  return root;
}

function node(parent: ElkNode, id: string): ElkNode {
  const created = ElkGraphUtil.createNode(parent);
  created.setIdentifier(id);
  return created;
}

function connect(container: ElkNode, source: ElkNode, target: ElkNode): ElkEdge {
  const edge = ElkGraphUtil.createEdge(container);
  edge.setIdentifier('e');
  edge.getSources().add(source);
  edge.getTargets().add(target);
  return edge;
}

function withProperty(key: IProperty<unknown> | null, value: unknown): ElkNode {
  const root = graph();
  node(root, 'n').getProperties().put(key, value);
  return root;
}

function build(c: RecordedCase): ElkNode {
  if (c.source === 'java') return (JAVA_SCENARIOS[c.id] as () => ElkNode)();
  if (c.source === 'json') return ElkGraphJson.forGraph(scenario(`${c.id}.json`)).toElk();
  return ElkGraphText.load(scenario(`${c.id}.elkt`)).root as ElkNode;
}

/** The recorded text without whitespace and comments, token texts joined. */
function significantText(text: string): string {
  return tokenize(text)
    .filter((t) => !t.hidden)
    .map((t) => t.text)
    .join('');
}

describe('ElkGraphSerializer against the recorded writer vectors', () => {
  it('covers every recorded java scenario', () => {
    const recorded = cases.filter((c) => c.source === 'java').map((c) => c.id);
    expect(Object.keys(JAVA_SCENARIOS).sort()).toEqual(recorded.sort());
    expect(recorded.every((id) => id.startsWith(JAVA_PREFIX))).toBe(true);
  });

  const written = cases.filter((c) => typeof c.unformatted === 'string');
  const failing = cases.filter((c) => typeof c.unformatted !== 'string');

  it.each(written.map((c) => [c.id, c] as const))('%s: the tokens are those of the recorded text', (_id, c) => {
    const stream = new ElkGraphSerializer().sequence(build(c));
    expect(stream.tokens.map((t) => t.text).join('')).toBe(significantText(c.unformatted as string));
  });

  it.each(failing.map((c) => [c.id, c] as const))('%s: serialisation fails', (_id, c) => {
    expect(() => new ElkGraphSerializer().sequence(build(c))).toThrow(ElkGraphSerializationError);
  });

  it('replays 113 recorded cases, 106 written and 7 failing', () => {
    expect([cases.length, written.length, failing.length]).toEqual([113, 106, 7]);
  });
});

describe('ElkGraphSerializer.serializeToRegions', () => {
  it('holds the token texts without whitespace', () => {
    const root = ElkGraphFactory.eINSTANCE.createElkNode();
    root.setIdentifier('g');
    const regions = new ElkGraphSerializer().serializeToRegions(root);
    expect(regions.regionForDocument().getText()).toBe('graphg');
  });
});
