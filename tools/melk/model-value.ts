// SPDX-License-Identifier: EPL-2.0
import * as DoubleToString from '../../src/java/lang/DoubleToString.js';

/**
 * The C4 value encoding of `test/golden/refs/java/metadata.json`: what a Java value looks like in the dump. A
 * `double` carries its `Double.toString` text so that the comparison is exact.
 */
export type EncodedValue =
  | null
  | { readonly t: 'bool'; readonly v: boolean }
  | { readonly t: 'int'; readonly v: number }
  | { readonly t: 'string'; readonly v: string }
  | { readonly t: 'double'; readonly v: string }
  | { readonly t: 'enum'; readonly c: string; readonly n: string }
  | { readonly t: 'set'; readonly c: string; readonly items: readonly string[] }
  | { readonly t: 'list'; readonly c: string; readonly items: readonly EncodedValue[] }
  | { readonly t: 'obj'; readonly c: string; readonly fields: Readonly<Record<string, EncodedValue>> }
  | { readonly t: 'class'; readonly c: string };

/** Encodes a Java `double` (or a widened `float`). */
export function encodeDouble(value: number): EncodedValue {
  return { t: 'double', v: DoubleToString.toString(value) };
}

/** Encodes a Java `int`. */
export function encodeInt(value: number): EncodedValue {
  return { t: 'int', v: value };
}

/** The `LayoutOptionData` fields of one `registerOption` call, named as in the dump. */
export interface OptionData {
  readonly id: string;
  readonly group: string;
  readonly name: string;
  readonly description: string | null;
  readonly type: string;
  readonly optionClass: string;
  readonly default: EncodedValue;
  readonly lowerBound: EncodedValue;
  readonly upperBound: EncodedValue;
  readonly targets: readonly string[];
  readonly visibility: string;
  readonly legacyIds: readonly string[] | null;
}

/** The `LayoutCategoryData` fields of one `registerCategory` call. */
export interface CategoryData {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
}

/** The `LayoutAlgorithmData` fields of one `registerAlgorithm` call (filled by the algorithm model). */
export interface AlgorithmData {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: string | null;
  readonly bundleName: string | null;
  readonly definingBundleId: string | null;
  readonly previewImagePath: string | null;
  readonly supportedFeatures: readonly string[];
  readonly validatorClass: string | null;
  readonly factoryClass: string;
}

/** One call the generated `apply(registry)` makes on the `ILayoutMetaDataProvider.Registry`. */
export type RegistryCall =
  | { readonly call: 'registerOption'; readonly data: OptionData }
  | { readonly call: 'registerCategory'; readonly data: CategoryData }
  | { readonly call: 'addDependency'; readonly source: string; readonly target: string; readonly value: EncodedValue }
  | { readonly call: 'registerAlgorithm'; readonly data: AlgorithmData }
  | {
      readonly call: 'addOptionSupport';
      readonly algorithm: string;
      readonly option: string;
      readonly default: EncodedValue;
    };
