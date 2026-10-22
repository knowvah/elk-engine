// SPDX-License-Identifier: EPL-2.0
import type { EStructuralFeature } from '../../../../xtext/validation/EStructuralFeature.js';
import type { Configuration } from '../gRandom/Configuration.js';
import { Form } from '../gRandom/Form.js';
import { GRandomPackage } from '../gRandom/GRandomPackage.js';

/** An error a check reports: Xtend's `error(message, feature)`. */
export interface GRandomCheckError {
  readonly message: string;
  readonly feature: EStructuralFeature;
}

/** One `Pair.of(predicate, Pair.of(message, feature))` of the Xtend `ERRORS` list (translation rules 8). */
interface RestrictionEntry {
  readonly applies: (c: Configuration) => boolean;
  readonly message: string;
  readonly feature: EStructuralFeature;
}

/**
 * The custom validation rules of the gRandom language. Not an `AbstractDeclarativeValidator`: the gRandom model is
 * plain classes (D3), so the check yields its errors and the facade locates them.
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/validation/GRandomValidator.xtend
 * @see org.eclipse.elk.core.debug.grandom/xtend-gen/org/eclipse/elk/core/debug/grandom/validation/GRandomValidator.java
 */
export class GRandomValidator {
  static readonly #ERRORS: readonly RestrictionEntry[] = [
    {
      applies: (c) => c.getForm() !== Form.TREES && c.isMD(),
      message: 'maxDegree only defined on trees.',
      feature: GRandomPackage.Literals.CONFIGURATION__MD,
    },
    {
      applies: (c) => c.getForm() !== Form.TREES && c.isMW(),
      message: 'maxWidth only defined on trees.',
      feature: GRandomPackage.Literals.CONFIGURATION__MW,
    },
    {
      applies: (c) => c.getForm() !== Form.BIPARTITE && c.isPF(),
      message: 'Partition Fraction only defined on bipartite graphs.',
      feature: GRandomPackage.Literals.CONFIGURATION__PF,
    },
  ];

  /** `@Check optionsRestrictions(Configuration conf)`: the errors of `conf`, in `ERRORS` order. */
  optionsRestrictions(conf: Configuration): GRandomCheckError[] {
    return GRandomValidator.#ERRORS
      .filter((p) => p.applies(conf))
      .map(({ message, feature }) => ({
        message,
        feature,
      }));
  }
}
