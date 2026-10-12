// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import * as Iterators from '../../guava/Iterators.js';
import * as Strings from '../../guava/Strings.js';
import { Random } from '../../java/util/Random.js';
import { type ElkEdge, isElkEdge } from '../ElkEdge.js';
import { type ElkEdgeSection, isElkEdgeSection } from '../ElkEdgeSection.js';
import { type ElkGraphElement, isElkGraphElement } from '../ElkGraphElement.js';
import { type ElkLabel, isElkLabel } from '../ElkLabel.js';
import { type ElkNode, isElkNode } from '../ElkNode.js';
import { type ElkPort, isElkPort } from '../ElkPort.js';

/** Highest code unit `String.trim()` removes: it strips every leading and trailing char `<= ' '` (U+0020). */
const TRIM_LIMIT = 0x20;
/** `Random.nextInt` bound of `fourDigitPaddedRandomNumber`. */
const RANDOM_BOUND = 10000;
/** Width of the random number of `fourDigitPaddedRandomNumber`. */
const RANDOM_DIGITS = 4;

/**
 * Java `identifier == null || identifier.trim().isEmpty()`. JS `trim()` strips other characters
 * than Java's, so the Java rule is spelled out: blank means every code unit is `<= U+0020`.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
 */
function isMissing(identifier: string | null): boolean {
  return identifier === null || identifier.split('').every((c) => c.charCodeAt(0) <= TRIM_LIMIT);
}

/**
 * The negation of the character test of Java's `validateIdentifier(String)`, split out to keep the
 * method within the complexity limit. Rule to validate:
 * `( 'a' .. 'z' | 'A' .. 'Z' | '_' ) ( 'a' .. 'z' | 'A' .. 'Z' | '_' | '0' .. '9' )*`; `c` is one
 * UTF-16 code unit, `i` its index.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
 */
function isValidIdentifierChar(c: string, i: number): boolean {
  return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '_' || (i > 0 && c >= '0' && c <= '9');
}

/**
 * The kinds of object the `ElkGraphSwitch` of validation and generation dispatches on. Every caller
 * passes one of them (the graph's containment tree holds nothing else of interest), so the switch's
 * `defaultCase` is unreachable and the guard chain ends in a plain `else`.
 */
type GraphElement = ElkNode | ElkPort | ElkLabel | ElkEdge | ElkEdgeSection;

/**
 * Enumeration of possible graph elements that can receive identifiers (private to the module,
 * translation rules 6.3).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
 */
class ElementType {
  static readonly NODE = new ElementType(0, 'N');
  static readonly PORT = new ElementType(1, 'P');
  static readonly EDGE = new ElementType(2, 'E');
  static readonly EDGE_SECTION = new ElementType(3, 'ES');
  static readonly LABEL = new ElementType(4, 'L');

  readonly #ordinal: number;
  readonly elementPrefix: string;

  private constructor(ordinal: number, prefix: string) {
    this.#ordinal = ordinal;
    this.elementPrefix = prefix;
  }

  ordinal(): number {
    return this.#ordinal;
  }

  static values(): readonly ElementType[] {
    return [ElementType.NODE, ElementType.PORT, ElementType.EDGE, ElementType.EDGE_SECTION, ElementType.LABEL];
  }
}

/**
 * Generates identifiers for graph elements where missing. Inside ELK, this class is mainly used to
 * generate proper identifiers before a graph is serialized using the textual graph languages, which
 * uses identifiers for elements referencing each other.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
 */
export class GraphIdentifierGenerator {
  readonly #graph: ElkNode;
  #validate = false;
  #generate = false;
  #unique = false;

  #random: Random | null = null;

  /** Array of highest identifiers generated so far for each kind of element. */
  readonly #currentIDs: number[] = ElementType.values().map(() => 0);
  /** Set of existing identifiers in the graph for collision detection. */
  readonly #existingIdentifiers = new Set<string>();

  /**
   * Constructor is only called from the inside.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
   */
  private constructor(graph: ElkNode) {
    this.#graph = graph;
    for (const currentEObject of graph.eAllContents()) {
      if (isElkGraphElement(currentEObject)) {
        const element = currentEObject;
        if (!isMissing(element.getIdentifier())) {
          this.#existingIdentifiers.add(element.getIdentifier() as string);
        }
      } else if (isElkEdgeSection(currentEObject)) {
        const section = currentEObject;
        if (!isMissing(section.getIdentifier())) {
          this.#existingIdentifiers.add(section.getIdentifier() as string);
        }
      }
    }
  }

  /**
   * @param graph the graph for which to generate identifiers.
   * @returns a new {@link GraphIdentifierGenerator} instance that can be configured and finally executed.
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
   */
  static forGraph(graph: ElkNode): GraphIdentifierGenerator {
    return new GraphIdentifierGenerator(graph);
  }

  /**
   * Ensures that existing identifiers are valid instances of identifiers as defined by the ELKT format.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
   */
  assertValid(): this {
    this.#validate = true;
    return this;
  }

  /**
   * Generates identifiers for the graph's elements, where missing.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
   */
  assertExists(): this {
    this.#generate = true;
    return this;
  }

  /**
   * Makes sure existing identifiers are unique by appending a "_" to non-unique ones.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
   */
  assertUnique(): this {
    this.#unique = true;
    return this;
  }

  /**
   * Execute this generator.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
   */
  execute(): void {
    if (this.#validate) {
      this.#validateIdentifiers(this.#graph);
    }

    if (this.#generate) {
      this.#generateIdentifiers(this.#graph);
    }

    if (this.#unique) {
      this.#assertAllIdsUnique(this.#graph);
    }
  }

  // ---- Identifier Validation ----

  /**
   * Ensures valid identifiers in the object tree rooted at the given element. The anonymous
   * `ElkGraphSwitch` becomes a guard chain in the switch's case order; `defaultCase` is unreachable
   * for a {@link GraphElement}.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
   */
  #validateIdentifiers(element: GraphElement): void {
    if (isElkNode(element)) {
      this.#caseValidateElkNode(element);
    } else if (isElkPort(element)) {
      this.#caseValidateElkPort(element);
    } else if (isElkLabel(element)) {
      this.#caseValidateElkLabel(element);
    } else if (isElkEdge(element)) {
      this.#caseValidateElkEdge(element);
    } else {
      this.#caseValidateElkEdgeSection(element);
    }
  }

  /** `caseElkNode` of the validation switch. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java */
  #caseValidateElkNode(node: ElkNode): void {
    this.#validateElementIdentifier(node);

    node
      .getLabels()
      .toArray()
      .forEach((l) => this.#validateIdentifiers(l));
    node
      .getPorts()
      .toArray()
      .forEach((p) => this.#validateIdentifiers(p));
    node
      .getContainedEdges()
      .toArray()
      .forEach((e) => this.#validateIdentifiers(e));
    node
      .getChildren()
      .toArray()
      .forEach((c) => this.#validateIdentifiers(c));
  }

  /** `caseElkPort` of the validation switch. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java */
  #caseValidateElkPort(port: ElkPort): void {
    this.#validateElementIdentifier(port);

    port
      .getLabels()
      .toArray()
      .forEach((l) => this.#validateIdentifiers(l));
  }

  /** `caseElkLabel` of the validation switch. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java */
  #caseValidateElkLabel(label: ElkLabel): void {
    this.#validateElementIdentifier(label);

    label
      .getLabels()
      .toArray()
      .forEach((l) => this.#validateIdentifiers(l));
  }

  /** `caseElkEdge` of the validation switch. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java */
  #caseValidateElkEdge(edge: ElkEdge): void {
    this.#validateElementIdentifier(edge);

    edge
      .getLabels()
      .toArray()
      .forEach((l) => this.#validateIdentifiers(l));
    edge
      .getSections()
      .toArray()
      .forEach((s) => this.#validateIdentifiers(s));
  }

  /** `caseElkEdgeSection` of the validation switch. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java */
  #caseValidateElkEdgeSection(section: ElkEdgeSection): void {
    this.#validateSectionIdentifier(section);
  }

  /**
   * Java overload `validateIdentifier(ElkGraphElement)`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
   */
  #validateElementIdentifier(element: ElkGraphElement): void {
    const validIdentifier = this.#validateIdentifier(element.getIdentifier());
    if (validIdentifier !== null) {
      element.setIdentifier(validIdentifier);
    }
  }

  /**
   * Java overload `validateIdentifier(ElkEdgeSection)`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
   */
  #validateSectionIdentifier(section: ElkEdgeSection): void {
    const validIdentifier = this.#validateIdentifier(section.getIdentifier());
    if (validIdentifier !== null) {
      section.setIdentifier(validIdentifier);
    }
  }

  /**
   * Returns a validated version of the given identifier or `null` if the identifier was already
   * valid (or empty or `null` itself). Java overload `validateIdentifier(String)`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
   */
  #validateIdentifier(identifier: string | null): string | null {
    if (Strings.isNullOrEmpty(identifier)) {
      return null;
    }

    let valid = true;
    // `split('')` yields UTF-16 code units, like `toCharArray()`.
    const chars = (identifier as string).split('');

    for (let i = 0; i < chars.length; i++) {
      if (!isValidIdentifierChar(chars[i] as string, i)) {
        // We have an invalid character, replace with _
        chars[i] = '_';
        valid = false;
      }
    }

    return valid ? null : chars.join('');
  }

  // ---- Identifier Generation ----

  /**
   * Recursively generates identifiers for the given element and its child elements. The anonymous
   * `ElkGraphSwitch` becomes a guard chain in the switch's case order; `defaultCase` is unreachable
   * for a {@link GraphElement}.
   *
   * @param element the element to generate an identifier for.
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
   */
  #generateIdentifiers(element: GraphElement): this {
    if (isElkNode(element)) {
      this.#caseGenerateElkNode(element);
    } else if (isElkPort(element)) {
      this.#caseGenerateElkPort(element);
    } else if (isElkLabel(element)) {
      this.#caseGenerateElkLabel(element);
    } else if (isElkEdge(element)) {
      this.#caseGenerateElkEdge(element);
    } else {
      this.#caseGenerateElkEdgeSection(element);
    }

    return this;
  }

  /** `caseElkNode` of the generation switch. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java */
  #caseGenerateElkNode(node: ElkNode): void {
    if (node.getParent() === null) {
      if (isMissing(node.getIdentifier())) {
        node.setIdentifier('G1');
      }
    } else {
      this.#setIdentifierIfMissing(node, ElementType.NODE);
    }

    node
      .getLabels()
      .toArray()
      .forEach((l) => this.#generateIdentifiers(l));
    node
      .getPorts()
      .toArray()
      .forEach((p) => this.#generateIdentifiers(p));
    node
      .getContainedEdges()
      .toArray()
      .forEach((e) => this.#generateIdentifiers(e));
    node
      .getChildren()
      .toArray()
      .forEach((c) => this.#generateIdentifiers(c));
  }

  /** `caseElkPort` of the generation switch. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java */
  #caseGenerateElkPort(port: ElkPort): void {
    this.#setIdentifierIfMissing(port, ElementType.PORT);

    port
      .getLabels()
      .toArray()
      .forEach((l) => this.#generateIdentifiers(l));
  }

  /** `caseElkLabel` of the generation switch. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java */
  #caseGenerateElkLabel(label: ElkLabel): void {
    this.#setIdentifierIfMissing(label, ElementType.LABEL);

    label
      .getLabels()
      .toArray()
      .forEach((l) => this.#generateIdentifiers(l));
  }

  /** `caseElkEdge` of the generation switch. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java */
  #caseGenerateElkEdge(edge: ElkEdge): void {
    this.#setIdentifierIfMissing(edge, ElementType.EDGE);

    edge
      .getLabels()
      .toArray()
      .forEach((l) => this.#generateIdentifiers(l));
    edge
      .getSections()
      .toArray()
      .forEach((s) => this.#generateIdentifiers(s));
  }

  /** `caseElkEdgeSection` of the generation switch. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java */
  #caseGenerateElkEdgeSection(section: ElkEdgeSection): void {
    this.#setSectionIdentifierIfMissing(section);
  }

  /**
   * Generates and sets a new identifier for the given element of the given type.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
   */
  #setIdentifierIfMissing(element: ElkGraphElement, elementType: ElementType): void {
    if (isMissing(element.getIdentifier())) {
      const id = this.#nextIdentifier(elementType);
      element.setIdentifier(id);
    }
  }

  /**
   * Generates and sets a new identifier for the given edge section. Java overload
   * `setIdentifierIfMissing(ElkEdgeSection)`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
   */
  #setSectionIdentifierIfMissing(section: ElkEdgeSection): void {
    if (isMissing(section.getIdentifier())) {
      const id = this.#nextIdentifier(ElementType.EDGE_SECTION);
      section.setIdentifier(id);
    }
  }

  /**
   * Returns the next unused identifier for an element of the given type.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java
   */
  #nextIdentifier(elementType: ElementType): string {
    let identifier: string;
    do {
      const ordinal = elementType.ordinal();
      const next = (this.#currentIDs[ordinal] as number) + 1;
      this.#currentIDs[ordinal] = next;
      identifier = elementType.elementPrefix + next;
    } while (this.#existingIdentifiers.has(identifier));

    return identifier;
  }

  // ---- Uniqueness ----

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java */
  #assertAllIdsUnique(element: EObject): this {
    // Identifiers may be null (Java `HashSet` accepts null; so does a JS `Set`).
    const knownIds = new Set<string | null>();
    const elementIt = Iterators.filter<unknown>(
      element.eAllContents(),
      isElkGraphElement,
    ) as IterableIterator<ElkGraphElement>;
    for (const e of elementIt) {
      while (knownIds.has(e.getIdentifier())) {
        // `+` on a null identifier yields "null", in Java and in the template alike.
        const newId = `${e.getIdentifier()}_g${this.#fourDigitPaddedRandomNumber()}`;
        e.setIdentifier(newId);
      }
      knownIds.add(e.getIdentifier());
    }

    return this;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java */
  #fourDigitPaddedRandomNumber(): string {
    // The unseeded `Random` is Java's (`new Random()`); only the shape of the result is specified.
    this.#random ??= new Random();
    const rand = this.#random.nextInt(RANDOM_BOUND);
    return this.#padZeroes(String(rand), RANDOM_DIGITS);
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java */
  #padZeroes(s: string, length: number): string {
    if (s.length === length) {
      return s;
    }
    let r = '';
    for (let i = 0; i < length - s.length; ++i) {
      r += '0';
    }
    r += s;
    return r;
  }
}
