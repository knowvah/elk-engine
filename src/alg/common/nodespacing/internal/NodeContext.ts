// SPDX-License-Identifier: EPL-2.0
import { ElkMargin } from '../../../../core/math/ElkMargin.js';
import { ElkPadding } from '../../../../core/math/ElkPadding.js';
import { KVector } from '../../../../core/math/KVector.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import { NodeLabelPlacement } from '../../../../core/options/NodeLabelPlacement.js';
import type { PortAlignment } from '../../../../core/options/PortAlignment.js';
import type { PortConstraints } from '../../../../core/options/PortConstraints.js';
import { PortLabelPlacement } from '../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import type { SizeConstraint } from '../../../../core/options/SizeConstraint.js';
import { SizeOptions } from '../../../../core/options/SizeOptions.js';
import { UnsupportedConfigurationException } from '../../../../core/UnsupportedConfigurationException.js';
import { IndividualSpacings } from '../../../../core/util/IndividualSpacings.js';
import type { GraphAdapters } from '../../../../core/util/adapters/GraphAdapters.js';
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import type { EnumSet } from '../../../../java/util/EnumSet.js';
import { EnumMap, newEnumMap } from '../../../../guava/Maps.js';
import type { Multimap } from '../../../../guava/Multimap.js';
import { TreeMultimap } from '../../../../guava/TreeMultimap.js';
import type { AtomicCell } from '../cellsystem/AtomicCell.js';
import { ContainerArea } from '../cellsystem/ContainerArea.js';
import type { GridContainerCell } from '../cellsystem/GridContainerCell.js';
import type { LabelCell } from '../cellsystem/LabelCell.js';
import { StripContainerCell } from '../cellsystem/StripContainerCell.js';
import { StripContainerCellStrip } from '../cellsystem/StripContainerCellStrip.js';
import type { NodeLabelLocation } from './NodeLabelLocation.js';
// NodeContext and PortContext refer to each other; both only need the other as a type (Q3), so the cycle is
// erased at runtime.
import type { PortContext } from './PortContext.js';

/**
 * Java's auto-unboxing of `IndividualSpacings.getIndividualOrInherited` for an adapter, which falls back to the
 * property's default value, so the result is never null for the spacing properties read here.
 */
function spacing<T>(node: GraphAdapters.NodeAdapter<unknown>, property: IProperty<T>): T {
  return IndividualSpacings.getIndividualOrInherited(node, property) as T;
}

/**
 * Data holder class to be passed around to avoid having too much state in the size calculation classes. Some of the
 * most relevant settings are copied into variables for convenience. The node's size is stored in a separate variable
 * in this context, to be used by the algorithm. Once the algorithm has finished it can apply the calculated size to
 * the node by calling {@link applyNodeSize}.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/NodeContext.java
 */
export class NodeContext {
  /** The node we calculate stuff for. */
  readonly node: GraphAdapters.NodeAdapter<unknown>;
  /** The node's size. This will be used during the algorithm, to be applied (or not) once it is finished. */
  readonly nodeSize: KVector;
  /** Whether this node has stuff inside it or not. */
  readonly treatAsCompoundNode: boolean;
  /** The node's size constraints. */
  readonly sizeConstraints: EnumSet<SizeConstraint>;
  /** The node's size options. */
  readonly sizeOptions: EnumSet<SizeOptions>;
  /** Port constraints set on the node. */
  readonly portConstraints: PortConstraints;
  /** Whether port labels are placed inside or outside. */
  readonly portLabelsPlacement: EnumSet<PortLabelPlacement>;
  /** Whether to treat port labels as a group when centering them next to eastern or western ports. */
  readonly portLabelsTreatAsGroup: boolean;
  /** Where node labels are placed by default. */
  readonly nodeLabelPlacement: EnumSet<NodeLabelPlacement>;
  /** Space to leave around the node label area. */
  readonly nodeLabelsPadding: ElkPadding;
  /** Space between a node and its outside labels. */
  readonly nodeLabelSpacing: number;
  /** Space between two labels. */
  readonly labelLabelSpacing: number;
  /** Space between two different label cells. */
  readonly labelCellSpacing: number;
  /** Space between a port and another port. */
  readonly portPortSpacing: number;
  /** Horizontal space between a port and its labels. */
  readonly portLabelSpacingHorizontal: number;
  /** Vertical space between a port and its labels. */
  readonly portLabelSpacingVertical: number;
  /** Margin to leave around the set of ports on each side. */
  readonly surroundingPortMargins: ElkMargin;
  /** Whether node is being laid out in top-down layout mode. */
  readonly topdownLayout: boolean;

  /** Context objects that hold more information about each port. Sorted left-to-right / top-to-bottom. */
  readonly portContexts: Multimap<PortSide, PortContext> = TreeMultimap.create(
    NodeContext.comparePortSides,
    NodeContext.comparePortContexts,
  );

  /** The main cell that holds all the cells that make up the node. */
  readonly nodeContainer: StripContainerCell;
  /** The main cell's middle row, which will contain further cells. */
  readonly nodeContainerMiddleRow: StripContainerCell;
  /**
   * The grid container that represents the node's area reserved for inside node labels (and the client area). Null
   * in Java until the algorithm sets it up; every reader runs after that, so it is declared non-null here.
   */
  insideNodeLabelContainer!: GridContainerCell;
  /**
   * All cells that will describe the space required for ports and for inside port labels. The paddings on these
   * things not only describe the space to be left between ports and their inside labels, but also the space to be
   * left between ports and the node border (the additional port spacing). These paddings will be updated as we
   * calculate more information over the course of the algorithm.
   */
  readonly insidePortLabelCells: EnumMap<PortSide, AtomicCell> = newEnumMap();
  /** All container cells that will hold label cells for outside node labels. */
  readonly outsideNodeLabelContainers: EnumMap<PortSide, StripContainerCell> = newEnumMap();
  /** All of the label cells created for possible node labels, both inside and outside. */
  readonly nodeLabelCells: EnumMap<NodeLabelLocation, LabelCell> = newEnumMap();

  /**
   * Creates a new context object for the given node, fully initialized with the node's settings.
   *
   * @param _parentGraph the node's parent graph (unused in Java too).
   * @param node the node to create the context for.
   */
  constructor(_parentGraph: GraphAdapters.GraphAdapter<unknown>, node: GraphAdapters.NodeAdapter<unknown>) {
    this.node = node;
    this.nodeSize = new KVector(node.getSize());

    // Top-down layout
    this.topdownLayout = node.getProperty(CoreOptions.TOPDOWN_LAYOUT);

    // Compound node
    this.treatAsCompoundNode = node.isCompoundNode() || node.getProperty(CoreOptions.INSIDE_SELF_LOOPS_ACTIVATE);

    // Core size settings
    this.sizeConstraints = node.getProperty(CoreOptions.NODE_SIZE_CONSTRAINTS);
    this.sizeOptions = node.getProperty(CoreOptions.NODE_SIZE_OPTIONS);
    this.portConstraints = node.getProperty(CoreOptions.PORT_CONSTRAINTS);
    this.portLabelsPlacement = node.getProperty(CoreOptions.PORT_LABELS_PLACEMENT);
    if (!PortLabelPlacement.isValid(this.portLabelsPlacement)) {
      throw new UnsupportedConfigurationException('Invalid port label placement: ' + this.portLabelsPlacement);
    }

    this.portLabelsTreatAsGroup = node.getProperty(CoreOptions.PORT_LABELS_TREAT_AS_GROUP);
    this.nodeLabelPlacement = node.getProperty(CoreOptions.NODE_LABELS_PLACEMENT);
    if (!NodeLabelPlacement.isValid(this.nodeLabelPlacement)) {
      throw new UnsupportedConfigurationException('Invalid node label placement: ' + this.nodeLabelPlacement);
    }

    // Copy spacings for convenience
    this.nodeLabelsPadding = spacing(node, CoreOptions.NODE_LABELS_PADDING);
    this.nodeLabelSpacing = spacing(node, CoreOptions.SPACING_LABEL_NODE);
    this.labelLabelSpacing = spacing(node, CoreOptions.SPACING_LABEL_LABEL);
    this.portPortSpacing = spacing(node, CoreOptions.SPACING_PORT_PORT);
    this.portLabelSpacingHorizontal = spacing(node, CoreOptions.SPACING_LABEL_PORT_HORIZONTAL);
    this.portLabelSpacingVertical = spacing(node, CoreOptions.SPACING_LABEL_PORT_VERTICAL);
    this.surroundingPortMargins = spacing(node, CoreOptions.SPACING_PORTS_SURROUNDING);

    this.labelCellSpacing = 2 * this.labelLabelSpacing;

    // Create main cells (the others will be created later)
    const symmetry = !this.sizeOptions.contains(SizeOptions.ASYMMETRICAL);
    this.nodeContainer = new StripContainerCell(StripContainerCellStrip.VERTICAL, symmetry, 0);

    this.nodeContainerMiddleRow = new StripContainerCell(StripContainerCellStrip.HORIZONTAL, symmetry, 0);
    this.nodeContainer.setCell(ContainerArea.CENTER, this.nodeContainerMiddleRow);
  }

  /**
   * Applies the node size stored in this context to the actual node.
   */
  applyNodeSize(): void {
    this.node.setSize(this.nodeSize);
  }

  /**
   * Returns the port alignment that applies to the given side of the node.
   *
   * @param portSide the side.
   * @returns the side's port alignment.
   */
  getPortAlignment(portSide: PortSide): PortAlignment {
    let alignment: PortAlignment | null = null;

    switch (portSide) {
      case PortSide.NORTH:
        if (this.node.hasProperty(CoreOptions.PORT_ALIGNMENT_NORTH)) {
          alignment = this.node.getProperty(CoreOptions.PORT_ALIGNMENT_NORTH);
        }
        break;

      case PortSide.SOUTH:
        if (this.node.hasProperty(CoreOptions.PORT_ALIGNMENT_SOUTH)) {
          alignment = this.node.getProperty(CoreOptions.PORT_ALIGNMENT_SOUTH);
        }
        break;

      case PortSide.EAST:
        if (this.node.hasProperty(CoreOptions.PORT_ALIGNMENT_EAST)) {
          alignment = this.node.getProperty(CoreOptions.PORT_ALIGNMENT_EAST);
        }
        break;

      case PortSide.WEST:
        if (this.node.hasProperty(CoreOptions.PORT_ALIGNMENT_WEST)) {
          alignment = this.node.getProperty(CoreOptions.PORT_ALIGNMENT_WEST);
        }
        break;
    }

    // Fall back to basic port alignment if we haven't found a more specific one yet
    if (alignment === null) {
      alignment = this.node.getProperty(CoreOptions.PORT_ALIGNMENT_DEFAULT);
    }

    return alignment;
  }

  /**
   * Comparator for two port sides.
   */
  static comparePortSides(portSide1: PortSide, portSide2: PortSide): number {
    return Math.sign(portSide1.ordinal() - portSide2.ordinal());
  }

  /**
   * Comparator for two port contexts.
   */
  static comparePortContexts(portContext1: PortContext, portContext2: PortContext): number {
    const portSideComparison = NodeContext.comparePortSides(portContext1.port.getSide(), portContext2.port.getSide());
    if (portSideComparison !== 0) {
      return portSideComparison;
    }

    // Two ports on the same side. Depending on the side, we need an ascending or a descending comparison, because
    // ports are numbered in a clockwise manner, but we want them to be sorted left-to-right / top-to-bottom
    switch (portContext1.port.getSide()) {
      case PortSide.NORTH:
      case PortSide.EAST:
        return Math.sign(portContext1.port.getVolatileId() - portContext2.port.getVolatileId());

      case PortSide.SOUTH:
      case PortSide.WEST:
        return Math.sign(portContext2.port.getVolatileId() - portContext1.port.getVolatileId());

      default:
      // This should never happen since we have already checked whether a port has an undefined side in the
      // constructor of this class
      // NodeContext.java:277 `assert false` stays a comment (NS5).
    }

    return 0;
  }
}
