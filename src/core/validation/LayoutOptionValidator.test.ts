// SPDX-License-Identifier: EPL-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import type { IPropertyValueProxy } from '../../graph/properties/IPropertyValueProxy.js';
import { Property } from '../../graph/properties/Property.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import type { Comparable } from '../../java/lang/Comparable.js';
import { JavaClass, type JavaClassRef, javaInterface } from '../../java/lang/JavaClass.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../data/LayoutOptionData.js';
import { LayoutOptionDataTarget } from '../data/LayoutOptionDataTarget.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { Direction } from '../options/Direction.js';
import { GraphIssue } from './GraphIssue.js';
import { LayoutOptionValidator } from './LayoutOptionValidator.js';

function option(id: string): LayoutOptionData {
  return LayoutMetaDataService.getInstance().getOptionData(id) as LayoutOptionData;
}

function messages(issues: Iterable<GraphIssue>): string[] {
  return [...issues].map((issue) => issue.getMessage());
}

function customOption(
  type: typeof LayoutOptionData.Type.STRING,
  optionClass: JavaClassRef = JavaClass.String,
): LayoutOptionData {
  return new LayoutOptionData.Builder()
    .id(`test.${type.name()}`)
    .type(type)
    .optionClass(optionClass)
    .targets(EnumSet.of(LayoutOptionDataTarget.NODES))
    .create();
}

/** A bound with its own comparison and text, like the exclusive bounds. */
function bound(compareTo: (x: number) => number, text: string): Comparable<number> {
  return { compareTo, toString: () => text } as Comparable<number>;
}

let validator: LayoutOptionValidator;

beforeEach(() => {
  validator = new LayoutOptionValidator();
});

describe('LayoutOptionValidator.checkProperty', () => {
  it('accepts a value within the bounds', () => {
    expect(validator.checkProperty(CoreOptions.SPACING_NODE_NODE, 5, null)).toEqual([]);
  });

  it('reports a Double below the lower bound with Java number text and the option name', () => {
    const issues = validator.checkProperty(option('org.eclipse.elk.spacing.nodeNode'), -1, null);
    expect(messages(issues)).toEqual([
      "The assigned value -1.0 of the option 'Node Spacing' is less than the lower bound 0.0.",
    ]);
    expect(issues[0]?.getSeverity()).toBe(GraphIssue.Severity.ERROR);
  });

  it('prints an Integer option value and bound without a fraction', () => {
    const issues = validator.checkProperty(option('org.eclipse.elk.animTimeFactor'), -1, null);
    expect(messages(issues)).toEqual([
      "The assigned value -1 of the option 'Animation Time Factor' is less than the lower bound 0.",
    ]);
  });

  it('reports an exclusive lower bound as such', () => {
    expect(messages(validator.checkProperty(option('org.eclipse.elk.aspectRatio'), 0, null))).toEqual([
      "The assigned value 0.0 of the option 'Aspect Ratio' is less than the lower bound 0.0 (exclusive).",
    ]);
  });

  it('reports a value above the upper bound with the property id when the option has no name', () => {
    const property = new Property<number>(
      'test.bounded',
      0,
      Property.NEGATIVE_INFINITY,
      bound((x) => (10 < x ? -1 : 1), '10'),
    );
    expect(messages(validator.checkProperty(property, 11, null))).toEqual([
      "The assigned value 11.0 of the option 'test.bounded' is greater than the upper bound 10.",
    ]);
  });

  it('falls back to the id for a nameless option below its bound', () => {
    const property = new Property<number>(
      'test.low',
      0,
      bound(() => 1, '4'),
    );
    expect(messages(validator.checkProperty(property, 1, null))).toEqual([
      "The assigned value 1.0 of the option 'test.low' is less than the lower bound 4.",
    ]);
  });

  it('accepts a null value and a property without a type check', () => {
    expect(validator.checkProperty(option('org.eclipse.elk.direction'), null, null)).toEqual([]);
    expect(validator.checkProperty(new Property<string>('test.plain'), 'x', null)).toEqual([]);
  });

  it.each([
    ['STRING', 5],
    ['BOOLEAN', 'x'],
    ['INT', 1.5],
    ['DOUBLE', 'x'],
    ['ENUMSET', []],
  ] as const)('rejects a mistyped %s value', (typeName, value) => {
    const type = LayoutOptionData.Type.valueOf(typeName);
    const classes = {
      STRING: JavaClass.String,
      BOOLEAN: JavaClass.Boolean,
      INT: JavaClass.Integer,
      DOUBLE: JavaClass.Double,
      ENUMSET: JavaClass.Object,
    };
    const issues = validator.checkProperty(customOption(type, classes[typeName]), value, null);
    expect(messages(issues)).toHaveLength(1);
    expect(messages(issues)[0]).toMatch(/does not match the type /);
  });

  it.each([
    ['STRING', 'x'],
    ['BOOLEAN', true],
    ['INT', 3],
    ['DOUBLE', 2.5],
  ] as const)('accepts a well-typed %s value', (typeName, value) => {
    const type = LayoutOptionData.Type.valueOf(typeName);
    expect(validator.checkProperty(customOption(type), value, null)).toEqual([]);
  });

  it('checks an enum option by its class', () => {
    expect(validator.checkProperty(CoreOptions.DIRECTION as LayoutOptionData, Direction.UP, null)).toEqual([]);
    expect(messages(validator.checkProperty(option('org.eclipse.elk.direction'), 'UP', null))).toEqual([
      "The assigned value UP of the option 'Direction' does not match the type Direction.",
    ]);
  });

  it('checks an enum set by EnumSet', () => {
    const set = EnumSet.noneOf(Direction);
    expect(validator.checkProperty(option('org.eclipse.elk.contentAlignment'), set, null)).toEqual([]);
  });
});

describe('LayoutOptionValidator object options', () => {
  const objectOption = (optionClass: JavaClassRef): LayoutOptionData =>
    customOption(LayoutOptionData.Type.OBJECT, optionClass);
  const accepts = (optionClass: JavaClassRef, value: unknown): boolean =>
    validator.checkProperty(objectOption(optionClass), value, null).length === 0;

  it.each([
    [JavaClass.String, 'x', 1],
    [JavaClass.Boolean, false, 'x'],
    [JavaClass.Integer, 4, 4.5],
    [JavaClass.Double, 4.5, 'x'],
    [JavaClass.Float, 4.5, 'x'],
    [JavaClass.Object, 'x', 'x'],
    [javaInterface('ITest'), {}, 'x'],
    [Direction, Direction.UP, 'UP'],
  ] as const)('checks %# by its class reference', (optionClass, good, bad) => {
    expect(accepts(optionClass, good)).toBe(true);
    expect(accepts(optionClass, bad)).toBe(optionClass === JavaClass.Object);
  });
});

describe('LayoutOptionValidator.visit', () => {
  it('collects the issues of all properties of an element and resolves proxies', () => {
    const node = ElkGraphUtil.createGraph();
    node.setProperty(CoreOptions.SPACING_NODE_NODE, -2);
    const proxy: IPropertyValueProxy = { resolveValue: () => 4 as never };
    node.setProperty(CoreOptions.SPACING_EDGE_EDGE, proxy as never);
    const unresolved: IPropertyValueProxy = { resolveValue: () => null };
    node.setProperty(CoreOptions.SPACING_LABEL_LABEL, unresolved as never);
    validator.visit(node);
    expect(messages(validator.getIssues())).toEqual([
      "The assigned value -2.0 of the option 'org.eclipse.elk.spacing.nodeNode' is less than the lower bound 0.0.",
    ]);
    expect(node.getProperty(CoreOptions.SPACING_EDGE_EDGE)).toBe(4);
    expect(node.getProperties().get(CoreOptions.SPACING_LABEL_LABEL)).toBe(unresolved);
  });
});
