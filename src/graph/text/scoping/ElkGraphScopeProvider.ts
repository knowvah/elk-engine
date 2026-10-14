// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import { QualifiedName } from '../../../xtext/naming/QualifiedName.js';
import type { EReferenceInfo } from '../../../xtext/scoping/EReferenceInfo.js';
import { NULLSCOPE, type IScope } from '../../../xtext/scoping/IScope.js';
import { DelegatingScopeProvider } from '../../../xtext/scoping/impl/DelegatingScopeProvider.js';
import { scopeFor } from '../../../xtext/scoping/Scopes.js';
import type { ElkEdgeSection } from '../../ElkEdgeSection.js';
import { ELK_EDGE_SECTION__OUTGOING_SECTIONS } from '../linking/ElkGraphReferences.js';

const SECTION_WITHOUT_EDGE = 'An edge section being linked must have a parent edge';

/**
 * Section references see only the sections of the same edge, by plain identifier, with no outer scope;
 * every other reference uses the delegate (the local scope provider; the empty generated
 * `AbstractElkGraphScopeProvider` is folded into the `DelegatingScopeProvider` base, its constructor
 * argument being the delegate).
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/scoping/ElkGraphScopeProvider.xtend
 * @see org.eclipse.elk.graph.text/src-gen/org/eclipse/elk/graph/text/scoping/AbstractElkGraphScopeProvider.java
 */
export class ElkGraphScopeProvider extends DelegatingScopeProvider {
  override getScope(context: EObject, reference: EReferenceInfo): IScope {
    if (reference === ELK_EDGE_SECTION__OUTGOING_SECTIONS) {
      // cast: the reference belongs to ElkEdgeSection, so the linking context is a section
      return this.getScopeForEdgeSection(context as ElkEdgeSection);
    }
    return super.getScope(context, reference);
  }

  private getScopeForEdgeSection(section: ElkEdgeSection): IScope {
    const edge = section.getParent();
    // Xtend would raise a NullPointerException on the dereference
    if (edge === null) throw new TypeError(SECTION_WITHOUT_EDGE);
    return scopeFor(edge.getSections(), (s) => QualifiedName.create(s.getIdentifier()), NULLSCOPE);
  }
}
