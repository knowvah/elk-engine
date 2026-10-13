// SPDX-License-Identifier: EPL-2.0
import { nestedClassPaths } from '../../tools/melk/imports.js';
import { encodeNative } from '../../tools/melk/model-ported.js';
import type { EncodedValue, RegistryCall } from '../../tools/melk/model-value.js';
import { LayoutAlgorithmData } from '../../src/core/data/LayoutAlgorithmData.js';
import { LayoutCategoryData } from '../../src/core/data/LayoutCategoryData.js';
import type { ILayoutMetaData } from '../../src/core/data/ILayoutMetaData.js';
import type { ILayoutMetaDataProvider } from '../../src/core/data/ILayoutMetaDataProvider.js';
import { LayoutOptionData } from '../../src/core/data/LayoutOptionData.js';
import { BoxedComparable } from '../../src/java/lang/BoxedComparable.js';
import * as DoubleToString from '../../src/java/lang/DoubleToString.js';
import { simpleNameOf } from '../../src/java/lang/JavaClass.js';
import { Property } from '../../src/graph/properties/Property.js';
import { MELK_NAMES, parseVendored, resolveVendored } from './helpers.js';

/** A call as recorded and C4-encoded, comparable with the `providers` section of `metadata.json`. */
export type EncodedCall = RegistryCall;

/** What the encoder needs to know about the option a value belongs to (a JS number is an int or a double). */
interface ValueShape {
  readonly numbers: 'INT' | 'DOUBLE' | null;
  readonly elementClass: string | null;
  /** Nested class paths by simple name (C4 names a nested enum `Outer.Inner`). */
  readonly nested: ReadonlyMap<string, string>;
}

const NO_NESTED: ReadonlyMap<string, string> = new Map();
const NO_SHAPE: ValueShape = { numbers: null, elementClass: null, nested: NO_NESTED };
const LIST_CLASS = 'UnmodifiableRandomAccessList';

function isEnumConstant(value: object): value is { name(): string; ordinal(): number } {
  return (
    'name' in value && 'ordinal' in value && typeof value.name === 'function' && typeof value.ordinal === 'function'
  );
}

function encodeNumber(value: number, shape: ValueShape): EncodedValue {
  if (shape.numbers === 'INT') {
    return { t: 'int', v: value };
  }
  if (shape.numbers === 'DOUBLE') {
    return { t: 'double', v: DoubleToString.toString(value) };
  }
  throw new Error(`cannot tell whether ${String(value)} is an int or a double without its option`);
}

/** Encodes a value the way `MetaDataVectors.encode` encodes the Java value, given the shape of its option. */
export function encodeValue(value: unknown, shape: ValueShape): EncodedValue {
  switch (typeof value) {
    case 'boolean':
      return { t: 'bool', v: value };
    case 'string':
      return { t: 'string', v: value };
    case 'number':
      return encodeNumber(value, shape);
    case 'object':
      return value === null ? null : encodeObject(value, shape);
    default:
      throw new Error(`cannot encode a ${typeof value}`);
  }
}

function encodeObject(value: object, shape: ValueShape): EncodedValue {
  if (Array.isArray(value)) {
    return { t: 'list', c: LIST_CLASS, items: value.map((item: unknown) => encodeValue(item, shape)) };
  }
  if (isEnumConstant(value)) {
    return { t: 'enum', c: shape.nested.get(value.constructor.name) ?? value.constructor.name, n: value.name() };
  }
  return encodeNative(
    value,
    shape.elementClass === null ? null : (shape.nested.get(shape.elementClass) ?? shape.elementClass),
  );
}

function encodeBound(bound: unknown, shape: ValueShape): EncodedValue {
  if (bound === Property.NEGATIVE_INFINITY || bound === Property.POSITIVE_INFINITY) {
    return null;
  }
  return bound instanceof BoxedComparable ? encodeValue(bound.value, shape) : encodeValue(bound, shape);
}

function shapeOf(option: LayoutOptionData, nested: ReadonlyMap<string, string>): ValueShape {
  const type = option.getType()?.name();
  const optionClass = option.getOptionClass();
  return {
    numbers: type === 'INT' ? 'INT' : type === 'DOUBLE' ? 'DOUBLE' : null,
    elementClass: type === 'ENUMSET' && optionClass !== null ? simpleNameOf(optionClass) : null,
    nested,
  };
}

function names(values: Iterable<{ name(): string }>): string[] {
  return [...values].map((value) => value.name());
}

/** Names the recorder cannot read off a TypeScript value; by default taken from the generator's model of the sources. */
export interface RecorderNames {
  /** Nested class simple name to `Outer.Inner` (default: the nested imports of the 13 vendored files). */
  readonly nestedClasses?: ReadonlyMap<string, string>;
  /** Factory class name to JVM binary name (default: the factories of the resolved vendored algorithms). */
  readonly factoryClasses?: ReadonlyMap<string, string>;
}

/** Factory class name (the TypeScript class name) to the binary name the JVM dump records, per resolved algorithm. */
export function factoryClassNames(): Map<string, string> {
  const names = new Map<string, string>();
  for (const algorithm of resolveVendored().flatMap((bundle) => bundle.algorithms)) {
    const existing = names.get(algorithm.factoryName);
    if (existing !== undefined && existing !== algorithm.data.factoryClass) {
      throw new Error(
        `factory name ${algorithm.factoryName} is ambiguous: ${existing} and ${algorithm.data.factoryClass}`,
      );
    }
    names.set(algorithm.factoryName, algorithm.data.factoryClass);
  }
  return names;
}

/** A registry that records every call and encodes its arguments per C4. */
export class RecordingRegistry implements ILayoutMetaDataProvider.Registry {
  readonly calls: EncodedCall[] = [];
  private readonly shapes = new Map<string, ValueShape>();
  private readonly nested: ReadonlyMap<string, string>;
  private readonly factories: ReadonlyMap<string, string>;

  constructor(names: RecorderNames = {}) {
    this.nested = names.nestedClasses ?? nestedClassPaths(MELK_NAMES.flatMap((name) => parseVendored(name).imports));
    this.factories = names.factoryClasses ?? factoryClassNames();
  }

  register(data: ILayoutMetaData): void {
    if (data instanceof LayoutOptionData) {
      const shape = shapeOf(data, this.nested);
      this.shapes.set(data.getId(), shape);
      this.calls.push({ call: 'registerOption', data: this.optionRecord(data, shape) });
    } else if (data instanceof LayoutCategoryData) {
      this.calls.push({
        call: 'registerCategory',
        data: { id: data.getId(), name: data.getName() ?? '', description: data.getDescription() },
      });
    } else if (data instanceof LayoutAlgorithmData) {
      this.calls.push({ call: 'registerAlgorithm', data: this.algorithmRecord(data) });
    } else {
      throw new Error('unknown meta data class');
    }
  }

  addDependency(sourceOption: string, targetOption: string, requiredValue: unknown): void {
    this.calls.push({
      call: 'addDependency',
      source: sourceOption,
      target: targetOption,
      value: encodeValue(requiredValue, this.shapes.get(targetOption) ?? { ...NO_SHAPE, nested: this.nested }),
    });
  }

  addOptionSupport(algorithm: string, option: string, defaultValue: unknown): void {
    this.calls.push({
      call: 'addOptionSupport',
      algorithm,
      option,
      default: encodeValue(defaultValue, this.shapes.get(option) ?? { ...NO_SHAPE, nested: this.nested }),
    });
  }

  private optionRecord(data: LayoutOptionData, shape: ValueShape): RegistryCallData<'registerOption'> {
    const optionClass = data.getOptionClass();
    return {
      id: data.getId(),
      group: orEmpty(data.getGroup()),
      name: orEmpty(data.getName()),
      description: data.getDescription(),
      type: enumNameOrEmpty(data.getType()),
      optionClass: optionClass === null ? '' : simpleNameOf(optionClass),
      default: encodeValue(data.getDefault(), shape),
      lowerBound: encodeBound(data.getLowerBound(), shape),
      upperBound: encodeBound(data.getUpperBound(), shape),
      targets: names(data.getTargets()),
      visibility: enumNameOrEmpty(data.getVisibility()),
      legacyIds: data.getLegacyIds(),
    };
  }

  private factoryClassOf(factory: unknown): string {
    if (typeof factory !== 'object' || factory === null) {
      return '';
    }
    return this.factories.get(factory.constructor.name) ?? factory.constructor.name;
  }

  private algorithmRecord(data: LayoutAlgorithmData): RegistryCallData<'registerAlgorithm'> {
    const validator = data.getValidatorClass();
    const factory: unknown = Reflect.get(data.getInstancePool(), 'factory');
    return {
      id: data.getId(),
      name: data.getName() ?? '',
      description: data.getDescription(),
      category: data.getCategoryId(),
      bundleName: data.getBundleName(),
      definingBundleId: data.getDefiningBundleId(),
      previewImagePath: data.getPreviewImagePath(),
      supportedFeatures: names(data.getSupportedFeatures()),
      validatorClass: validator === null ? null : simpleNameOf(validator),
      factoryClass: this.factoryClassOf(factory),
    };
  }
}

type RegistryCallData<K extends 'registerOption' | 'registerAlgorithm'> = Extract<RegistryCall, { call: K }>['data'];

/** `text`, or `''` when the getter returned `null`. */
function orEmpty(text: string | null): string {
  return text ?? '';
}

/** The constant's `name()`, or `''` when the getter returned `null`. */
function enumNameOrEmpty(constant: { name(): string } | null): string {
  return constant === null ? '' : constant.name();
}
