// SPDX-License-Identifier: EPL-2.0
import type { SelfLoopHolder } from '../SelfLoopHolder.js';

/**
 * Abstract base class for self loop routers.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/routing/AbstractSelfLoopRouter.java
 */
export abstract class AbstractSelfLoopRouter {
  /** Routes the given self loop. */
  abstract routeSelfLoops(slHolder: SelfLoopHolder): void;
}
