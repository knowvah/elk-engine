// SPDX-License-Identifier: EPL-2.0
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { KVector } from '../../../core/math/KVector.js';
import { SVGImage } from './SVGImage.js';

/** The private bookkeeping of an image, read for assertions. */
interface Internals {
  groups: Map<string, string>;
  current: string;
  viewBoxX: number;
  viewBoxY: number;
  viewBoxW: number;
  viewBoxH: number;
  enableUpdateViewBox: boolean;
  index: number;
}

const inner = (img: SVGImage): Internals => img as unknown as Internals;
const ATTRS = 'fill="red"';
const MISSING_FILE_PREFIX = 'svgimage-test-never-written';

describe('SVGImage constructor', () => {
  it('disables the output without a usable file name', () => {
    for (const name of [null, '', 'null', 'nullable']) {
      const img = new SVGImage(name);
      expect(img.debug).toBe(false);
      expect(img.fileName).toBeNull();
      expect([...inner(img).groups]).toEqual([['main', '']]);
    }
  });

  it('enables the output for a file name', () => {
    const img = new SVGImage('x');
    expect(img.debug).toBe(true);
    expect(img.fileName).toBe('x');
  });
});

describe('SVGImage disabled', () => {
  it('ignores every call', () => {
    const img = new SVGImage(null);
    img.g('a').addCircle(1, 2);
    img.addCircle(1, 2, 3, ATTRS);
    img.addLine(0, 0, 1, 1);
    img.addLine(0, 0, 1, 1, ATTRS);
    img.addRect(0, 0, 1, 1, ATTRS);
    img.addRect(new ElkRectangle(0, 0, 1, 1), ATTRS);
    img.addPoly(ATTRS, new KVector(0, 0));
    img.addText(0, 0, 't', ATTRS);
    img.addGroups('b');
    img.setViewBox(0, 0, 1, 1);
    img.addElementStr('<x/>');
    img.removeGroup('main');
    img.clearGroup('main');
    img.save();
    img.isave();
    expect([...inner(img).groups]).toEqual([['main', '']]);
    expect(inner(img).enableUpdateViewBox).toBe(true);
    // Java increments the number in isave() whether or not the output is enabled.
    expect(inner(img).index).toBe(1);
  });
});

describe('SVGImage groups', () => {
  it('selects groups and resets to main after an element', () => {
    const img = new SVGImage('x');
    expect(img.g('a')).toBe(img);
    expect(inner(img).current).toBe('a');
    img.addElementStr('<e/>');
    expect(inner(img).current).toBe('main');
    expect([...inner(img).groups]).toEqual([
      ['main', ''],
      ['a', '<e/>\n'],
    ]);
  });

  it('keeps an existing group when it is selected again', () => {
    const img = new SVGImage('x');
    img.g('a').addElementStr('<e/>');
    img.g('a');
    expect(inner(img).groups.get('a')).toBe('<e/>\n');
  });

  it('adds groups, clearing existing ones', () => {
    const img = new SVGImage('x');
    img.g('a').addElementStr('<e/>');
    img.addGroups('a', 'b');
    expect([...inner(img).groups]).toEqual([
      ['main', ''],
      ['a', ''],
      ['b', ''],
    ]);
  });

  it('clears only existing groups and never removes main', () => {
    const img = new SVGImage('x');
    img.addElementStr('<m/>');
    img.g('a').addElementStr('<e/>');
    img.clearGroup('a');
    img.clearGroup('nope');
    expect([...inner(img).groups]).toEqual([
      ['main', '<m/>\n'],
      ['a', ''],
    ]);
    img.removeGroup('a');
    img.removeGroup('main');
    expect([...inner(img).groups]).toEqual([['main', '']]);
  });

  it('fails like a Java NullPointerException when the current group was removed', () => {
    const img = new SVGImage('x');
    img.g('a');
    img.removeGroup('a');
    expect(() => img.addElementStr('<e/>')).toThrow('SVG group "a" does not exist');
  });
});

describe('SVGImage elements and view box', () => {
  it('writes a circle with the default and the explicit radius', () => {
    const img = new SVGImage('x');
    img.addCircle(1, 2);
    img.addCircle(1.5, 2, 3, ATTRS);
    expect(inner(img).groups.get('main')).toBe(
      '<circle cx="1.0" cy="2.0" r="5.0" stroke="black" stroke-width="1" fill="none" />\n' +
        '<circle cx="1.5" cy="2.0" r="3.0" fill="red" />\n',
    );
    expect(inner(img).viewBoxX).toBe(-4);
    expect(inner(img).viewBoxY).toBe(-3);
    expect(inner(img).viewBoxW).toBe(10);
    expect(inner(img).viewBoxH).toBe(10);
  });

  it('writes lines, rectangles, polylines and text', () => {
    const img = new SVGImage('x');
    img.addLine(0, 0, 4, 2);
    img.addLine(1, 1, 2, 2, ATTRS);
    img.addRect(1, 2, 3, 4, ATTRS);
    img.addRect(new ElkRectangle(5, 6, 7, 8), ATTRS);
    img.addPoly(ATTRS, new KVector(1, 2), new KVector(3, 4));
    img.addText(9, 10, 'hi', ATTRS);
    expect(inner(img).groups.get('main')).toBe(
      '<line x1="0.0" y1="0.0" x2="4.0" y2="2.0" stroke="black" stroke-width="1" />\n' +
        '<line x1="1.0" y1="1.0" x2="2.0" y2="2.0" fill="red" />\n' +
        '<rect x="1.0" y="2.0" width="3.0" height="4.0" fill="red" />\n' +
        '<rect x="5.0" y="6.0" width="7.0" height="8.0" fill="red" />\n' +
        '<polyline points="1.0,2.0 3.0,4.0 " fill="red" />\n' +
        '<text x="9.0" y="10.0" fill="red">hi</text>\n',
    );
    // text does not touch the view box; the rest spans (0,0)..(12,14)
    expect([inner(img).viewBoxX, inner(img).viewBoxY, inner(img).viewBoxW, inner(img).viewBoxH]).toEqual([
      0, 0, 12, 14,
    ]);
  });

  it('ignores non-finite points in the view box', () => {
    const img = new SVGImage('x');
    img.addLine(0, 0, Infinity, 1, ATTRS);
    expect(inner(img).viewBoxX).toBe(0);
    expect(inner(img).viewBoxW).toBe(0);
  });

  it('fixes the view box with setViewBox and clear keeps it', () => {
    const img = new SVGImage('x');
    img.setViewBox(1, 2, 3, 4);
    img.addCircle(100, 100);
    expect([inner(img).viewBoxX, inner(img).viewBoxY, inner(img).viewBoxW, inner(img).viewBoxH]).toEqual([1, 2, 3, 4]);
    img.g('a').addElementStr('<e/>');
    img.clear();
    expect([...inner(img).groups]).toEqual([['main', '']]);
    expect(inner(img).viewBoxW).toBe(3);
  });

  it('clear resets the automatic view box and re-evaluates the debug flag', () => {
    const img = new SVGImage('x');
    img.addCircle(0, 0);
    img.clear();
    expect(inner(img).viewBoxX).toBe(Infinity);
    expect(inner(img).viewBoxW).toBe(0);
    img.fileName = '';
    img.clear();
    expect(img.debug).toBe(false);
    img.fileName = null;
    img.clear();
    expect(img.debug).toBe(false);
  });
});

describe('SVGImage save', () => {
  it('writes nothing, enabled or disabled, and counts isave calls', () => {
    const on = new SVGImage(MISSING_FILE_PREFIX);
    on.addCircle(0, 0);
    on.save();
    on.save(`${MISSING_FILE_PREFIX}-other`);
    on.isave();
    on.isave(`${MISSING_FILE_PREFIX}-seq`);
    expect(inner(on).index).toBe(2);
    const off = new SVGImage(null);
    off.save();
    off.isave();
    expect(inner(off).index).toBe(1);
    for (const suffix of ['', '-other', '000', '-seq001', '001']) {
      expect(existsSync(`${MISSING_FILE_PREFIX}${suffix}.svg`)).toBe(false);
    }
  });

  it('builds the document the Java save would print', () => {
    const img = new SVGImage('x');
    img.addRect(0, 0, 100, 50, ATTRS);
    const lines = (img as unknown as { buildDocument(): string[] }).buildDocument();
    expect(lines).toEqual([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"  viewBox="-20.0 -20.0 140.0 90.0">',
      '<g transform="scale(1.0)" id="main">\n<rect x="0.0" y="0.0" width="100.0" height="50.0" fill="red" />\n</g>',
      '</svg>',
    ]);
  });

  it('scales down an image larger than maxArea', () => {
    const img = new SVGImage('x');
    img.maxArea = 2500;
    img.setViewBox(0, 0, 100, 100);
    const lines = (img as unknown as { buildDocument(): string[] }).buildDocument();
    // scale = sqrt(2500 / 10000) = 0.5
    expect(lines[1]).toContain('viewBox="-20.0 -20.0 90.0 90.0"');
    expect(lines[2]).toContain('<g transform="scale(0.5)" id="main">');
  });
});
