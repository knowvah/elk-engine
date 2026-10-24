// SPDX-License-Identifier: EPL-2.0
/**
 * `ElkUtil` visitors, debugging and miscellaneous: `applyVisitors`, `applyVisitorsWithValidation`,
 * `printElementPath`, `debugFolderPath` and `createIdentifier` (M10 section module of `ElkUtil.ts`).
 * `printElementPath` lives here rather than in `ElkUtil.ts` so that `applyVisitorsWithValidation` can call it
 * without an import cycle. `toSafePathName` is inside `elkjs-exclude` (M2) and is not ported.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
import type { ElkEdge } from '../../graph/ElkEdge.js';
import { isElkEdge } from '../../graph/ElkEdge.js';
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import { isElkGraphElement } from '../../graph/ElkGraphElement.js';
import { isElkLabel } from '../../graph/ElkLabel.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { isNullOrEmpty } from '../../guava/Strings.js';
import { identityHashCode } from '../../java/lang/IdentityHashCode.js';
import type { StringBuilder } from '../../java/lang/StringBuilder.js';
import { StringBuilder as StringBuilderImpl } from '../../java/lang/StringBuilder.js';
import type { GraphIssue } from '../validation/GraphIssue.js';
import { Severity } from '../validation/GraphIssue.js';
import { GraphValidationException } from '../validation/GraphValidationException.js';
import type { IValidatingGraphElementVisitor } from '../validation/IValidatingGraphElementVisitor.js';
import type { IGraphElementVisitor } from './IGraphElementVisitor.js';

const SPACE = 0x20;
const ROOT_PREFIX = 'Root ';
const CONTAINER_SEPARATOR = ' > ';
const CLASS_PREFIX = 'Elk';
const ITEM_SEPARATOR = ', ';
const ISSUE_SEPARATOR = '\n';
const ISSUE_ELEMENT_INTRO = '\n\tat ';
const SEVERITY_SEPARATOR = ': ';

/** Java's `visitors[i] instanceof IValidatingGraphElementVisitor`: interfaces have no run-time identity. */
function isValidatingVisitor(visitor: IGraphElementVisitor): visitor is IValidatingGraphElementVisitor {
  return typeof (visitor as Partial<IValidatingGraphElementVisitor>).getIssues === 'function';
}

/**
 * Apply the given graph element visitors to the content of the given graph. If validators are involved they are
 * not queried about errors.
 *
 * @param graph the graph the visitors shall be applied to.
 * @param visitors the visitors to apply.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function applyVisitors(graph: ElkNode, ...visitors: IGraphElementVisitor[]): void {
  const allElements = ElkGraphUtil.propertiesSkippingIteratorFor(graph, true);
  for (const nextElement of allElements) {
    if (isElkGraphElement(nextElement)) {
      for (const visitor of visitors) {
        visitor.visit(nextElement);
      }
    }
  }
}

/** Appends the severity, message and element path of every issue, separated by line breaks. */
function buildIssueMessage(allIssues: readonly GraphIssue[]): string {
  const message = new StringBuilderImpl();
  let first = true;
  for (const issue of allIssues) {
    if (!first) {
      message.append(ISSUE_SEPARATOR);
    }
    first = false;
    message
      .appendObject(issue.getSeverity())
      .append(SEVERITY_SEPARATOR)
      .append(issue.getMessage())
      .append(ISSUE_ELEMENT_INTRO);
    printElementPath(issue.getElement() as ElkGraphElement, message);
  }
  return message.toString();
}

/**
 * Apply the given graph element visitors to the content of the given graph. If validators are involved and at
 * least one error is found, a {@link GraphValidationException} is thrown.
 *
 * @param graph the graph the visitors shall be applied to.
 * @param visitors the visitors to apply.
 * @throws GraphValidationException if an error is found while validating the graph
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function applyVisitorsWithValidation(graph: ElkNode, ...visitors: IGraphElementVisitor[]): void {
  applyVisitors(graph, ...visitors);

  // Gather validator results and generate an error message
  const allIssues: GraphIssue[] = [];
  for (const visitor of visitors) {
    if (isValidatingVisitor(visitor)) {
      allIssues.push(...visitor.getIssues());
    }
  }

  // TODO print warnings to log if there are no errors
  if (allIssues.some((issue) => issue.getSeverity() === Severity.ERROR)) {
    throw new GraphValidationException(buildIssueMessage(allIssues), allIssues);
  }
}

/** Appends `' ' + text` when the text is non-empty and reports whether it did. */
function appendText(text: string | null, builder: StringBuilder): boolean {
  if (text === null || isNullOrEmpty(text)) {
    return false;
  }
  builder.appendChar(SPACE).append(text);
  return true;
}

/** Appends the identifier, the element's own label text, or the first non-empty label text. */
function appendNaming(element: ElkGraphElement, builder: StringBuilder): boolean {
  if (appendText(element.getIdentifier(), builder)) {
    return true;
  }
  if (isElkLabel(element) && appendText(element.getText(), builder)) {
    return true;
  }
  for (const label of element.getLabels()) {
    if (appendText(label.getText(), builder)) {
      return true;
    }
  }
  return false;
}

/** Appends the paths of the shapes, separated by commas. */
function appendPaths(shapes: Iterable<ElkGraphElement>, builder: StringBuilder): void {
  let first = true;
  for (const shape of shapes) {
    if (!first) {
      builder.append(ITEM_SEPARATOR);
    }
    first = false;
    printElementPath(shape, builder);
  }
}

/** Appends the ` (sources -> targets)` form of a connected edge. */
function appendEdgeEnds(edge: ElkEdge, builder: StringBuilder): void {
  if (edge.isConnected()) {
    builder.append(' (');
    appendPaths(edge.getSources(), builder);
    builder.append(' -> ');
    appendPaths(edge.getTargets(), builder);
    builder.append(')');
  }
}

/**
 * Print information on the given graph element to the given string builder.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function printElementPath(element: ElkGraphElement, builder: StringBuilder): void {
  // Print the containing element
  const container = element.eContainer();
  if (isElkGraphElement(container)) {
    printElementPath(container, builder);
    builder.append(CONTAINER_SEPARATOR);
  } else {
    builder.append(ROOT_PREFIX);
  }

  // Print the class name
  const className = element.eClass().getName();
  builder.append(className.startsWith(CLASS_PREFIX) ? className.substring(CLASS_PREFIX.length) : className);

  // Print the identifier or label if present; otherwise, for an edge, source and target
  if (!appendNaming(element, builder) && isElkEdge(element)) {
    appendEdgeEnds(element, builder);
  }
}

/**
 * Returns a path where debug files can be stored. In Java the body is inside `elkjs-exclude` (it reads
 * `user.home`), so, as in elkjs, the browser-safe port returns `null` ("the user's home folder is not defined")
 * for any `subfolders` (M2).
 *
 * @param _subfolders optional subfolder names; unused
 * @returns always `null`
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function debugFolderPath(..._subfolders: string[]): string | null {
  return null;
}

/**
 * Create a unique identifier for the given graph element. Note that this identifier is not necessarily
 * universally unique, since it uses the hash code, which usually covers only the range of heap space addresses.
 * Java's `hashCode()` of an EMF object is its identity hash.
 *
 * @param element a graph element
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function createIdentifier(element: ElkGraphElement): void {
  element.setIdentifier(String(identityHashCode(element)));
}
