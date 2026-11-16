// SPDX-License-Identifier: EPL-2.0
import type { LEdge } from '../graph/LEdge.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { PortType } from '../options/PortType.js';

/**
 * An internal representation for external ports. This class is used to pass information gathered on one hierarchy
 * level to the containing hierarchy level. Instances are created whenever a cross-hierarchy edge crosses the hierarchy
 * bounds of a parent node; the instance represents the split point of the edge.
 *
 * Java: the private static nested class `CompoundGraphPreprocessor.ExternalPort`; its private fields are read and
 * written by the outer class, so they are public here (the section modules are the outer class's methods).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export class ExternalPort {
  /** the list of original edges for which the port is created. */
  readonly origEdges: LEdge[] = [];
  /** the new edge by which the original edge is replaced. */
  newEdge: LEdge;
  /** the dummy node used by the algorithm as representative for the external port. */
  dummyNode: LNode;
  /** the dummy port used by the algorithm as representative for the external port. */
  dummyPort: LPort;
  /** the flow direction: input or output. */
  type: PortType = PortType.UNDEFINED;
  /**
   * whether the external port will be exported to the outside or not. (it will not be exported if the port was
   * introduced for connections from an inside node to its parent)
   */
  exported: boolean;

  /**
   * Create an external port. Java's six parameters (one more than the 5-parameter limit) arrive as one
   * {@link ExternalPortArgs} object with the Java names (the `ExternalPortDummyArgs` precedent).
   */
  constructor(args: ExternalPortArgs) {
    this.origEdges.push(args.origEdge);
    this.newEdge = args.newEdge;
    this.dummyNode = args.dummyNode;
    this.dummyPort = args.dummyPort;
    this.type = args.portType;
    this.exported = args.exported;
  }
}

/** The parameters of the `ExternalPort` constructor, named as in Java. */
export interface ExternalPortArgs {
  /** the original edge for which the port is created */
  readonly origEdge: LEdge;
  /** the new edge by which the original edge is replaced */
  readonly newEdge: LEdge;
  /** the dummy node used by the algorithm as representative for the external port */
  readonly dummyNode: LNode;
  /** the dummy port used by the algorithm as representative for the external port */
  readonly dummyPort: LPort;
  /** the flow direction: input or output */
  readonly portType: PortType;
  /** whether the external port is to be exported by its parent. */
  readonly exported: boolean;
}
