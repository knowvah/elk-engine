// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it, vi } from 'vitest';
import type { EClass } from '../../emf/ecore/EClass.js';
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { StringBuilder } from '../../java/lang/StringBuilder.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { KVector } from '../math/KVector.js';
import { ContentAlignment } from '../options/ContentAlignment.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { ElkUtil } from './ElkUtil.js';

function path(element: ElkGraphElement): string {
  const builder = new StringBuilder();
  ElkUtil.printElementPath(element, builder);
  return builder.toString();
}

describe('ElkUtil.printElementPath', () => {
  it('prints the container chain with class names stripped of the Elk prefix', () => {
    const root = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(root);
    n1.setIdentifier('n1');
    const p1 = ElkGraphUtil.createPort(n1);
    p1.setIdentifier('p1');
    expect(path(p1)).toBe('Root Node > Node n1 > Port p1');
  });

  it('prints the first non-empty label text when there is no identifier', () => {
    const root = ElkGraphUtil.createGraph();
    const node = ElkGraphUtil.createNode(root);
    ElkGraphUtil.createLabelWithText('', node);
    ElkGraphUtil.createLabelWithText('B', node);
    ElkGraphUtil.createLabelWithText('C', node);
    expect(path(node)).toBe('Root Node > Node B');
  });

  it('skips labels without any non-empty text and ends the path at the class name', () => {
    const root = ElkGraphUtil.createGraph();
    const node = ElkGraphUtil.createNode(root);
    ElkGraphUtil.createLabelWithText(null, node);
    ElkGraphUtil.createLabelWithText('', node);
    expect(path(node)).toBe('Root Node > Node');
  });

  it('prints the text of a label element', () => {
    const root = ElkGraphUtil.createGraph();
    root.setIdentifier('r');
    const label = ElkGraphUtil.createLabelWithText('T', root);
    expect(path(label)).toBe('Root Node r > Label T');
  });

  it('prefers the identifier over the label text', () => {
    const root = ElkGraphUtil.createGraph();
    root.setIdentifier('r');
    const label = ElkGraphUtil.createLabelWithText('T', root);
    label.setIdentifier('id');
    expect(path(label)).toBe('Root Node r > Label id');
  });

  it('falls through to the labels of an unnamed label element without text', () => {
    const root = ElkGraphUtil.createGraph();
    root.setIdentifier('r');
    const label = ElkGraphUtil.createLabelWithText(null, root);
    ElkGraphUtil.createLabelWithText('inner', label);
    expect(path(label)).toBe('Root Node r > Label inner');
  });

  it('prints sources and targets of a connected edge without identifier or labels', () => {
    const root = ElkGraphUtil.createGraph();
    const a = ElkGraphUtil.createNode(root);
    a.setIdentifier('a');
    const b = ElkGraphUtil.createNode(root);
    b.setIdentifier('b');
    const c = ElkGraphUtil.createNode(root);
    c.setIdentifier('c');
    const edge = ElkGraphUtil.createHyperedge([a, b], [c]);
    expect(path(edge)).toBe('Root Node > Edge (Root Node > Node a, Root Node > Node b -> Root Node > Node c)');
  });

  it('prints an unconnected edge as the bare class name', () => {
    const root = ElkGraphUtil.createGraph();
    const edge = ElkGraphUtil.createEdge(root);
    expect(path(edge)).toBe('Root Node > Edge');
  });

  it('prints an edge identifier instead of its ends', () => {
    const root = ElkGraphUtil.createGraph();
    const a = ElkGraphUtil.createNode(root);
    const edge = ElkGraphUtil.createSimpleEdge(a, a);
    edge.setIdentifier('e');
    expect(path(edge)).toBe('Root Node > Edge e');
  });

  it('prints the bare root', () => {
    expect(path(ElkGraphUtil.createGraph())).toBe('Root Node');
  });

  it('keeps a class name without the Elk prefix whole', () => {
    const node = ElkGraphUtil.createGraph();
    vi.spyOn(node, 'eClass').mockReturnValue({ getName: (): string => 'Custom' } as unknown as EClass);
    expect(path(node)).toBe('Root Custom');
  });
});

// Port of ElkUtilTest.java (frozen assertions); `assertEquals(expected, actual, delta)` is JUnit's.
function assertEquals(expected: number, actual: number, delta: number): void {
  expect(Math.abs(expected - actual)).toBeLessThanOrEqual(delta);
}

/**
 * Creates a graph with one node with inner behavior.
 *
 * @returns The graph with one node with dimension (100, 100) and inner behavior of dimension (80, 80)
 */
function createContentAlignmentTestGraph(contentAlignment: EnumSet<ContentAlignment> | null): ElkNode {
  const parent = ElkGraphUtil.createGraph();
  const node = ElkGraphUtil.createNode(parent);
  node.setProperty(CoreOptions.CONTENT_ALIGNMENT, contentAlignment);
  const innerBehavior = ElkGraphUtil.createNode(node);
  node.setDimensions(100, 100);
  innerBehavior.setDimensions(80, 80);
  return parent;
}

/** One block of `translateWithContentAlignmentTest`: translate by (120,120) from (100,100), check the inner node. */
function checkAlignment(alignment: EnumSet<ContentAlignment> | null, expectedX: number, expectedY: number): void {
  const parent = createContentAlignmentTestGraph(alignment);
  const node = parent.getChildren().get(0);
  const innerBehavior = node.getChildren().get(0);
  ElkUtil.translate(parent.getChildren().get(0), new KVector(120, 120), new KVector(100, 100));
  assertEquals(expectedX, innerBehavior.getX(), 1);
  assertEquals(expectedY, innerBehavior.getY(), 1);
}

describe('ElkUtilTest', () => {
  it('translateWithContentAlignmentTest', () => {
    // Imagine a graph with one node that has inner behavior.
    // If this node is resized, the contents of said node should be alignment
    // based on the ContentAlignment specific by the parent of the node.
    checkAlignment(null, 0, 0); // Test no alignment set
    checkAlignment(ContentAlignment.topLeft(), 0, 0); // Test top left
    checkAlignment(ContentAlignment.topCenter(), 10, 0); // Test top center
    checkAlignment(EnumSet.of(ContentAlignment.V_TOP, ContentAlignment.H_RIGHT), 20, 0); // Test top right
    checkAlignment(EnumSet.of(ContentAlignment.V_CENTER, ContentAlignment.H_LEFT), 0, 10); // Test center left
    checkAlignment(ContentAlignment.centerCenter(), 10, 10); // Test center center
    checkAlignment(EnumSet.of(ContentAlignment.V_CENTER, ContentAlignment.H_RIGHT), 20, 10); // Test center right
    checkAlignment(EnumSet.of(ContentAlignment.V_BOTTOM, ContentAlignment.H_LEFT), 0, 20); // Test bottom left
    checkAlignment(EnumSet.of(ContentAlignment.V_BOTTOM, ContentAlignment.H_CENTER), 10, 20); // Test bottom center
    checkAlignment(ContentAlignment.bottomRight(), 20, 20); // Test bottom right
  });
});
