// SPDX-License-Identifier: EPL-2.0
import { Pair } from './Pair.js';

/**
 * Only `pair` is ported; `toMap` and the triple factories have no caller.
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/Tuples.java
 */
function pair<A, B>(a: A, b: B): Pair<A, B> {
  return new Pair(a, b);
}

export const Tuples = { pair } as const;
