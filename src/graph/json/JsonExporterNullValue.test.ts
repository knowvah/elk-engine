// SPDX-License-Identifier: EPL-2.0
// A stored null option value reaches `p.value.toString` in both `forEach` loops of the Xtend exporter
// (JsonExporter.xtend:321 layoutOptions, :342 individualSpacings) and throws a NullPointerException; the port
// throws a TypeError (D10). JSON input cannot store a null value, `.elkt` input can (`direction: null`).
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { IndividualSpacings } from '../../core/util/IndividualSpacings.js';
import type { IProperty } from '../properties/IProperty.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { JsonExporter } from './JsonExporter.js';

beforeEach(() => {
  LayoutMetaDataService.getInstance();
});

describe('JsonExporter: a null option value', () => {
  it('fails in layoutOptions with a TypeError (Java: p.value.toString NPE)', () => {
    const root = ElkGraphUtil.createGraph();
    root.getProperties().put(CoreOptions.DIRECTION, null);
    expect(() => new JsonExporter().export(root)).toThrow(TypeError);
  });

  it('fails in individualSpacings with a TypeError (Java: p.value.toString NPE)', () => {
    const root = ElkGraphUtil.createGraph();
    const inner = new IndividualSpacings();
    inner.setProperty(CoreOptions.SPACING_NODE_NODE, 5);
    // setProperty(key, null) removes the key and the map is private: feed the null value through the
    // read-only view, as a Java HashMap entry with a null value would iterate.
    const view = inner.getAllProperties();
    inner.getAllProperties = () => ({
      ...view,
      isEmpty: () => false,
      [Symbol.iterator]: () => [[CoreOptions.SPACING_NODE_NODE, null] as [IProperty<unknown>, unknown]].values(),
    });
    root.setProperty(CoreOptions.SPACING_INDIVIDUAL, inner);
    expect(() => new JsonExporter().export(root)).toThrow(TypeError);
  });
});
