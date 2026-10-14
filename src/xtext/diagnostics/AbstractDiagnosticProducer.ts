// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { INode } from '../nodemodel/INode.js';
import type { EReferenceInfo } from '../scoping/EReferenceInfo.js';
import type { Diagnostic } from './Diagnostic.js';
import type { DiagnosticMessage } from './DiagnosticMessage.js';
import type { IDiagnosticConsumer } from './IDiagnosticConsumer.js';
import type { IDiagnosticProducer } from './IDiagnosticProducer.js';

const NULL_CONSUMER = 'consumer may not be null';

/**
 * @see org.eclipse.xtext/src/org/eclipse/xtext/diagnostics/AbstractDiagnosticProducer.java
 */
export abstract class AbstractDiagnosticProducer implements IDiagnosticProducer {
  readonly #consumer: IDiagnosticConsumer;
  #node: INode | null = null;

  protected constructor(consumer: IDiagnosticConsumer) {
    // the Java NullPointerException; the type excludes null, JS callers may not
    if ((consumer as IDiagnosticConsumer | null) === null) {
      throw new TypeError(NULL_CONSUMER);
    }
    this.#consumer = consumer;
  }

  addDiagnostic(message: DiagnosticMessage): void {
    this.#consumer.consume(this.createDiagnostic(message), message.getSeverity());
  }

  protected abstract createDiagnostic(message: DiagnosticMessage): Diagnostic;

  setNode(node: INode | null): void {
    this.#node = node;
  }

  getNode(): INode | null {
    return this.#node;
  }

  setTarget(_object: EObject, _feature: EReferenceInfo): void {
    // nothing to do
  }
}
