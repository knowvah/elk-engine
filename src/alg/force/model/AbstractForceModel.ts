// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { Random } from '../../../java/util/Random.js';
import { FBendpoint } from '../graph/FBendpoint.js';
import type { FEdge } from '../graph/FEdge.js';
import type { FGraph } from '../graph/FGraph.js';
import type { FParticle } from '../graph/FParticle.js';
import { ForceOptions } from '../options/ForceOptions.js';
import { InternalProperties } from '../options/InternalProperties.js';

/**
 * Superclass for force models.
 *
 * @author msp
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/model/AbstractForceModel.java
 */
export abstract class AbstractForceModel {
  /** the random number generator used for this model. */
  private random!: Random;
  /** the graph for which this model was initialized. */
  private graph!: FGraph;
  /** upper bound for particle coordinates. */
  private dispBound: number = 0;

  /** factor by which nodes influence the displacement bound. */
  private static readonly DISP_BOUND_FACTOR: number = 16;

  /**
   * Initialize the force model with the given graph. Subclasses that override this must call the superclass method
   * first.
   *
   * @param fgraph a force graph
   */
  protected initialize(fgraph: FGraph): void {
    this.graph = fgraph;
    this.random = fgraph.getProperty(InternalProperties.RANDOM);

    // calculate the adjacency matrix for the graph
    fgraph.calcAdjacency();

    // calculate an upper bound for particle displacement
    this.dispBound = Math.max(
      fgraph.getNodes().length * AbstractForceModel.DISP_BOUND_FACTOR + fgraph.getEdges().length,
      AbstractForceModel.DISP_BOUND_FACTOR * AbstractForceModel.DISP_BOUND_FACTOR,
    );

    // if interactive mode is off, randomize the layout
    if (!fgraph.getProperty(ForceOptions.INTERACTIVE)) {
      const posScale: number = this.graph.getNodes().length;
      for (const node of fgraph.getNodes()) {
        const pos: KVector = node.getPosition();
        pos.x = this.random.nextDouble() * posScale;
        pos.y = this.random.nextDouble() * posScale;
      }
    }

    // create bend points for node repulsion
    const bends: FBendpoint[] = fgraph.getBendpoints();
    for (const edge of fgraph.getEdges()) {
      const count: number = edge.getProperty(ForceOptions.REPULSIVE_POWER);
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          bends.push(new FBendpoint(edge));
        }
        edge.distributeBendpoints();
      }
    }
  }

  /**
   * Return the graph for which the model was initialized.
   *
   * @return the force graph
   */
  getGraph(): FGraph {
    return this.graph;
  }

  /**
   * Return the random number generator for this model.
   *
   * @return the random number generator
   */
  protected getRandom(): Random {
    return this.random;
  }

  /**
   * Perform layout on the given force graph.
   *
   * @param fgraph a force graph
   * @param monitor a progress monitor
   */
  layout(fgraph: FGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Component Layout', 1);
    this.initialize(fgraph);
    let iterations = 0;

    while (this.moreIterations(iterations) && !monitor.isCanceled()) {
      this.iterationDone();
      // calculate attractive and repulsive forces
      for (const v of fgraph.getParticles()) {
        for (const u of fgraph.getParticles()) {
          if (u !== v) {
            const displacement: KVector | null = this.calcDisplacement(u, v);
            if (displacement !== null) {
              v.getDisplacement().add(displacement);
            }
          }
        }
      }

      // apply calculated displacement
      for (const v of fgraph.getParticles()) {
        const d: KVector = v.getDisplacement();
        d.bound(-this.dispBound, -this.dispBound, this.dispBound, this.dispBound);
        v.getPosition().add(d);
        d.reset();
      }
      iterations++;
    }
    monitor.done();
  }

  /**
   * Perform all necessary calculations after a full iteration. Subclasses must call the superclass method first.
   */
  protected iterationDone(): void {
    for (const edge of this.graph.getEdges()) {
      // adjust label positions
      for (const label of edge.getLabels()) {
        label.refreshPosition();
      }

      // adjust bend point positions
      edge.distributeBendpoints();
    }
  }

  /**
   * Determine whether more iterations need to be performed.
   *
   * @param count the current iterations count
   * @return `true` if more iterations shall be done
   */
  protected abstract moreIterations(count: number): boolean;

  /**
   * Calculate a displacement for the given particles.
   *
   * @param forcer the particle that is causing the force
   * @param forcee the particle that is affected by the force
   * @return a displacement vector for the forcee, or `null` if no force is applied
   */
  protected abstract calcDisplacement(forcer: FParticle, forcee: FParticle): KVector | null;

  /**
   * Avoid having nodes on the same position by moving them a little.
   *
   * @param random the random number generator
   * @param u first node
   * @param v second node
   */
  static avoidSamePosition(random: Random, u: FParticle, v: FParticle): void {
    const pu: KVector = u.getPosition();
    const pv: KVector = v.getPosition();
    while (pu.x - pv.x === 0 && pu.y - pv.y === 0) {
      // Declared inside the loop, as in the Java: it is false at every test below, so the bend point arm is taken
      // whenever both particles are bend points (and loops forever for coincident bend points of antiparallel edges,
      // upstream issue #69; no guard here, the port copies that).
      let triedForBendPoints = false;
      if (u instanceof FBendpoint && v instanceof FBendpoint && !triedForBendPoints) {
        // Wiggle orthogonal to edge direction
        const uE: FEdge = u.getEdge();
        const uVector: KVector = new KVector(uE.getTargetPoint()).sub(uE.getSourcePoint());
        let length = 2;
        const orthogonaluV: KVector = new KVector(
          (uVector.x / uVector.length()) * length,
          (-uVector.y / uVector.length()) * length,
        );
        pu.add(orthogonaluV);

        const vE: FEdge = v.getEdge();
        const vVector: KVector = new KVector(vE.getTargetPoint()).sub(vE.getSourcePoint());
        // Java compares references: uVector and vVector are two distinct objects, so this is always false (length 2).
        length = uVector === vVector ? -2 : 2;
        const orthogonalvV: KVector = new KVector(
          (vVector.x / vVector.length()) * length,
          -(vVector.y / vVector.length()) * length,
        );
        pu.add(orthogonalvV);
        triedForBendPoints = true;
      } else {
        pu.wiggle(random, 1);
        pv.wiggle(random, 1);
      }
    }
  }
}
