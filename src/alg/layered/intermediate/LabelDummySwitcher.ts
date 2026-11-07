// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { add as int32Add, sub as int32Sub } from '../../../java/lang/Int32.js';
import { Property } from '../../../graph/properties/Property.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { CenterEdgeLabelPlacementStrategy } from '../options/CenterEdgeLabelPlacementStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LabelDummySwitcherLabelDummyInfo } from './LabelDummySwitcherLabelDummyInfo.js';
import { computeSpaceEfficientAssignment } from './LabelDummySwitcherSpaceEfficient.js';
import { firstOf } from './LabelDummySwitcherSupport.js';
import { swapNodes } from './LabelDummySwitcherSwapping.js';
import {
  findCenterLayerTargetId,
  findEndLayerTargetId,
  findMedianLayerTargetId,
  findWidestLayerTargetId,
  setEndLayerNodeAlignment,
} from './LabelDummySwitcherTargets.js';

type InfosByStrategy = Map<CenterEdgeLabelPlacementStrategy, LabelDummySwitcherLabelDummyInfo[]>;

/**
 * Processor that tries to move label dummy nodes into an "optimal" layer their long edges crosses. This is done by
 * switching the order of long edge dummies and label dummies. There are different `CenterEdgeLabelPlacementStrategy`
 * strategies available to determine the target layer. The long edge dummies preceding a label dummy get their
 * `LONG_EDGE_BEFORE_LABEL_DUMMY` property set so that hyperedge dummy merging cannot confuse the edge labels.
 *
 * Section files hold the target finders, the space-efficient assignment and the node swap
 * (`LabelDummySwitcher{Targets,SpaceEfficient,Swapping}.ts`); the nested `LabelDummyInfo` is
 * `LabelDummySwitcherLabelDummyInfo`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LabelDummySwitcher.java
 */
export class LabelDummySwitcher implements ILayoutProcessor<LGraph> {
  /** A property to communicate with the analyses that can be run on a graph. */
  static readonly INCLUDE_LABEL: IProperty<boolean> = new Property<boolean>(
    'edgelabelcenterednessanalysis.includelabel',
    false,
  );

  /** Width of each layer (Java: `null` outside `process`; here empty, nothing reads it there). */
  private layerWidths: number[] = [];

  /** @see LabelDummySwitcher.java:99 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Label dummy switching', 1);

    // The default placement strategy to be assumed if no more specific strategy is
    const defaultPlacementStrategy = layeredGraph.getProperty(
      LayeredOptions.EDGE_LABELS_CENTER_LABEL_PLACEMENT_STRATEGY,
    );

    // Assign layer IDs
    this.assignIdsToLayers(layeredGraph);

    // Collect label dummy infos by placement strategy
    const labelDummyInfos = this.gatherLabelDummyInfos(layeredGraph, defaultPlacementStrategy);

    // If at least one width-based strategy is active, calculate layers widths. After this point, layer widths are
    // either all zero or equal to each layer's widest non-dummy node
    this.layerWidths = new Array<number>(layeredGraph.getLayers().length).fill(0);

    for (const strategy of CenterEdgeLabelPlacementStrategy.values()) {
      if (strategy.usesLabelSizeInformation() && labelDummyInfos.get(strategy)!.length !== 0) {
        // We have found an active width-based strategy
        this.calculateLayerWidths(layeredGraph);
        break;
      }
    }

    // Work through the non-width-based strategies first. They might change the width of layers, which might
    // influence size-based strategies later on
    for (const strategy of CenterEdgeLabelPlacementStrategy.values()) {
      if (!strategy.usesLabelSizeInformation()) {
        this.processStrategy(labelDummyInfos.get(strategy)!);
      }
    }

    // Now execute size-based strategies
    for (const strategy of CenterEdgeLabelPlacementStrategy.values()) {
      if (strategy.usesLabelSizeInformation()) {
        this.processStrategy(labelDummyInfos.get(strategy)!);
      }
    }

    // Reset data
    this.layerWidths = [];

    monitor.done();
  }

  /**
   * Goes through the graph's layers and assigns zero-based IDs.
   *
   * @see LabelDummySwitcher.java:149
   */
  private assignIdsToLayers(layeredGraph: LGraph): void {
    let layerIndex = 0;
    for (const layer of layeredGraph) {
      layer.id = layerIndex;
      layerIndex++;
    }
  }

  /**
   * Gathers the graph's label dummies, turns them into `LabelDummyInfo` objects, and returns them by placement
   * strategy. The Java `EnumMap` (AD-10: ordinal-ordered, nothing hashed) is a `Map` filled in ordinal order.
   *
   * @see LabelDummySwitcher.java:161
   */
  private gatherLabelDummyInfos(
    layeredGraph: LGraph,
    defaultPlacementStrategy: CenterEdgeLabelPlacementStrategy,
  ): InfosByStrategy {
    // Initialize the map with empty lists
    const infos: InfosByStrategy = new Map();

    for (const strategy of CenterEdgeLabelPlacementStrategy.values()) {
      infos.set(strategy, []);
    }

    // From the graph's nodes, filter out the label dummies and add them to the appropriate lists
    for (const layer of layeredGraph.getLayers()) {
      for (const node of layer.getNodes()) {
        if (node.getType() === NodeType.LABEL) {
          const dummyInfo = new LabelDummySwitcherLabelDummyInfo(node, defaultPlacementStrategy);
          infos.get(dummyInfo.placementStrategy!)!.push(dummyInfo);
        }
      }
    }

    return infos;
  }

  /**
   * Fills the layer widths array, indexed by layer ID which was assigned to the layers previously (Java asserts the
   * array length, line 186; omitted).
   *
   * @see LabelDummySwitcher.java:185
   */
  private calculateLayerWidths(layeredGraph: LGraph): void {
    for (const layer of layeredGraph.getLayers()) {
      this.layerWidths[layer.id] = LGraphUtil.findMaxNonDummyNodeWidth(layer, false);
    }
  }

  /**
   * Executes label dummy switching on the given list of label dummy infos. For most strategies, this method simply
   * invokes the strategy on each label dummy. However, if a strategy places all dummies at once, this method
   * completely delegates to that strategy's implementation.
   *
   * @see LabelDummySwitcher.java:198
   */
  private processStrategy(labelDummyInfos: LabelDummySwitcherLabelDummyInfo[]): void {
    // There might not be anything to do for this strategy
    if (labelDummyInfos.length === 0) {
      return;
    }

    // Check if the strategy has a special processing method
    if (labelDummyInfos[0]!.placementStrategy === CenterEdgeLabelPlacementStrategy.SPACE_EFFICIENT_LAYER) {
      computeSpaceEfficientAssignment(labelDummyInfos, this.layerWidths, (info, layer) =>
        this.assignLayer(info, layer),
      );
    } else {
      // Execute the strategy for each label dummy
      for (const labelDummyInfo of labelDummyInfos) {
        this.assignByStrategy(labelDummyInfo);

        this.updateLongEdgeSourceLabelDummyInfo(labelDummyInfo);
      }
    }
  }

  /**
   * The Java `switch` over the placement strategy inside `processStrategy` (`:215-241`); split out for the complexity
   * limit.
   */
  private assignByStrategy(labelDummyInfo: LabelDummySwitcherLabelDummyInfo): void {
    switch (labelDummyInfo.placementStrategy) {
      case CenterEdgeLabelPlacementStrategy.CENTER_LAYER:
        this.assignLayer(labelDummyInfo, findCenterLayerTargetId(labelDummyInfo, this.layerWidths));
        break;

      case CenterEdgeLabelPlacementStrategy.MEDIAN_LAYER:
        this.assignLayer(labelDummyInfo, findMedianLayerTargetId(labelDummyInfo));
        break;

      case CenterEdgeLabelPlacementStrategy.WIDEST_LAYER:
        this.assignLayer(labelDummyInfo, findWidestLayerTargetId(labelDummyInfo, this.layerWidths));
        break;

      case CenterEdgeLabelPlacementStrategy.HEAD_LAYER:
        setEndLayerNodeAlignment(labelDummyInfo);
        this.assignLayer(labelDummyInfo, findEndLayerTargetId(labelDummyInfo, true));
        break;

      case CenterEdgeLabelPlacementStrategy.TAIL_LAYER:
        setEndLayerNodeAlignment(labelDummyInfo);
        this.assignLayer(labelDummyInfo, findEndLayerTargetId(labelDummyInfo, false));
        break;
    }
  }

  /**
   * Assigns the given label dummy to the layer with the given index. Updates the layer size if the label enlarges the
   * layer (Java asserts the target index, line 520; omitted).
   *
   * @see LabelDummySwitcher.java:518
   */
  private assignLayer(labelDummyInfo: LabelDummySwitcherLabelDummyInfo, targetLayerIndex: number): void {
    // If the label dummy is not in the target layer yet, swap it with the long edge dummy that is
    if (targetLayerIndex !== int32Add(labelDummyInfo.leftmostLayerId, labelDummyInfo.leftLongEdgeDummies.length)) {
      swapNodes(
        labelDummyInfo.labelDummy,
        labelDummyInfo.ithDummyNode(int32Sub(targetLayerIndex, labelDummyInfo.leftmostLayerId)),
      );
    }

    // Update the size information of the label dummy's new layer
    const newLayerId = labelDummyInfo.labelDummy.getLayer()!.id;
    this.layerWidths[newLayerId] = Math.max(this.layerWidths[newLayerId]!, labelDummyInfo.labelDummy.getSize().x);

    for (const label of labelDummyInfo.labelDummy.getProperty(InternalProperties.REPRESENTED_LABELS)) {
      label.setProperty(LabelDummySwitcher.INCLUDE_LABEL, true);
    }
  }

  /**
   * Updates the `LONG_EDGE_BEFORE_LABEL_DUMMY` property of long edge dummy nodes preceding the given label dummy node.
   *
   * @see LabelDummySwitcher.java:603
   */
  private updateLongEdgeSourceLabelDummyInfo(labelDummyInfo: LabelDummySwitcherLabelDummyInfo): void {
    // Predecessors
    this.doUpdateLongEdgeLabelDummyInfo(
      labelDummyInfo.labelDummy,
      (node) => firstOf(node.getIncomingEdges()).getSource()!.getNode()!,
      true,
    );

    // We may want to do things to the successors as well at some point
  }

  /**
   * Does the actual work of setting the long edge source or target of all nodes before or after the given label dummy
   * node to `null`.
   *
   * @param labelDummy the label dummy node to start from.
   * @param nextElement a function that, given a node, returns the node to process next.
   * @param value the new property value.
   * @see LabelDummySwitcher.java:623
   */
  private doUpdateLongEdgeLabelDummyInfo(labelDummy: LNode, nextElement: (node: LNode) => LNode, value: boolean): void {
    let longEdgeDummy = nextElement(labelDummy);
    while (longEdgeDummy.getType() === NodeType.LONG_EDGE) {
      longEdgeDummy.setProperty(InternalProperties.LONG_EDGE_BEFORE_LABEL_DUMMY, value);
      longEdgeDummy = nextElement(longEdgeDummy);
    }
  }
}
