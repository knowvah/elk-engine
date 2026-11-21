// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { LayoutOptionData } from '../../src/core/data/LayoutOptionData.js';
import { javaInterface } from '../../src/java/lang/JavaClass.js';
import { RecordingRegistry, listElementNumberKinds } from './recorder.js';

const LIST_OPTION_ID = 't.list';
const ENFORCED_GROUP_ORDERS = 'org.eclipse.elk.layered.considerModelOrder.groupModelOrder.cmEnforcedGroupOrders';
const LIST_CLASS = 'UnmodifiableRandomAccessList';

function listOption(defaultValue: readonly number[]): LayoutOptionData {
  return new LayoutOptionData.Builder()
    .id(LIST_OPTION_ID)
    .type(LayoutOptionData.Type.OBJECT)
    .optionClass(javaInterface('List'))
    .defaultValue(Object.freeze([...defaultValue]))
    .create();
}

describe('RecordingRegistry list element numbers (D4)', () => {
  it('encodes a List<Integer> default as int items', () => {
    const recorder = new RecordingRegistry({ listElementNumbers: new Map([[LIST_OPTION_ID, 'INT']]) });
    recorder.register(listOption([1, 2]));
    expect(recorder.calls[0]).toMatchObject({
      call: 'registerOption',
      data: {
        default: {
          t: 'list',
          c: LIST_CLASS,
          items: [
            { t: 'int', v: 1 },
            { t: 'int', v: 2 },
          ],
        },
      },
    });
  });

  it('encodes a List<Double> default as double items through DoubleToString', () => {
    const recorder = new RecordingRegistry({ listElementNumbers: new Map([[LIST_OPTION_ID, 'DOUBLE']]) });
    recorder.register(listOption([1, 2.5]));
    recorder.addOptionSupport('a', LIST_OPTION_ID, [1, 2.5]);
    const doubles = {
      t: 'list',
      c: LIST_CLASS,
      items: [
        { t: 'double', v: '1.0' },
        { t: 'double', v: '2.5' },
      ],
    };
    expect(recorder.calls[0]).toMatchObject({ data: { default: doubles } });
    expect(recorder.calls[1]).toMatchObject({ call: 'addOptionSupport', default: doubles });
  });

  it('still throws for a list whose element kind is unknown', () => {
    const recorder = new RecordingRegistry({ listElementNumbers: new Map() });
    expect(() => recorder.register(listOption([1, 2]))).toThrow(/cannot tell whether 1 is an int or a double/);
  });

  it('derives the element kinds from the vendored model: List<Integer> is INT', () => {
    const kinds = listElementNumberKinds();
    expect(kinds.get(ENFORCED_GROUP_ORDERS)).toBe('INT');
    expect([...new Set(kinds.values())]).toEqual(['INT']);
    expect([...kinds.keys()].sort()).toEqual([
      ENFORCED_GROUP_ORDERS,
      'org.eclipse.elk.layered.wrapping.cutting.cuts',
      'org.eclipse.elk.layered.wrapping.validify.forbiddenIndices',
    ]);
  });
});
