// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import { DefaultDeclarativeQualifiedNameProvider } from '../../../xtext/naming/DefaultDeclarativeQualifiedNameProvider.js';
import { QualifiedName } from '../../../xtext/naming/QualifiedName.js';
import { ElkEdgeSectionImpl } from '../../impl/ElkEdgeSectionImpl.js';
import { ElkGraphElementImpl } from '../../impl/ElkGraphElementImpl.js';

/**
 * The qualified name of a graph element is its identifier below the name of its nearest named ancestor; a
 * section is named by its identifier alone. An element without identifier has no name (its
 * `QualifiedName.create(null)` throws, which the dispatcher turns into "no name"). The Xtend dispatch on
 * the argument type is the `instanceof` ladder (an `ElkEdgeSection` is no `ElkGraphElement`).
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/naming/ElkGraphQualifiedNameProvider.xtend
 */
export class ElkGraphQualifiedNameProvider extends DefaultDeclarativeQualifiedNameProvider {
  protected override qualifiedName(ele: EObject): QualifiedName | null {
    if (ele instanceof ElkGraphElementImpl) {
      return this.prependParentNames(ele, QualifiedName.create(ele.getIdentifier()));
    }
    if (ele instanceof ElkEdgeSectionImpl) {
      return QualifiedName.create(ele.getIdentifier());
    }
    return super.qualifiedName(ele);
  }

  private prependParentNames(object: EObject, name: QualifiedName): QualifiedName {
    for (let curr = object.eContainer(); curr !== null; curr = curr.eContainer()) {
      const parentsQualifiedName = this.getFullyQualifiedName(curr);
      if (parentsQualifiedName !== null) {
        return parentsQualifiedName.append(name);
      }
    }
    return name;
  }
}
