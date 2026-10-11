// SPDX-License-Identifier: EPL-2.0
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { repoRoot } from './corpus.js';

const GENERATED_DIR = path.join(repoRoot(), 'test', 'corpus', 'generated');
const CONFIG_EXTENSION = '.elkr';
const GRAPH_EXTENSION = '.json';
const MAX_GENERATED_NODES = 50;
const SEED_LINE = /^\s*seed\s*=\s*\d+\s*$/m;
const GENERATE_STATEMENT = /^generate\s+1\s+\S/gm;
const FILE_NAME = /^[a-z]+(?:[A-Z][a-z]+)?-[a-z]+(?:-[a-z]+)*$/i;
const UNCOVERED_ALGORITHMS = [
  'disco',
  'force',
  'mrtree',
  'radial',
  'random',
  'sporeCompaction',
  'sporeOverlap',
  'topdownpacking',
  'vertiflex',
];

interface GraphNode {
  children?: GraphNode[];
  edges?: { labels?: unknown[] }[];
}

function countNodes(node: GraphNode): number {
  return 1 + (node.children ?? []).reduce((sum, c) => sum + countNodes(c), 0);
}

function edgeLabelCount(node: GraphNode): number {
  const own = (node.edges ?? []).reduce((sum, e) => sum + (e.labels ?? []).length, 0);
  return own + (node.children ?? []).reduce((sum, c) => sum + edgeLabelCount(c), 0);
}

const configNames = readdirSync(GENERATED_DIR)
  .filter((f) => f.endsWith(CONFIG_EXTENSION))
  .map((f) => f.slice(0, -CONFIG_EXTENSION.length))
  .sort();

describe('generated corpus', () => {
  it('covers every algorithm absent from elk-models', () => {
    const covered = new Set(configNames.map((n) => n.split('-')[0]));
    expect([...covered].sort()).toEqual([...UNCOVERED_ALGORITHMS].sort());
  });

  it.each(configNames)('%s: config sets a seed and one generate statement', (name) => {
    const config = readFileSync(path.join(GENERATED_DIR, name + CONFIG_EXTENSION), 'utf8');
    expect(name).toMatch(FILE_NAME);
    expect(config).toMatch(SEED_LINE);
    expect(config.match(GENERATE_STATEMENT)).toHaveLength(1);
  });

  it.each(configNames)('%s: sibling json exists with at most 50 nodes and no edge labels', (name) => {
    const graphPath = path.join(GENERATED_DIR, name + GRAPH_EXTENSION);
    expect(existsSync(graphPath)).toBe(true);
    const graph = JSON.parse(readFileSync(graphPath, 'utf8')) as GraphNode;
    const nodes = countNodes(graph);
    expect(nodes).toBeGreaterThan(1);
    expect(nodes).toBeLessThanOrEqual(MAX_GENERATED_NODES);
    expect(edgeLabelCount(graph)).toBe(0);
  });

  it('has no json without a config', () => {
    const graphs = readdirSync(GENERATED_DIR)
      .filter((f) => f.endsWith(GRAPH_EXTENSION))
      .map((f) => f.slice(0, -GRAPH_EXTENSION.length))
      .sort();
    expect(graphs).toEqual(configNames);
  });
});
