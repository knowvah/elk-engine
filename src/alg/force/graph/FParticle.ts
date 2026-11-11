// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { MapPropertyHolder } from '../../../graph/properties/MapPropertyHolder.js';

/**
 * A particle in the force graph, that is an object that can attract or repulse other particles.
 *
 * @author owo
 * @author msp
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/graph/FParticle.java
 */
export abstract class FParticle extends MapPropertyHolder {
  /** particle position displacement for each iteration. */
  private readonly displacement: KVector = new KVector();
  /** Position of this particle. */
  private readonly position: KVector = new KVector();
  /** Width and height of graphical representation. */
  private readonly size: KVector = new KVector();

  /**
   * Returns the position vector of this particle.
   *
   * @return the position vector
   */
  getPosition(): KVector {
    return this.position;
  }

  /**
   * Returns the size of this particle.
   *
   * @return the dimension vector
   */
  getSize(): KVector {
    return this.size;
  }

  /**
   * Calculate radius for this particle.
   *
   * @return radius of smallest circle surrounding shape of p
   */
  getRadius(): number {
    return this.size.length() / 2;
  }

  /**
   * Returns the displacement vector.
   *
   * @return the displacement vector
   */
  getDisplacement(): KVector {
    return this.displacement;
  }
}
