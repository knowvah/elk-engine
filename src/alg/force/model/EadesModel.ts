// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../../core/math/KVector.js';
import { log } from '../../../java/lang/JavaMath.js';
import type { FGraph } from '../graph/FGraph.js';
import type { FParticle } from '../graph/FParticle.js';
import { ForceOptions } from '../options/ForceOptions.js';
import { AbstractForceModel } from './AbstractForceModel.js';

/**
 * A force model after the Eades approach.
 *
 * @author msp
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/model/EadesModel.java
 */
export class EadesModel extends AbstractForceModel {
  /** factor used for force calculations when the distance of two particles is zero. */
  private static readonly ZERO_FACTOR: number = 100;

  /** the maximal number of iterations after which the model stops. */
  private maxIterations: number = ForceOptions.ITERATIONS.getDefault();
  /** the spring length that determines the optimal distance of connected nodes. */
  private springLength: number = ForceOptions.SPACING_NODE_NODE.getDefault();
  /** additional factor for repulsive forces. */
  private repulsionFactor: number = ForceOptions.REPULSION.getDefault();

  protected override initialize(graph: FGraph): void {
    super.initialize(graph);
    this.maxIterations = graph.getProperty(ForceOptions.ITERATIONS);
    this.springLength = graph.getProperty(ForceOptions.SPACING_NODE_NODE);
    this.repulsionFactor = graph.getProperty(ForceOptions.REPULSION);
  }

  protected override moreIterations(count: number): boolean {
    return count < this.maxIterations;
  }

  protected override calcDisplacement(forcer: FParticle, forcee: FParticle): KVector | null {
    AbstractForceModel.avoidSamePosition(this.getRandom(), forcer, forcee);

    // compute distance (z in the original algorithm)
    const displacement: KVector = forcee.getPosition().clone().sub(forcer.getPosition());
    const length: number = displacement.length();
    const d: number = Math.max(0, length - forcer.getRadius() - forcee.getRadius());

    // calculate attractive or repulsive force, depending of adjacency
    let force: number;
    const connection: number = this.getGraph().getConnection(forcer, forcee);
    if (connection > 0) {
      force = -EadesModel.attractive(d, this.springLength) * connection;
    } else {
      force = EadesModel.repulsive(d, this.repulsionFactor) * forcer.getProperty(ForceOptions.PRIORITY);
    }

    // scale distance vector to the amount of repulsive forces
    displacement.scale(force / length);

    return displacement;
  }

  /**
   * Compute repulsion force between the forcee and the forcer.
   *
   * @param d the distance between the two particles
   * @param r the factor for repulsive force
   * @return a force exerted on the forcee
   */
  private static repulsive(d: number, r: number): number {
    if (d > 0) {
      return r / (d * d);
    } else {
      return r * EadesModel.ZERO_FACTOR;
    }
  }

  /**
   * Compute attraction force between the forcee and the forcer.
   *
   * @param d the distance between the two particles
   * @param s the spring length
   * @return a force exerted on the forcee
   */
  static attractive(d: number, s: number): number {
    if (d > 0) {
      // Math.log: the bit-exact shim (FD3), never the engine's Math.log
      return log(d / s);
    } else {
      return -EadesModel.ZERO_FACTOR;
    }
  }
}
