// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';
import type { FormattingToken } from '../FormattingToken.js';
import type { AbstractEObjectRegion } from './AbstractEObjectRegion.js';
import { StringBasedRegionAccess } from './StringBasedRegionAccess.js';
import { StringEObjectRegion } from './StringEObjectRegion.js';
import { StringHiddenRegion } from './StringHiddenRegion.js';
import { StringSemanticRegion } from './StringSemanticRegion.js';

/**
 * Builds a {@link StringBasedRegionAccess} from the token stream of the writer.
 *
 * Invariant (G1/G2): the writer input is a plain ElkGraph without a node model, so the sequencer is never
 * given comments or whitespace. The Java `acceptComment` (lines 80-84) and `acceptWhitespace` (lines 112-119)
 * are therefore dead for this flow and not ported: every hidden region stays empty and undefined.
 * The twelve `accept*` callbacks of the Java `ISequenceAcceptor` all reduce to `appendSemantic` (lines
 * 124-146, here `token`); `acceptUnassignedAction`, `enterUnassignedParserRuleCall`, `finish` and
 * `leaveUnssignedParserRuleCall` are no-ops and not ported; the `enterAssigned*`/`leaveAssigned*` pairs are
 * `enterObject`/`leaveObject`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/TextRegionAccessBuildingSequencer.java
 */
export class TextRegionAccessBuildingSequencer {
  private last: StringHiddenRegion;
  private readonly regionAccess: StringBasedRegionAccess;
  // Java LinkedList used as a stack: push/pop/peek at the head
  private readonly stack: AbstractEObjectRegion[] = [];

  /** `withRoot(ctx, root)` 229-236. The resource is the minimal view `{ contents = [root] }` (no `eResource()`). */
  constructor(rootGrammarElement: string, root: EObject) {
    this.regionAccess = new StringBasedRegionAccess({ getContents: (): readonly EObject[] => [root] });
    this.last = this.createHiddenRegion();
    this.regionAccess.setRootEObject(this.enterEObject(rootGrammarElement, root));
  }

  /** Java private `appendSemantic` 124-146; empty tokens are ignored (125-126). */
  appendSemantic(token: FormattingToken): void {
    if (token.text.length === 0) return;
    const tokens = this.peek();
    if (tokens === null) throw new IllegalStateException(`token '${token.text}' outside of any object`);
    const offset = this.regionAccess.append(token.text);
    const semantic = new StringSemanticRegion(this.regionAccess, tokens, token, offset);
    this.last.setNext(semantic);
    semantic.setLeadingHiddenRegion(this.last);
    this.last = this.createHiddenRegion();
    this.last.setPrevious(semantic);
    semantic.setTrailingHiddenRegion(this.last);
    tokens.addChild(semantic);
    tokens.setTrailingHiddenRegion(this.last);
  }

  protected createHiddenRegion(): StringHiddenRegion {
    return new StringHiddenRegion(this.regionAccess);
  }

  /** `enterEObject` 167-200. */
  enterEObject(grammarElement: string, semanticChild: EObject): StringEObjectRegion {
    const tokens = new StringEObjectRegion(this.regionAccess, grammarElement, semanticChild);
    this.regionAccess.add(tokens);
    tokens.setLeadingHiddenRegion(this.last);
    tokens.setTrailingHiddenRegion(this.last);
    const peek = this.peek();
    if (peek !== null) {
      peek.addChild(tokens);
    }
    this.stack.push(tokens);
    return tokens;
  }

  getRegionAccess(): StringBasedRegionAccess {
    return this.regionAccess;
  }

  /** `leaveEObject` 207-222. */
  leaveEObject(): void {
    const popped = this.stack.pop();
    if (popped === undefined) throw new IllegalStateException('leaveObject without a matching enterObject');
    const peek = this.peek();
    if (peek !== null) {
      peek.setTrailingHiddenRegion(popped.getTrailingHiddenRegion());
    }
  }

  private peek(): AbstractEObjectRegion | null {
    return this.stack.length === 0 ? null : this.stack[this.stack.length - 1]!;
  }
}
