// SPDX-License-Identifier: EPL-2.0
import { ElkMath } from '../../../core/math/ElkMath.js';
import { KVector } from '../../../core/math/KVector.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { ValueCollection } from '../../../guava/Multimap.js';
import * as Float32 from '../../../java/lang/Float32.js';
import type { LGraph } from '../graph/LGraph.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { AbstractGraphPlacer } from './AbstractGraphPlacer.js';
import { ComponentGroup } from './ComponentGroup.js';
import { ComponentsCompactor } from './ComponentsCompactor.js';

/** The sizes the sector placements of `placeComponents` return (Java locals `sizeC` ... `sizeNESW`). */
interface SectorSizes {
  readonly sizeC: KVector;
  readonly sizeN: KVector;
  readonly sizeS: KVector;
  readonly sizeW: KVector;
  readonly sizeE: KVector;
  readonly sizeNW: KVector;
  readonly sizeNE: KVector;
  readonly sizeSW: KVector;
  readonly sizeSE: KVector;
  readonly sizeWE: KVector;
  readonly sizeNS: KVector;
  readonly sizeNWE: KVector;
  readonly sizeSWE: KVector;
  readonly sizeWNS: KVector;
  readonly sizeENS: KVector;
  readonly sizeNESW: KVector;
}

/** The column widths and row heights of `placeComponents` (Java locals `colLeftWidth` ... `rowBottomHeight`). */
interface SectorDimensions {
  readonly colLeftWidth: number;
  readonly colMidWidth: number;
  readonly colNsWidth: number;
  readonly colRightWidth: number;
  readonly rowTopHeight: number;
  readonly rowMidHeight: number;
  readonly rowWeHeight: number;
  readonly rowBottomHeight: number;
}

/**
 * A graph placer that groups components by the external port sides they connect to and places the groups one after the
 * other, each group in a three by three grid of sectors.
 *
 * @author cds
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupGraphPlacer.java
 */
export class ComponentGroupGraphPlacer extends AbstractGraphPlacer {
  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupGraphPlacer.java:65 */
  protected readonly componentGroups: ComponentGroup[] = [];

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupGraphPlacer.java:71 */
  combine(components: LGraph[], target: LGraph): void {
    this.componentGroups.length = 0;
    // Java line 73 'assert !components.contains(target)' is omitted (dev-only check)
    target.getLayerlessNodes().length = 0;

    // Check if there are any components to be placed
    if (components.length === 0) {
      target.getSize().x = 0;
      target.getSize().y = 0;
      return;
    }

    // Set the graph properties
    const firstComponent = components[0]!;
    target.copyProperties(firstComponent);

    // Construct component groups
    for (const component of components) {
      this.addComponent(component);
    }

    // Place components in each group
    const componentSpacing = firstComponent.getProperty(LayeredOptions.SPACING_COMPONENT_COMPONENT);
    const offset = this.placeGroups(componentSpacing);

    // Set the graph's new size (the component group sizes include additional spacing
    // on the right and bottom sides which we need to subtract at this point)
    target.getSize().x = offset.x - componentSpacing;
    target.getSize().y = offset.y - componentSpacing;

    // if compaction is desired, do so! (the Java comment reads "do so!cing;")
    if (
      firstComponent.getProperty(LayeredOptions.COMPACTION_CONNECTED_COMPONENTS) &&
      // the compaction only supports orthogonally routed edges
      firstComponent.getProperty(LayeredOptions.EDGE_ROUTING) === EdgeRouting.ORTHOGONAL
    ) {
      this.compactComponents(components, target, componentSpacing);
    }

    // finally move the components to the combined graph
    for (const group of this.componentGroups) {
      this.moveGraphs(target, group.getComponents(), 0, 0);
    }
  }

  /**
   * The group placement loop of `combine` (split out for the complexity limits). Returns the final offset, the size of
   * all groups including the spacing.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupGraphPlacer.java:93
   */
  private placeGroups(componentSpacing: number): KVector {
    const offset = new KVector();

    for (const group of this.componentGroups) {
      // Place the components
      const groupSize = this.placeComponents(group, componentSpacing);
      this.offsetGraphs(group.getComponents(), offset.x, offset.y);

      // Compute the new offset
      offset.x += groupSize.x;
      offset.y += groupSize.y;
    }
    return offset;
  }

  /**
   * The compaction block of `combine` (split out for the complexity limits; Java order kept).
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupGraphPlacer.java:114
   */
  protected compactComponents(components: LGraph[], target: LGraph, componentSpacing: number): void {
    // apply graph offsets (which we reset later on)
    // since the compaction works in a common coordinate system
    for (const h of components) {
      this.offsetGraph(h, h.getOffset().x, h.getOffset().y);
    }

    const compactor = new ComponentsCompactor();
    compactor.compact(components, target.getSize(), componentSpacing);

    // the compaction algorithm places components absolutely,
    // therefore we have to use the final drawing's offset
    for (const h of components) {
      h.getOffset().reset().add(compactor.getOffset());
    }

    // set the new (compacted) graph size
    target.getSize().reset().add(compactor.getGraphSize());
  }

  /**
   * Adds the component to the first group that has room for it, or to a new group.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupGraphPlacer.java:150
   */
  protected addComponent(component: LGraph): void {
    // Check if one of the existing component groups has some place left
    for (const group of this.componentGroups) {
      if (group.add(component)) {
        return;
      }
    }

    // Create a new component group for the component
    this.componentGroups.push(new ComponentGroup(component));
  }

  /**
   * Places the components of the group in their sectors and returns the size of the group. The Java method is split
   * into `placeSectors`, `computeDimensions`, the three `offset*Sectors` and `computeGroupSize` for the complexity
   * limits; the statements keep the Java order.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupGraphPlacer.java:184
   */
  protected placeComponents(group: ComponentGroup, spacing: number): KVector {
    // Determine the spacing between two components
    // Place the different sector components and remember the amount of space their placement uses.
    // In this phase, we pretend that no other components are in the component group.
    const sizes = this.placeSectors(group, spacing);

    // Find the maximum height of the three rows and the maximum width of the three columns the
    // component group is divided into (we're adding a fourth row for WE components and a fourth
    // column for NS components to make the placement easier later)
    const dimensions = ComponentGroupGraphPlacer.computeDimensions(sizes);

    // With the individual placements computed, we now move the components to their final place,
    // taking the size of other component placements into account (the NW, NWE, and WNS components
    // stay at coordinates (0,0) and thus don't need to be moved around)
    this.offsetFirstSectors(group, dimensions);
    this.offsetSecondSectors(group, dimensions);
    this.offsetThirdSectors(group, dimensions);

    // Compute this component group's size
    return ComponentGroupGraphPlacer.computeGroupSize(sizes, dimensions);
  }

  /** The sector placements at the start of `placeComponents`, in Java order. */
  private placeSectors(group: ComponentGroup, spacing: number): SectorSizes {
    const S = PortSide;
    return {
      sizeC: this.placeComponentsInRows(group.getComponents(S.SIDES_NONE), spacing),
      sizeN: this.placeComponentsHorizontally(group.getComponents(S.SIDES_NORTH), spacing),
      sizeS: this.placeComponentsHorizontally(group.getComponents(S.SIDES_SOUTH), spacing),
      sizeW: this.placeComponentsVertically(group.getComponents(S.SIDES_WEST), spacing),
      sizeE: this.placeComponentsVertically(group.getComponents(S.SIDES_EAST), spacing),
      sizeNW: this.placeComponentsHorizontally(group.getComponents(S.SIDES_NORTH_WEST), spacing),
      sizeNE: this.placeComponentsHorizontally(group.getComponents(S.SIDES_NORTH_EAST), spacing),
      sizeSW: this.placeComponentsHorizontally(group.getComponents(S.SIDES_SOUTH_WEST), spacing),
      sizeSE: this.placeComponentsHorizontally(group.getComponents(S.SIDES_EAST_SOUTH), spacing),
      sizeWE: this.placeComponentsVertically(group.getComponents(S.SIDES_EAST_WEST), spacing),
      sizeNS: this.placeComponentsHorizontally(group.getComponents(S.SIDES_NORTH_SOUTH), spacing),
      sizeNWE: this.placeComponentsHorizontally(group.getComponents(S.SIDES_NORTH_EAST_WEST), spacing),
      sizeSWE: this.placeComponentsHorizontally(group.getComponents(S.SIDES_EAST_SOUTH_WEST), spacing),
      sizeWNS: this.placeComponentsVertically(group.getComponents(S.SIDES_NORTH_SOUTH_WEST), spacing),
      sizeENS: this.placeComponentsVertically(group.getComponents(S.SIDES_NORTH_EAST_SOUTH), spacing),
      sizeNESW: this.placeComponentsHorizontally(group.getComponents(S.SIDES_NORTH_EAST_SOUTH_WEST), spacing),
    };
  }

  /** The column widths and row heights of `placeComponents`. */
  private static computeDimensions(sizes: SectorSizes): SectorDimensions {
    return {
      colLeftWidth: ElkMath.maxd(sizes.sizeNW.x, sizes.sizeW.x, sizes.sizeSW.x, sizes.sizeWNS.x),
      colMidWidth: ElkMath.maxd(sizes.sizeN.x, sizes.sizeC.x, sizes.sizeS.x, sizes.sizeNESW.x),
      colNsWidth: sizes.sizeNS.x,
      colRightWidth: ElkMath.maxd(sizes.sizeNE.x, sizes.sizeE.x, sizes.sizeSE.x, sizes.sizeENS.x),
      rowTopHeight: ElkMath.maxd(sizes.sizeNW.y, sizes.sizeN.y, sizes.sizeNE.y, sizes.sizeNWE.y),
      rowMidHeight: ElkMath.maxd(sizes.sizeW.y, sizes.sizeC.y, sizes.sizeE.y, sizes.sizeNESW.y),
      rowWeHeight: sizes.sizeWE.y,
      rowBottomHeight: ElkMath.maxd(sizes.sizeSW.y, sizes.sizeS.y, sizes.sizeSE.y, sizes.sizeSWE.y),
    };
  }

  /** The first five `offsetGraphs` calls of `placeComponents`. */
  private offsetFirstSectors(group: ComponentGroup, d: SectorDimensions): void {
    const { SIDES_NONE, SIDES_NORTH_EAST_SOUTH_WEST, SIDES_NORTH, SIDES_SOUTH, SIDES_WEST } = PortSide;
    this.offsetGraphs(group.getComponents(SIDES_NONE), d.colLeftWidth + d.colNsWidth, d.rowTopHeight + d.rowWeHeight);
    this.offsetGraphs(
      group.getComponents(SIDES_NORTH_EAST_SOUTH_WEST),
      d.colLeftWidth + d.colNsWidth,
      d.rowTopHeight + d.rowWeHeight,
    );
    this.offsetGraphs(group.getComponents(SIDES_NORTH), d.colLeftWidth + d.colNsWidth, 0.0);
    this.offsetGraphs(
      group.getComponents(SIDES_SOUTH),
      d.colLeftWidth + d.colNsWidth,
      d.rowTopHeight + d.rowWeHeight + d.rowMidHeight,
    );
    this.offsetGraphs(group.getComponents(SIDES_WEST), 0.0, d.rowTopHeight + d.rowWeHeight);
  }

  /** The next five `offsetGraphs` calls of `placeComponents`. */
  private offsetSecondSectors(group: ComponentGroup, d: SectorDimensions): void {
    const { SIDES_EAST, SIDES_NORTH_EAST, SIDES_SOUTH_WEST, SIDES_EAST_SOUTH, SIDES_EAST_WEST } = PortSide;
    this.offsetGraphs(
      group.getComponents(SIDES_EAST),
      d.colLeftWidth + d.colNsWidth + d.colMidWidth,
      d.rowTopHeight + d.rowWeHeight,
    );
    this.offsetGraphs(group.getComponents(SIDES_NORTH_EAST), d.colLeftWidth + d.colNsWidth + d.colMidWidth, 0.0);
    this.offsetGraphs(group.getComponents(SIDES_SOUTH_WEST), 0.0, d.rowTopHeight + d.rowWeHeight + d.rowMidHeight);
    this.offsetGraphs(
      group.getComponents(SIDES_EAST_SOUTH),
      d.colLeftWidth + d.colNsWidth + d.colMidWidth,
      d.rowTopHeight + d.rowWeHeight + d.rowMidHeight,
    );
    this.offsetGraphs(group.getComponents(SIDES_EAST_WEST), 0.0, d.rowTopHeight);
  }

  /** The last three `offsetGraphs` calls of `placeComponents`. */
  private offsetThirdSectors(group: ComponentGroup, d: SectorDimensions): void {
    const { SIDES_NORTH_SOUTH, SIDES_EAST_SOUTH_WEST, SIDES_NORTH_EAST_SOUTH } = PortSide;
    this.offsetGraphs(group.getComponents(SIDES_NORTH_SOUTH), d.colLeftWidth, 0.0);
    this.offsetGraphs(group.getComponents(SIDES_EAST_SOUTH_WEST), 0.0, d.rowTopHeight + d.rowWeHeight + d.rowMidHeight);
    this.offsetGraphs(group.getComponents(SIDES_NORTH_EAST_SOUTH), d.colLeftWidth + d.colNsWidth + d.colMidWidth, 0.0);
  }

  /** The size computation at the end of `placeComponents`. */
  private static computeGroupSize(sizes: SectorSizes, d: SectorDimensions): KVector {
    const componentSize = new KVector();
    componentSize.x = ElkMath.maxd(
      d.colLeftWidth + d.colMidWidth + d.colNsWidth + d.colRightWidth,
      sizes.sizeWE.x,
      sizes.sizeNWE.x,
      sizes.sizeSWE.x,
    );
    componentSize.y = ElkMath.maxd(
      d.rowTopHeight + d.rowMidHeight + d.rowWeHeight + d.rowBottomHeight,
      sizes.sizeNS.y,
      sizes.sizeWNS.y,
      sizes.sizeENS.y,
    );

    return componentSize;
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupGraphPlacer.java:301 */
  protected placeComponentsHorizontally(components: Iterable<LGraph>, spacing: number): KVector {
    const size = new KVector();

    // Iterate over the components and place them
    for (const component of components) {
      this.offsetGraph(component, size.x, 0.0);

      size.x += component.getSize().x + spacing;
      size.y = Math.max(size.y, component.getSize().y);
    }

    // Add vertical spacing, if necessary
    if (size.y > 0.0) {
      size.y += spacing;
    }

    return size;
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupGraphPlacer.java:329 */
  protected placeComponentsVertically(components: Iterable<LGraph>, spacing: number): KVector {
    const size = new KVector();

    // Iterate over the components and place them
    for (const component of components) {
      this.offsetGraph(component, 0.0, size.y);

      size.y += component.getSize().y + spacing;
      size.x = Math.max(size.x, component.getSize().x);
    }

    // Add horizontal spacing, if necessary
    if (size.x > 0.0) {
      size.x += spacing;
    }

    return size;
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupGraphPlacer.java:357 */
  protected placeComponentsInRows(components: ValueCollection<LGraph>, spacing: number): KVector {
    // Check if there actually are any components
    if (components.isEmpty()) {
      return new KVector();
    }

    // Determine the maximal row width by the maximal box width and the total area
    let maxRowWidth = 0.0;
    let totalArea = 0.0;
    for (const component of components) {
      const componentSize = component.getSize();
      maxRowWidth = Math.max(maxRowWidth, componentSize.x);
      totalArea += componentSize.x * componentSize.y;
    }

    const [firstComponent] = components;
    maxRowWidth = Math.max(
      maxRowWidth,
      Float32.fromDouble(Math.sqrt(totalArea)) * firstComponent.getProperty(LayeredOptions.ASPECT_RATIO),
    );

    return this.placeInRows(components, spacing, maxRowWidth);
  }

  /**
   * The row placement of `placeComponentsInRows` (split out for the complexity limits).
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupGraphPlacer.java:377
   */
  private placeInRows(components: Iterable<LGraph>, spacing: number, maxRowWidth: number): KVector {
    // Place nodes iteratively into rows
    let xpos = 0;
    let ypos = 0;
    let highestBox = 0;
    let broadestRow = spacing;
    for (const graph of components) {
      const size = graph.getSize();

      if (xpos + size.x > maxRowWidth) {
        // Place the graph into the next row
        xpos = 0;
        ypos += highestBox + spacing;
        highestBox = 0;
      }

      this.offsetGraph(graph, xpos, ypos);

      broadestRow = Math.max(broadestRow, xpos + size.x);
      highestBox = Math.max(highestBox, size.y);

      xpos += size.x + spacing;
    }

    return new KVector(broadestRow + spacing, ypos + highestBox + spacing);
  }
}
