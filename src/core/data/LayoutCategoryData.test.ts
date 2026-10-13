// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import * as JavaString from '../../java/lang/JavaString.js';
import { LayoutAlgorithmData } from './LayoutAlgorithmData.js';
import { LayoutCategoryData } from './LayoutCategoryData.js';

const CATEGORY_ID = 'org.eclipse.elk.layered';

function category(id: string): LayoutCategoryData {
  return new LayoutCategoryData.Builder().id(id).name('Layered').description('Sugiyama').create();
}

describe('LayoutCategoryData', () => {
  it('exposes the configured values', () => {
    const c = category(CATEGORY_ID);
    expect(c.getId()).toBe(CATEGORY_ID);
    expect(c.getName()).toBe('Layered');
    expect(c.getDescription()).toBe('Sugiyama');
    expect(c.getLayouters()).toEqual([]);
  });

  it('leaves unset name and description null and the id empty', () => {
    const c = new LayoutCategoryData.Builder().create();
    expect(c.getName()).toBeNull();
    expect(c.getDescription()).toBeNull();
    expect(c.getId()).toBe('');
  });

  it('collects layouters and follows the id-based Java object contract', () => {
    const c = category(CATEGORY_ID);
    const a = new LayoutAlgorithmData.Builder().id('a').create();
    const b = new LayoutAlgorithmData.Builder().id('b').create();
    c.getLayouters().push(a, b);
    expect(c.getLayouters()).toEqual([a, b]);
    expect(c.toString()).toBe(`Layout Type: ${CATEGORY_ID}`);
    expect(c.hashCode()).toBe(JavaString.hashCode(CATEGORY_ID));
    expect(c.equals(category(CATEGORY_ID))).toBe(true);
    expect(c.equals(category('other'))).toBe(false);
    expect(c.equals(a)).toBe(false);
    expect(c.equals(null)).toBe(false);
  });
});
