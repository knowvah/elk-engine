// SPDX-License-Identifier: EPL-2.0
import type { IValueConverterService } from '../../../../xtext/conversion/IValueConverterService.js';
import type { DotEObject, DotFeature } from '../dot/DotPackage.js';
import { getValueConversionExceptionDiagnostic, throwDiagnostic } from './GraphvizDotSerializationDiagnostic.js';
import type { GraphvizDotSyntacticSequencer } from './GraphvizDotSyntacticSequencer.js';

/** Where one assigned value goes: the rule call that produces it and the assignment that holds it. */
export interface AssignedIds {
  readonly ruleCall: string;
  readonly assignment: string;
}

/** Where one assigned keyword goes: the keyword and the assignment that holds it. */
export interface AssignedKeywordIds {
  readonly keyword: string;
  readonly assignment: string;
}

/**
 * Turns assigned values into tokens: the work Xtext's `SequenceFeeder`, `ValueSerializer` and
 * `EnumLiteralSerializer` do between the semantic and the syntactic sequencer. A value is written with the value
 * converter of the rule it is assigned through; any failure of the converter becomes the value conversion
 * diagnostic, which the serializer's error acceptor throws (`ValueSerializer.serializeAssignedValue` catches
 * `Throwable`). Port-local helper, as `ElkGraphTokenWriter` is for the `.elkt` writer.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/acceptor/SequenceFeeder.java
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/tokens/ValueSerializer.java:62-86
 */
export class GraphvizDotTokenWriter {
  constructor(
    readonly out: GraphvizDotSyntacticSequencer,
    private readonly valueConverters: IValueConverterService,
  ) {}

  /** An unassigned keyword of `owner`'s rule. */
  keyword(grammarElement: string, text: string, owner: DotEObject): void {
    this.out.acceptUnassignedKeyword(grammarElement, text, owner);
  }

  /** A boolean assignment of a keyword (`strict?='strict'`), written when the value is `true`. */
  assignedKeyword(ids: AssignedKeywordIds, feature: DotFeature, text: string, owner: DotEObject): void {
    this.out.acceptAssignedKeyword(ids.keyword, ids.assignment, feature.name, text, owner);
  }

  /** `value` of `feature`, converted through the rule `ruleName`. */
  value(ids: AssignedIds, feature: DotFeature, ruleName: string, value: unknown, owner: DotEObject): void {
    let text: string;
    try {
      text = this.valueConverters.toString(value, ruleName);
    } catch (e) {
      // the converters throw Error subclasses only (Java `Throwable`)
      return throwDiagnostic(getValueConversionExceptionDiagnostic(owner, feature, ruleName, value, e as Error));
    }
    this.out.acceptAssigned(ids.ruleCall, ids.assignment, feature.name, text, owner);
  }

  /** An enum value: `EnumLiteralSerializer` writes the keyword of its literal declaration, the EMF literal. */
  enumLiteral(ids: AssignedIds, feature: DotFeature, literal: string, owner: DotEObject): void {
    this.out.acceptAssigned(ids.ruleCall, ids.assignment, feature.name, literal, owner);
  }

  /** A contained object entered through the rule call `ruleCall` of the rule `rule`, then sequenced. */
  contained<T extends DotEObject>(ruleCall: string, rule: string, child: T, sequence: (child: T) => void): void {
    this.out.enterAssignedParserRuleCall(ruleCall, rule, child);
    sequence(child);
    this.out.leaveAssignedParserRuleCall();
  }
}
