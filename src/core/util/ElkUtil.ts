// SPDX-License-Identifier: EPL-2.0
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import { isElkGraphElement } from '../../graph/ElkGraphElement.js';
import { isElkEdge } from '../../graph/ElkEdge.js';
import type { ElkEdge } from '../../graph/ElkEdge.js';
import { isElkLabel } from '../../graph/ElkLabel.js';
import { isNullOrEmpty } from '../../guava/Strings.js';
import type { StringBuilder } from '../../java/lang/StringBuilder.js';

const SPACE = 0x20;
const ROOT_PREFIX = 'Root ';
const CONTAINER_SEPARATOR = ' > ';
const CLASS_PREFIX = 'Elk';
const ITEM_SEPARATOR = ', ';

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
function printElementPath(element: ElkGraphElement, builder: StringBuilder): void {
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
 * The public statics of Java's `ElkUtil` ported so far (C2: mission 3 ports `printElementPath` only).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export const ElkUtil = { printElementPath } as const;
