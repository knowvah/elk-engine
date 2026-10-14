// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { FormattingToken } from './FormattingToken.js';
import { StringBasedRegionAccess } from './internal/StringBasedRegionAccess.js';
import { TextRegionAccessBuildingSequencer } from './internal/TextRegionAccessBuildingSequencer.js';

export type { FormattingToken, SemanticKind } from './FormattingToken.js';

/**
 * The entry point of the writer (T19) into the region access: mirrors `forSequence(ctx, root)` and the acceptor
 * callbacks of the Java `TextRegionAccessBuilder` (`forNodeModel` is not ported: no node model, G2).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/TextRegionAccessBuilder.java
 */
export class TextRegionAccessBuilder {
  private readonly sequencer: TextRegionAccessBuildingSequencer;

  /** `root` is the semantic root; `rootRule` the id of the rule/action it is serialised by (`getActionOrRule()`). */
  constructor(root: EObject, rootRule: string) {
    this.sequencer = new TextRegionAccessBuildingSequencer(rootRule, root);
  }

  /** `enterAssignedParserRuleCall` / `enterAssignedAction`. */
  enterObject(grammarElement: string, child: EObject): void {
    this.sequencer.enterEObject(grammarElement, child);
  }

  /** `leaveAssignedParserRuleCall` / `leaveAssignedAction`. */
  leaveObject(): void {
    this.sequencer.leaveEObject();
  }

  /** Every `accept*` callback that carries a token. */
  token(t: FormattingToken): void {
    this.sequencer.appendSemantic(t);
  }

  /** `create()`. */
  build(): StringBasedRegionAccess {
    return this.sequencer.getRegionAccess();
  }
}
