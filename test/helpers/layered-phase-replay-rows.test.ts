// SPDX-License-Identifier: EPL-2.0
// Structural tests of the phase replay's row loading and import (L4: no hand-derived numbers).
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findImportTarget } from './layered-framework-replay.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { Random } from '../../src/java/util/Random.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import manifest from '../golden/inputs/manifest.json' with { type: 'json' };
import { normalise } from './layered-phase-replay-normalise.js';
import {
  applyOptions,
  importRow,
  loadInput,
  loadRows,
  prepareRoot,
  type PhaseRow,
} from './layered-phase-replay-rows.js';
import { phaseDump } from './layered-phase-replay-dump.js';

const MODEL = 'realworld/ptolemy/flattened/hlacerti_multidatatypes_producer.json';
const ELKT = 'tickets/core/489_paddingAndMinSize_Small.elkt';
const TICKET_600 = 'tickets/layered/600_outgoingEdgeInLastSeparateNode.elkt';
const INPUTS_DIR = 'test/golden/inputs';
const EMPTY_EXPECTED = { layers: [], layerless: [], hidden: [], edges: [], changed: [] };
const files = manifest.files as Record<string, string>;

function fileRow(file: string, over: Partial<PhaseRow> = {}): PhaseRow {
  return {
    id: `models/${file}`,
    group: 'models',
    input: { path: `${INPUTS_DIR}/${file}`, sha256: files[file] as string },
    target: null,
    options: {},
    steps: [],
    prefix: null,
    expected: EMPTY_EXPECTED,
    ...over,
  };
}

function childCount(root: { getChildren(): Iterable<unknown> }): number {
  return [...root.getChildren()].length;
}

function tempFile(content: unknown): string {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'phase-rows-')), 'rows.json');
  writeFileSync(file, JSON.stringify(content));
  return file;
}

describe('loadRows', () => {
  it('returns the rows of a file in order', () => {
    const rows = [fileRow(MODEL), fileRow(ELKT, { id: 'models/second' })];
    expect(loadRows(tempFile({ rows })).map((r) => r.id)).toEqual([`models/${MODEL}`, 'models/second']);
  });

  it('rejects a file without rows', () => {
    expect(() => loadRows(tempFile({ nothing: 1 }))).toThrow(/no "rows" array/);
  });

  it('rejects a malformed row, an unknown group and a row with both steps and prefix', () => {
    expect(() => loadRows(tempFile({ rows: [{ id: 1 }] }))).toThrow(/row 0 is malformed/);
    expect(() => loadRows(tempFile({ rows: [fileRow(MODEL, { group: 'bogus' as never })] }))).toThrow(
      /unknown group "bogus"/,
    );
    expect(() => loadRows(tempFile({ rows: [fileRow(MODEL, { prefix: [] })] }))).toThrow(
      /exactly one of steps and prefix/,
    );
  });
});

describe('loadInput', () => {
  it('rejects a file whose hash differs from the row', () => {
    const row = fileRow(MODEL);
    expect(() => loadInput({ path: `${INPUTS_DIR}/${MODEL}`, sha256: '0'.repeat(64) })).toThrow(
      /sha256 is [0-9a-f]{64}/,
    );
    expect(childCount(loadInput(row.input))).toBeGreaterThan(0);
  });

  it('loads a vendored .elkt through the text port', () => {
    const root = loadInput(fileRow(ELKT).input);
    expect(childCount(root)).toBeGreaterThan(0);
  });

  it('loads inline ELK JSON as a string and as an object', () => {
    const graph = { id: 'root', children: [{ id: 'a', width: 10, height: 10 }] };
    expect(childCount(loadInput({ elk: JSON.stringify(graph) }))).toBe(1);
    expect(childCount(loadInput({ elk: graph }))).toBe(1);
  });
});

describe('applyOptions and prepareRoot', () => {
  it('decodes a tagged C4 value and parses a plain one through the option data', () => {
    const root = loadInput({ elk: { id: 'root' } });
    applyOptions(root, {
      'org.eclipse.elk.randomSeed': { t: 'int', v: 7 },
      'org.eclipse.elk.layered.cycleBreaking.strategy': 'GREEDY',
    });
    expect(root.getProperty(LayeredOptions.RANDOM_SEED)).toBe(7);
    expect(String(root.getProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY))).toBe('GREEDY');
  });

  it('rejects a plain value for an unknown option', () => {
    expect(() => applyOptions(loadInput({ elk: { id: 'root' } }), { 'no.such.option': 1 })).toThrow(/no.such.option/);
  });

  // Re-anchored (D4): the recorder writes SEPARATE_CONNECTED_COMPONENTS=false into the options of pipeline rows only
  // (LayeredPhaseVectors.java:1489); a step row's graph has no such property set.
  it('applies only the row options: B3 arrives through them, never unconditionally', () => {
    expect(prepareRoot(fileRow(MODEL)).getProperty(LayeredOptions.SEPARATE_CONNECTED_COMPONENTS)).toBe(true);
    const options = { 'org.eclipse.elk.separateConnectedComponents': { t: 'bool', v: false } };
    expect(prepareRoot(fileRow(MODEL, { options })).getProperty(LayeredOptions.SEPARATE_CONNECTED_COMPONENTS)).toBe(
      false,
    );
  });

  // The recorder sets a row's options on the node it imports (LayeredPhaseVectors.java:1299-1300), not on the root.
  it('sets the options on the imported target, leaving the root as loaded', () => {
    const options = { 'org.eclipse.elk.layered.cycleBreaking.strategy': 'MODEL_ORDER' };
    const root = prepareRoot(fileRow(TICKET_600, { options, target: 'N1' }));
    const target = findImportTarget(root, 'N1');
    expect(String(target.getProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY))).toBe('MODEL_ORDER');
    expect(root.hasProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY)).toBe(false);
  });
});

describe('importRow', () => {
  it('imports a vendored model: all nodes layerless, no layers, an unchanged dump', () => {
    const { graph, importDump } = importRow(fileRow(MODEL));
    expect(graph.getLayerlessNodes().length).toBeGreaterThan(0);
    expect(graph.getLayers()).toEqual([]);
    expect(importDump.graphs.length).toBeGreaterThan(0);
    expect(phaseDump(graph, importDump).changed).toEqual([]);
  });

  it('seeds RANDOM with 1 after normalise', () => {
    const { graph } = importRow(fileRow(MODEL));
    normalise(graph);
    const random = graph.getProperty(InternalProperties.RANDOM);
    expect(random.nextInt()).toBe(new Random(1).nextInt());
  });

  it('imports the elkt as a graph with the input children as layerless nodes', () => {
    const { graph } = importRow(fileRow(ELKT));
    expect(graph.getLayerlessNodes().length).toBe(childCount(loadInput(fileRow(ELKT).input)));
  });
});
