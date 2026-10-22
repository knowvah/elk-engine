// SPDX-License-Identifier: EPL-2.0
import type { EStructuralFeature } from '../../../../xtext/validation/EStructuralFeature.js';

/** An `EStructuralFeature` reduced to its name (the port has no metamodel, D3/D4). */
function featureNamed(name: string): EStructuralFeature {
  return { getName: () => name };
}

/**
 * The `Literals` of the generated package, reduced to the three `Configuration` attributes the
 * validator reports on (`mW`, `mD`, `pF`). Everything else of `GRandomPackage` is not ported (D3).
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/gRandom/GRandomPackage.java
 */
const LITERALS = {
  CONFIGURATION__MW: featureNamed('mW'),
  CONFIGURATION__MD: featureNamed('mD'),
  CONFIGURATION__PF: featureNamed('pF'),
} as const;

/**
 * The generated package interface, ported as {@link GRandomPackage.Literals} only.
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/gRandom/GRandomPackage.java
 */
export abstract class GRandomPackage {
  static readonly Literals: typeof LITERALS = LITERALS;
}
