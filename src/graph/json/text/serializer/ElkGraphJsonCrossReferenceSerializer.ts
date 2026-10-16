// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import type { IValueConverterService } from '../../../../xtext/conversion/IValueConverterService.js';
import { ValueConverterException } from '../../../../xtext/conversion/ValueConverterException.js';
import type { IQualifiedNameConverter } from '../../../../xtext/naming/IQualifiedNameConverter.js';
import type { EReferenceInfo } from '../../../../xtext/scoping/EReferenceInfo.js';
import type { IScopeProvider } from '../../../../xtext/scoping/IScopeProvider.js';
import { ElkGraphJsonSerializationError } from './ElkGraphJsonSerializationError.js';

/**
 * The text of a cross reference: the name under which the scope of the reference makes the target visible.
 *
 * The scope is the language's own scope provider (`SerializerScopeProviderBinding` has no binding of its own, so the
 * default `IScopeProvider` applies): `ElkGraphJsonScopeProvider` over the imported-namespace-aware local scope, whose
 * names are the flat identifiers of `ElkGraphJsonQualifiedNameProvider`. The first description the scope lists for
 * the target wins; its name goes through the qualified name converter and then the `STRING` value converter.
 *
 * The node model arm of `serializeCrossRef` (reuse the existing text when it still resolves to the target) is not
 * ported: the writer's input has no node model (D3). A target that no description of the scope names, including a
 * proxy that stays unresolved, cannot be written: that is a serialisation error.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/tokens/CrossReferenceSerializer.java:75-136
 */
export class ElkGraphJsonCrossReferenceSerializer {
  constructor(
    private readonly scopeProvider: IScopeProvider,
    private readonly qualifiedNames: IQualifiedNameConverter,
    private readonly valueConverters: IValueConverterService,
  ) {}

  /**
   * @param semanticObject the object that owns the reference (the edge)
   * @param reference the reference being written
   * @param ruleName the rule the cross reference calls (`getRuleNameFrom(crossref)`)
   * @param target the referenced object, after `handleProxy`: resolved if it can be, else still a proxy
   * @throws ElkGraphJsonSerializationError when the target is not in scope or no name converts
   */
  serializeCrossRef(semanticObject: EObject, reference: EReferenceInfo, ruleName: string, target: EObject): string {
    const scope = this.scopeProvider.getScope(semanticObject, reference);
    const failures: ValueConverterException[] = [];
    let foundOne = false;
    for (const description of scope.getElements(target)) {
      foundOne = true;
      const unconverted = this.qualifiedNames.toString(description.getName());
      try {
        return this.valueConverters.toString(unconverted, ruleName) as string;
      } catch (e) {
        if (!(e instanceof ValueConverterException)) throw e;
        failures.push(e);
      }
    }
    throw new ElkGraphJsonSerializationError(this.failureMessage(reference, foundOne), { cause: failures[0] });
  }

  private failureMessage(reference: EReferenceInfo, foundOne: boolean): string {
    return foundOne
      ? `Cannot write the reference '${reference.name}': the name of its target is no valid STRING.`
      : `Cannot write the reference '${reference.name}': its target is not visible in the scope of the reference.`;
  }
}
