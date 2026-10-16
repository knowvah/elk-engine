// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import { QualifiedName } from '../../../../xtext/naming/QualifiedName.js';
import type { EReferenceInfo } from '../../../../xtext/scoping/EReferenceInfo.js';
import { NULLSCOPE, type IScope } from '../../../../xtext/scoping/IScope.js';
import { DelegatingScopeProvider } from '../../../../xtext/scoping/impl/DelegatingScopeProvider.js';
import { scopeFor } from '../../../../xtext/scoping/Scopes.js';
import type { ElkEdgeSection } from '../../../ElkEdgeSection.js';

const SECTION_WITHOUT_EDGE = 'An edge section being linked must have a parent edge';

/** `ElkGraphPackage.Literals.ELK_EDGE_SECTION__OUTGOING_SECTIONS`, told apart by name and owner type. */
const OUTGOING_SECTIONS_NAME = 'outgoingSections';
const ELK_EDGE_SECTION_CLASS = 'ElkEdgeSection';

/**
 * Section references see only the sections of the same edge, by plain identifier, with no outer scope;
 * every other reference uses the delegate (the generated empty `AbstractElkGraphJsonScopeProvider` is
 * folded into the `DelegatingScopeProvider` base, its constructor argument being the delegate).
 *
 * The reference literal is matched structurally: `src/graph/json/text` must not import the literal from
 * `src/graph/text` (AD-8), and `outgoingSections` is the only reference of that name and type.
 *
 * @see plugins/org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/scoping/ElkGraphJsonScopeProvider.xtend
 * @see plugins/org.eclipse.elk.graph.json.text/src-gen/org/eclipse/elk/graph/json/text/scoping/AbstractElkGraphJsonScopeProvider.java
 */
export class ElkGraphJsonScopeProvider extends DelegatingScopeProvider {
  override getScope(context: EObject, reference: EReferenceInfo): IScope {
    if (isOutgoingSections(reference)) {
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

function isOutgoingSections(reference: EReferenceInfo): boolean {
  return reference.name === OUTGOING_SECTIONS_NAME && reference.referenceType.name === ELK_EDGE_SECTION_CLASS;
}
