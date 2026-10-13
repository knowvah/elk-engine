// SPDX-License-Identifier: EPL-2.0
import { ElkReflect } from '../../graph/util/ElkReflect.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import { isIProperty, Property } from '../../graph/properties/Property.js';
import { newLinkedList } from '../../guava/Lists.js';
import { ArrayIndexOutOfBoundsException } from '../../java/lang/ArrayIndexOutOfBoundsException.js';
import { asComparable } from '../../java/lang/BoxedComparable.js';
import type { Comparable } from '../../java/lang/Comparable.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import {
  type ClassObject,
  type EnumClassObject,
  type JavaClassRef,
  type JavaEnum,
  getEnumConstants,
  isAssignableToDataObject,
  isEnum,
} from '../../java/lang/JavaClass.js';
import * as JavaDouble from '../../java/lang/JavaDouble.js';
import * as JavaInteger from '../../java/lang/JavaInteger.js';
import * as JavaString from '../../java/lang/JavaString.js';
import { NumberFormatException } from '../../java/lang/NumberFormatException.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import type { IDataObject } from '../util/IDataObject.js';
import type { Pair } from '../util/Pair.js';
import type { ILayoutMetaData } from './ILayoutMetaData.js';
import { LayoutOptionDataBuilder } from './LayoutOptionDataBuilder.js';
import { LayoutOptionDataTarget } from './LayoutOptionDataTarget.js';
import { LayoutOptionDataType } from './LayoutOptionDataType.js';
import { LayoutOptionDataVisibility } from './LayoutOptionDataVisibility.js';

/** The class of an enumeration option: a class object with a static `values()`. */
type EnumRef = ClassObject & EnumClassObject;

/** Java regex `[\[\]\s,]+` (`\s` is ASCII-only in Java). */
const ENUM_SET_SEPARATORS = /[[\]\t\n\v\f\r ,]+/;

/** Java array indexing: out-of-range access throws (translation-rules 6.7). */
function elementAt<T>(array: readonly T[], index: number): T {
  if (index < 0 || index >= array.length) {
    throw new ArrayIndexOutOfBoundsException(`Index ${index} out of bounds for length ${array.length}`);
  }
  return array[index] as T;
}

/**
 * Data type used to store information for a layout option.
 *
 * `Class<?>` is a {@link JavaClassRef}. The Java constructor is private and called by the nested
 * `Builder`; TypeScript has no nested-class access, so the constructor is public. The nested types
 * live in their own files (C3 amendment) and are exposed as static members; `Builder` is a getter
 * so that either module may be imported first (the two import each other).
 *
 * @author msp
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutOptionData.java
 */
export class LayoutOptionData implements ILayoutMetaData, IProperty<unknown>, Comparable<IProperty<unknown>> {
  /** Enumeration of data types for layout options. */
  static readonly Type: typeof LayoutOptionDataType = LayoutOptionDataType;
  /** Enumeration of target elements for layout options. */
  static readonly Target: typeof LayoutOptionDataTarget = LayoutOptionDataTarget;
  /** Enumeration of visibility options for layout options. */
  static readonly Visibility: typeof LayoutOptionDataVisibility = LayoutOptionDataVisibility;

  /** choices for boolean type options. */
  private static readonly BOOLEAN_CHOICES: readonly string[] = ['false', 'true'];

  /** identifier of the layout option. */
  private readonly id: string;
  /** the group this layout option is associated with. Note that the group is included in the `id`. */
  private readonly group: string | null;
  /** legacy identifiers of this option. */
  private readonly legacyIds: string[] | null;
  /** the default value of this option. */
  private readonly defaultValue: unknown;
  /** the class that represents this option type. */
  private readonly clazz: JavaClassRef | null;
  /** type of the layout option. */
  private readonly type: LayoutOptionDataType | null;
  /** user friendly name of the layout option. */
  private readonly name: string | null;
  /** a description to be displayed in the UI. */
  private readonly description: string | null;
  /** configured targets. */
  private readonly targets: EnumSet<LayoutOptionDataTarget>;
  /** dependencies to other layout options. */
  private readonly dependencies: Array<Pair<LayoutOptionData, unknown>> = newLinkedList();
  /** cached value of the available choices. */
  private choices: readonly string[] | null = null;
  /** visibility in the UI. */
  private readonly visibility: LayoutOptionDataVisibility | null;
  /** the lower bound for option values. */
  private lowerBound: unknown;
  /** the upper bound for option values. */
  private upperBound: unknown;

  /** Builder for {@link LayoutOptionData} instances. */
  static get Builder(): typeof LayoutOptionDataBuilder {
    return LayoutOptionDataBuilder;
  }

  /** Create a layout option data entry. An unset id (a Java `NullPointerException` in `equals`) becomes `''`. */
  constructor(builder: LayoutOptionDataBuilder) {
    const fields = builder.fields;
    this.id = fields.id ?? '';
    this.group = fields.group;
    this.name = fields.name;
    this.description = fields.description;
    this.defaultValue = fields.defaultValue;
    this.lowerBound = fields.lowerBound;
    this.upperBound = fields.upperBound;
    this.type = fields.type;
    this.clazz = fields.clazz;
    this.targets = fields.targets ?? EnumSet.noneOf(LayoutOptionDataTarget);
    this.visibility = fields.visibility;
    this.legacyIds = fields.legacyIds;
  }

  /** Checks the enumeration class; only for options of type `enum` and `enumset`. */
  private checkEnumClass(): void {
    if (this.clazz === null || !isEnum(this.clazz)) {
      throw new IllegalStateException(`Enumeration class expected for layout option ${this.id}`);
    }
  }

  /** The enumeration class after {@link checkEnumClass} (Java's unchecked cast of `clazz`). */
  private enumClass(): EnumRef {
    return this.clazz as EnumRef;
  }

  /** Checks the {@link IDataObject} class and creates an instance; only for options of type 'object'. */
  private createDataInstance(): IDataObject {
    if (this.clazz === null || !isAssignableToDataObject(this.clazz)) {
      throw new IllegalStateException(`IDataType class expected for layout option ${this.id}`);
    }
    const instance = ElkReflect.newInstance(this.clazz as unknown as new () => IDataObject);
    if (instance === null) {
      throw new IllegalStateException(
        `Couldn't create new instance of property '${this.id}'. ` +
          'Make sure its type is registered with the ElkReflect utility class.',
      );
    }
    return instance;
  }

  equals(obj: unknown): boolean {
    if (obj instanceof LayoutOptionData) {
      return this.id === obj.id;
    } else if (isIProperty(obj)) {
      return this.id === obj.getId();
    } else {
      return false;
    }
  }

  hashCode(): number {
    return JavaString.hashCode(this.id);
  }

  compareTo(other: IProperty<unknown>): number {
    return JavaString.compareTo(this.id, other.getId());
  }

  toString(): string {
    return `Layout Option: ${this.id}`;
  }

  /**
   * Whether {@link parseValue} can conceivably parse strings for this option: the type is neither
   * `UNDEFINED` nor `OBJECT`, or it is `OBJECT` and the option class implements {@link IDataObject}.
   */
  canParseValue(): boolean {
    if (this.type === LayoutOptionDataType.UNDEFINED) {
      return false;
    } else if (this.type === LayoutOptionDataType.OBJECT) {
      return this.clazz !== null && isAssignableToDataObject(this.clazz);
    } else {
      return true;
    }
  }

  /**
   * Helper holding the two guards that open Java's `parseValue` (kept apart for the CCN limit).
   * An ENUMSET allows empty strings to denote that no enumeration value is selected; otherwise
   * empty strings are forbidden.
   *
   * @returns the string to parse, or `null` if the Java returns `null` right away
   */
  private parseableText(valueString: string | null): string | null {
    if (valueString === null || valueString === 'null') {
      return null;
    }
    if (valueString.length === 0 && this.type !== LayoutOptionDataType.ENUMSET) {
      return null;
    }
    return valueString;
  }

  /**
   * Parses a string value for this layout option.
   *
   * @param valueString a serialized value
   * @returns an instance of the corresponding correctly typed value, or
   *         `null` if the given value string is invalid
   */
  parseValue(valueString: string | null): unknown {
    const text = this.parseableText(valueString);
    if (text === null) {
      return null;
    }

    switch (this.type) {
      case LayoutOptionDataType.BOOLEAN:
        return LayoutOptionData.parseValueBoolean(text);
      case LayoutOptionDataType.INT:
        return LayoutOptionData.parseValueNumber(text, JavaInteger.valueOf);
      case LayoutOptionDataType.DOUBLE:
        return LayoutOptionData.parseValueNumber(text, JavaDouble.parseDouble);
      case LayoutOptionDataType.STRING:
        return text;
      case LayoutOptionDataType.ENUM:
        this.checkEnumClass();
        return this.enumForString(text);
      case LayoutOptionDataType.ENUMSET:
        this.checkEnumClass();
        return this.enumSetForStringArray(text);
      case LayoutOptionDataType.OBJECT:
        return this.parseValueObject(text);
      default:
        throw new IllegalStateException('Invalid type set for this layout option.');
    }
  }

  /** The BOOLEAN arm of `parseValue`. */
  private static parseValueBoolean(valueString: string): boolean | null {
    const lower = valueString.toLowerCase();
    if (lower === 'true') {
      return true;
    } else if (lower === 'false') {
      return false;
    } else {
      return null;
    }
  }

  /** The INT and DOUBLE arms of `parseValue`: the `try` around `Integer.valueOf` / `Double.valueOf`. */
  private static parseValueNumber(valueString: string, parse: (s: string) => number): number | null {
    try {
      return parse(valueString);
    } catch (exception) {
      if (exception instanceof NumberFormatException) {
        return null;
      }
      throw exception;
    }
  }

  /** The OBJECT arm of `parseValue`: the `try` that creates and fills the data object. */
  private parseValueObject(valueString: string): IDataObject | null {
    try {
      const value = this.createDataInstance();
      value.parse(valueString);
      return value;
    } catch (exception) {
      if (exception instanceof IllegalArgumentException) {
        return null;
      }
      throw exception;
    }
  }

  /**
   * Turns a string like `[a, b, c]` into a set over the enumeration of {@link clazz}; each part
   * follows {@link enumForString}. (Java passes `clazz` for type inference; it is the field here.)
   *
   * @returns the enumeration set, or `null` if a component is no constant.
   */
  private enumSetForStringArray(leString: string): EnumSet<JavaEnum> | null {
    const set = EnumSet.noneOf<JavaEnum>(this.enumClass());

    // break the value string into its different components and iterate over them;
    // the string will be of the form "[a, b, c]"
    const components = JavaString.split(leString, ENUM_SET_SEPARATORS);
    for (const component of components) {
      // Check for empty strings
      if (JavaString.trim(component).length === 0) {
        continue;
      }

      const o = this.enumForString(component);

      if (o === null) {
        // we were unable to get the enumeration instance, so the whole enumset is pointless
        return null;
      } else {
        // add the enumeration object to the set
        set.add(o);
      }
    }

    return set;
  }

  /** Turns a constant name or an ordinal number into the constant of {@link clazz}, or `null`. */
  private enumForString(leString: string): JavaEnum | null {
    const found = this.enumClass()
      .values()
      .find((constant) => constant.name() === leString);
    if (found !== undefined) {
      return found;
    }
    // the value could not be parsed as enumeration constant, try as integer
    return this.enumForStringIndex(leString);
  }

  /** The `catch (IllegalArgumentException)` branch of `enumForString`: the string as an ordinal. */
  private enumForStringIndex(leString: string): JavaEnum | null {
    try {
      const index = JavaInteger.valueOf(leString);
      const constants = getEnumConstants(this.enumClass());
      if (index >= 0 && index < constants.length) {
        return constants[index] as JavaEnum;
      }
    } catch (e) {
      // ignore exception and return null
      if (!(e instanceof NumberFormatException)) {
        throw e;
      }
    }
    return null;
  }

  /** The default-default value, used if no default was specified; never `null` except for 'object'. */
  getDefaultDefault(): unknown {
    switch (this.type) {
      case LayoutOptionDataType.STRING:
        return '';
      case LayoutOptionDataType.BOOLEAN:
        return false;
      case LayoutOptionDataType.INT:
        return 0;
      case LayoutOptionDataType.DOUBLE:
        return 0.0;
      case LayoutOptionDataType.ENUM:
        this.checkEnumClass();
        return elementAt(getEnumConstants(this.enumClass()), 0);
      case LayoutOptionDataType.ENUMSET:
        this.checkEnumClass();
        return EnumSet.noneOf<JavaEnum>(this.enumClass());
      case LayoutOptionDataType.OBJECT:
        return null;
      default:
        throw new IllegalStateException('Invalid type set for this layout option.');
    }
  }

  /** The choices a user can select; only meaningful for enumeration and boolean options. */
  getChoices(): readonly string[] {
    if (this.choices === null) {
      switch (this.type) {
        case LayoutOptionDataType.ENUM:
        case LayoutOptionDataType.ENUMSET:
          this.checkEnumClass();
          this.choices = getEnumConstants(this.enumClass()).map((e) => e.toString());
          break;
        case LayoutOptionDataType.BOOLEAN:
          this.choices = LayoutOptionData.BOOLEAN_CHOICES;
          break;
        default:
          this.choices = [];
      }
    }
    return this.choices;
  }

  /** The number of enumeration constants; 0 if the option type is not enumeration related. */
  getEnumValueCount(): number {
    switch (this.type) {
      case LayoutOptionDataType.ENUM:
      case LayoutOptionDataType.ENUMSET:
        this.checkEnumClass();
        return getEnumConstants(this.enumClass()).length;
      default:
        return 0;
    }
  }

  /** The enumeration value at a zero-based index; `null` if the option type is not enumeration related. */
  getEnumValue(intValue: number): JavaEnum | null {
    switch (this.type) {
      case LayoutOptionDataType.ENUM:
      case LayoutOptionDataType.ENUMSET:
        this.checkEnumClass();
        return elementAt(getEnumConstants(this.enumClass()), intValue);
      default:
        return null;
    }
  }

  /** The types of graph elements the option can be related to. */
  getTargets(): EnumSet<LayoutOptionDataTarget> {
    return this.targets;
  }

  /** Dependencies to other options (visible only if one is met); modified only by providers. */
  getDependencies(): Array<Pair<LayoutOptionData, unknown>> {
    return this.dependencies;
  }

  getId(): string {
    return this.id;
  }

  /** @returns the group */
  getGroup(): string | null {
    return this.group;
  }

  /** @returns the type */
  getType(): LayoutOptionDataType | null {
    return this.type;
  }

  getName(): string | null {
    return this.name;
  }

  getDescription(): string | null {
    return this.description;
  }

  /** Returns the default value of this layout option. */
  getDefault(): unknown {
    // Clone the default value if it's a Cloneable (D6: `ElkReflect.isCloneable`).
    if (ElkReflect.isCloneable(this.defaultValue)) {
      const clone = ElkReflect.clone(this.defaultValue);
      if (clone === null) {
        throw new IllegalStateException(
          `Couldn't clone property '${this.id}'. Make sure it's type is registered with the ElkReflect utility class.`,
        );
      }
      return clone;
    } else {
      return this.defaultValue;
    }
  }

  getLowerBound(): Comparable<unknown> {
    return asComparable(this.lowerBound) ?? Property.NEGATIVE_INFINITY;
  }

  /** Sets the lower bound for layout option values. */
  setLowerBound(lowerBound: unknown): void {
    this.lowerBound = lowerBound;
  }

  getUpperBound(): Comparable<unknown> {
    return asComparable(this.upperBound) ?? Property.POSITIVE_INFINITY;
  }

  /** Sets the upper bound for layout option values. */
  setUpperBound(upperBound: unknown): void {
    this.upperBound = upperBound;
  }

  /** Returns the option type class. */
  getOptionClass(): JavaClassRef | null {
    return this.clazz;
  }

  /** Returns the visibility of this option in the UI. */
  getVisibility(): LayoutOptionDataVisibility | null {
    return this.visibility;
  }

  /** @returns the legacyIds, may be `null` */
  getLegacyIds(): string[] | null {
    return this.legacyIds;
  }
}
