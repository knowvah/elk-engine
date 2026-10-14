// SPDX-License-Identifier: EPL-2.0

/**
 * Complexity gate that measures EVERY TypeScript function.
 *
 * `lizard` silently drops functions it cannot tokenize (`#private` methods,
 * anything after a `new X()` default parameter or a regex literal containing a
 * quote, parameters typed `readonly (A | B)[]`, generics after `:`). This
 * tool takes the function inventory from an AST and measures each one with
 * lizard, falling back to a standalone snippet per function.
 *
 *   tsx tools/complexity/check.ts [file|dir ...]     (default: src)
 *
 * Exit 0: no violation. Exit 1: a limit is exceeded or a file does not parse. Exit 2: usage / lizard unavailable.
 */

import { relative } from 'node:path';
import { collectFiles } from './files.js';
import {
  countLines,
  findFileViolations,
  findFunctionViolations,
  formatFileViolation,
  formatMeasured,
  formatSummary,
  formatViolation,
  summarize,
} from './evaluate.js';
import { buildFileModel, type FileModel } from './inventory.js';
import { lizardAvailable } from './lizard.js';
import { measureAll } from './measure.js';

const DEFAULT_TARGETS = ['src'];
const EXIT_OK = 0;
const EXIT_VIOLATIONS = 1;
const EXIT_UNUSABLE = 2;

function display(path: string): string {
  return relative(process.cwd(), path) || path;
}

function parseAll(texts: ReadonlyMap<string, string>): { models: Map<string, FileModel>; errors: string[] } {
  const models = new Map<string, FileModel>();
  const errors: string[] = [];
  for (const [path, text] of texts) {
    try {
      models.set(display(path), buildFileModel(path, text));
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  return { models, errors };
}

function printSection(title: string, lines: readonly string[]): void {
  if (lines.length === 0) return;
  console.log(`${title} (${lines.length})`);
  for (const line of lines) console.log(`  ${line}`);
}

function main(targets: readonly string[]): number {
  if (!lizardAvailable()) {
    console.error('complexity: `lizard` is not on PATH (pip install lizard)');
    return EXIT_UNUSABLE;
  }
  const { files: texts, skipped } = collectFiles(targets);
  const { models, errors } = parseAll(texts);
  const { measured } = measureAll(models);
  const lineCounts = new Map([...texts].map(([path, text]) => [display(path), countLines(text)]));
  const functionViolations = findFunctionViolations(measured).map(formatViolation);
  const fileViolations = findFileViolations(lineCounts).map(formatFileViolation);
  printSection('parse errors', errors);
  printSection('function violations', functionViolations);
  printSection('file length violations', fileViolations);
  printSection('measured by AST only (approximate)', measured.filter((m) => m.method === 'ast').map(formatMeasured));
  console.log(`${formatSummary(summarize(models.size, measured))}  skipped files: ${skipped}`);
  const failed = [errors, functionViolations, fileViolations].some((list) => list.length > 0);
  return failed ? EXIT_VIOLATIONS : EXIT_OK;
}

const args = process.argv.slice(2);
process.exitCode = main(args.length > 0 ? args : DEFAULT_TARGETS);
