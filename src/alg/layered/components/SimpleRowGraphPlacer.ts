// SPDX-License-Identifier: EPL-2.0
import * as DoubleCompare from '../../../java/lang/DoubleCompare.js';
import * as Float32 from '../../../java/lang/Float32.js';
import * as Int32 from '../../../java/lang/Int32.js';
import type { LGraph } from '../graph/LGraph.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { AbstractGraphPlacer } from './AbstractGraphPlacer.js';
import { ComponentOrderingStrategy } from './ComponentOrderingStrategy.js';
import { ComponentsCompactor } from './ComponentsCompactor.js';

/**
 * A simple graph placer that arranges the components in rows, sorted by priority and size.
 *
 * @author msp
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/SimpleRowGraphPlacer.java
 */
export class SimpleRowGraphPlacer extends AbstractGraphPlacer {
  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/SimpleRowGraphPlacer.java:43 */
  combine(components: LGraph[], target: LGraph): void {
    if (components.length === 1) {
      this.combineSingleComponent(components[0]!, target);
      return;
    } else if (components.length === 0) {
      target.getLayerlessNodes().length = 0;
      target.getSize().x = 0;
      target.getSize().y = 0;
      return;
    }
    // Java line 61 'assert !components.contains(target)' is omitted (dev-only check)
    // Sort components
    this.sortComponents(components, target);

    const firstComponent = components[0]!;
    target.getLayerlessNodes().length = 0;
    target.copyProperties(firstComponent);

    const maxRowWidth = SimpleRowGraphPlacer.determineMaxRowWidth(components, target);
    const componentSpacing = target.getProperty(LayeredOptions.SPACING_COMPONENT_COMPONENT);

    this.placeComponents(components, target, maxRowWidth, componentSpacing);

    // if compaction is desired, do so!
    if (firstComponent.getProperty(LayeredOptions.COMPACTION_CONNECTED_COMPONENTS)) {
      this.compactComponents(components, target, componentSpacing);
    }

    // finally move the components to the combined graph
    this.moveGraphs(target, components, 0, 0);
  }

  /**
   * The single component branch of `combine` (split out for the complexity limits).
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/SimpleRowGraphPlacer.java:44
   */
  private combineSingleComponent(source: LGraph, target: LGraph): void {
    if (source !== target) {
      target.getLayerlessNodes().length = 0;
      this.moveGraph(target, source, 0, 0);
      target.copyProperties(source);
      target.getPadding().copy(source.getPadding());
      target.getSize().x = source.getSize().x;
      target.getSize().y = source.getSize().y;
    }
  }

  /**
   * The maximal row width of `combine`: the maximal box width and the total area (split out for the complexity
   * limits).
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/SimpleRowGraphPlacer.java:67
   */
  private static determineMaxRowWidth(components: LGraph[], target: LGraph): number {
    // determine the maximal row width by the maximal box width and the total area
    let maxRowWidth = 0.0;
    let totalArea = 0.0;
    for (const graph of components) {
      const size = graph.getSize();
      maxRowWidth = Math.max(maxRowWidth, size.x);
      totalArea += size.x * size.y;
    }
    return Math.max(
      maxRowWidth,
      Float32.fromDouble(Math.sqrt(totalArea)) * target.getProperty(LayeredOptions.ASPECT_RATIO),
    );
  }

  /**
   * The compaction block of `combine` (split out for the complexity limits; Java order kept).
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/SimpleRowGraphPlacer.java:84
   */
  private compactComponents(components: LGraph[], target: LGraph, componentSpacing: number): void {
    const compactor = new ComponentsCompactor();
    compactor.compact(components, target.getSize(), componentSpacing);

    // the compaction algorithm places components absolutely,
    // therefore we have to use the final drawing's offset
    for (const h of components) {
      h.getOffset().reset().add(compactor.getOffset());
    }

    // set the new graph size
    target.getSize().reset().add(compactor.getGraphSize());
  }

  /**
   * Sorts the components by priority and size, unless the model order of components is considered.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/SimpleRowGraphPlacer.java:108
   */
  sortComponents(components: LGraph[], target: LGraph): void {
    if (target.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_COMPONENTS) === ComponentOrderingStrategy.NONE) {
      // assign priorities
      for (const graph of components) {
        let priority = 0;
        for (const node of graph.getLayerlessNodes()) {
          priority = Int32.add(priority, node.getProperty(LayeredOptions.PRIORITY));
        }
        graph.id = priority;
      }

      // sort the components by their priority and size.
      components.sort((graph1, graph2) => {
        const prio = Int32.sub(graph2.id, graph1.id);
        if (prio === 0) {
          const size1 = graph1.getSize().x * graph1.getSize().y;
          const size2 = graph2.getSize().x * graph2.getSize().y;
          return DoubleCompare.compare(size1, size2);
        }
        return prio;
      });
    }
  }

  /**
   * Places the components in rows.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/SimpleRowGraphPlacer.java:142
   */
  placeComponents(components: LGraph[], target: LGraph, maxRowWidth: number, componentSpacing: number): void {
    // place nodes iteratively into rows
    let xpos = 0;
    let ypos = 0;
    let highestBox = 0;
    let broadestRow = componentSpacing;
    for (const graph of components) {
      const size = graph.getSize();
      if (xpos + size.x > maxRowWidth) {
        // place the graph into the next row
        xpos = 0;
        ypos += highestBox + componentSpacing;
        highestBox = 0;
      }
      const offset = graph.getOffset();
      this.offsetGraph(graph, xpos + offset.x, ypos + offset.y);
      offset.reset();
      broadestRow = Math.max(broadestRow, xpos + size.x);
      highestBox = Math.max(highestBox, size.y);
      xpos += size.x + componentSpacing;
    }

    target.getSize().x = broadestRow;
    target.getSize().y = ypos + highestBox;
  }
}
