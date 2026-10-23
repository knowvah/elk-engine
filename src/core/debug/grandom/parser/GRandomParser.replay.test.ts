// SPDX-License-Identifier: EPL-2.0

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { toString as doubleToString } from '../../../../java/lang/DoubleToString.js';
import { parse } from './GRandomParser.js';

const PARSE_REF = fileURLToPath(new URL('../../../../../test/golden/refs/java/grandom-parse.json', import.meta.url));
const CORPUS_DIR = fileURLToPath(new URL('../../../../../test/corpus/generated/', import.meta.url));
const ROW_COUNT = 142;
const SYNTAX_ROW_COUNT = 65;
const CONVERSION_ROW_COUNT = 9;
const CORPUS_COUNT = 9;

interface Diag {
  readonly message: string;
  readonly line: number;
  readonly offset: number;
  readonly length: number;
}

interface Obj {
  readonly class: string;
  readonly features: ReadonlyArray<{ readonly name: string; readonly value: unknown }>;
}

interface Row {
  readonly id: string;
  readonly input: string;
  readonly syntaxErrors: readonly Diag[];
  readonly conversionErrors: readonly Diag[];
  readonly model: Obj | null;
}

const rows = (JSON.parse(readFileSync(PARSE_REF, 'utf8')) as { cases: Row[] }).cases;
const errorFree = rows.filter((r) => r.syntaxErrors.length === 0);
const withSyntaxErrors = rows.filter((r) => r.syntaxErrors.length > 0);

// ---- the model dump in the recorder's shape; feature order = eAllStructuralFeatures (GRandom.ecore) ----

const DOUBLES = new Set(['quant', 'min', 'max', 'mean', 'stddv']);
const FEATURES: Readonly<Record<string, readonly string[]>> = {
  RandGraph: ['configs'],
  Configuration: [
    'samples',
    'form',
    'nodes',
    'edges',
    'mW',
    'maxWidth',
    'mD',
    'maxDegree',
    'pF',
    'fraction',
    'hierarchy',
    'seed',
    'format',
    'filename',
  ],
  Hierarchy: ['levels', 'edges', 'numHierarchNodes', 'crossHierarchRel'],
  Edges: ['density', 'total', 'relative', 'outbound', 'nEdges', 'labels', 'selfLoops'],
  Nodes: ['nNodes', 'ports', 'labels', 'size', 'removeIsolated'],
  Size: ['height', 'width'],
  Ports: ['labels', 'reUse', 'size', 'constraint', 'flow'],
  Flow: ['flowType', 'side', 'amount'],
  DoubleQuantity: ['quant', 'min', 'minMax', 'max', 'mean', 'gaussian', 'stddv'],
};
const COLLECTIONS: Readonly<Record<string, string>> = { configs: 'getConfigs', flow: 'getFlow' };

type Getter = () => unknown;

function read(owner: object, name: string): unknown {
  const suffix = name.charAt(0).toUpperCase() + name.slice(1);
  const bag = owner as Record<string, Getter>;
  const getter = COLLECTIONS[name] ?? (`is${suffix}` in owner ? `is${suffix}` : `get${suffix}`);
  return (bag[getter] as Getter).call(owner);
}

function dumpValue(name: string, value: unknown): unknown {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') return DOUBLES.has(name) ? doubleToString(value) : value;
  if (Array.isArray(value)) return value.map((v) => dumpValue(name, v));
  const literal = (value as { getLiteral?: () => string }).getLiteral;
  if (literal !== undefined) return literal.call(value);
  return dump(value as object);
}

function dump(obj: object): Obj {
  const cls = obj.constructor.name;
  const features = (FEATURES[cls] as readonly string[]).map((name) => ({
    name,
    value: dumpValue(name, read(obj, name)),
  }));
  return { class: cls, features };
}

// ---- replay ----

describe('GRandomParser replay of grandom-parse.json', () => {
  it('has the recorded row counts', () => {
    expect(rows).toHaveLength(ROW_COUNT);
    expect(withSyntaxErrors).toHaveLength(SYNTAX_ROW_COUNT);
    expect(rows.filter((r) => r.conversionErrors.length > 0)).toHaveLength(CONVERSION_ROW_COUNT);
  });

  it.each(errorFree.map((r) => [r.id, r] as const))('%s: model dump and conversion errors match', (_id, row) => {
    const result = parse(row.input);
    expect(result.syntaxErrors).toEqual([]);
    expect(result.conversionErrors).toEqual(row.conversionErrors);
    expect(result.model === null ? null : dump(result.model)).toEqual(row.model);
  });

  it.each(withSyntaxErrors.map((r) => [r.id, r] as const))('%s: reports a syntax error', (_id, row) => {
    expect(parse(row.input).syntaxErrors.length).toBeGreaterThan(0);
  });

  it('parses the nine corpus inputs without diagnostics', () => {
    const files = readdirSync(CORPUS_DIR).filter((f) => f.endsWith('.elkr'));
    expect(files).toHaveLength(CORPUS_COUNT);
    for (const file of files) {
      const result = parse(readFileSync(CORPUS_DIR + file, 'utf8'));
      expect([file, result.syntaxErrors, result.conversionErrors]).toEqual([file, [], []]);
      expect(result.model?.getConfigs().length).toBeGreaterThan(0);
    }
  });
});
