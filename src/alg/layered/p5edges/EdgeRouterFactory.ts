// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import type { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import { OrthogonalEdgeRouter } from './OrthogonalEdgeRouter.js';
import { PolylineEdgeRouter } from './PolylineEdgeRouter.js';
import { SplineEdgeRouter } from './splines/SplineEdgeRouter.js';

/**
 * Factory for edge routers. This factory is necessary since the {@link EdgeRouting} enumeration is defined outside of
 * ELK Layered and can thus not be made into a factory.
 *
 * @author cds
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/EdgeRouterFactory.java
 */
export class EdgeRouterFactory implements ILayoutPhaseFactory<LayeredPhases, LGraph> {
  /** The cache prevents us from always instantiating new factories (R4: a static `Map` on the class). */
  private static readonly factoryCache: Map<EdgeRouting, EdgeRouterFactory> = new Map();

  /** The edge routing this factory uses to decide which implementation to return. */
  private readonly edgeRoutingStrategy: EdgeRouting;

  private constructor(edgeRoutingStrategy: EdgeRouting) {
    this.edgeRoutingStrategy = edgeRoutingStrategy;
  }

  /**
   * Creates a new factory for the given edge routing strategy. The strategy decides which edge router implementation
   * the factory returns.
   *
   * @param edgeRoutingStrategy the edge routing strategy.
   * @returns the edge router factory.
   */
  static factoryFor(edgeRoutingStrategy: EdgeRouting): EdgeRouterFactory {
    let factory = EdgeRouterFactory.factoryCache.get(edgeRoutingStrategy);
    if (factory === undefined) {
      factory = new EdgeRouterFactory(edgeRoutingStrategy);
      EdgeRouterFactory.factoryCache.set(edgeRoutingStrategy, factory);
    }
    return factory;
  }

  create(): ILayoutPhase<LayeredPhases, LGraph> {
    switch (this.edgeRoutingStrategy) {
      case EdgeRouting.POLYLINE:
        return new PolylineEdgeRouter();

      case EdgeRouting.SPLINES:
        return new SplineEdgeRouter();

      default:
        return new OrthogonalEdgeRouter();
    }
  }
}
