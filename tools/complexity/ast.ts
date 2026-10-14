// SPDX-License-Identifier: EPL-2.0

/**
 * Last-resort measurement straight from the AST, for a function lizard cannot
 * parse even as a stripped standalone snippet. It mirrors lizard's counting:
 * NLOC = lines with code (comments and blank lines excluded); CCN = 1 + each
 * `if`, loop, `case`, `catch`, `?:`, `&&`, `||`, `?.` (one `?` token) and `??`
 * / `??=` (two). Lizard reports nested functions separately, so their body
 * lines and branches are not part of the enclosing function; it reads a
 * template literal as one token, so nothing inside `${...}` counts either.
 */

import type { AstNode, FileModel, FunctionInfo } from './inventory.js';
import { applyEdits, blank } from './snippets.js';

const BRANCH_NODES: ReadonlySet<string> = new Set([
  'IfStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'CatchClause',
  'ConditionalExpression',
]);
const COUNTED_LOGICAL: ReadonlySet<string> = new Set(['&&', '||']);
const NULLISH_OPERATORS: ReadonlySet<string> = new Set(['??', '??=']);
const NULLISH_WEIGHT = 2;
const OPAQUE_NODES: ReadonlySet<string> = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'TemplateLiteral',
]);

function logicalWeight(operator: string): number {
  if (COUNTED_LOGICAL.has(operator)) return 1;
  return NULLISH_OPERATORS.has(operator) ? NULLISH_WEIGHT : 0;
}

function branchWeight(node: AstNode): number {
  if (BRANCH_NODES.has(node.type)) return 1;
  if (node.type === 'SwitchCase') return node['test'] ? 1 : 0;
  if (node.type === 'LogicalExpression' || node.type === 'AssignmentExpression') {
    return logicalWeight(node['operator'] as string);
  }
  return node['optional'] === true && node.type.endsWith('Expression') ? 1 : 0;
}

function childNodes(node: AstNode): AstNode[] {
  const children: AstNode[] = [];
  for (const value of Object.values(node)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === 'object' && item !== null && typeof (item as AstNode).type === 'string') {
        children.push(item as AstNode);
      }
    }
  }
  return children;
}

/** Cyclomatic complexity of `node`'s subtree, lizard-style. */
export function astCcn(node: AstNode): number {
  return 1 + countBranches(node);
}

function countBranches(node: AstNode): number {
  const inner = childNodes(node)
    .filter((c) => !OPAQUE_NODES.has(c.type))
    .reduce((sum, c) => sum + countBranches(c), 0);
  return branchWeight(node) + inner;
}

/** Lines of `fn`'s span that belong to nested functions, bar each one's first line. */
function nestedLines(model: FileModel, fn: FunctionInfo): Set<number> {
  const lines = new Set<number>();
  for (const g of model.functions) {
    if (g === fn || g.node.start < fn.node.start || g.node.end > fn.node.end) continue;
    for (let line = g.startLine + 1; line <= g.endLine; line++) lines.add(line);
  }
  return lines;
}

/** Lines of `fn` (from its declaring line) that hold code once comments are blanked. */
export function astNloc(model: FileModel, fn: FunctionInfo): number {
  const first = model.lineStarts[fn.startLine - 1]!;
  const last = model.lineStarts[fn.endLine] ?? model.text.length;
  const comments = model.commentRanges.map((r) => ({ ...r, replacement: blank }));
  const code = applyEdits(model.text, { start: first, end: last }, comments);
  const nested = nestedLines(model, fn);
  return code.split('\n').filter((line, i) => line.trim() !== '' && !nested.has(fn.startLine + i)).length;
}

export interface AstMetrics {
  readonly nloc: number;
  readonly ccn: number;
}

export function measureByAst(model: FileModel, fn: FunctionInfo): AstMetrics {
  return { nloc: astNloc(model, fn), ccn: astCcn(fn.node) };
}
