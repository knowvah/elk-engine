// SPDX-License-Identifier: EPL-2.0

/**
 * Function inventory of one TypeScript file, taken from an AST (oxc-parser).
 *
 * The inventory is the ground truth for "which functions exist"; lizard is
 * only a metric engine and silently drops functions it cannot tokenize.
 * Offsets are UTF-16 code units (JS string indices), as oxc-parser reports.
 */

import { parseSync } from 'oxc-parser';

/** A half-open `[start, end)` range of UTF-16 offsets in the source text. */
export interface TextRange {
  readonly start: number;
  readonly end: number;
}

/** Loose ESTree node shape: only the fields the inventory reads are typed. */
export interface AstNode {
  readonly type: string;
  readonly start: number;
  readonly end: number;
  readonly [key: string]: unknown;
}

/** One function-like node. Lines are 1-based. */
export interface FunctionInfo {
  /** Display name, e.g. `#foo`, `get x`, `constructor`, `(anonymous)`. */
  readonly name: string;
  /** Line where the declaring construct starts (member / declarator / node). */
  readonly startLine: number;
  /** Line where the body starts; lizard may report any line in between. */
  readonly bodyStartLine: number;
  readonly endLine: number;
  readonly paramCount: number;
  /** True when the last parameter ends on a later line than the declaration. */
  readonly paramsMultiline: boolean;
  readonly body: TextRange;
  readonly bodyIsBlock: boolean;
  /** The function node itself, for AST-based measurement. */
  readonly node: AstNode;
}

/** Everything extracted from one file. */
export interface FileModel {
  readonly text: string;
  readonly functions: readonly FunctionInfo[];
  /** Offsets of the `#` of every private name. */
  readonly privateHashOffsets: readonly number[];
  readonly regexRanges: readonly TextRange[];
  readonly commentRanges: readonly TextRange[];
  readonly lineStarts: readonly number[];
  /** Ranges blanked in a stripped snippet: TypeScript-only syntax and expression parentheses. */
  readonly strippableRanges: readonly TextRange[];
}

const FUNCTION_TYPES: ReadonlySet<string> = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);
const MEMBER_TYPES: ReadonlySet<string> = new Set(['MethodDefinition', 'PropertyDefinition', 'Property']);
const WHOLE_TYPE_NODES: ReadonlySet<string> = new Set([
  'TSTypeAnnotation',
  'TSTypeParameterDeclaration',
  'TSTypeParameterInstantiation',
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
  'TSDeclareFunction',
]);
/** Parenthesized forms whose parentheses delimit a function or class body start. */
const KEEP_PARENS: ReadonlySet<string> = new Set(['FunctionExpression', 'ArrowFunctionExpression', 'ClassExpression']);
const ANONYMOUS = '(anonymous)';

function isNode(value: unknown): value is AstNode {
  return typeof value === 'object' && value !== null && typeof (value as AstNode).type === 'string';
}

function asNode(value: unknown): AstNode | null {
  return isNode(value) ? value : null;
}

/** Offsets of the first character of every line, for offset-to-line lookup. */
export function lineStartsOf(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return starts;
}

/** 1-based line of `offset`, by binary search over `lineStarts`. */
export function lineOf(lineStarts: readonly number[], offset: number): number {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid]! <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

function keyName(key: AstNode | null): string {
  if (key === null) return ANONYMOUS;
  if (key.type === 'PrivateIdentifier') return `#${String(key['name'])}`;
  if (key.type === 'Identifier') return String(key['name']);
  if (key.type === 'Literal') return String(key['value']);
  return '[computed]';
}

interface Described {
  readonly name: string;
  readonly from: number;
}

function describeMember(parent: AstNode): Described {
  const kind = parent['kind'] === 'get' || parent['kind'] === 'set' ? `${String(parent['kind'])} ` : '';
  return { name: kind + keyName(asNode(parent['key'])), from: parent.start };
}

function describeAssignment(parent: AstNode): Described {
  const left = asNode(parent['left']);
  return { name: left?.type === 'Identifier' ? String(left['name']) : ANONYMOUS, from: parent.start };
}

function describeDeclarator(parent: AstNode): Described {
  return { name: keyName(asNode(parent['id'])), from: parent.start };
}

/** Name from the construct that holds the function as a value. */
function describeFromParent(node: AstNode, parent: AstNode): Described {
  if (MEMBER_TYPES.has(parent.type) && parent['value'] === node) return describeMember(parent);
  if (parent.type === 'VariableDeclarator' && parent['init'] === node) return describeDeclarator(parent);
  if (parent.type === 'AssignmentExpression' && parent['right'] === node) return describeAssignment(parent);
  return { name: ANONYMOUS, from: node.start };
}

/** Name and declaring-construct start for a function node in context. */
function describeFunction(node: AstNode, parent: AstNode | null): Described {
  const id = asNode(node['id']);
  if (node.type === 'FunctionDeclaration' || id !== null) {
    return { name: id ? String(id['name']) : 'default', from: node.start };
  }
  return parent === null ? { name: ANONYMOUS, from: node.start } : describeFromParent(node, parent);
}

function countParams(params: readonly unknown[]): number {
  return params.filter((p) => !(isNode(p) && p.type === 'Identifier' && p['name'] === 'this')).length;
}

function toFunctionInfo(node: AstNode, parent: AstNode | null, lineStarts: readonly number[]): FunctionInfo | null {
  const body = asNode(node['body']);
  if (body === null) return null;
  const { name, from } = describeFunction(node, parent);
  const params = (node['params'] as readonly unknown[]).filter(isNode);
  const lastParam = params[params.length - 1];
  const startLine = lineOf(lineStarts, from);
  return {
    name,
    startLine,
    bodyStartLine: lineOf(lineStarts, body.start),
    endLine: lineOf(lineStarts, node.end - 1),
    paramCount: countParams(params),
    paramsMultiline: lastParam !== undefined && lineOf(lineStarts, lastParam.end) !== startLine,
    body: { start: body.start, end: body.end },
    bodyIsBlock: body.type === 'BlockStatement',
    node,
  };
}

/** Strips from the end of the wrapped expression to the end of a cast. */
function typeRangeOf(node: AstNode): TextRange | null {
  if (WHOLE_TYPE_NODES.has(node.type)) return { start: node.start, end: node.end };
  if (node.type === 'TSAsExpression' || node.type === 'TSSatisfiesExpression') {
    return { start: (node['expression'] as AstNode).end, end: node.end };
  }
  if (node.type === 'TSNonNullExpression') return { start: node.end - 1, end: node.end };
  if (node.type === 'TSTypeAssertion') return { start: node.start, end: (node['expression'] as AstNode).start };
  return null;
}

interface Collector {
  readonly text: string;
  readonly lineStarts: readonly number[];
  readonly functions: FunctionInfo[];
  readonly privateHashOffsets: number[];
  readonly regexRanges: TextRange[];
  readonly strippableRanges: TextRange[];
}

/** The `?.` of `callee?.(...)`: the first one after the callee. */
function optionalCallToken(call: AstNode, text: string): TextRange {
  const from = (call['callee'] as AstNode).end;
  const at = text.indexOf('?.', from);
  return { start: at, end: at + 2 };
}

/** Ranges a stripped snippet blanks for this node: type syntax, `?.(`, expression parentheses. */
function strippableRangesOf(node: AstNode, text: string): TextRange[] {
  const ranges: TextRange[] = [];
  const typeRange = typeRangeOf(node);
  if (typeRange !== null) ranges.push(typeRange);
  if (node.type === 'CallExpression' && node['optional']) ranges.push(optionalCallToken(node, text));
  if (node.type === 'ParenthesizedExpression' && !KEEP_PARENS.has((node['expression'] as AstNode).type)) {
    ranges.push({ start: node.start, end: node.start + 1 }, { start: node.end - 1, end: node.end });
  }
  return ranges;
}

function collectFromNode(node: AstNode, parent: AstNode | null, out: Collector): void {
  if (FUNCTION_TYPES.has(node.type)) {
    const info = toFunctionInfo(node, parent, out.lineStarts);
    if (info !== null) out.functions.push(info);
  } else if (node.type === 'PrivateIdentifier') {
    out.privateHashOffsets.push(node.start);
  } else if (node.type === 'Literal' && node['regex']) {
    out.regexRanges.push({ start: node.start, end: node.end });
  }
  out.strippableRanges.push(...strippableRangesOf(node, out.text));
}

function walk(node: AstNode, parent: AstNode | null, out: Collector): void {
  collectFromNode(node, parent, out);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) walk(item, node, out);
    } else if (isNode(value)) {
      walk(value, node, out);
    }
  }
}

/** Parses `text` as TypeScript and returns its function inventory. */
export function buildFileModel(filename: string, text: string): FileModel {
  const result = parseSync(filename, text, { lang: 'ts' });
  if (result.errors.length > 0) {
    const first = result.errors[0]!;
    throw new Error(`${filename}: parse error: ${first.message}`);
  }
  const out: Collector = {
    text,
    lineStarts: lineStartsOf(text),
    functions: [],
    privateHashOffsets: [],
    regexRanges: [],
    strippableRanges: [],
  };
  walk(result.program as unknown as AstNode, null, out);
  const { functions, privateHashOffsets, regexRanges, strippableRanges, lineStarts } = out;
  const commentRanges = result.comments.map((c) => ({ start: c.start, end: c.end }));
  return { text, functions, privateHashOffsets, regexRanges, commentRanges, strippableRanges, lineStarts };
}
