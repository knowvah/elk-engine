// SPDX-License-Identifier: EPL-2.0

import { describe, expect, it } from 'vitest';
import { Form } from '../gRandom/Form.js';
import { GRandomPositions, parse } from './GRandomParser.js';

describe('GRandomParser', () => {
  it('gives no model and no diagnostics for an empty or comments-only file', () => {
    for (const text of ['', '  \n', '// only a comment\n/* and another */']) {
      expect(parse(text)).toEqual({
        model: null,
        syntaxErrors: [],
        conversionErrors: [],
        positions: expect.any(GRandomPositions),
      });
    }
  });

  it('reports a lexer error that the parser does not meet', () => {
    const result = parse('generate 1 graphs\n/* unterminated');
    expect(result.syntaxErrors).toEqual([
      { message: 'The lexer could not tokenize the input.', line: 2, offset: 18, length: 15 },
    ]);
    expect(result.model?.getConfigs()).toHaveLength(1);
  });

  it('keeps the configurations parsed before a syntax error', () => {
    const result = parse('generate 2 trees generate 3 frobnicate');
    expect(result.syntaxErrors).toHaveLength(1);
    expect(result.syntaxErrors[0]?.line).toBe(1);
    const configs = result.model?.getConfigs() ?? [];
    expect(configs.map((c) => [c.getSamples(), c.getForm()])).toEqual([[2, Form.TREES]]);
  });

  it('converts a Double written without fraction, with fraction and past the double range', () => {
    const digits = '9'.repeat(400);
    const result = parse(`generate 1 graphs { nodes = 2 edges total = ${digits} partitionFraction = 1.25 }`);
    expect(result.conversionErrors).toEqual([]);
    const config = result.model?.getConfigs()[0];
    expect(config?.getNodes()?.getNNodes()?.getQuant()).toBe(2);
    expect(config?.getEdges()?.getNEdges()?.getQuant()).toBe(Infinity);
    expect(config?.getFraction()?.getQuant()).toBe(1.25);
  });

  it('leaves a feature unset when its Integer conversion fails but keeps the flag', () => {
    const result = parse('generate 1 trees { maxWidth = 2.5 }');
    const config = result.model?.getConfigs()[0];
    expect([config?.isMW(), config?.getMaxWidth()]).toEqual([true, null]);
    expect(result.conversionErrors).toEqual([{ message: 'For input string: "2.5"', line: 1, offset: 30, length: 3 }]);
  });

  it('accepts each unordered member once in any order and rejects a repeat', () => {
    expect(parse('generate 1 trees { seed = 1 format = elkg }').syntaxErrors).toEqual([]);
    expect(parse('generate 1 trees { format = elkg seed = 1 }').syntaxErrors).toEqual([]);
    expect(parse('generate 1 trees { seed = 1 seed = 2 }').syntaxErrors).toHaveLength(1);
  });

  it('records the keyword token of each restricted flag per configuration', () => {
    const result = parse('generate 1 graphs {\r\n  maxWidth = 3\r\n  maxDegree = 4 partitionFraction = 1 }');
    const config = result.model?.getConfigs()[0] as object;
    expect(result.positions.featurePosition(config, 'mW')).toEqual({ line: 2, offset: 23, length: 8 });
    expect(result.positions.featurePosition(config, 'mD')).toEqual({ line: 3, offset: 39, length: 9 });
    expect(result.positions.featurePosition(config, 'pF')).toEqual({ line: 3, offset: 53, length: 17 });
    expect(result.positions.featurePosition(config, 'seed')).toBeNull();
  });

  it('keeps a configuration with a syntax error in its body, partial, in the model', () => {
    const result = parse('generate 1 graphs { maxDegree = 3 nodes 3 }');
    const config = result.model?.getConfigs()[0];
    expect([result.syntaxErrors.length, config?.isMD(), config?.getMaxDegree()]).toEqual([1, true, 3]);
  });
});
