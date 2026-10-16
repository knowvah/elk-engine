// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import type { IValueConverterService } from '../../../../xtext/conversion/IValueConverterService.js';
import type { EReferenceInfo } from '../../../../xtext/scoping/EReferenceInfo.js';
import type { ElkGraphJsonCrossReferenceSerializer } from './ElkGraphJsonCrossReferenceSerializer.js';
import { ElkGraphJsonSerializationError } from './ElkGraphJsonSerializationError.js';
import type { ElkGraphJsonSyntacticSequencer } from './ElkGraphJsonSyntacticSequencer.js';

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
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/tokens/ValueSerializer.java:70-93
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/acceptor/SequenceFeeder.java
 */
export class ElkGraphJsonTokenWriter {
  constructor(
    private readonly out: ElkGraphJsonSyntacticSequencer,
    private readonly valueConverters: IValueConverterService,
    private readonly crossReferences: ElkGraphJsonCrossReferenceSerializer,
  ) {}

  keyword(grammarElement: string, text: string, owner: EObject): void {
    this.out.keyword(grammarElement, text, owner);
  }

  /** An unassigned datatype rule call (a key, `JsonMember`) with the text the generated sequencer chooses. */
  ruleCall(grammarElement: string, text: string, owner: EObject): void {
    this.out.unassignedRuleCall(grammarElement, text, owner);
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

  /** The contained object `item`, entered as a child region of the rule call `ruleCall`. */
  contained<T extends EObject>(item: T, ruleCall: string, sequence: (item: T) => void): void {
    this.out.enterObject(ruleCall, item);
    sequence(item);
    this.out.leaveObject();
  }

  private convert(ruleName: string, value: unknown): string {
    try {
      return this.valueConverters.toString(value, ruleName);
    } catch (e) {
      throw new ElkGraphJsonSerializationError(
        `Error while converting a value for grammar rule '${ruleName}' to text.`,
        {
          cause: e,
        },
      );
    }
  }
}
