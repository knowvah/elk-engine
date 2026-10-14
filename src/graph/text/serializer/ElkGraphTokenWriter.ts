// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { EMapPropertyHolder } from '../../EMapPropertyHolder.js';
import type { ElkPropertyToValueMapEntryImpl } from '../../impl/ElkPropertyToValueMapEntryImpl.js';
import type { IValueConverterService } from '../../../xtext/conversion/IValueConverterService.js';
import type { EReferenceInfo } from '../../../xtext/scoping/EReferenceInfo.js';
import { ElkGraphRuleName } from '../conversion/ElkGraphValueConverterService.js';
import type { CrossReferenceSerializer } from './CrossReferenceSerializer.js';
import { ElkGraphSerializationError } from './ElkGraphSerializationError.js';
import { Kw, type ElkGraphSyntacticSequencer } from './ElkGraphSyntacticSequencer.js';
import type { PairIds } from './ElkGraphSectionGrammar.js';

/** Rules the writer converts values for that `ElkGraph.xtext` inherits from `org.eclipse.xtext.common.Terminals`. */
export const TerminalRuleName = { ID: 'ID', STRING: 'STRING' } as const;

/** Where one assigned value goes: the rule call that produces it and the assignment that holds it. */
export interface AssignedIds {
  readonly ruleCall: string;
  readonly assignment: string;
}

/** Where one cross reference goes: the cross reference element and its assignment. */
export interface ReferenceIds {
  readonly crossReference: string;
  readonly assignment: string;
}

/**
 * Turns assigned values into tokens: the work Xtext's `SequenceFeeder` and `ValueSerializer`/
 * `CrossReferenceSerializer` do between the semantic and the syntactic sequencer. A value is written with the
 * value converter of the rule it is assigned through; any failure of a converter is a serialisation error, as
 * `ValueSerializer.serializeAssignedValue` catches `Throwable` and reports it.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/tokens/ValueSerializer.java:58-86
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/acceptor/SequenceFeeder.java
 */
export class ElkGraphTokenWriter {
  constructor(
    readonly out: ElkGraphSyntacticSequencer,
    private readonly valueConverters: IValueConverterService,
    private readonly crossReferences: CrossReferenceSerializer,
  ) {}

  keyword(grammarElement: string, text: string, owner: EObject): void {
    this.out.keyword(grammarElement, text, owner);
  }

  /** `value` converted through the rule `ruleName`; `owner` is the object the assignment belongs to. */
  value(ids: AssignedIds, ruleName: string, value: unknown, owner: EObject): void {
    this.out.assigned('assignment', ids.ruleCall, ids.assignment, this.convert(ruleName, value), owner);
  }

  /** The cross reference of `owner` to `target` through `reference`, written with the rule `ruleName`. */
  crossReference(
    ids: ReferenceIds,
    reference: EReferenceInfo,
    ruleName: string,
    owner: EObject,
    target: EObject,
  ): void {
    const text = this.crossReferences.serializeCrossRef(owner, reference, ruleName, target);
    this.out.assigned('crossref', ids.crossReference, ids.assignment, text, owner);
  }

  /** A number token (`Number` rule): a `double`, integral values print as `int`. */
  number(ids: AssignedIds, value: number, owner: EObject): void {
    this.value(ids, ElkGraphRuleName.NUMBER, value, owner);
  }

  /** `keyword : first , second` for a pair of `Number` values (`position`, `size`, `start`, `end`). */
  pair(owner: EObject, ids: PairIds, keyword: string, first: number, second: number): void {
    this.keyword(ids.keyword, keyword, owner);
    this.keyword(ids.colon, Kw.COLON, owner);
    this.number({ ruleCall: ids.firstRuleCall, assignment: ids.firstAssignment }, first, owner);
    this.keyword(ids.comma, Kw.COMMA, owner);
    this.number({ ruleCall: ids.secondRuleCall, assignment: ids.secondAssignment }, second, owner);
  }

  /** The contained objects of one feature, each entered as a child region of the rule call `ruleCall`. */
  contained<T extends EObject>(items: Iterable<T>, ruleCall: string, sequence: (item: T) => void): void {
    for (const item of items) {
      this.out.enterObject(ruleCall, item);
      sequence(item);
      this.out.leaveObject();
    }
  }

  /**
   * The properties of `holder`, each entered as a child region of the rule call `ruleCall`. The property map
   * creates its entries with `ElkPropertyToValueMapEntryImpl` (`EMapPropertyHolderImpl.newEntry`), so the cast
   * is exact.
   */
  properties(
    holder: EMapPropertyHolder,
    ruleCall: string,
    sequence: (entry: ElkPropertyToValueMapEntryImpl) => void,
  ): void {
    this.contained(holder.getProperties().entryList() as Iterable<ElkPropertyToValueMapEntryImpl>, ruleCall, sequence);
  }

  private convert(ruleName: string, value: unknown): string {
    try {
      return this.valueConverters.toString(value, ruleName);
    } catch (e) {
      throw new ElkGraphSerializationError(`Error while converting a value for grammar rule '${ruleName}' to text.`, {
        cause: e,
      });
    }
  }
}
