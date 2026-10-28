// SPDX-License-Identifier: EPL-2.0
import { ElkMargin } from '../../../core/math/ElkMargin.js';
import { ElkPadding } from '../../../core/math/ElkPadding.js';
import type { GraphAdapters } from '../../../core/util/adapters/GraphAdapters.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { AbstractLShapeAdapter } from './LGraphAdaptersAbstractLShapeAdapter.js';
import { LLabelAdapter } from './LGraphAdaptersLLabelAdapter.js';
import { LPortAdapter } from './LGraphAdaptersLPortAdapter.js';
import { DEFAULT_PORTLIST_SORTER } from './LGraphAdaptersPortComparator.js';
import type { LNode } from './LNode.js';
import type { LPort } from './LPort.js';

/**
 * Adapter for {@link LNode}s.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraphAdapters.java
 */
export class LNodeAdapter extends AbstractLShapeAdapter<LNode> implements GraphAdapters.NodeAdapter<LNode> {
  /** The parent graph adapter that created this thing. */
  private parentGraphAdapter: GraphAdapters.GraphAdapter<unknown> | null = null;
  /** List of cached label adapters. */
  private labelAdapters: GraphAdapters.LabelAdapter<unknown>[] | null = null;
  /** List of cached port adapters. */
  private portAdapters: GraphAdapters.PortAdapter<unknown>[] | null = null;
  /**
   * Whether to simulate that edges are directly connected to north south ports instead of to north/south port
   * dummies.
   */
  private transparentNorthSouthEdges: boolean;

  /**
   * Creates a new adapter for the given node.
   *
   * @param parent the graph adapter that created us.
   * @param element the node to be adapted.
   * @param transparentNorthSouthEdges whether to simulate that edges are directly connected to north south ports
   *   instead of to north/south port dummies.
   */
  constructor(parent: GraphAdapters.GraphAdapter<unknown> | null, element: LNode, transparentNorthSouthEdges: boolean) {
    super(element);
    this.parentGraphAdapter = parent;
    this.transparentNorthSouthEdges = transparentNorthSouthEdges;
  }

  getGraph(): GraphAdapters.GraphAdapter<unknown> | null {
    return this.parentGraphAdapter;
  }

  getLabels(): Iterable<GraphAdapters.LabelAdapter<unknown>> {
    if (this.labelAdapters === null) {
      this.labelAdapters = [];
      for (const l of this.element.getLabels()) {
        this.labelAdapters.push(new LLabelAdapter(l));
      }
    }
    return this.labelAdapters;
  }

  getPorts(): Iterable<GraphAdapters.PortAdapter<unknown>> {
    if (this.portAdapters === null) {
      this.portAdapters = [];
      for (const p of this.element.getPorts()) {
        this.portAdapters.push(new LPortAdapter(p, this.transparentNorthSouthEdges));
      }
    }
    return this.portAdapters;
  }

  getIncomingEdges(): Iterable<GraphAdapters.EdgeAdapter<unknown>> {
    // we have no directly connected edges
    return [];
  }

  getOutgoingEdges(): Iterable<GraphAdapters.EdgeAdapter<unknown>> {
    // we have no directly connected edges
    return [];
  }

  /** Covers the Java overloads `sortPortList()` (default sorter) and `sortPortList(Comparator<?>)`. */
  sortPortList(comparator?: (a: never, b: never) => number): void {
    const effective = comparator ?? ((a: LPort, b: LPort): number => DEFAULT_PORTLIST_SORTER.compare(a, b));
    if (this.element.getProperty(LayeredOptions.PORT_CONSTRAINTS).isOrderFixed()) {
      // We need to sort the port list accordingly (Collections.sort: stable, in place)
      this.element.getPorts().sort(effective as (a: LPort, b: LPort) => number);
    }
  }

  isCompoundNode(): boolean {
    return this.element.getProperty(InternalProperties.COMPOUND_NODE);
  }

  getPadding(): ElkPadding {
    const lPadding = this.element.getPadding();
    return new ElkPadding(lPadding.getTop(), lPadding.getRight(), lPadding.getBottom(), lPadding.getLeft());
  }

  setPadding(padding: ElkPadding): void {
    this.element.getPadding().setLeft(padding.getLeft());
    this.element.getPadding().setTop(padding.getTop());
    this.element.getPadding().setRight(padding.getRight());
    this.element.getPadding().setBottom(padding.getBottom());
  }

  getMargin(): ElkMargin {
    const lmargins = this.element.getMargin();
    return new ElkMargin(lmargins.getTop(), lmargins.getRight(), lmargins.getBottom(), lmargins.getLeft());
  }

  setMargin(margin: ElkMargin): void {
    this.element.getMargin().setLeft(margin.getLeft());
    this.element.getMargin().setTop(margin.getTop());
    this.element.getMargin().setRight(margin.getRight());
    this.element.getMargin().setBottom(margin.getBottom());
  }
}
