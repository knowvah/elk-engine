// SPDX-License-Identifier: EPL-2.0
import { DiagnosticMessage } from '../../diagnostics/DiagnosticMessage.js';
import { LINKING_DIAGNOSTIC } from '../../diagnostics/Diagnostic.js';
import { Severity } from '../../diagnostics/Severity.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import type {
  ILinkingDiagnosticContext,
  ILinkingDiagnosticMessageProviderExtended,
} from '../ILinkingDiagnosticMessageProvider.js';
import { IllegalNodeException } from './IllegalNodeException.js';

const NO_REFERENCE = 'the diagnostic context has no reference';

/** The reference of a context whose message needs one (everything but the illegal-cross-reference message). */
function requireReference(context: ILinkingDiagnosticContext): EReferenceInfo {
  const reference = context.getReference();
  if (reference === null) throw new TypeError(NO_REFERENCE);
  return reference;
}

function linkingError(message: string): DiagnosticMessage {
  return new DiagnosticMessage(message, Severity.ERROR, LINKING_DIAGNOSTIC);
}

/**
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/impl/LinkingDiagnosticMessageProvider.java
 */
export class LinkingDiagnosticMessageProvider implements ILinkingDiagnosticMessageProviderExtended {
  getUnresolvedProxyMessage(context: ILinkingDiagnosticContext): DiagnosticMessage {
    const referenceType = requireReference(context).referenceType;
    let linkText: string | null;
    try {
      linkText = context.getLinkText();
    } catch (e) {
      if (!(e instanceof IllegalNodeException)) throw e;
      linkText = e.getNode().getText();
    }
    return linkingError(`Couldn't resolve reference to ${referenceType.name} '${linkText}'.`);
  }

  getIllegalNodeMessage(_context: ILinkingDiagnosticContext, ex: IllegalNodeException): DiagnosticMessage {
    return linkingError(ex.message);
  }

  getIllegalCrossReferenceMessage(_context: ILinkingDiagnosticContext, reference: string): DiagnosticMessage {
    return linkingError(`Cannot find reference ${reference}`);
  }

  getViolatedBoundsConstraintMessage(context: ILinkingDiagnosticContext, size: number): DiagnosticMessage {
    const reference = requireReference(context);
    const message =
      `Too many matches for reference to '${context.getLinkText()}'. ` +
      `Feature ${reference.name} can only hold ${reference.upperBound} ` +
      `reference${reference.upperBound !== 1 ? 's' : ''} but found ${size} candidate${size !== 1 ? 's' : ''}`;
    return linkingError(message);
  }

  getViolatedUniqueConstraintMessage(context: ILinkingDiagnosticContext): DiagnosticMessage {
    return linkingError(`Cannot refer to '${context.getLinkText()}' more than once.`);
  }
}
