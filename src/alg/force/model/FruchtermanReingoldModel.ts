// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../../core/math/KVector.js';
import type { FGraph } from '../graph/FGraph.js';
import type { FParticle } from '../graph/FParticle.js';
import { ForceOptions } from '../options/ForceOptions.js';
import { AbstractForceModel } from './AbstractForceModel.js';

/**
 * A force model after the Fruchterman-Reingold approach.
 *
 * @author msp
 * @author tmn
 * @author fhol
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/model/FruchtermanReingoldModel.java
 */
export class FruchtermanReingoldModel extends AbstractForceModel {
  /** factor that determines the C constant used for calculation of K. */
  private static readonly SPACING_FACTOR: number = 0.01;
  /** factor used for repulsive force when the distance of two particles is zero. */
  private static readonly ZERO_FACTOR: number = 100;

  /** the current temperature of the system. */
  private temperature: number = ForceOptions.TEMPERATURE.getDefault();
  /** the temperature threshold for stopping the model. */
  private threshold: number = 0;
  /** the main constant used for force calculations. */
  private k: number = 0;

  protected override initialize(graph: FGraph): void {
    super.initialize(graph);
    this.temperature = graph.getProperty(ForceOptions.TEMPERATURE);
    this.threshold = this.temperature / graph.getProperty(ForceOptions.ITERATIONS);

    // calculate an appropriate value for K
    const n: number = graph.getNodes().length;
    let totalWidth = 0;
    let totalHeight = 0;
    for (const v of graph.getNodes()) {
      totalWidth += v.getSize().x;
      totalHeight += v.getSize().y;
    }
    const area: number = totalWidth * totalHeight;
    const c: number = graph.getProperty(ForceOptions.SPACING_NODE_NODE) * FruchtermanReingoldModel.SPACING_FACTOR;
    this.k = Math.sqrt(area / (2 * n)) * c;
  }

  protected override moreIterations(_count: number): boolean {
    return this.temperature > 0;
  }

  protected override calcDisplacement(forcer: FParticle, forcee: FParticle): KVector | null {
    AbstractForceModel.avoidSamePosition(this.getRandom(), forcer, forcee);

    // compute distance (z in the original algorithm)
    const displacement: KVector = forcee.getPosition().clone().sub(forcer.getPosition());
    const length: number = displacement.length();
    const d: number = Math.max(0, length - forcer.getRadius() - forcee.getRadius());

    // calculate repulsive force, independent of adjacency
    let force: number = FruchtermanReingoldModel.repulsive(d, this.k) * forcer.getProperty(ForceOptions.PRIORITY);

    // calculate attractive force, depending of adjacency
    const connection: number = this.getGraph().getConnection(forcer, forcee);
    if (connection > 0) {
      force -= FruchtermanReingoldModel.attractive(d, this.k) * connection;
    }

    // scale distance vector to the amount of repulsive forces
    displacement.scale((force * this.temperature) / length);

    return displacement;
  }

  protected override iterationDone(): void {
    super.iterationDone();
    this.temperature -= this.threshold;
  }

  /**
   * Calculates the amount of repulsive force along a distance.
   *
   * @param d the distance over which the force exerts
   * @param k the space parameter, depending on the available area
   * @return the amount of the repulsive force
   */
  private static repulsive(d: number, k: number): number {
    if (d > 0) {
      return (k * k) / d;
    } else {
      return k * k * FruchtermanReingoldModel.ZERO_FACTOR;
    }
  }

  /**
   * Calculates the amount of attracting force along a distance.
   *
   * @param d the distance over which the force exerts
   * @param k the space-parameter, depending on the available area
   * @return the amount of the attracting force
   */
  static attractive(d: number, k: number): number {
    return (d * d) / k;
  }
}
