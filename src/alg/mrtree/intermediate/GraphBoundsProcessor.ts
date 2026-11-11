// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { InternalProperties } from '../options/InternalProperties.js';

/**
 * Java `tGraph.getNodes().stream().mapToDouble(f).min().getAsDouble()`: `DoubleStream.min` reduces with `Math.min`; an
 * empty stream has no value to get.
 */
function streamMin(nodes: Iterable<TNode>, f: (node: TNode) => number): number {
  let result: number | undefined;
  for (const node of nodes) {
    const value = f(node);
    result = result === undefined ? value : Math.min(result, value);
  }
  if (result === undefined) {
    throw new NoSuchElementException('No value present');
  }
  return result;
}

/** As {@link streamMin} for `DoubleStream.max` (`Math.max`). */
function streamMax(nodes: Iterable<TNode>, f: (node: TNode) => number): number {
  let result: number | undefined;
  for (const node of nodes) {
    const value = f(node);
    result = result === undefined ? value : Math.max(result, value);
  }
  if (result === undefined) {
    throw new NoSuchElementException('No value present');
  }
  return result;
}

/**
 * Sets the graphs x/y max/min properties.
 *
 * @author jnc, sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/intermediate/GraphBoundsProcessor.java
 */
export class GraphBoundsProcessor implements ILayoutProcessor<TGraph> {
  process(tGraph: TGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Process graph bounds', 1);

    tGraph.setProperty(
      InternalProperties.GRAPH_XMIN,
      streamMin(tGraph.getNodes(), (x) => x.getPosition().x),
    );
    tGraph.setProperty(
      InternalProperties.GRAPH_YMIN,
      streamMin(tGraph.getNodes(), (x) => x.getPosition().y),
    );
    tGraph.setProperty(
      InternalProperties.GRAPH_XMAX,
      streamMax(tGraph.getNodes(), (x) => x.getPosition().x + x.getSize().x),
    );
    tGraph.setProperty(
      InternalProperties.GRAPH_YMAX,
      streamMax(tGraph.getNodes(), (x) => x.getPosition().y + x.getSize().y),
    );

    progressMonitor.done();
  }
}
