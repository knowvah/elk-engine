// SPDX-License-Identifier: EPL-2.0
import type { IPropertyHolder } from '../../../../graph/properties/IPropertyHolder.js';

/**
 * Interface around the layout format service's `TransformationData` class. This is required to eliminate the
 * dependency on the format service.
 *
 * `S` is the source graph type, `T` the target graph type. The Java `List<T>` is an array (translation rules § 6).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/IDotTransformationData.java
 */
export interface IDotTransformationData<S, T> extends IPropertyHolder {
  /** Set the original source graph. */
  setSourceGraph(srcGraph: S | null): void;

  /** Returns the original source graph. */
  getSourceGraph(): S | null;

  /** Returns the transformed target graphs. */
  getTargetGraphs(): T[];

  /** Report a log message: a user friendly message. */
  log(msg: string): void;

  /** Returns the reported log messages. */
  getMessages(): Iterable<string>;
}
