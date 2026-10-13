// SPDX-License-Identifier: EPL-2.0
import {
  MelkSyntaxError,
  type BundleDraft,
  type OptionDraft,
  type AlgorithmDraft,
  type CategoryDraft,
  type Expr,
  type GraphFeature,
  type LiteralExpr,
  type MdAlgorithm,
  type MdBundle,
  type MdBundleMember,
  type MdCategory,
  type MdGroup,
  type MdGroupOrOption,
  type MdOption,
  type MdOptionDependency,
  type MdOptionSupport,
  type MelkFile,
  type OptionModifier,
  type OptionTarget,
  type TypeRef,
} from './ast.js';
import { lex, type Token } from './lexer.js';

const OPTION_MODIFIERS: readonly OptionModifier[] = ['advanced', 'programmatic', 'output', 'global'];
const OPTION_TARGETS: readonly OptionTarget[] = ['parents', 'nodes', 'edges', 'ports', 'labels'];
const GRAPH_FEATURES: readonly GraphFeature[] = [
  'self_loops',
  'inside_self_loops',
  'multi_edges',
  'edge_labels',
  'ports',
  'compound',
  'clusters',
  'disconnected',
];

/** Xbase keyword-led expression forms outside the C5 set (reported by name). */
const UNSUPPORTED_KEYWORDS: ReadonlySet<string> = new Set([
  'if',
  'switch',
  'for',
  'while',
  'do',
  'try',
  'throw',
  'return',
  'val',
  'var',
  'typeof',
  'synchronized',
  'instanceof',
  'as',
]);
const UNSUPPORTED_PUNCTUATION: Readonly<Record<string, string>> = {
  '[': 'lambda',
  '{': 'block expression',
  '(': 'parenthesized expression',
};
const NUMBER_SUFFIXES: Readonly<Record<string, 'f' | 'd' | 'l'>> = { f: 'f', d: 'd', l: 'l' };

/** A clause handler fills one field of the mutable draft of the construct being parsed. */
type ClauseTable<D> = Readonly<Record<string, (draft: D) => void>>;

class Parser {
  private index = 0;

  constructor(
    private readonly tokens: readonly Token[],
    private readonly fileName: string,
  ) {}

  // ---- token plumbing ----

  private get tok(): Token {
    return this.tokens[this.index] as Token;
  }

  private next(): Token {
    const t = this.tok;
    if (t.kind !== 'eof') this.index++;
    return t;
  }

  private describe(t: Token): string {
    return t.kind === 'eof' ? 'end of file' : `'${t.text}'`;
  }

  private failAt(t: Token, message: string): never {
    throw new MelkSyntaxError(message, this.fileName, t.line, t.column);
  }

  private unexpected(expected: string): never {
    return this.failAt(this.tok, `expected ${expected} but found ${this.describe(this.tok)}`);
  }

  private atKw(text: string): boolean {
    return this.tok.kind === 'id' && !this.tok.escaped && this.tok.text === text;
  }

  private atPunct(text: string): boolean {
    return this.tok.kind === 'punct' && this.tok.text === text;
  }

  private optKw(text: string): boolean {
    const hit = this.atKw(text);
    if (hit) this.next();
    return hit;
  }

  private optPunct(text: string): boolean {
    const hit = this.atPunct(text);
    if (hit) this.next();
    return hit;
  }

  private expectKw(text: string): void {
    if (!this.optKw(text)) this.unexpected(`'${text}'`);
  }

  private expectPunct(text: string): void {
    if (!this.optPunct(text)) this.unexpected(`'${text}'`);
  }

  private ident(): string {
    if (this.tok.kind !== 'id') this.unexpected('an identifier');
    return this.next().text;
  }

  private string(): string {
    if (this.tok.kind !== 'string') this.unexpected('a string');
    return this.next().text;
  }

  // ---- names and types ----

  private qualifiedName(): string {
    const parts = [this.ident()];
    while (this.atPunct('.') && this.tokens[this.index + 1]?.kind === 'id') {
      this.next();
      parts.push(this.ident());
    }
    return parts.join('.');
  }

  private path(): string {
    let out = this.qualifiedName();
    while (this.atPunct('/') || this.atPunct('-')) {
      out += this.next().text + this.qualifiedName();
    }
    return out;
  }

  private typeRef(): TypeRef {
    const name = this.qualifiedName();
    const args: TypeRef[] = [];
    if (this.optPunct('<')) {
      args.push(this.typeRef());
      while (this.optPunct(',')) args.push(this.typeRef());
      this.expectPunct('>');
    }
    return { name, args };
  }

  private commaList<T>(item: () => T): T[] {
    const items = [item()];
    while (this.optPunct(',')) items.push(item());
    return items;
  }

  private enumLiteral<T extends string>(allowed: readonly T[], what: string): T {
    const t = this.tok;
    const value = allowed.find((a) => a === t.text);
    if (t.kind !== 'id' || value === undefined) this.unexpected(what);
    this.next();
    return value as T;
  }

  // ---- unordered groups ----

  /** Parses the `&` group: every clause at most once, in any order. */
  private clauses<D>(table: ClauseTable<D>, draft: D): void {
    const seen = new Set<string>();
    for (;;) {
      const t = this.tok;
      const handler = t.kind === 'id' && !t.escaped ? table[t.text] : undefined;
      if (handler === undefined || !Object.hasOwn(table, t.text)) return;
      if (seen.has(t.text)) this.failAt(t, `clause '${t.text}' appears more than once`);
      seen.add(t.text);
      this.next();
      handler(draft);
    }
  }

  private assign(): Expr {
    this.expectPunct('=');
    return this.expr();
  }

  // ---- model ----

  parseFile(): MelkFile {
    let packageName: string | null = null;
    const imports: string[] = [];
    let bundle: MdBundle | null = null;
    if (this.optKw('package')) {
      packageName = this.qualifiedName();
      while (this.optKw('import')) imports.push(this.importName());
      bundle = this.bundle();
    } else if (this.tok.kind !== 'eof') {
      this.unexpected("'package'");
    }
    const members: MdBundleMember[] = [];
    while (this.tok.kind !== 'eof') members.push(this.member());
    return { fileName: this.fileName, packageName, imports, bundle, members };
  }

  private importName(): string {
    if (this.atKw('static')) this.failAt(this.tok, "unsupported import form 'import static'");
    const name = this.qualifiedName();
    if (!this.atPunct('.')) return name;
    this.next();
    this.expectPunct('*');
    return `${name}.*`;
  }

  private bundle(): MdBundle {
    const draft: BundleDraft = { label: null, targetClass: null, documentationFolder: null, idPrefix: null };
    if (this.optKw('bundle')) {
      this.expectPunct('{');
      this.clauses<BundleDraft>(
        {
          label: (d) => (d.label = this.string()),
          metadataClass: (d) => (d.targetClass = this.qualifiedName()),
          documentationFolder: (d) => (d.documentationFolder = this.path()),
          idPrefix: (d) => (d.idPrefix = this.qualifiedName()),
        },
        draft,
      );
      this.expectPunct('}');
    }
    return draft;
  }

  /** Parses `deprecated? modifier?`, shared by members and group children. */
  private declarationPrefix(): { line: number; deprecated: boolean; modifier: OptionModifier | null } {
    const line = this.tok.line;
    const deprecated = this.optKw('deprecated');
    const modifier = OPTION_MODIFIERS.find((m) => this.atKw(m)) ?? null;
    if (modifier !== null) this.next();
    return { line, deprecated, modifier };
  }

  private member(): MdBundleMember {
    if (this.atKw('group')) return this.group();
    const { line, deprecated, modifier } = this.declarationPrefix();
    if (this.atKw('option')) return this.option(line, deprecated, modifier);
    if (modifier !== null) this.unexpected("'option'");
    if (this.atKw('algorithm')) return this.algorithm(line, deprecated);
    if (this.atKw('category')) return this.category(line, deprecated);
    return this.unexpected("'option', 'algorithm', 'category' or 'group'");
  }

  private group(): MdGroup {
    this.expectKw('group');
    const name = this.ident();
    this.expectPunct('{');
    let documentation: string | null = null;
    if (this.optKw('documentation')) documentation = this.string();
    const children: MdGroupOrOption[] = [];
    while (!this.atPunct('}')) children.push(this.groupChild());
    this.next();
    return { kind: 'group', name, documentation, children };
  }

  private groupChild(): MdGroupOrOption {
    if (this.atKw('group')) return this.group();
    const { line, deprecated, modifier } = this.declarationPrefix();
    if (!this.atKw('option')) this.unexpected("'option' or 'group'");
    return this.option(line, deprecated, modifier);
  }

  private option(line: number, deprecated: boolean, modifier: OptionModifier | null): MdOption {
    this.expectKw('option');
    const name = this.ident();
    const type = this.optPunct(':') ? this.typeRef() : null;
    this.expectPunct('{');
    const draft: OptionDraft = {
      label: null,
      description: null,
      documentation: null,
      defaultValue: null,
      lowerBound: null,
      upperBound: null,
      targets: [],
      legacyIds: [],
    };
    this.clauses<OptionDraft>(this.optionClauses(), draft);
    const dependencies: MdOptionDependency[] = [];
    while (this.optKw('requires')) dependencies.push(this.dependency());
    this.expectPunct('}');
    return { kind: 'option', name, deprecated, modifier, type, ...draft, dependencies, line };
  }

  private optionClauses(): ClauseTable<OptionDraft> {
    return {
      label: (d) => (d.label = this.string()),
      description: (d) => (d.description = this.string()),
      documentation: (d) => (d.documentation = this.string()),
      default: (d) => (d.defaultValue = this.assign()),
      lowerBound: (d) => (d.lowerBound = this.assign()),
      upperBound: (d) => (d.upperBound = this.assign()),
      targets: (d) => (d.targets = this.commaList(() => this.enumLiteral(OPTION_TARGETS, 'an option target'))),
      legacyIds: (d) => (d.legacyIds = this.commaList(() => this.qualifiedName())),
    };
  }

  private dependency(): MdOptionDependency {
    const target = this.qualifiedName();
    const value = this.optPunct('==') ? this.expr() : null;
    return { target, value };
  }

  private algorithm(line: number, deprecated: boolean): MdAlgorithm {
    this.expectKw('algorithm');
    const name = this.ident();
    this.expectPunct('(');
    const provider = this.typeRef();
    const parameter = this.optPunct('#') ? this.ident() : null;
    this.expectPunct(')');
    this.expectPunct('{');
    const draft: AlgorithmDraft = {
      label: null,
      targetClass: null,
      description: null,
      documentation: null,
      category: null,
      previewImage: null,
      supportedFeatures: [],
      validator: null,
    };
    this.clauses<AlgorithmDraft>(this.algorithmClauses(), draft);
    const supportedOptions: MdOptionSupport[] = [];
    while (this.optKw('supports')) supportedOptions.push(this.support());
    this.expectPunct('}');
    return { kind: 'algorithm', name, deprecated, provider, parameter, ...draft, supportedOptions, line };
  }

  private algorithmClauses(): ClauseTable<AlgorithmDraft> {
    return {
      label: (d) => (d.label = this.string()),
      metadataClass: (d) => (d.targetClass = this.qualifiedName()),
      description: (d) => (d.description = this.string()),
      documentation: (d) => (d.documentation = this.string()),
      category: (d) => (d.category = this.qualifiedName()),
      preview: (d) => (d.previewImage = this.path()),
      features: (d) =>
        (d.supportedFeatures = this.commaList(() => this.enumLiteral(GRAPH_FEATURES, 'a graph feature'))),
      validator: (d) => (d.validator = this.typeRef()),
    };
  }

  private support(): MdOptionSupport {
    const option = this.qualifiedName();
    const value = this.optPunct('=') ? this.expr() : null;
    const documentation = this.optKw('documentation') ? this.string() : null;
    return { option, value, documentation };
  }

  private category(line: number, deprecated: boolean): MdCategory {
    this.expectKw('category');
    const name = this.ident();
    this.expectPunct('{');
    const draft: CategoryDraft = { label: null, description: null, documentation: null };
    this.clauses<CategoryDraft>(
      {
        label: (d) => (d.label = this.string()),
        description: (d) => (d.description = this.string()),
        documentation: (d) => (d.documentation = this.string()),
      },
      draft,
    );
    this.expectPunct('}');
    return { kind: 'category', name, deprecated, ...draft, line };
  }

  // ---- expressions (C5 forms only) ----

  private expr(): Expr {
    const t = this.tok;
    switch (t.kind) {
      case 'number':
        return this.number();
      case 'string':
        this.next();
        return { kind: 'literal', type: 'string', raw: t.text, suffix: null };
      case 'id':
        return this.identExpr();
      default:
        return this.punctExpr();
    }
  }

  private punctExpr(): Expr {
    const t = this.tok;
    if (t.kind === 'punct' && t.text === '-') {
      this.next();
      return { kind: 'unary', operator: '-', operand: this.expr() };
    }
    if (t.kind === 'punct' && t.text === '#') return this.list();
    const form = t.kind === 'punct' ? UNSUPPORTED_PUNCTUATION[t.text] : undefined;
    return this.failAt(t, `unsupported expression form '${form ?? this.describe(t)}'`);
  }

  private number(): LiteralExpr {
    const t = this.next();
    const last = t.text.slice(-1).toLowerCase();
    const suffix = NUMBER_SUFFIXES[last] ?? null;
    const raw = suffix === null ? t.text : t.text.slice(0, -1);
    const decimal = suffix === 'f' || suffix === 'd' || /[.eE]/.test(raw);
    return { kind: 'literal', type: decimal ? 'decimal' : 'int', raw, suffix };
  }

  private list(): Expr {
    this.next();
    this.expectPunct('[');
    const elements: Expr[] = [];
    if (!this.atPunct(']')) elements.push(...this.commaList(() => this.expr()));
    this.expectPunct(']');
    return { kind: 'list', elements };
  }

  private identExpr(): Expr {
    const t = this.tok;
    if (!t.escaped) {
      if (t.text === 'null') return this.keywordLiteral({ kind: 'null' });
      if (t.text === 'true' || t.text === 'false') {
        return this.keywordLiteral({ kind: 'literal', type: 'boolean', raw: t.text, suffix: null });
      }
      if (t.text === 'new') return this.newExpr();
      if (UNSUPPORTED_KEYWORDS.has(t.text)) this.failAt(t, `unsupported expression form '${t.text}'`);
    }
    return this.referenceOrCall();
  }

  private keywordLiteral(expr: Expr): Expr {
    this.next();
    return expr;
  }

  private newExpr(): Expr {
    this.next();
    const type = this.typeRef();
    return { kind: 'new', type, args: this.arguments() };
  }

  private arguments(): Expr[] {
    this.expectPunct('(');
    const args: Expr[] = [];
    if (!this.atPunct(')')) args.push(...this.commaList(() => this.expr()));
    this.expectPunct(')');
    return args;
  }

  private referenceOrCall(): Expr {
    const segments = this.qualifiedName().split('.');
    if (!this.atPunct('(')) return { kind: 'ref', segments };
    const name = segments.pop() as string;
    const call: Expr = { kind: 'call', receiver: segments, name, args: this.arguments() };
    if (this.atPunct('.')) this.failAt(this.tok, "unsupported expression form 'chained member access'");
    return call;
  }
}

/**
 * Parses `.melk` source text.
 *
 * @throws MelkSyntaxError naming file, line and column on any lexical, grammar or
 *   unsupported-expression error.
 * @see org.eclipse.elk.core.meta/src/org/eclipse/elk/core/meta/MetaData.xtext
 */
export function parseMelk(text: string, fileName: string): MelkFile {
  return new Parser(lex(text, fileName), fileName).parseFile();
}
