// SPDX-License-Identifier: EPL-2.0
// The G3 comparator's own contract, on hand-built strings.
import { describe, expect, it } from 'vitest';
import {
  compareDotLogged,
  compareJsonLogged,
  compareLogged,
  normalizeIdentityHashes,
} from './layered-labels-replay-logged.js';

const lines = (...parts: string[]): string => parts.join('\n');
const doc = (properties: string[], id = 'n1'): string =>
  lines('{', `  "id": "${id}",`, '  "properties": {', ...properties, '  },', '  "children": [', '  ]', '}');

describe('compareJsonLogged', () => {
  const ordered = ['    "a": "1",', '    "b": "2",', '    "c": "3"'];

  it('passes equal texts, including text that is not valid JSON', () => {
    const text = lines('{', '  "x": [', '  ],,', '}');
    expect(compareJsonLogged(text, text)).toEqual([]);
  });

  it('passes a property block in another order, whichever entry ends up last', () => {
    const reordered = ['    "c": "3",', '    "a": "1",', '    "b": "2"'];
    expect(compareJsonLogged(doc(reordered), doc(ordered))).toEqual([]);
  });

  it('reports a changed property value with its line number and both entries', () => {
    const changed = ['    "a": "1",', '    "b": "9",', '    "c": "3"'];
    expect(compareJsonLogged(doc(changed), doc(ordered))).toEqual([
      'line 5 (properties): "    \\"b\\": \\"9\\"," != "    \\"b\\": \\"2\\","',
    ]);
  });

  it('reports a property that is missing or extra', () => {
    const fewer = ['    "a": "1",', '    "b": "2"'];
    expect(compareJsonLogged(doc(fewer), doc(ordered))).toEqual([
      'line 6 (properties): (none) != "    \\"c\\": \\"3\\""',
    ]);
    expect(compareJsonLogged(doc(ordered), doc(fewer))).toEqual([
      'line 6 (properties): "    \\"c\\": \\"3\\"" != (none)',
    ]);
  });

  it('counts duplicate entries as a multiset', () => {
    const twice = ['    "a": "1",', '    "a": "1"'];
    const once = ['    "a": "1",', '    "b": "1"'];
    expect(compareJsonLogged(doc(twice), doc(once))).toHaveLength(1);
  });

  it('reports a changed line outside a property block with its line number', () => {
    expect(compareJsonLogged(doc(ordered, 'n2'), doc(ordered, 'n1'))).toEqual([
      'line 2: "  \\"id\\": \\"n2\\"," != "  \\"id\\": \\"n1\\","',
    ]);
  });

  it('keeps line order outside property blocks exact', () => {
    expect(compareJsonLogged(lines('a', 'b'), lines('b', 'a'))).toEqual(['line 1: "a" != "b"']);
  });

  it('applies normalize to both sides before comparing', () => {
    const strip = (text: string): string => text.replace(/@[0-9a-f]+/g, '@H');
    expect(compareJsonLogged('x@1f', 'x@2a')).toHaveLength(1);
    expect(compareJsonLogged('x@1f', 'x@2a', strip)).toEqual([]);
  });
});

describe('compareDotLogged', () => {
  it('passes equal strings', () => {
    expect(compareDotLogged('digraph {\n a -> b;\n}', 'digraph {\n a -> b;\n}')).toEqual([]);
  });

  it('reports the first differing line of a one-character change', () => {
    expect(compareDotLogged('digraph {\n a -> c;\n}', 'digraph {\n a -> b;\n}')).toEqual([
      'line 2: " a -> c;" != " a -> b;"',
    ]);
  });

  it('applies normalize to both sides', () => {
    const strip = (text: string): string => text.replace(/\d+/g, 'N');
    expect(compareDotLogged('7 -> 8', '1 -> 2', strip)).toEqual([]);
  });
});

describe('compareLogged', () => {
  const run = { tags: ['0-A'], dot: ['digraph {}'], json: ['{', '}'].join('\n').split('\n').slice(0, 1) };

  it('passes an equal run', () => {
    expect(compareLogged(run, run)).toEqual([]);
  });

  it('compares tags exactly', () => {
    expect(compareLogged({ ...run, tags: ['0-B'] }, run)).toEqual(['tags[0] "0-B" != "0-A"']);
  });

  it('compares list lengths exactly before the elements', () => {
    const two = { tags: ['0-A', '1-B'], dot: ['d1', 'd2'], json: ['{', '{'] };
    const one = { tags: ['0-A'], dot: ['d1'], json: ['{'] };
    expect(compareLogged(two, one)).toEqual([
      'tags: 2 logged graphs, expected 1',
      'dot: 2 logged graphs, expected 1',
      'json: 2 logged graphs, expected 1',
    ]);
  });

  it('prefixes a difference with its format and index and passes normalize on', () => {
    const actual = { ...run, dot: ['digraph { 5 }'] };
    const expected = { ...run, dot: ['digraph { 6 }'] };
    expect(compareLogged(actual, expected)).toEqual(['dot[0] line 1: "digraph { 5 }" != "digraph { 6 }"']);
    expect(compareLogged(actual, expected, (t) => t.replace(/\d/g, 'N'))).toEqual([]);
  });
});

describe('normalizeIdentityHashes (G3a)', () => {
  it('replaces DOT node ids, edge ends and segment arrows', () => {
    const dot = lines(
      'digraph {',
      '        17[label="n1 (0,0)",shape=box];',
      '    17 -> 23;',
      '  5->6[label="x"]',
      '}',
    );
    expect(normalizeIdentityHashes(dot)).toBe(
      lines('digraph {', '        H[label="n1 (0,0)",shape=box];', '    H -> H;', '  H->H[label="x"]', '}'),
    );
  });

  it('replaces JSON n/e/p ids and Object.toString hashes, nothing else', () => {
    const json = lines(
      '  "id": "root",',
      '      "id": "n17",',
      '      "sourcePort": "p4",',
      '        "random": "java.util.Random@1f",',
      '        "label": "n17 (0,0)",',
    );
    expect(normalizeIdentityHashes(json)).toBe(
      lines(
        '  "id": "root",',
        '      "id": "H",',
        '      "sourcePort": "H",',
        '        "random": "java.util.Random@H",',
        '        "label": "n17 (0,0)",',
      ),
    );
  });

  it('makes graphs that differ only in identity hashes equal through compareLogged', () => {
    const logged = (hash: string) => ({
      tags: ['1-Before X'],
      dot: [lines('digraph {', `    ${hash} -> ${hash};`, '}')],
      json: [lines('{', `  "id": "n${hash}",`, '  "properties": {', `    "s": "a.B@${hash}"`, '  }', '}')],
    });
    expect(compareLogged(logged('1'), logged('2'))).toEqual([]);
    expect(compareLogged(logged('1'), logged('1'), (text) => text)).toEqual([]);
    expect(compareLogged(logged('1'), logged('2'), (text) => text)).not.toEqual([]);
  });
});
