// SPDX-License-Identifier: EPL-2.0
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import { isPropertyValueProxy } from '../../graph/properties/IPropertyValueProxy.js';
import { BoxedComparable } from '../../java/lang/BoxedComparable.js';
import * as DoubleToString from '../../java/lang/DoubleToString.js';
import { type JavaClassRef, simpleNameOf } from '../../java/lang/JavaClass.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { LayoutOptionData } from '../data/LayoutOptionData.js';
import { LayoutOptionDataType } from '../data/LayoutOptionDataType.js';
import { GraphIssue } from './GraphIssue.js';
import type { IValidatingGraphElementVisitor } from './IValidatingGraphElementVisitor.js';

/** `Class.isInstance` of the `java.lang` classes, by simple name; any other (`Object`) accepts every non-null value. */
const JAVA_LANG_INSTANCE_TESTS: ReadonlyMap<string, (value: unknown) => boolean> = new Map([
  ['String', (value) => typeof value === 'string'],
  ['Boolean', (value) => typeof value === 'boolean'],
  ['Integer', (value) => typeof value === 'number' && Number.isInteger(value)],
  ['Double', (value) => typeof value === 'number'],
  ['Float', (value) => typeof value === 'number'],
]);

/** `Class.isInstance` for the three kinds of class reference ({@link JavaClassRef}). */
function isInstanceOf(classRef: JavaClassRef, value: unknown): boolean {
  if (typeof classRef === 'function') {
    return value instanceof classRef;
  }
  if (classRef.kind === 'interface') {
    // A TypeScript interface has no run-time value: any object stands for an implementor.
    return typeof value === 'object' && value !== null;
  }
  const test = JAVA_LANG_INSTANCE_TESTS.get(classRef.simpleName);
  return test === undefined ? value !== null && value !== undefined : test(value);
}

/**
 * `String.valueOf` of a value or bound as the JVM prints it. A `number` is a `Double` unless the option is
 * an `INT` (the port has one number type), a {@link BoxedComparable} bound prints as what it wraps.
 */
function javaText(type: LayoutOptionDataType | null, value: unknown): string {
  const plain = value instanceof BoxedComparable ? value.value : value;
  if (typeof plain === 'number' && type !== LayoutOptionDataType.INT) {
    return DoubleToString.toString(plain);
  }
  return String(plain);
}

/**
 * A validator for layout options that checks lower and upper bounds as well as other constraints.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/validation/LayoutOptionValidator.java
 */
export class LayoutOptionValidator implements IValidatingGraphElementVisitor {
  /** The issues found by this validator. */
  readonly #issues: GraphIssue[] = [];

  /**
   * Check the lower and upper bounds of all properties attached to graph elements.
   *
   * @see org.eclipse.elk.core/src/org/eclipse/elk/core/validation/LayoutOptionValidator.java
   */
  visit(element: ElkGraphElement): void {
    for (const entry of element.getProperties().entryList()) {
      const property = entry.getKey() as IProperty<unknown> | null;
      if (property !== null) {
        let value = entry.getValue();
        if (isPropertyValueProxy(value)) {
          value = value.resolveValue(property);
          if (value !== null) {
            entry.setValue(value);
          }
        }
        this.#issues.push(...this.checkProperty(property, value, element));
      }
    }
  }

  /**
   * Check the lower and upper bounds of the given property.
   *
   * @see org.eclipse.elk.core/src/org/eclipse/elk/core/validation/LayoutOptionValidator.java
   */
  checkProperty(property: IProperty<unknown>, value: unknown, element: ElkGraphElement | null): GraphIssue[] {
    let optionName: string | null = null;
    let type: LayoutOptionDataType | null = null;
    if (property instanceof LayoutOptionData) {
      optionName = property.getName();
      type = property.getType();
      if (value !== null && !this.isValidType(property, value)) {
        const className = simpleNameOf(property.getOptionClass() as JavaClassRef);
        const message =
          `The assigned value ${javaText(type, value)} of the option '${String(optionName)}'` +
          ` does not match the type ${className}.`;
        return [new GraphIssue(element, message, GraphIssue.Severity.ERROR)];
      }
    }
    if (value !== null) {
      const name = optionName ?? property.getId();
      const prefix = `The assigned value ${javaText(type, value)} of the option '${name}'`;
      if (property.getLowerBound().compareTo(value) > 0) {
        const message = `${prefix} is less than the lower bound ${javaText(type, property.getLowerBound())}.`;
        return [new GraphIssue(element, message, GraphIssue.Severity.ERROR)];
      } else if (property.getUpperBound().compareTo(value) < 0) {
        const message = `${prefix} is greater than the upper bound ${javaText(type, property.getUpperBound())}.`;
        return [new GraphIssue(element, message, GraphIssue.Severity.ERROR)];
      }
    }
    return [];
  }

  /**
   * @returns whether the given value has the correct type
   * @see org.eclipse.elk.core/src/org/eclipse/elk/core/validation/LayoutOptionValidator.java
   */
  protected isValidType(optionData: LayoutOptionData, value: unknown): boolean {
    switch (optionData.getType()) {
      case LayoutOptionDataType.STRING:
        return typeof value === 'string';
      case LayoutOptionDataType.BOOLEAN:
        return typeof value === 'boolean';
      case LayoutOptionDataType.INT:
        return typeof value === 'number' && Number.isInteger(value);
      case LayoutOptionDataType.DOUBLE:
        return typeof value === 'number';
      case LayoutOptionDataType.ENUMSET:
        return value instanceof EnumSet;
      default:
        return isInstanceOf(optionData.getOptionClass() as JavaClassRef, value);
    }
  }

  getIssues(): Iterable<GraphIssue> {
    return this.#issues;
  }
}
