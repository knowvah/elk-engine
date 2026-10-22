// SPDX-License-Identifier: EPL-2.0
import type { Configuration } from './Configuration.js';

/**
 * The generated EMF class `RandGraph`, a plain class (AD-11) whose features are plain fields with the EMF defaults.
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/gRandom/RandGraph.java
 */
export class RandGraph {
  readonly #configs: Configuration[] = [];

  getConfigs(): Configuration[] {
    return this.#configs;
  }
}
