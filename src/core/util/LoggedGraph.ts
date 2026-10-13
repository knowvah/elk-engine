// SPDX-License-Identifier: EPL-2.0
import { isElkNode } from '../../graph/ElkNode.js';
import { ClassCastException } from '../../java/lang/ClassCastException.js';

const JAVA_STRING_CLASS = 'java.lang.String';
/** Fallback class name when the object is neither a string nor an EObject (journaled judgment call). */
const UNKNOWN_CLASS_PREFIX = 'js.';
const ELK_GRAPH_IMPL_PACKAGE = 'org.eclipse.elk.graph.impl.';
const IMPL_SUFFIX = 'Impl';
const ELK_SERIALIZE_FALLBACK = 'Unexpected problem serializing ELK Graph.';

interface HasEClass {
  eClass(): { getName(): string };
}

function hasEClass(o: unknown): o is HasEClass {
  return typeof o === 'object' && o !== null && typeof (o as { eClass?: unknown }).eClass === 'function';
}

/** Java `o.getClass().getName()` for the values a logged graph can hold. */
function javaClassName(o: unknown): string {
  if (typeof o === 'string') {
    return JAVA_STRING_CLASS;
  }
  if (hasEClass(o)) {
    return `${ELK_GRAPH_IMPL_PACKAGE}${o.eClass().getName()}${IMPL_SUFFIX}`;
  }
  return `${UNKNOWN_CLASS_PREFIX}${typeof o}`;
}

/**
 * Possible types for a logged graph (Java nested enum `LoggedGraph.Type`, exposed as
 * `LoggedGraph.Type`).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/LoggedGraph.java
 */
export class LoggedGraphType {
  /** Type for elk graphs. */
  static readonly ELK: LoggedGraphType = new LoggedGraphType('ELK', 0, isElkNode, 'elkg');
  /** Type for json graphs. */
  static readonly JSON: LoggedGraphType = new LoggedGraphType('JSON', 1, isString, 'json');
  /** Type for dot graphs. */
  static readonly DOT: LoggedGraphType = new LoggedGraphType('DOT', 2, isString, 'dot');
  /** Type for SVG images. */
  static readonly SVG: LoggedGraphType = new LoggedGraphType('SVG', 3, isString, 'svg');

  static readonly #VALUES: readonly LoggedGraphType[] = [
    LoggedGraphType.ELK,
    LoggedGraphType.JSON,
    LoggedGraphType.DOT,
    LoggedGraphType.SVG,
  ];

  readonly #name: string;
  readonly #ordinal: number;
  /** Stands for Java's `expectedType.isAssignableFrom(o.getClass())`. */
  readonly #expectedType: (o: unknown) => boolean;
  /** Extension of files this type of graph should be stored in. */
  readonly #fileExtension: string;

  private constructor(name: string, ordinal: number, expectedType: (o: unknown) => boolean, fileExtension: string) {
    this.#name = name;
    this.#ordinal = ordinal;
    this.#expectedType = expectedType;
    this.#fileExtension = fileExtension;
  }

  /** The constants in declaration order. */
  static values(): readonly LoggedGraphType[] {
    return LoggedGraphType.#VALUES;
  }

  name(): string {
    return this.#name;
  }

  ordinal(): number {
    return this.#ordinal;
  }

  toString(): string {
    return this.#name;
  }

  /** Checks if `o`'s type is the same or a subtype of the type we would expect. */
  isTypeCompatible(o: unknown): boolean {
    return this.#expectedType(o);
  }

  /**
   * Throws a {@link ClassCastException} if {@link isTypeCompatible} returns `false` for the object.
   *
   * @throws ClassCastException if the type is unexpected.
   */
  checkTypeCompatibility(o: unknown): void {
    if (!this.isTypeCompatible(o)) {
      throw new ClassCastException(`Type ${javaClassName(o)} incompatible for ${this.name()}`);
    }
  }

  /** Returns the file extension for graphs of this type. */
  getFileExtension(): string {
    return this.#fileExtension;
  }
}

function isString(o: unknown): boolean {
  return typeof o === 'string';
}

/**
 * A logged graph, including relevant information about the graph. The actual data type of a logged graph can be either
 * an ElkNode (for graphs of type `LoggedGraph.Type.ELK`), or a string (for the other graph types).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/LoggedGraph.java
 */
export class LoggedGraph {
  /** Java nested enum `LoggedGraph.Type`. */
  static readonly Type: typeof LoggedGraphType = LoggedGraphType;

  readonly #graph: unknown;
  readonly #graphType: LoggedGraphType;
  readonly #tag: string;

  /**
   * Creates a new logged graph.
   *
   * @throws ClassCastException if the type of `graph` does not conform to the type expected for `graphType`.
   */
  constructor(graph: unknown, tag: string, graphType: LoggedGraphType) {
    graphType.checkTypeCompatibility(graph);
    this.#graph = graph;
    this.#tag = tag;
    this.#graphType = graphType;
  }

  getGraph(): unknown {
    return this.#graph;
  }

  getGraphType(): LoggedGraphType {
    return this.#graphType;
  }

  /** Returns a string that will describe the graph. */
  getTag(): string {
    return this.#tag;
  }

  /**
   * Serializes the graph to a string for it to be saved to a file. ELK graphs: the Java persists
   * through `ElkGraphResource` (XMI, `core.util.persistence`, out of scope); the port takes the
   * Java's own fallback result.
   */
  serialize(): string {
    if (this.#graphType === LoggedGraphType.ELK) {
      return ELK_SERIALIZE_FALLBACK;
    }
    return String(this.#graph);
  }
}
