// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import type { Direction } from '../../../core/options/Direction.js';
import type { PortSide } from '../../../core/options/PortSide.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import type { IExternalExtension } from '../compaction/components/IExternalExtension.js';
import type { LEdge } from '../graph/LEdge.js';
import { portSideToDirection } from './ComponentsCompactorPortSides.js';

/**
 * Represents the union of multiple external extensions.
 *
 * `edges` is a Java identity-keyed `HashSet` (W6/AD-10) that is iterated (`InternalComponent.getExternalEdges`
 * and the components transformer): a JS `Set`, whose insertion order is the order a `-XX:hashCode=2` JVM
 * yields below the treeify threshold.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:668
 */
export class ComponentsCompactorInternalUnionExternalExtension implements IExternalExtension<Set<LEdge>> {
  edges: Set<LEdge> = new Set<LEdge>();
  side!: PortSide;
  extension!: ElkRectangle;
  placeholder!: ElkRectangle;

  getRepresentative(): Set<LEdge> {
    return this.edges;
  }

  getRepresentor(): ElkRectangle {
    return this.extension;
  }

  getParent(): ElkRectangle {
    throw new UnsupportedOperationException();
  }

  getDirection(): Direction {
    return portSideToDirection(this.side);
  }

  getPlaceholder(): ElkRectangle {
    return this.placeholder;
  }
}
