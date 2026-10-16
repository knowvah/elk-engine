// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import { DefaultDeclarativeQualifiedNameProvider } from '../../../../xtext/naming/DefaultDeclarativeQualifiedNameProvider.js';
import { QualifiedName } from '../../../../xtext/naming/QualifiedName.js';
import { ElkGraphElementImpl } from '../../../impl/ElkGraphElementImpl.js';

/**
 * The qualified name of a graph element is its identifier as a single segment, whatever its nesting
 * (unlike `.elkt`, which prefixes the names of the ancestors). An element without identifier has no
 * name (`QualifiedName.create(null)` throws, which the dispatcher turns into "no name"). The Xtend
 * dispatch on the argument type is the `instanceof` check.
 *
 * @see plugins/org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/naming/ElkGraphJsonQualifiedNameProvider.xtend
 */
export class ElkGraphJsonQualifiedNameProvider extends DefaultDeclarativeQualifiedNameProvider {
  protected override qualifiedName(ele: EObject): QualifiedName | null {
    if (ele instanceof ElkGraphElementImpl) {
      return QualifiedName.create(ele.getIdentifier());
    }
    return super.qualifiedName(ele);
  }
}
