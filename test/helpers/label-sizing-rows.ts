// SPDX-License-Identifier: EPL-2.0
// The TS derivation of the label rows recorded by tools/vectors/LabelSizingVectors.java (see its header for the key format):
// key = <element path>#<index in getLabels()>, a label of a label = <parent label key>#<index>; an element path joins the
// identifiers from below the root with `/`, and an element without an identifier is `@<index in its containment list>`.
// Rows come in `eAllContents` order of the root, the recorder's order: labels, ports, children (each one's contents before
// its next sibling), then contained edges (the feature order of ElkNode in elkgraph.ecore). This is not the visiting order of
// `ensureSensibleLabelSize`, which does not matter for sizing.
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ensureSensibleLabelSize } from './layout-test-labels.js';
import type { TextMeasurer } from './layout-test-text-measurer.js';

const KEY_SEPARATOR = '#';
const PATH_SEPARATOR = '/';
const NO_ID_PREFIX = '@';

/** One label after sizing, as in `label-sizing.json`. */
export interface LabelRow {
  readonly key: string;
  readonly text: string | null;
  readonly size: readonly [number, number];
  readonly preset: boolean;
}

interface Pending {
  readonly key: string;
  readonly label: ElkLabel;
  readonly preset: boolean;
}

/** `ensureSensibleLabelSize` leaves a label alone when it already has a size or has no text. */
function isPreset(label: ElkLabel): boolean {
  const text = label.getText();
  return label.getWidth() !== 0 || label.getHeight() !== 0 || text === null || text === '';
}

function segmentOf(element: ElkGraphElement, index: number): string {
  const id = element.getIdentifier();
  return id !== null && id !== '' ? id : `${NO_ID_PREFIX}${String(index)}`;
}

function childPath(parent: string, element: ElkGraphElement, index: number): string {
  const segment = segmentOf(element, index);
  return parent === '' ? segment : `${parent}${PATH_SEPARATOR}${segment}`;
}

function collectLabels(element: ElkGraphElement, path: string, into: Pending[]): void {
  [...element.getLabels()].forEach((label, index) => {
    const key = `${path}${KEY_SEPARATOR}${String(index)}`;
    into.push({ key, label, preset: isPreset(label) });
    collectLabels(label, key, into);
  });
}

function collectNode(node: ElkNode, path: string, into: Pending[]): void {
  collectLabels(node, path, into);
  [...node.getPorts()].forEach((port, index) => {
    collectLabels(port, childPath(path, port, index), into);
  });
  [...node.getChildren()].forEach((child, index) => {
    collectNode(child, childPath(path, child, index), into);
  });
  [...node.getContainedEdges()].forEach((edge: ElkEdge, index) => {
    collectLabels(edge, childPath(path, edge, index), into);
  });
}

/**
 * Notes `preset` for every label under the graph, sizes them with `ensureSensibleLabelSize(graph, measurer)`, and returns one
 * row per label. The graph is sized in place.
 */
export function labelRows(graph: ElkNode, measurer: TextMeasurer): LabelRow[] {
  const pending: Pending[] = [];
  collectNode(graph, '', pending);
  ensureSensibleLabelSize(graph, measurer);
  return pending.map(({ key, label, preset }) => ({
    key,
    text: label.getText(),
    size: [label.getWidth(), label.getHeight()],
    preset,
  }));
}
