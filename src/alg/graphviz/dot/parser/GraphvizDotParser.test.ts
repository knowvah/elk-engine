// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { dumpModel } from '../../../../../test/helpers/dot-model-dump.js';
import type { IValueConverterService } from '../../../../xtext/conversion/IValueConverterService.js';
import { ValueConverterException } from '../../../../xtext/conversion/ValueConverterException.js';
import { ValueConverterWithValueException } from '../../../../xtext/conversion/ValueConverterWithValueException.js';
import { nodeModelLineSource } from '../../../../xtext/parser/LineSource.js';
import { tokenize } from './GraphvizDotLexer.js';
import { GraphvizDotParser, parse } from './GraphvizDotParser.js';
import { SyntaxFailure } from '../../../../xtext/parser/SyntaxFailure.js';
import { GraphvizDotRecognizer } from './GraphvizDotRecognizer.js';
import { createValueConverterService } from './GraphvizDotValueConverters.js';

const DOT_ID_RULE = 'org.eclipse.elk.alg.graphviz.dot.GraphvizDot.DotID';
const NPE_MESSAGE =
  'A NullPointerException occured. This indicates a missing value converter or a bug in its implementation.';
const TWO_LINE_GRAPH = 'graph {\n  a = b\n}';

/** A service whose `DotID` conversion of `b` fails with `failure`; every other value converts to itself. */
function failingOn(failure: () => never): IValueConverterService {
  return {
    toValue: (text, rule) => (rule === DOT_ID_RULE && text === 'b' ? failure() : text),
    toString: (value) => String(value),
  };
}

function parserFor(text: string): { parser: GraphvizDotParser; recognizer: GraphvizDotRecognizer } {
  const recognizer = new GraphvizDotRecognizer(tokenize(text), nodeModelLineSource(text), text.length);
  return { parser: new GraphvizDotParser(recognizer, createValueConverterService()), recognizer };
}

const CONVERSION_CASES: ReadonlyArray<readonly [string, () => never, string]> = [
  [
    'a ValueConverterException keeps its message',
    () => {
      throw new ValueConverterException('bad value', null, null);
    },
    'bad value',
  ],
  [
    'a runtime error stands for a NullPointerException',
    () => {
      throw new TypeError('x is null');
    },
    'x is null',
  ],
  [
    'another error reports its own message',
    () => {
      throw new RangeError('out of range');
    },
    'out of range',
  ],
  [
    'an error without a message reports its class',
    () => {
      throw new RangeError();
    },
    'RangeError',
  ],
];

describe('GraphvizDotParser: value conversion diagnostics (no bound converter fails on text)', () => {
  it.each(CONVERSION_CASES)('%s', (_name, failure, message) => {
    const result = parse(TWO_LINE_GRAPH, failingOn(failure));
    expect(result.diagnostics).toEqual([{ kind: 'conversion', message, line: 2, offset: 14, length: 1 }]);
    const attribute = result.root?.getGraphs().get(0).getStatements().get(0);
    expect(dumpModel(attribute ?? null)).toEqual({ eClass: 'Attribute', name: 'a', value: null, isSet: ['name'] });
  });

  it('applies the value of a ValueConverterWithValueException and reports its message', () => {
    const result = parse(
      TWO_LINE_GRAPH,
      failingOn(() => {
        throw new ValueConverterWithValueException('recovered', null, 'B', null);
      }),
    );
    expect(result.diagnostics).toEqual([{ kind: 'conversion', message: 'recovered', line: 2, offset: 14, length: 1 }]);
    expect(result.root?.getGraphs().get(0).getStatements().get(0)).toMatchObject({ value: 'B' });
  });

  it('wraps a runtime error as the NullPointerException of DefaultEcoreElementFactory', () => {
    const result = parse(
      TWO_LINE_GRAPH,
      failingOn(() => {
        throw new TypeError('');
      }),
    );
    expect(result.diagnostics.map((d) => d.message)).toEqual([NPE_MESSAGE]);
  });
});

describe('GraphvizDotParser: branches the decisions of the grammar keep out of reach', () => {
  it('raises an EarlyExitException for an edge statement without a target', () => {
    const { parser, recognizer } = parserFor('a ;');
    const statement = parser.ruleEdgeStatement();
    recognizer.finish();
    expect(dumpModel(statement)).toEqual({
      eClass: 'EdgeStatement',
      sourceNode: { eClass: 'Node', name: 'a', port: null, isSet: ['name'] },
      edgeTargets: [],
      attributes: [],
      isSet: ['sourceNode'],
    });
    expect(recognizer.diagnostics).toEqual([
      {
        kind: 'syntax',
        message: "required (...)+ loop did not match anything at input ';'",
        line: 1,
        offset: 2,
        length: 1,
      },
    ]);
  });

  it.each([
    ['EdgeOperator', (p: GraphvizDotParser) => p.ruleEdgeOperator()],
    ['AttributeType', (p: GraphvizDotParser) => p.ruleAttributeType()],
  ] as const)('returns null from the enum rule %s without a literal', (_name, rule) => {
    const { parser, recognizer } = parserFor('x');
    expect(rule(parser)).toBeNull();
    recognizer.finish();
    expect(recognizer.diagnostics).toEqual([
      { kind: 'syntax', message: "no viable alternative at input 'x'", line: 1, offset: 0, length: 1 },
    ]);
  });

  it('attaches a pending error to the root node when there is no leaf', () => {
    const recognizer = new GraphvizDotRecognizer([], nodeModelLineSource(''), 0);
    recognizer.recoverRule(new SyntaxFailure('pending', 1));
    recognizer.finish();
    expect(recognizer.diagnostics).toEqual([{ kind: 'syntax', message: 'pending', line: 1, offset: 0, length: 0 }]);
  });

  it('lets anything but a recognition failure propagate', () => {
    const recognizer = new GraphvizDotRecognizer([], nodeModelLineSource(''), 0);
    const error = new Error('bug');
    expect(() => recognizer.recoverRule(error)).toThrow(error);
  });

  it('parses an empty text to no model and no diagnostics', () => {
    expect(parse('', createValueConverterService())).toEqual({ root: null, diagnostics: [] });
  });
});
