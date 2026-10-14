// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { isPropertyValueProxy } from '../../../graph/properties/IPropertyValueProxy.js';
import { Property } from '../../../graph/properties/Property.js';
import * as JavaString from '../../../java/lang/JavaString.js';
import { LayoutMetaDataService } from '../../data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../../data/LayoutOptionData.js';
import { CoreOptions } from '../../options/CoreOptions.js';
import { LayoutOptionProxy } from './LayoutOptionProxy.js';

const PARSE_REF = new URL('../../../../test/golden/refs/java/graph-text-parse.json', import.meta.url);
const UNKNOWN_ID = 'org.eclipse.elk.noSuchOption';

interface ParseRef {
  cases: { id: string; properties?: { key: string; valueClass: string; value: string }[] }[];
}

function optionOf(id: string): LayoutOptionData {
  const data = LayoutMetaDataService.getInstance().getOptionData(id);
  if (data === null) {
    throw new Error(`option ${id} is not registered`);
  }
  return data;
}

describe('LayoutOptionProxy', () => {
  beforeAll(() => {
    LayoutMetaDataService.unload();
  });

  describe('resolveValue', () => {
    it('parses a double option', () => {
      expect(new LayoutOptionProxy('2.5').resolveValue(CoreOptions.SPACING_NODE_NODE)).toBe(2.5);
    });

    it('parses an int option', () => {
      expect(new LayoutOptionProxy('7').resolveValue(CoreOptions.PRIORITY)).toBe(7);
    });

    it('parses a boolean option', () => {
      expect(new LayoutOptionProxy('TRUE').resolveValue(CoreOptions.INTERACTIVE)).toBe(true);
    });

    it('returns a string option verbatim', () => {
      expect(new LayoutOptionProxy('layered').resolveValue(CoreOptions.ALGORITHM)).toBe('layered');
    });

    it('resolves enum, enum set, KVector and ElkPadding options like parseValue', () => {
      const cases: [string, string, (v: unknown) => void][] = [
        [CoreOptions.DIRECTION.getId(), 'DOWN', (v) => expect(String(v)).toBe('DOWN')],
        [CoreOptions.NODE_SIZE_CONSTRAINTS.getId(), '[PORTS, PORT_LABELS]', (v) => expect(v).not.toBeNull()],
        [CoreOptions.POSITION.getId(), '(1.5,2.5)', (v) => expect(String(v)).toBe('(1.5,2.5)')],
        [CoreOptions.PADDING.getId(), '[top=1,left=2,bottom=3,right=4]', (v) => expect(v).not.toBeNull()],
      ];
      for (const [id, text, check] of cases) {
        const data = optionOf(id);
        const expected = data.parseValue(text);
        const actual = new LayoutOptionProxy(text).resolveValue(new Property<unknown>(id));
        check(actual);
        expect(actual).toEqual(expected);
      }
    });

    it('resolves through a LayoutOptionData property directly', () => {
      const data = optionOf(CoreOptions.SPACING_NODE_NODE.getId());
      expect(new LayoutOptionProxy('3').resolveValue(data)).toBe(3);
    });

    it('resolves a property that is only known by id', () => {
      const property = new Property<number>(CoreOptions.SPACING_NODE_NODE.getId());
      expect(new LayoutOptionProxy('4').resolveValue(property)).toBe(4);
    });

    it('returns null for unparseable text', () => {
      expect(new LayoutOptionProxy('abc').resolveValue(CoreOptions.SPACING_NODE_NODE)).toBeNull();
      expect(new LayoutOptionProxy('maybe').resolveValue(CoreOptions.INTERACTIVE)).toBeNull();
      expect(new LayoutOptionProxy('NOT_A_DIRECTION').resolveValue(CoreOptions.DIRECTION)).toBeNull();
      expect(new LayoutOptionProxy(null).resolveValue(CoreOptions.PRIORITY)).toBeNull();
    });

    it('returns null for an unknown property id', () => {
      expect(new LayoutOptionProxy('1').resolveValue(new Property<number>(UNKNOWN_ID))).toBeNull();
    });

    it('returns null for a null property', () => {
      expect(new LayoutOptionProxy('1').resolveValue(null)).toBeNull();
    });
  });

  describe('setProxyValue', () => {
    it('stores a proxy under a property with the given key', () => {
      const node = ElkGraphUtil.createGraph();
      LayoutOptionProxy.setProxyValue(node, UNKNOWN_ID, 'xyz');
      const stored = node.getProperties().get(new Property<LayoutOptionProxy>(UNKNOWN_ID));
      expect(stored).toBeInstanceOf(LayoutOptionProxy);
      expect(String(stored)).toBe('xyz');
    });
  });

  describe('proxy consumers', () => {
    it('is recognised by isPropertyValueProxy', () => {
      expect(isPropertyValueProxy(new LayoutOptionProxy('x'))).toBe(true);
    });

    it('EMapPropertyHolderImpl.getProperty replaces a resolvable proxy by the resolved value', () => {
      const node = ElkGraphUtil.createGraph();
      LayoutOptionProxy.setProxyValue(node, CoreOptions.SPACING_NODE_NODE.getId(), '9');
      expect(node.getProperty(CoreOptions.SPACING_NODE_NODE)).toBe(9);
      expect(node.getProperties().get(CoreOptions.SPACING_NODE_NODE)).toBe(9);
    });

    it('EMapPropertyHolderImpl.getProperty keeps an unresolvable proxy', () => {
      const node = ElkGraphUtil.createGraph();
      const property = new Property<number>(UNKNOWN_ID, 5);
      LayoutOptionProxy.setProxyValue(node, UNKNOWN_ID, '9');
      expect(node.getProperty(property)).toBe(5);
      expect(node.getProperties().get(property)).toBeInstanceOf(LayoutOptionProxy);
    });
  });

  describe('toString, equals, hashCode', () => {
    it('toString returns the value, null stays null', () => {
      expect(new LayoutOptionProxy('abc').toString()).toBe('abc');
      expect(new LayoutOptionProxy(null).toString()).toBeNull();
    });

    it('equal text gives equal proxies and equal hash codes', () => {
      const a = new LayoutOptionProxy('abc');
      const b = new LayoutOptionProxy('abc');
      expect(a.equals(b)).toBe(true);
      expect(a.hashCode()).toBe(b.hashCode());
      expect(a.hashCode()).toBe(JavaString.hashCode('abc'));
    });

    it('differs for different text, null vs non-null and foreign objects', () => {
      const a = new LayoutOptionProxy('abc');
      expect(a.equals(new LayoutOptionProxy('abd'))).toBe(false);
      expect(a.equals(new LayoutOptionProxy(null))).toBe(false);
      expect(new LayoutOptionProxy(null).equals(a)).toBe(false);
      expect(a.equals('abc')).toBe(false);
      expect(a.equals(null)).toBe(false);
    });

    it('treats two null values as equal with hash code 0', () => {
      const a = new LayoutOptionProxy(null);
      const b = new LayoutOptionProxy(null);
      expect(a.equals(b)).toBe(true);
      expect(a.hashCode()).toBe(0);
      expect(b.hashCode()).toBe(0);
    });
  });

  describe('graph-text-parse.json replay (value text only)', () => {
    it('keeps the recorded value text of every LayoutOptionProxy property', () => {
      const ref = JSON.parse(readFileSync(PARSE_REF, 'utf8')) as ParseRef;
      const rows = ref.cases.flatMap((c) => c.properties ?? []).filter((p) => p.valueClass === 'LayoutOptionProxy');
      expect(rows.length).toBe(124);
      for (const row of rows) {
        const proxy = new LayoutOptionProxy(row.value);
        expect(proxy.toString()).toBe(row.value);
        expect(proxy.equals(new LayoutOptionProxy(row.value))).toBe(true);
      }
    });
  });
});
