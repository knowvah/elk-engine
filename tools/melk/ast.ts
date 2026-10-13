// SPDX-License-Identifier: EPL-2.0
/**
 * AST of the `.melk` metadata language (AD-12). Hand-written counterpart of the
 * rules of `MetaData.xtext`.
 *
 * @see org.eclipse.elk.core.meta/src/org/eclipse/elk/core/meta/MetaData.xtext
 *
 * Xbase expression forms (C5). The set was enumerated by scanning every
 * `default`, `lowerBound`, `upperBound`, `requires ... ==` and `supports ... =`
 * of the 13 pinned sources; the parser accepts exactly these forms:
 *
 * | Form                          | AST kind   | Example (pinned sources)                      |
 * | ----------------------------- | ---------- | --------------------------------------------- |
 * | integer literal               | `literal`  | `0`, `1000`                                   |
 * | decimal literal, `f`/`d`/`l`  | `literal`  | `0.5`, `1.3f`, `10e-4`                        |
 * | boolean literal               | `literal`  | `true`, `false`                               |
 * | string literal                | `literal`  | `"x"` (grammar-level support)                 |
 * | `null`                        | `null`     | `default = null`                              |
 * | unary minus                   | `unary`    | `-1`, `-1.0f`                                 |
 * | feature / static field / enum | `ref`      | `Direction.UNDEFINED`, `Integer.MAX_VALUE`,   |
 * |   constant (incl. nested)     |            | `BoxLayoutProvider.PackingMode.SIMPLE`,       |
 * |                               |            | `wrapping.strategy`                           |
 * | constructor call              | `new`      | `new ElkPadding(12)`, `new KVector(0, 0)`     |
 * | static / member call          | `call`     | `ExclusiveBounds.greaterThan(0)`,             |
 * |                               |            | `EnumSet.of(SizeOptions.X)`,                  |
 * |                               |            | `EnumSet.noneOf(SizeConstraint)`,             |
 * |                               |            | `ContentAlignment.topLeft()`                  |
 * | list literal                  | `list`     | `#[1, 2, 6]`                                  |
 *
 * Every other form (lambda, binary operators, `if`, ...) is a `MelkSyntaxError`.
 */

/** A `JvmTypeReference`: a qualified or simple name with optional type arguments. */
export interface TypeRef {
  /** Dotted name, e.g. `EnumSet` or `StressMajorization.Dimension`. */
  readonly name: string;
  readonly args: readonly TypeRef[];
}

export type LiteralType = 'int' | 'decimal' | 'boolean' | 'string';

export interface LiteralExpr {
  readonly kind: 'literal';
  readonly type: LiteralType;
  /** Source text for numbers (exponent included, suffix excluded), content for strings. */
  readonly raw: string;
  /** Number suffix (`f`, `d`, `l`) lower-cased, or null. */
  readonly suffix: 'f' | 'd' | 'l' | null;
}

export interface NullExpr {
  readonly kind: 'null';
}

export interface UnaryExpr {
  readonly kind: 'unary';
  readonly operator: '-';
  readonly operand: Expr;
}

export interface RefExpr {
  readonly kind: 'ref';
  readonly segments: readonly string[];
}

export interface NewExpr {
  readonly kind: 'new';
  readonly type: TypeRef;
  readonly args: readonly Expr[];
}

export interface CallExpr {
  /** Dotted receiver (type or feature path); empty for an unqualified call. */
  readonly kind: 'call';
  readonly receiver: readonly string[];
  readonly name: string;
  readonly args: readonly Expr[];
}

export interface ListExpr {
  readonly kind: 'list';
  readonly elements: readonly Expr[];
}

export type Expr = LiteralExpr | NullExpr | UnaryExpr | RefExpr | NewExpr | CallExpr | ListExpr;

export type OptionModifier = 'advanced' | 'programmatic' | 'output' | 'global';

export type OptionTarget = 'parents' | 'nodes' | 'edges' | 'ports' | 'labels';

export type GraphFeature =
  | 'self_loops'
  | 'inside_self_loops'
  | 'multi_edges'
  | 'edge_labels'
  | 'ports'
  | 'compound'
  | 'clusters'
  | 'disconnected';

export interface MdBundle {
  readonly label: string | null;
  readonly targetClass: string | null;
  readonly documentationFolder: string | null;
  readonly idPrefix: string | null;
}

export interface MdOptionDependency {
  readonly target: string;
  readonly value: Expr | null;
}

export interface MdOption {
  readonly kind: 'option';
  readonly name: string;
  readonly deprecated: boolean;
  readonly modifier: OptionModifier | null;
  readonly type: TypeRef | null;
  readonly label: string | null;
  readonly description: string | null;
  readonly documentation: string | null;
  readonly defaultValue: Expr | null;
  readonly lowerBound: Expr | null;
  readonly upperBound: Expr | null;
  readonly targets: readonly OptionTarget[];
  readonly legacyIds: readonly string[];
  readonly dependencies: readonly MdOptionDependency[];
  /** Line of the first token of the declaration (1-based). */
  readonly line: number;
}

export interface MdGroup {
  readonly kind: 'group';
  readonly name: string;
  readonly documentation: string | null;
  readonly children: readonly MdGroupOrOption[];
}

export type MdGroupOrOption = MdGroup | MdOption;

export interface MdOptionSupport {
  readonly option: string;
  readonly value: Expr | null;
  readonly documentation: string | null;
}

export interface MdAlgorithm {
  readonly kind: 'algorithm';
  readonly name: string;
  readonly deprecated: boolean;
  readonly provider: TypeRef;
  readonly parameter: string | null;
  readonly label: string | null;
  readonly targetClass: string | null;
  readonly description: string | null;
  readonly documentation: string | null;
  readonly category: string | null;
  readonly previewImage: string | null;
  readonly supportedFeatures: readonly GraphFeature[];
  readonly validator: TypeRef | null;
  readonly supportedOptions: readonly MdOptionSupport[];
  readonly line: number;
}

export interface MdCategory {
  readonly kind: 'category';
  readonly name: string;
  readonly deprecated: boolean;
  readonly label: string | null;
  readonly description: string | null;
  readonly documentation: string | null;
  readonly line: number;
}

export type MdBundleMember = MdGroupOrOption | MdAlgorithm | MdCategory;

export interface MelkFile {
  readonly fileName: string;
  readonly packageName: string | null;
  readonly imports: readonly string[];
  readonly bundle: MdBundle | null;
  readonly members: readonly MdBundleMember[];
}

/** Lexing or parsing failure; carries the position of the offending token. */
export class MelkSyntaxError extends Error {
  readonly fileName: string;
  readonly line: number;
  readonly column: number;

  constructor(message: string, fileName: string, line: number, column: number) {
    super(`${fileName}:${String(line)}:${String(column)}: ${message}`);
    this.name = 'MelkSyntaxError';
    this.fileName = fileName;
    this.line = line;
    this.column = column;
  }
}

/** Mutable accumulators the parser fills while reading an unordered clause group. */
export interface BundleDraft {
  label: string | null;
  targetClass: string | null;
  documentationFolder: string | null;
  idPrefix: string | null;
}

export interface OptionDraft {
  label: string | null;
  description: string | null;
  documentation: string | null;
  defaultValue: Expr | null;
  lowerBound: Expr | null;
  upperBound: Expr | null;
  targets: OptionTarget[];
  legacyIds: string[];
}

export interface AlgorithmDraft {
  label: string | null;
  targetClass: string | null;
  description: string | null;
  documentation: string | null;
  category: string | null;
  previewImage: string | null;
  supportedFeatures: GraphFeature[];
  validator: TypeRef | null;
}

export interface CategoryDraft {
  label: string | null;
  description: string | null;
  documentation: string | null;
}
