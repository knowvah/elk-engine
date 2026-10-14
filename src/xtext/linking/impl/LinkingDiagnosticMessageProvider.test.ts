// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Node, NODE_REFERENCE } from '../../../../test/helpers/xtext/ScopeFixture.js';
import { LINKING_DIAGNOSTIC } from '../../diagnostics/Diagnostic.js';
import { Severity } from '../../diagnostics/Severity.js';
import type { INode } from '../../nodemodel/INode.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import type { ILinkingDiagnosticContext } from '../ILinkingDiagnosticMessageProvider.js';
import { IllegalNodeException } from './IllegalNodeException.js';
import { LinkingDiagnosticMessageProvider } from './LinkingDiagnosticMessageProvider.js';

const provider = new LinkingDiagnosticMessageProvider();
const rawNode: INode = { getStartLine: () => 1, getText: () => '^raw', getSemanticElement: () => null };

function context(
  linkText: () => string | null,
  reference: EReferenceInfo | null = NODE_REFERENCE,
): ILinkingDiagnosticContext {
  return { getContext: () => Node.of('c'), getReference: () => reference, getLinkText: linkText };
}

describe('LinkingDiagnosticMessageProvider', () => {
  it('words an unresolved reference with the type name and link text', () => {
    const message = provider.getUnresolvedProxyMessage(context(() => 'x'));
    expect([message.getMessage(), message.getSeverity(), message.getIssueCode(), message.getIssueData()]).toEqual([
      "Couldn't resolve reference to Node 'x'.",
      Severity.ERROR,
      LINKING_DIAGNOSTIC,
      [],
    ]);
  });

  it('falls back to the raw node text when the link text cannot be converted', () => {
    const failing = context(() => {
      throw new IllegalNodeException(rawNode, 'bad');
    });
    expect(provider.getUnresolvedProxyMessage(failing).getMessage()).toBe("Couldn't resolve reference to Node '^raw'.");
  });

  it('rethrows other errors from the link text', () => {
    const failing = context(() => {
      throw new RangeError('boom');
    });
    expect(() => provider.getUnresolvedProxyMessage(failing)).toThrow(RangeError);
  });

  it('uses the exception message for an illegal node', () => {
    const message = provider.getIllegalNodeMessage(
      context(() => 'x'),
      new IllegalNodeException(rawNode, 'oops'),
    );
    expect([message.getMessage(), message.getSeverity()]).toEqual(['oops', Severity.ERROR]);
  });

  it('words an illegal cross reference without needing a reference', () => {
    const message = provider.getIllegalCrossReferenceMessage(
      context(() => 'x', null),
      'nosuch',
    );
    expect(message.getMessage()).toBe('Cannot find reference nosuch');
  });

  it.each([
    [1, 1, "Too many matches for reference to 'a'. Feature target can only hold 1 reference but found 1 candidate"],
    [1, 2, "Too many matches for reference to 'a'. Feature target can only hold 1 reference but found 2 candidates"],
    [0, 1, "Too many matches for reference to 'a'. Feature target can only hold 0 references but found 1 candidate"],
    [-1, 3, "Too many matches for reference to 'a'. Feature target can only hold -1 references but found 3 candidates"],
  ])('words the bounds violation for upper bound %i and %i links', (upperBound, size, expected) => {
    const reference = { ...NODE_REFERENCE, upperBound };
    expect(
      provider
        .getViolatedBoundsConstraintMessage(
          context(() => 'a', reference),
          size,
        )
        .getMessage(),
    ).toBe(expected);
  });

  it('words the unique violation', () => {
    expect(provider.getViolatedUniqueConstraintMessage(context(() => 'a')).getMessage()).toBe(
      "Cannot refer to 'a' more than once.",
    );
  });

  it('refuses a message that needs a reference when there is none', () => {
    expect(() => provider.getUnresolvedProxyMessage(context(() => 'a', null))).toThrow(TypeError);
  });
});
