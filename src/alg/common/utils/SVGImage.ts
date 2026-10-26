// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import type { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { toString as doubleToString } from '../../../java/lang/DoubleToString.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import * as Maps from '../../../guava/Maps.js';

/** The element group that always exists and cannot be removed. */
const MAIN_GROUP = 'main';

/** The default radius of a circle. */
const DEFAULT_RADIUS = 5;

/** The default attributes of a circle. */
const DEFAULT_CIRCLE_ATTRIBUTES = 'stroke="black" stroke-width="1" fill="none"';

/** The default attributes of a line. */
const DEFAULT_LINE_ATTRIBUTES = 'stroke="black" stroke-width="1"';

/** Number of digits of the running number appended by `isave` (`%1$03d`). */
const INDEX_DIGITS = 3;

/**
 * SVG output for debugging purposes. Everything but the file writes is ported verbatim (decision
 * AC4): there is no file system in a browser build, so {@link save} and {@link isave} build the
 * document and write nothing.
 *
 * The overloads `addCircle(x, y)` / `addCircle(x, y, r, attributes)`, `addLine(x1, y1, x2, y2)` /
 * `addLine(x1, y1, x2, y2, attributes)` and `addRect(x, y, w, h, attributes)` /
 * `addRect(r, attributes)` are told apart by argument count and by `typeof`.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/utils/SVGImage.java
 */
export class SVGImage {
  private readonly spacing = 20;
  private viewBoxX = Number.POSITIVE_INFINITY;
  private viewBoxY = Number.POSITIVE_INFINITY;
  private viewBoxW = 0;
  private viewBoxH = 0;
  private viewBoxX2 = Number.NEGATIVE_INFINITY;
  private viewBoxY2 = Number.NEGATIVE_INFINITY;
  private enableUpdateViewBox = true;
  private current = MAIN_GROUP;
  private readonly groups: Map<string, string> = Maps.newLinkedHashMap<string, string>();
  /**
   * Path to the file where the image should be saved. The file extension and a possible
   * numeration are appended automatically.
   */
  fileName: string | null = null;
  private index = 0;
  /** Enables the output. */
  debug = false;
  /** The image will be scaled down if it exceeds this size. */
  maxArea = 8294400; // 4k

  /**
   * The constructor disables the output if the filename is null.
   *
   * @param file the SVG's filename
   */
  constructor(file: string | null) {
    if (file !== null && file.length > 0 && !file.startsWith('null')) {
      this.fileName = file;
      this.debug = true;
    }
    this.groups.set(this.current, '');
  }

  /**
   * Select an SVG group.
   *
   * @param key the identifier of an existing or a new group
   * @returns the image with the selected group being active
   */
  g(key: string): SVGImage {
    if (this.debug) {
      if (!this.groups.has(key)) {
        this.groups.set(key, '');
      }
      this.current = key;
    }
    return this;
  }

  /**
   * Add SVG groups.
   *
   * @param keys the new groups' identifiers
   */
  addGroups(...keys: string[]): void {
    if (this.debug) {
      for (const key of keys) {
        this.groups.set(key, ''); // clears existing
      }
    }
  }

  /**
   * Clears the specified group.
   *
   * @param key identifier of the group
   */
  clearGroup(key: string): void {
    if (this.debug) {
      // `Map.replace`: only an existing mapping is replaced.
      if (this.groups.has(key)) {
        this.groups.set(key, '');
      }
    }
  }

  /**
   * Removes group.
   *
   * @param key identifier of the group
   */
  removeGroup(key: string): void {
    if (this.debug) {
      if (key === MAIN_GROUP) {
        this.clearGroup(key);
      } else {
        this.groups.delete(key);
      }
    }
  }

  /**
   * Sets the SVG's viewbox to a fixed size and position and disables its automatic updating.
   *
   * @param x x
   * @param y y
   * @param w width
   * @param h height
   */
  setViewBox(x: number, y: number, w: number, h: number): void {
    if (this.debug) {
      this.viewBoxX = x;
      this.viewBoxY = y;
      this.viewBoxW = w;
      this.viewBoxH = h;
      this.enableUpdateViewBox = false;
    }
  }

  /** Clears the entire image and resets the output according to the availability of a filename. */
  clear(): void {
    this.debug = this.fileName !== null && this.fileName.length > 0;
    if (this.debug) {
      this.groups.clear();
      this.current = MAIN_GROUP;
      this.groups.set(this.current, '');
      if (this.enableUpdateViewBox) {
        this.viewBoxX = Number.POSITIVE_INFINITY;
        this.viewBoxY = Number.POSITIVE_INFINITY;
        this.viewBoxW = 0;
        this.viewBoxH = 0;
        this.viewBoxX2 = Number.NEGATIVE_INFINITY;
        this.viewBoxY2 = Number.NEGATIVE_INFINITY;
      }
    }
  }

  addElementStr(element: string): void {
    if (this.debug) {
      // Java: `groups.get(current).concat(...)` throws a NullPointerException for a removed group.
      const content = this.groups.get(this.current);
      if (content === undefined) {
        throw new IllegalStateException(`SVG group "${this.current}" does not exist`);
      }
      this.groups.set(this.current, content + element + '\n');
      this.current = MAIN_GROUP;
    }
  }

  addCircle(x: number, y: number): void;
  addCircle(x: number, y: number, r: number, attributes: string): void;
  addCircle(x: number, y: number, r?: number, attributes?: string): void {
    if (this.debug) {
      if (r === undefined || attributes === undefined) {
        this.addCircle(x, y, DEFAULT_RADIUS, DEFAULT_CIRCLE_ATTRIBUTES);
        return;
      }
      this.addElementStr(
        `<circle cx="${doubleToString(x)}" cy="${doubleToString(y)}" r="${doubleToString(r)}" ${attributes} />`,
      );
      this.updateViewBox(new KVector(x - r, y - r), new KVector(x + r, y + r));
    }
  }

  addLine(x1: number, y1: number, x2: number, y2: number): void;
  addLine(x1: number, y1: number, x2: number, y2: number, attributes: string): void;
  addLine(x1: number, y1: number, x2: number, y2: number, attributes?: string): void {
    if (this.debug) {
      if (attributes === undefined) {
        this.addLine(x1, y1, x2, y2, DEFAULT_LINE_ATTRIBUTES);
        return;
      }
      this.addElementStr(
        `<line x1="${doubleToString(x1)}" y1="${doubleToString(y1)}" x2="${doubleToString(x2)}" ` +
          `y2="${doubleToString(y2)}" ${attributes} />`,
      );
      this.updateViewBox(new KVector(x1, y1), new KVector(x2, y2));
    }
  }

  addRect(x: number, y: number, w: number, h: number, attributes: string): void;
  addRect(r: ElkRectangle, attributes: string): void;
  addRect(...args: [number, number, number, number, string] | [ElkRectangle, string]): void {
    if (this.debug) {
      if (args.length === 2) {
        const [r, rectAttributes] = args;
        this.addRect(r.x, r.y, r.width, r.height, rectAttributes);
        return;
      }
      const [x, y, w, h, attributes] = args;
      this.addElementStr(
        `<rect x="${doubleToString(x)}" y="${doubleToString(y)}" width="${doubleToString(w)}" ` +
          `height="${doubleToString(h)}" ${attributes} />`,
      );
      this.updateViewBox(new KVector(x, y), new KVector(x + w, y + h));
    }
  }

  addPoly(attributes: string, ...points: KVector[]): void {
    if (this.debug) {
      let str = '<polyline points="';
      for (const p of points) {
        str += `${doubleToString(p.x)},${doubleToString(p.y)} `;
      }
      this.addElementStr(`${str}" ${attributes} />`);
      this.updateViewBox(...points);
    }
  }

  addText(x: number, y: number, text: string, attributes: string): void {
    // anchor bottom left
    if (this.debug) {
      this.addElementStr(`<text x="${doubleToString(x)}" y="${doubleToString(y)}" ${attributes}>${text}</text>`);
      // no update because size unknown
    }
  }

  private updateViewBox(...points: KVector[]): void {
    if (this.debug) {
      if (this.enableUpdateViewBox) {
        for (const point of points) {
          if (Number.isFinite(point.x) && Number.isFinite(point.y)) {
            this.viewBoxX = Math.min(this.viewBoxX, point.x);
            this.viewBoxY = Math.min(this.viewBoxY, point.y);
            this.viewBoxX2 = Math.max(this.viewBoxX2, point.x);
            this.viewBoxY2 = Math.max(this.viewBoxY2, point.y);
          }
        }
        this.viewBoxW = this.viewBoxX2 - this.viewBoxX;
        this.viewBoxH = this.viewBoxY2 - this.viewBoxY;
      }
    }
  }

  /**
   * Builds the SVG document that Java writes to `fName + ".svg"`, one string per `println`.
   *
   * @returns the lines of the document
   */
  private buildDocument(): string[] {
    const area = this.viewBoxH * this.viewBoxW;
    let scale = 1;
    if (area > this.maxArea) {
      scale = Math.sqrt(this.maxArea / area);
    }
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"  viewBox="' +
        `${doubleToString(this.viewBoxX * scale - this.spacing)} ` +
        `${doubleToString(this.viewBoxY * scale - this.spacing)} ` +
        `${doubleToString(this.viewBoxW * scale + 2 * this.spacing)} ` +
        `${doubleToString(this.viewBoxH * scale + 2 * this.spacing)}">`,
    );
    for (const [key, value] of this.groups) {
      lines.push(`<g transform="scale(${doubleToString(scale)})" id="${key}">\n${value}</g>`);
    }
    lines.push('</svg>');
    return lines;
  }

  /**
   * Writes the SVG to the given file. Java (`:252-301`) computes the scale, creates the parent
   * directories, opens a `FileWriter` on `fName + ".svg"` and prints the lines built here. This port
   * stops before the `FileWriter` (decision AC4): the document is built, nothing is written.
   *
   * @param fName filename without file extension; `save()` is `save(fileName)`
   */
  save(fName: string | null = this.fileName): void {
    if (this.debug) {
      // The Java `new File(fName).getParentFile().mkdirs()` and `new FileWriter(fName + ".svg")` with the
      // `println` calls of the lines below are dropped; `fName` only names the file that is not written.
      void fName;
      void this.buildDocument();
    }
  }

  /**
   * Writes the SVG and appends an incrementing number (`isave()` is `isave(fileName)`).
   *
   * @param fName filename without file extension
   */
  isave(fName: string | null = this.fileName): void {
    this.save(`${String(fName)}${String(this.index).padStart(INDEX_DIGITS, '0')}`);
    this.index++;
  }
}
