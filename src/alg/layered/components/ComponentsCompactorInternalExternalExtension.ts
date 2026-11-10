// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import type { Direction } from '../../../core/options/Direction.js';
import type { PortSide } from '../../../core/options/PortSide.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { IExternalExtension } from '../compaction/components/IExternalExtension.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LPort } from '../graph/LPort.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { portSideToDirection } from './ComponentsCompactorPortSides.js';

/**
 * Internal implementation of the {@link IExternalExtension} interface. Contains the {@link LEdge} which
 * represents the external edge alongside which of the two ports is the external port and on which side of
 * the parent node the port is located.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:715
 */
export class ComponentsCompactorInternalExternalExtension implements IExternalExtension<LEdge> {
  edge: LEdge;
  externalPort!: LPort;
  externalPortSide!: PortSide;

  // the following are calculated (never assigned in the Java either)
  externalExtension!: ElkRectangle;
  parent!: ElkRectangle;

  constructor(edge: LEdge) {
    // housekeeping
    this.edge = edge;
    if (edge.getSource()!.getNode()!.getType() === NodeType.EXTERNAL_PORT) {
      this.externalPort = edge.getSource()!;
      this.externalPortSide = edge.getSource()!.getNode()!.getProperty(InternalProperties.EXT_PORT_SIDE);
    } else if (edge.getTarget()!.getNode()!.getType() === NodeType.EXTERNAL_PORT) {
      this.externalPort = edge.getTarget()!;
      this.externalPortSide = edge.getTarget()!.getNode()!.getProperty(InternalProperties.EXT_PORT_SIDE);
    } else {
      throw new IllegalArgumentException(`Edge ${String(edge)} is not an external edge.`);
    }
  }

  getDirection(): Direction {
    return portSideToDirection(this.externalPortSide);
  }

  getRepresentative(): LEdge {
    return this.edge;
  }

  getRepresentor(): ElkRectangle {
    return this.externalExtension;
  }

  getParent(): ElkRectangle {
    return this.parent;
  }
}
