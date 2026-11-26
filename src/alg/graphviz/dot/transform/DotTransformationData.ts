// SPDX-License-Identifier: EPL-2.0
import { MapPropertyHolder } from '../../../../graph/properties/MapPropertyHolder.js';
import type { IDotTransformationData } from './IDotTransformationData.js';

/**
 * Pretty much a copy of the format service's `TransformationData` class. This class is necessary to keep GraphViz Dot
 * itself independent from the formats service.
 *
 * `S` is the source graph type, `T` the target graph type. `serialVersionUID` is not ported (no Java serialization).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotTransformationData.java
 */
export class DotTransformationData<S, T> extends MapPropertyHolder implements IDotTransformationData<S, T> {
  /** the original source graph. */
  private sourceGraph: S | null = null;
  /** the transformed target graphs. */
  private readonly layoutGraphs: T[] = [];
  /** the log messages. */
  private readonly logMessages: string[] = [];

  setSourceGraph(srcGraph: S | null): void {
    this.sourceGraph = srcGraph;
  }

  getSourceGraph(): S | null {
    return this.sourceGraph;
  }

  getTargetGraphs(): T[] {
    return this.layoutGraphs;
  }

  log(msg: string): void {
    this.logMessages.push(msg);
  }

  getMessages(): Iterable<string> {
    return this.logMessages;
  }
}
