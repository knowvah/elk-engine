// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { KVector } from '../../../../core/math/KVector.js';
import { Direction } from '../../../../core/options/Direction.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { Pair } from '../../../../core/util/Pair.js';
import { LinkedHashMultimap } from '../../../../guava/LinkedHashMultimap.js';
import type { Multimap } from '../../../../guava/Multimap.js';
import { hashable, identity } from '../../../../java/util/HashStrategy.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { CGraph } from '../oned/CGraph.js';
import { CGroup } from '../oned/CGroup.js';
import type { CNode } from '../oned/CNode.js';
import type { ICGraphTransformer } from '../oned/ICGraphTransformer.js';
import type { ISpacingsHandler } from '../oned/ISpacingsHandler.js';
import { CRectNode } from './ComponentsToCGraphTransformerCRectNode.js';
import type { IComponent } from './IComponent.js';
import type { IConnectedComponents } from './IConnectedComponents.js';
import { getPlaceholder, type IExternalExtension } from './IExternalExtension.js';

/**
 * Java `Set.equals` of a port side set against one of the `PortSide.SIDES_*` constants: same size
 * and every element contained.
 */
function sidesEqual(portSides: EnumSet<PortSide>, sides: ReadonlySet<PortSide>): boolean {
  return portSides.size() === sides.size && [...portSides].every((side) => sides.has(side));
}

/**
 * Transforms {@link IConnectedComponents} into a representing {@link CGraph} which can be passed to
 * a {@link OneDimensionalCompactor} to obtain a more compact drawing.
 *
 * @typeParam N the type of the contained nodes
 * @typeParam E the type of the contained edges
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/components/ComponentsToCGraphTransformer.java
 */
export class ComponentsToCGraphTransformer<N, E> implements ICGraphTransformer<IConnectedComponents<N, E>> {
  /** The {@link CGroup} resulting from this transformation. */
  private cGraph: CGraph = null as never;

  private readonly spacing: number;

  // internal mappings
  // IDENTITY-KEYED (Maps.newHashMap, Java :70-71; the components define no equals/hashCode): only
  // containsKey/get/put, never iterated, so a Map.
  private readonly oldPosition = new Map<IComponent<N, E>, KVector>();
  private readonly offsets = new Map<IComponent<N, E>, CRectNode>();

  // a global offset and the new graph size after layout
  private globalOffset: KVector = null as never;
  private graphSize: KVector = null as never;

  // maps the external extension to the CNodes by which they are represented
  // IDENTITY-KEYED and ITERATED (Java :78, entrySet() in OneDimensionalComponentsCompaction): an
  // insertion-ordered Map, the oracle's -XX:hashCode=2 makes every identity hash 1.
  private readonly externalExtensions = new Map<IExternalExtension<E>, Pair<CGroup, CNode>>();
  // Java :79 HashMultimap<Direction, Pair>: both iterations (get(d) and values()) follow insertion
  // order under -XX:hashCode=2 (Direction and CGroup/CNode hash to 1), hence a LinkedHashMultimap.
  private readonly externalPlaceholder: Multimap<Direction, Pair<CGroup, CNode>> = LinkedHashMultimap.create(
    identity<Direction>(),
    hashable<Pair<CGroup, CNode>>(),
  );

  /**
   * @param spacing required spacing between connected IComponents.
   */
  constructor(spacing: number) {
    this.spacing = spacing;
  }

  /**
   * @param c a IComponent
   * @returns the offset to c's original position after layout.
   */
  getOffset(c: IComponent<N, E>): KVector {
    const cOffset = (this.oldPosition.get(c) as KVector)
      .clone()
      .sub((this.offsets.get(c) as CRectNode).rect.getPosition());
    return cOffset;
  }

  /** @returns the globalOffset */
  getGlobalOffset(): KVector {
    return this.globalOffset;
  }

  /** @returns the graphSize */
  getGraphSize(): KVector {
    return this.graphSize;
  }

  /** @returns the externalExtensions */
  getExternalExtensions(): Map<IExternalExtension<E>, Pair<CGroup, CNode>> {
    return this.externalExtensions;
  }

  /** @returns the externalPlaceholder */
  getExternalPlaceholder(): Multimap<Direction, Pair<CGroup, CNode>> {
    return this.externalPlaceholder;
  }

  /* -----------------------------------------------------------
   *                    Graph Transformation
   * ----------------------------------------------------------- */

  transform(ccs: IConnectedComponents<N, E>): CGraph {
    this.cGraph = new CGraph(EnumSet.allOf(Direction));

    for (const comp of ccs.getComponents()) {
      const group = new CGroup();
      this.cGraph.cGroups.push(group);

      // convert the hull of the graph's elements without external edges
      for (const rect of comp.getHull()) {
        const rectNode = new CRectNode(this.spacingReader, rect);
        this.setLock(rectNode, comp.getExternalExtensionSides());

        if (!this.oldPosition.has(comp)) {
          this.oldPosition.set(comp, new KVector(rect.x, rect.y));
          this.offsets.set(comp, rectNode);
        }

        this.cGraph.cNodes.push(rectNode);
        group.addCNode(rectNode);
      }

      // now prepare the rectangles for the external extensions
      // they can be added to the CGraph on demand later on
      for (const ee of comp.getExternalExtensions()) {
        this.prepareExternalExtension(comp, group, ee);
      }
    }

    return this.cGraph;
  }

  /**
   * Body of the Java loop over `comp.getExternalExtensions()` (:157-170), extracted to stay within
   * the complexity limits.
   */
  private prepareExternalExtension(comp: IComponent<N, E>, group: CGroup, ee: IExternalExtension<E>): void {
    const rectNode = new CRectNode(this.spacingReader, ee.getRepresentor());
    this.externalExtensions.set(ee, Pair.of(group, rectNode));
    this.setLock(rectNode, comp.getExternalExtensionSides());

    // placeholder
    if (getPlaceholder(ee) !== null) {
      const rectPlaceholder = new CRectNode(this.spacingReader, getPlaceholder(ee) as ElkRectangle, 1);
      this.setLock(rectPlaceholder, comp.getExternalExtensionSides());
      const dummyGroup = new CGroup();
      dummyGroup.addCNode(rectPlaceholder);
      this.externalPlaceholder.put(ee.getDirection(), Pair.of(group, rectPlaceholder));
    }
  }

  /** The inner class' read of the outer `spacing` field. */
  private readonly spacingReader = (): number => this.spacing;

  /**
   * The locks should assure that a component c that is connected to external ports on the sides
   * WEST and SOUTH stays in the bottom left corner. Otherwise edges may become unnecessarily
   * long. (Java's one 19-branch method is split in three, in the Java order, for the complexity
   * limits.)
   */
  private setLock(cNode: CNode, portSides: EnumSet<PortSide>): void {
    if (portSides.isEmpty()) {
      cNode.lock.set(true, true, true, true);
    }

    this.setLockRegulars(cNode, portSides);
    this.setLockCorners(cNode, portSides);
    this.setLockMultiples(cNode, portSides);
  }

  /** The `// regulars` block of `setLock`. */
  private setLockRegulars(cNode: CNode, portSides: EnumSet<PortSide>): void {
    if (sidesEqual(portSides, PortSide.SIDES_NORTH)) {
      cNode.lock.set(true, true, true, false);
    }
    if (sidesEqual(portSides, PortSide.SIDES_EAST)) {
      cNode.lock.set(false, true, true, true);
    }
    if (sidesEqual(portSides, PortSide.SIDES_SOUTH)) {
      cNode.lock.set(true, true, false, true);
    }
    if (sidesEqual(portSides, PortSide.SIDES_WEST)) {
      cNode.lock.set(true, false, true, true);
    }
  }

  /** The `// corners` block of `setLock`. */
  private setLockCorners(cNode: CNode, portSides: EnumSet<PortSide>): void {
    if (sidesEqual(portSides, PortSide.SIDES_NORTH_EAST)) {
      cNode.lock.set(false, true, true, false);
    }
    if (sidesEqual(portSides, PortSide.SIDES_EAST_SOUTH)) {
      cNode.lock.set(false, true, false, true);
    }
    if (sidesEqual(portSides, PortSide.SIDES_SOUTH_WEST)) {
      cNode.lock.set(true, false, false, true);
    }
    if (sidesEqual(portSides, PortSide.SIDES_NORTH_WEST)) {
      cNode.lock.set(true, false, true, false);
    }
  }

  /** The `// opposite`, `// triumvirates` and `// all of them!` blocks of `setLock`. */
  private setLockMultiples(cNode: CNode, portSides: EnumSet<PortSide>): void {
    // opposite
    if (sidesEqual(portSides, PortSide.SIDES_NORTH_SOUTH)) {
      cNode.lock.set(true, true, true, true);
    }
    if (sidesEqual(portSides, PortSide.SIDES_EAST_WEST)) {
      cNode.lock.set(true, true, true, true);
    }

    // triumvirates
    if (sidesEqual(portSides, PortSide.SIDES_NORTH_SOUTH)) {
      cNode.lock.set(true, true, true, true);
    }
    if (sidesEqual(portSides, PortSide.SIDES_EAST_SOUTH_WEST)) {
      cNode.lock.set(true, true, true, true);
    }
    if (sidesEqual(portSides, PortSide.SIDES_NORTH_SOUTH_WEST)) {
      cNode.lock.set(true, true, true, true);
    }
    if (sidesEqual(portSides, PortSide.SIDES_NORTH_EAST_WEST)) {
      cNode.lock.set(true, true, true, true);
    }

    // all of them!
    if (sidesEqual(portSides, PortSide.SIDES_NORTH_EAST_SOUTH_WEST)) {
      cNode.lock.set(true, true, true, true);
    }
  }

  /* -----------------------------------------------------------
   *                    Layout Application
   * ----------------------------------------------------------- */

  applyLayout(): void {
    for (const n of this.cGraph.cNodes) {
      n.applyElementPosition();
    }

    // calculating new graph size and offset
    const topLeft = new KVector(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    const bottomRight = new KVector(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    for (const cNode of this.cGraph.cNodes) {
      topLeft.x = Math.min(topLeft.x, cNode.hitbox.x);
      topLeft.y = Math.min(topLeft.y, cNode.hitbox.y);
      bottomRight.x = Math.max(bottomRight.x, cNode.hitbox.x + cNode.hitbox.width);
      bottomRight.y = Math.max(bottomRight.y, cNode.hitbox.y + cNode.hitbox.height);
    }

    // note that placeholdes "can move" during compaction and are _not_ fixed to the boundary
    // which allows to use them to determine the maximum position
    for (const placeholder of this.externalPlaceholder.values()) {
      const cNode = placeholder.getSecond() as CNode;
      topLeft.x = Math.min(topLeft.x, cNode.hitbox.x);
      topLeft.y = Math.min(topLeft.y, cNode.hitbox.y);
      bottomRight.x = Math.max(bottomRight.x, cNode.hitbox.x + cNode.hitbox.width);
      bottomRight.y = Math.max(bottomRight.y, cNode.hitbox.y + cNode.hitbox.height);
    }

    this.globalOffset = topLeft.clone().negate();
    this.graphSize = bottomRight.clone().sub(topLeft);

    // resetting lists
    this.cGraph.cGroups.length = 0;
    this.cGraph.cNodes.length = 0;
  }

  /**
   * Component compaction-specific spacing handler that can cope with placeholders.
   * During compaction a placeholder can be moved right next to an adjacent rectangle;
   * no spacing has to be preserved.
   */
  static readonly SPACING_HANDLER: ISpacingsHandler<CNode> = {
    getHorizontalSpacing(cNode1: CNode, cNode2: CNode): number {
      return Math.min(cNode1.getHorizontalSpacing(), cNode2.getHorizontalSpacing());
    },

    getVerticalSpacing(cNode1: CNode, cNode2: CNode): number {
      return Math.min(cNode1.getVerticalSpacing(), cNode2.getVerticalSpacing());
    },
  };
}
