// SPDX-License-Identifier: EPL-2.0
import type { Diagnostic } from '../../diagnostics/Diagnostic.js';
import type { DiagnosticMessage } from '../../diagnostics/DiagnosticMessage.js';
import { AbstractDiagnosticProducer } from '../../diagnostics/AbstractDiagnosticProducer.js';
import type { IDiagnosticConsumer } from '../../diagnostics/IDiagnosticConsumer.js';
import { XtextLinkingDiagnostic } from './XtextLinkingDiagnostic.js';

/**
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/impl/LinkingDiagnosticProducer.java
 */
export class LinkingDiagnosticProducer extends AbstractDiagnosticProducer {
  constructor(consumer: IDiagnosticConsumer) {
    super(consumer);
  }

  protected override createDiagnostic(message: DiagnosticMessage): Diagnostic {
    return new XtextLinkingDiagnostic(
      this.getNode(),
      message.getMessage(),
      message.getIssueCode(),
      message.getIssueData(),
    );
  }
}
