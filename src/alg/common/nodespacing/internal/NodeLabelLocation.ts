// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { NodeLabelPlacement } from '../../../../core/options/NodeLabelPlacement.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { ContainerArea } from '../cellsystem/ContainerArea.js';
import { HorizontalLabelAlignment } from '../cellsystem/HorizontalLabelAlignment.js';
import { VerticalLabelAlignment } from '../cellsystem/VerticalLabelAlignment.js';

const { INSIDE, OUTSIDE, H_LEFT, H_CENTER, H_RIGHT, V_TOP, V_CENTER, V_BOTTOM, H_PRIORITY } = NodeLabelPlacement;

/**
 * The alignments and container cell position of a location: the four leading constructor arguments of the Java enum
 * constructor, grouped to respect the five parameter limit (the Java constructor has four leading arguments plus a
 * varargs list).
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/NodeLabelLocation.java
 */
class LocationLayout {
  constructor(
    readonly horizontalAlignment: HorizontalLabelAlignment | null,
    readonly verticalAlignment: VerticalLabelAlignment | null,
    readonly containerRow: ContainerArea | null,
    readonly containerColumn: ContainerArea | null,
  ) {}
}

/**
 * Enumeration over all possible label placements and associated things.
 *
 * @author csp
 * @see NodeLabelPlacement
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/NodeLabelLocation.java
 */
export class NodeLabelLocation {
  /** Outside top left. */
  static readonly OUT_T_L: NodeLabelLocation = new NodeLabelLocation(
    'OUT_T_L',
    0,
    new LocationLayout(
      HorizontalLabelAlignment.LEFT,
      VerticalLabelAlignment.BOTTOM,
      ContainerArea.BEGIN,
      ContainerArea.BEGIN,
    ),
    [EnumSet.of(OUTSIDE, V_TOP, H_LEFT)],
  );

  /** Outside top center. */
  static readonly OUT_T_C: NodeLabelLocation = new NodeLabelLocation(
    'OUT_T_C',
    1,
    new LocationLayout(
      HorizontalLabelAlignment.CENTER,
      VerticalLabelAlignment.BOTTOM,
      ContainerArea.BEGIN,
      ContainerArea.CENTER,
    ),
    [EnumSet.of(OUTSIDE, V_TOP, H_CENTER), EnumSet.of(OUTSIDE, V_TOP, H_CENTER, H_PRIORITY)],
  );

  /** Outside top right. */
  static readonly OUT_T_R: NodeLabelLocation = new NodeLabelLocation(
    'OUT_T_R',
    2,
    new LocationLayout(
      HorizontalLabelAlignment.RIGHT,
      VerticalLabelAlignment.BOTTOM,
      ContainerArea.BEGIN,
      ContainerArea.END,
    ),
    [EnumSet.of(OUTSIDE, V_TOP, H_RIGHT)],
  );

  /** Outside bottom left. */
  static readonly OUT_B_L: NodeLabelLocation = new NodeLabelLocation(
    'OUT_B_L',
    3,
    new LocationLayout(
      HorizontalLabelAlignment.LEFT,
      VerticalLabelAlignment.TOP,
      ContainerArea.END,
      ContainerArea.BEGIN,
    ),
    [EnumSet.of(OUTSIDE, V_BOTTOM, H_LEFT)],
  );

  /** Outside bottom center. */
  static readonly OUT_B_C: NodeLabelLocation = new NodeLabelLocation(
    'OUT_B_C',
    4,
    new LocationLayout(
      HorizontalLabelAlignment.CENTER,
      VerticalLabelAlignment.TOP,
      ContainerArea.END,
      ContainerArea.CENTER,
    ),
    [EnumSet.of(OUTSIDE, V_BOTTOM, H_CENTER), EnumSet.of(OUTSIDE, V_BOTTOM, H_CENTER, H_PRIORITY)],
  );

  /** Outside bottom right. */
  static readonly OUT_B_R: NodeLabelLocation = new NodeLabelLocation(
    'OUT_B_R',
    5,
    new LocationLayout(
      HorizontalLabelAlignment.RIGHT,
      VerticalLabelAlignment.TOP,
      ContainerArea.END,
      ContainerArea.END,
    ),
    [EnumSet.of(OUTSIDE, V_BOTTOM, H_RIGHT)],
  );

  /** Outside left top. */
  static readonly OUT_L_T: NodeLabelLocation = new NodeLabelLocation(
    'OUT_L_T',
    6,
    new LocationLayout(
      HorizontalLabelAlignment.RIGHT,
      VerticalLabelAlignment.TOP,
      ContainerArea.BEGIN,
      ContainerArea.BEGIN,
    ),
    [EnumSet.of(OUTSIDE, H_LEFT, V_TOP, H_PRIORITY)],
  );

  /** Outside left center. */
  static readonly OUT_L_C: NodeLabelLocation = new NodeLabelLocation(
    'OUT_L_C',
    7,
    new LocationLayout(
      HorizontalLabelAlignment.RIGHT,
      VerticalLabelAlignment.CENTER,
      ContainerArea.CENTER,
      ContainerArea.BEGIN,
    ),
    [EnumSet.of(OUTSIDE, H_LEFT, V_CENTER), EnumSet.of(OUTSIDE, H_LEFT, V_CENTER, H_PRIORITY)],
  );

  /** Outside left bottom. */
  static readonly OUT_L_B: NodeLabelLocation = new NodeLabelLocation(
    'OUT_L_B',
    8,
    new LocationLayout(
      HorizontalLabelAlignment.RIGHT,
      VerticalLabelAlignment.BOTTOM,
      ContainerArea.END,
      ContainerArea.BEGIN,
    ),
    [EnumSet.of(OUTSIDE, H_LEFT, V_BOTTOM, H_PRIORITY)],
  );

  /** Outside right top. */
  static readonly OUT_R_T: NodeLabelLocation = new NodeLabelLocation(
    'OUT_R_T',
    9,
    new LocationLayout(
      HorizontalLabelAlignment.LEFT,
      VerticalLabelAlignment.TOP,
      ContainerArea.BEGIN,
      ContainerArea.END,
    ),
    [EnumSet.of(OUTSIDE, H_RIGHT, V_TOP, H_PRIORITY)],
  );

  /** Outside right center. */
  static readonly OUT_R_C: NodeLabelLocation = new NodeLabelLocation(
    'OUT_R_C',
    10,
    new LocationLayout(
      HorizontalLabelAlignment.LEFT,
      VerticalLabelAlignment.CENTER,
      ContainerArea.CENTER,
      ContainerArea.END,
    ),
    [EnumSet.of(OUTSIDE, H_RIGHT, V_CENTER), EnumSet.of(OUTSIDE, H_RIGHT, V_CENTER, H_PRIORITY)],
  );

  /** Outside right bottom. */
  static readonly OUT_R_B: NodeLabelLocation = new NodeLabelLocation(
    'OUT_R_B',
    11,
    new LocationLayout(
      HorizontalLabelAlignment.LEFT,
      VerticalLabelAlignment.BOTTOM,
      ContainerArea.END,
      ContainerArea.END,
    ),
    [EnumSet.of(OUTSIDE, H_RIGHT, V_BOTTOM, H_PRIORITY)],
  );

  /** Inside top left. */
  static readonly IN_T_L: NodeLabelLocation = new NodeLabelLocation(
    'IN_T_L',
    12,
    new LocationLayout(
      HorizontalLabelAlignment.LEFT,
      VerticalLabelAlignment.TOP,
      ContainerArea.BEGIN,
      ContainerArea.BEGIN,
    ),
    [EnumSet.of(INSIDE, V_TOP, H_LEFT), EnumSet.of(INSIDE, V_TOP, H_LEFT, H_PRIORITY)],
  );

  /** Inside top center. */
  static readonly IN_T_C: NodeLabelLocation = new NodeLabelLocation(
    'IN_T_C',
    13,
    new LocationLayout(
      HorizontalLabelAlignment.CENTER,
      VerticalLabelAlignment.TOP,
      ContainerArea.BEGIN,
      ContainerArea.CENTER,
    ),
    [EnumSet.of(INSIDE, V_TOP, H_CENTER), EnumSet.of(INSIDE, V_TOP, H_CENTER, H_PRIORITY)],
  );

  /** Inside top right. */
  static readonly IN_T_R: NodeLabelLocation = new NodeLabelLocation(
    'IN_T_R',
    14,
    new LocationLayout(
      HorizontalLabelAlignment.RIGHT,
      VerticalLabelAlignment.TOP,
      ContainerArea.BEGIN,
      ContainerArea.END,
    ),
    [EnumSet.of(INSIDE, V_TOP, H_RIGHT), EnumSet.of(INSIDE, V_TOP, H_RIGHT, H_PRIORITY)],
  );

  /** Inside center left. */
  static readonly IN_C_L: NodeLabelLocation = new NodeLabelLocation(
    'IN_C_L',
    15,
    new LocationLayout(
      HorizontalLabelAlignment.LEFT,
      VerticalLabelAlignment.CENTER,
      ContainerArea.CENTER,
      ContainerArea.BEGIN,
    ),
    [EnumSet.of(INSIDE, V_CENTER, H_LEFT), EnumSet.of(INSIDE, V_CENTER, H_LEFT, H_PRIORITY)],
  );

  /** Inside center center. */
  static readonly IN_C_C: NodeLabelLocation = new NodeLabelLocation(
    'IN_C_C',
    16,
    new LocationLayout(
      HorizontalLabelAlignment.CENTER,
      VerticalLabelAlignment.CENTER,
      ContainerArea.CENTER,
      ContainerArea.CENTER,
    ),
    [EnumSet.of(INSIDE, V_CENTER, H_CENTER), EnumSet.of(INSIDE, V_CENTER, H_CENTER, H_PRIORITY)],
  );

  /** Inside center right. */
  static readonly IN_C_R: NodeLabelLocation = new NodeLabelLocation(
    'IN_C_R',
    17,
    new LocationLayout(
      HorizontalLabelAlignment.RIGHT,
      VerticalLabelAlignment.CENTER,
      ContainerArea.CENTER,
      ContainerArea.END,
    ),
    [EnumSet.of(INSIDE, V_CENTER, H_RIGHT), EnumSet.of(INSIDE, V_CENTER, H_RIGHT, H_PRIORITY)],
  );

  /** Inside bottom left. */
  static readonly IN_B_L: NodeLabelLocation = new NodeLabelLocation(
    'IN_B_L',
    18,
    new LocationLayout(
      HorizontalLabelAlignment.LEFT,
      VerticalLabelAlignment.BOTTOM,
      ContainerArea.END,
      ContainerArea.BEGIN,
    ),
    [EnumSet.of(INSIDE, V_BOTTOM, H_LEFT), EnumSet.of(INSIDE, V_BOTTOM, H_LEFT, H_PRIORITY)],
  );

  /** Inside bottom center. */
  static readonly IN_B_C: NodeLabelLocation = new NodeLabelLocation(
    'IN_B_C',
    19,
    new LocationLayout(
      HorizontalLabelAlignment.CENTER,
      VerticalLabelAlignment.BOTTOM,
      ContainerArea.END,
      ContainerArea.CENTER,
    ),
    [EnumSet.of(INSIDE, V_BOTTOM, H_CENTER), EnumSet.of(INSIDE, V_BOTTOM, H_CENTER, H_PRIORITY)],
  );

  /** Inside bottom right. */
  static readonly IN_B_R: NodeLabelLocation = new NodeLabelLocation(
    'IN_B_R',
    20,
    new LocationLayout(
      HorizontalLabelAlignment.RIGHT,
      VerticalLabelAlignment.BOTTOM,
      ContainerArea.END,
      ContainerArea.END,
    ),
    [EnumSet.of(INSIDE, V_BOTTOM, H_RIGHT), EnumSet.of(INSIDE, V_BOTTOM, H_RIGHT, H_PRIORITY)],
  );

  /** Undefined or not decidable. */
  static readonly UNDEFINED: NodeLabelLocation = new NodeLabelLocation(
    'UNDEFINED',
    21,
    new LocationLayout(null, null, null, null),
    [],
  );

  static readonly #VALUES: readonly NodeLabelLocation[] = [
    NodeLabelLocation.OUT_T_L,
    NodeLabelLocation.OUT_T_C,
    NodeLabelLocation.OUT_T_R,
    NodeLabelLocation.OUT_B_L,
    NodeLabelLocation.OUT_B_C,
    NodeLabelLocation.OUT_B_R,
    NodeLabelLocation.OUT_L_T,
    NodeLabelLocation.OUT_L_C,
    NodeLabelLocation.OUT_L_B,
    NodeLabelLocation.OUT_R_T,
    NodeLabelLocation.OUT_R_C,
    NodeLabelLocation.OUT_R_B,
    NodeLabelLocation.IN_T_L,
    NodeLabelLocation.IN_T_C,
    NodeLabelLocation.IN_T_R,
    NodeLabelLocation.IN_C_L,
    NodeLabelLocation.IN_C_C,
    NodeLabelLocation.IN_C_R,
    NodeLabelLocation.IN_B_L,
    NodeLabelLocation.IN_B_C,
    NodeLabelLocation.IN_B_R,
    NodeLabelLocation.UNDEFINED,
  ];

  /** The corresponding placements to this location. */
  readonly #assignedPlacements: readonly EnumSet<NodeLabelPlacement>[];
  /** The horizontal text alignment, vertical text alignment, appropriate label row and column of this location. */
  readonly #layout: LocationLayout;
  readonly #name: string;
  readonly #ordinal: number;

  /**
   * Creates a new location with the {@link NodeLabelPlacement}s that lead to this location.
   *
   * @param layout the horizontal and vertical label alignment and the appropriate container row and column.
   * @param assignedPlacements the valid {@link NodeLabelPlacement}s for this location.
   */
  private constructor(
    name: string,
    ordinal: number,
    layout: LocationLayout,
    assignedPlacements: readonly EnumSet<NodeLabelPlacement>[],
  ) {
    this.#name = name;
    this.#ordinal = ordinal;
    this.#layout = layout;
    this.#assignedPlacements = assignedPlacements;
  }

  /** The constants in declaration order. */
  static values(): readonly NodeLabelLocation[] {
    return NodeLabelLocation.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): NodeLabelLocation {
    const found = NodeLabelLocation.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.common.nodespacing.internal.NodeLabelLocation.${name}`,
      );
    }
    return found;
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

  /**
   * Converts a set of {@link NodeLabelPlacement}s to a {@link NodeLabelLocation} if possible.
   *
   * @param labelPlacement the set of placements to convert.
   * @returns the corresponding location. If no valid combination is given, `NodeLabelLocation.UNDEFINED` is returned.
   */
  static fromNodeLabelPlacement(labelPlacement: EnumSet<NodeLabelPlacement>): NodeLabelLocation {
    for (const location of NodeLabelLocation.values()) {
      if (location.#assignedPlacements.some((placements) => placements.equals(labelPlacement))) {
        return location;
      }
    }

    return NodeLabelLocation.UNDEFINED;
  }

  /** Returns the horizontal text alignment for this location (`null` for `UNDEFINED`). */
  getHorizontalAlignment(): HorizontalLabelAlignment | null {
    return this.#layout.horizontalAlignment;
  }

  /** Returns the vertical text alignment for this location (`null` for `UNDEFINED`). */
  getVerticalAlignment(): VerticalLabelAlignment | null {
    return this.#layout.verticalAlignment;
  }

  /** Returns the appropriate row in a container cell (`null` for `UNDEFINED`). */
  getContainerRow(): ContainerArea | null {
    return this.#layout.containerRow;
  }

  /** Returns the appropriate column in a container cell (`null` for `UNDEFINED`). */
  getContainerColumn(): ContainerArea | null {
    return this.#layout.containerColumn;
  }

  /** Checks whether this location is inside the node or not. */
  isInsideLocation(): boolean {
    switch (this) {
      case NodeLabelLocation.IN_T_L:
      case NodeLabelLocation.IN_T_C:
      case NodeLabelLocation.IN_T_R:
      case NodeLabelLocation.IN_C_L:
      case NodeLabelLocation.IN_C_C:
      case NodeLabelLocation.IN_C_R:
      case NodeLabelLocation.IN_B_L:
      case NodeLabelLocation.IN_B_C:
      case NodeLabelLocation.IN_B_R:
        return true;
      default:
        return false;
    }
  }

  /**
   * Returns the side of the node an outside node label location corresponds to or {@link PortSide.UNDEFINED} if this
   * location is on the inside or {@link NodeLabelLocation.UNDEFINED}.
   */
  getOutsideSide(): PortSide {
    switch (this) {
      case NodeLabelLocation.OUT_T_L:
      case NodeLabelLocation.OUT_T_C:
      case NodeLabelLocation.OUT_T_R:
        return PortSide.NORTH;
      case NodeLabelLocation.OUT_B_L:
      case NodeLabelLocation.OUT_B_C:
      case NodeLabelLocation.OUT_B_R:
        return PortSide.SOUTH;
      default:
        return this.#getOutsideSideWestEast();
    }
  }

  /**
   * The `WEST` and `EAST` arms and the default of Java's `getOutsideSide()` switch, split out to respect the
   * cyclomatic complexity limit.
   */
  #getOutsideSideWestEast(): PortSide {
    switch (this) {
      case NodeLabelLocation.OUT_L_T:
      case NodeLabelLocation.OUT_L_C:
      case NodeLabelLocation.OUT_L_B:
        return PortSide.WEST;
      case NodeLabelLocation.OUT_R_T:
      case NodeLabelLocation.OUT_R_C:
      case NodeLabelLocation.OUT_R_B:
        return PortSide.EAST;
      default:
        return PortSide.UNDEFINED;
    }
  }
}
