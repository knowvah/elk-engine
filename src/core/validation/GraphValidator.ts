// SPDX-License-Identifier: EPL-2.0
import type { ElkConnectableShape } from '../../graph/ElkConnectableShape.js';
import type { ElkEdge } from '../../graph/ElkEdge.js';
import { isElkEdge } from '../../graph/ElkEdge.js';
import type { ElkEdgeSection } from '../../graph/ElkEdgeSection.js';
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { isElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { RuntimeException } from '../../java/lang/RuntimeException.js';
import { StringBuilder } from '../../java/lang/StringBuilder.js';
import type { LayoutAlgorithmData } from '../data/LayoutAlgorithmData.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { ElkUtil } from '../util/ElkUtil.js';
import { GraphIssue } from './GraphIssue.js';
import type { IValidatingGraphElementVisitor } from './IValidatingGraphElementVisitor.js';

const NOT_CONNECTED_MESSAGE = 'Edge is not connected.';
const CONTAINMENT_MESSAGE_PREFIX = 'Edge should be contained in ';
const NOT_A_SOURCE_SUFFIX = ' declared as incoming shape is not a source of this edge.';
const NOT_A_TARGET_SUFFIX = ' declared as outgoing shape is not a target of this edge.';
const SECTION_CONNECTED_PREFIX = 'An edge section cannot be connected to an ';
const SECTION_CONNECTED_SUFFIX = ' and other sections at the same time.';
const INSTANTIATION_FAILURE_PREFIX = 'Failed to instantiate validator for ';

/**
 * A graph validator that checks basic structural properties of a graph and applies algorithm-specific
 * validation.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/validation/GraphValidator.java
 */
export class GraphValidator implements IValidatingGraphElementVisitor {
  /** The issues found by this validator. */
  readonly #issues: GraphIssue[] = [];
  /** A cache of algorithm-specific validator instances (identity-keyed, AD-10). */
  readonly #algorithmSpecificValidators: Map<LayoutAlgorithmData, IValidatingGraphElementVisitor> = new Map();

  /** Check the structural properties of the given graph element. */
  visit(element: ElkGraphElement): void {
    // Execute the generic checks
    if (isElkEdge(element)) {
      this.checkEdge(element);
    }

    // Execute the algorithm-specific checks
    const parent = ElkGraphUtil.containingGraph(element);
    if (parent !== null) {
      this.runAlgorithmSpecificChecks(element, parent);
    }
    if (
      isElkNode(element) &&
      (parent === null ||
        parent.getProperty(CoreOptions.RESOLVED_ALGORITHM) !== element.getProperty(CoreOptions.RESOLVED_ALGORITHM))
    ) {
      this.runAlgorithmSpecificChecks(element, element);
    }
  }

  /** Apply generic checks to the given edge. */
  protected checkEdge(edge: ElkEdge): void {
    if (!edge.isConnected()) {
      this.#issues.push(new GraphIssue(edge, NOT_CONNECTED_MESSAGE, GraphIssue.Severity.ERROR));
    } else {
      const bestContainer = ElkGraphUtil.findBestEdgeContainment(edge);
      if (bestContainer !== null && bestContainer !== edge.getContainingNode()) {
        const message = new StringBuilder().append(CONTAINMENT_MESSAGE_PREFIX);
        ElkUtil.printElementPath(bestContainer, message);
        this.#issues.push(new GraphIssue(edge, message.toString(), GraphIssue.Severity.WARNING));
      }
    }

    for (const edgeSection of edge.getSections()) {
      this.checkIncomingShape(edge, edgeSection);
      this.checkOutgoingShape(edge, edgeSection);
    }
  }

  /** The incoming half of the per-section loop of `checkEdge` (split out for the complexity limit). */
  private checkIncomingShape(edge: ElkEdge, edgeSection: ElkEdgeSection): void {
    const incomingShape = edgeSection.getIncomingShape();
    if (incomingShape !== null) {
      if (!edge.getSources().contains(incomingShape)) {
        this.addSectionError(edge, shapeClassName(incomingShape) + NOT_A_SOURCE_SUFFIX);
      }
      if (!edgeSection.getIncomingSections().isEmpty()) {
        this.addSectionError(edge, SECTION_CONNECTED_PREFIX + shapeClassName(incomingShape) + SECTION_CONNECTED_SUFFIX);
      }
    }
  }

  /** The outgoing half of the per-section loop of `checkEdge` (split out for the complexity limit). */
  private checkOutgoingShape(edge: ElkEdge, edgeSection: ElkEdgeSection): void {
    const outgoingShape = edgeSection.getOutgoingShape();
    if (outgoingShape !== null) {
      if (!edge.getTargets().contains(outgoingShape)) {
        this.addSectionError(edge, shapeClassName(outgoingShape) + NOT_A_TARGET_SUFFIX);
      }
      if (!edgeSection.getOutgoingSections().isEmpty()) {
        this.addSectionError(edge, SECTION_CONNECTED_PREFIX + shapeClassName(outgoingShape) + SECTION_CONNECTED_SUFFIX);
      }
    }
  }

  private addSectionError(edge: ElkEdge, message: string): void {
    this.#issues.push(new GraphIssue(edge, message, GraphIssue.Severity.ERROR));
  }

  /** Apply algorithm-specific checks to the given graph element. */
  protected runAlgorithmSpecificChecks(element: ElkGraphElement, parent: ElkNode): void {
    const algoData = parent.getProperty(CoreOptions.RESOLVED_ALGORITHM);
    if (algoData !== null && algoData !== undefined) {
      const validator = this.getValidator(algoData);
      if (validator !== null) {
        validator.visit(element);
      }
    }
  }

  /**
   * Create an instance of the algorithm-specific validator for the given layout algorithm.
   * The instance is cached for performance optimization.
   */
  protected getValidator(algoData: LayoutAlgorithmData): IValidatingGraphElementVisitor | null {
    const cached = this.#algorithmSpecificValidators.get(algoData);
    if (cached !== undefined) {
      return cached;
    }
    const validatorClass = algoData.getValidatorClass();
    if (validatorClass === null) {
      return null;
    }
    try {
      // Java: validatorClass.getConstructor().newInstance()
      const validator = new (validatorClass as new () => IValidatingGraphElementVisitor)();
      this.#algorithmSpecificValidators.set(algoData, validator);
      return validator;
    } catch (ex) {
      throw new RuntimeException(INSTANTIATION_FAILURE_PREFIX + algoData.getId(), { cause: ex });
    }
  }

  getIssues(): GraphIssue[] {
    if (this.#algorithmSpecificValidators.size === 0) {
      return this.#issues;
    }
    const result: GraphIssue[] = [...this.#issues];
    for (const validator of this.#algorithmSpecificValidators.values()) {
      result.push(...validator.getIssues());
    }
    return result;
  }
}

/** Java `shape.eClass().getName()`. */
function shapeClassName(shape: ElkConnectableShape): string {
  return shape.eClass().getName();
}
