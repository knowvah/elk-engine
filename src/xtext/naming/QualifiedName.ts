// SPDX-License-Identifier: EPL-2.0
import { ArrayIndexOutOfBoundsException } from '../../java/lang/ArrayIndexOutOfBoundsException.js';
import type { Comparable } from '../../java/lang/Comparable.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { add, mul } from '../../java/lang/Int32.js';
import { compareTo as compareStrings, hashCode as hashString } from '../../java/lang/JavaString.js';

const NULL_SEGMENT_MESSAGE = 'Segment cannot be null';
const DEFAULT_DELIMITER = '.';
const NULL_TEXT = 'null';
const HASH_SEED = 1;
const HASH_FACTOR = 31;

/**
 * The Java `QualifiedName` is a class with two anonymous/nested subclasses (the empty name and the
 * lower-case name). Here they are variants of one class: `empty` is `EMPTY`, `lowerCase` is
 * `QualifiedNameLowerCase` (its own lower case, always ready).
 */
type Variant = 'plain' | 'lowerCase' | 'empty';

/** `Character.toUpperCase`/`toLowerCase` map one UTF-16 unit to one; `ß` -> `SS` is not a mapping. */
function foldChar(c: string, fold: (s: string) => string): string {
  const folded = fold(c);
  return folded.length === 1 ? folded : c;
}

/** `Character.toLowerCase(Character.toUpperCase(c))`, the folding of `String.compareToIgnoreCase`. */
function foldForCompare(c: string): string {
  return foldChar(
    foldChar(c, (s) => s.toUpperCase()),
    (s) => s.toLowerCase(),
  );
}

/** `String.compareToIgnoreCase`: first differing folded unit, else the length difference. */
function compareIgnoreCase(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  for (let i = 0; i < limit; i++) {
    if (a[i] !== b[i]) {
      const fa = foldForCompare(a[i] as string);
      const fb = foldForCompare(b[i] as string);
      if (fa !== fb) {
        return fa.charCodeAt(0) - fb.charCodeAt(0);
      }
    }
  }
  return a.length - b.length;
}

/** `String.equalsIgnoreCase`: same length and every unit equal after folding. */
function equalsIgnoreCase(a: string, b: string): boolean {
  return a.length === b.length && compareIgnoreCase(a, b) === 0;
}

/** `Arrays.hashCode(String[])`: 31 * h + element hash from 1, int32 wrapping. */
function arrayHash(segments: readonly string[]): number {
  let result = HASH_SEED;
  for (const segment of segments) {
    result = add(mul(HASH_FACTOR, result), hashString(segment));
  }
  return result;
}

/**
 * An immutable dotted name (the cache of its lower-case form is the only mutable state and is not
 * observable). A null segment is an `IllegalArgumentException`: the declarative name provider
 * relies on it to yield no name for an element without an identifier. Not ported: `Builder`,
 * interning (`USE_INTERNING`; behaviourally the identity) and the binary stream (de)serialisation.
 * `String.toLowerCase`/`toUpperCase` are locale-independent here (Java uses the default locale).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/naming/QualifiedName.java
 */
export class QualifiedName implements Comparable<QualifiedName> {
  /** The single existing empty name. */
  static readonly EMPTY: QualifiedName = new QualifiedName([], 'empty');

  private readonly hash: number;
  private readonly segments: readonly string[];
  private lowerCase: QualifiedName | null = null;

  private constructor(
    segments: readonly string[],
    private readonly variant: Variant = 'plain',
  ) {
    this.segments = Object.freeze([...segments]);
    this.hash = arrayHash(this.segments);
  }

  /**
   * `create(String...)` and `create(String)`; segments may be `null` only so that the Java
   * null check is reproduced.
   *
   * @throws IllegalArgumentException if any segment is null
   */
  static create(...segments: ReadonlyArray<string | null>): QualifiedName {
    return QualifiedName.createFromList(segments);
  }

  /**
   * `create(List<String>)`: `null` or empty gives `EMPTY`.
   *
   * @throws IllegalArgumentException if any segment is null
   */
  static createFromList(segments: ReadonlyArray<string | null> | null): QualifiedName {
    if (segments === null || segments.length === 0) {
      return QualifiedName.EMPTY;
    }
    const checked: string[] = [];
    for (const segment of segments) {
      if (segment === null) {
        throw new IllegalArgumentException(NULL_SEGMENT_MESSAGE);
      }
      checked.push(segment);
    }
    return new QualifiedName(checked);
  }

  /** Wraps a name function to return a qualified name; `null` when the function returns `null`. */
  static wrapper<F>(nameFunction: (from: F) => string | null): (from: F) => QualifiedName | null {
    return (from) => {
      const name = nameFunction(from);
      return name === null ? null : QualifiedName.create(name);
    };
  }

  isEmpty(): boolean {
    return this.segments.length === 0;
  }

  getSegments(): readonly string[] {
    return this.segments;
  }

  getSegmentCount(): number {
    return this.segments.length;
  }

  /** @throws ArrayIndexOutOfBoundsException outside `0 .. count - 1` */
  getSegment(index: number): string {
    const segment = this.segments[index];
    if (segment === undefined) {
      throw new ArrayIndexOutOfBoundsException(`Index ${index} out of bounds for length ${this.segments.length}`);
    }
    return segment;
  }

  getLastSegment(): string {
    return this.getSegment(this.segments.length - 1);
  }

  getFirstSegment(): string {
    return this.getSegment(0);
  }

  /** `append(String)` and `append(QualifiedName)`; appending to `EMPTY` is the argument's name. */
  append(segment: string | QualifiedName): QualifiedName {
    if (!(segment instanceof QualifiedName)) {
      return this.appendSegment(segment);
    }
    if (this.variant === 'empty') {
      return segment;
    }
    return new QualifiedName([...this.segments, ...segment.segments]);
  }

  private appendSegment(segment: string): QualifiedName {
    // the Java null check; the type excludes null, JS callers may not
    if ((segment as string | null) === null) {
      throw new IllegalArgumentException(NULL_SEGMENT_MESSAGE);
    }
    return new QualifiedName([...this.segments, segment]);
  }

  skipFirst(skipCount: number): QualifiedName {
    return this.skip(skipCount, (count) => this.segments.slice(count));
  }

  skipLast(skipCount: number): QualifiedName {
    return this.skip(skipCount, (count) => this.segments.slice(0, this.segments.length - count));
  }

  private skip(skipCount: number, remaining: (count: number) => readonly string[]): QualifiedName {
    if (skipCount === this.segments.length) {
      return QualifiedName.EMPTY;
    }
    if (skipCount === 0) {
      return this;
    }
    if (skipCount > this.segments.length || skipCount < 0) {
      throw new IllegalArgumentException(
        `Cannot skip ${skipCount} fragments from QualifiedName with ${this.segments.length} segments`,
      );
    }
    return new QualifiedName(remaining(skipCount));
  }

  toLowerCase(): QualifiedName {
    if (this.variant !== 'plain') {
      return this;
    }
    if (this.lowerCase !== null) {
      return this.lowerCase;
    }
    const lowered = this.segments.map((segment) => segment.toLowerCase());
    const isLowerCase = lowered.every((segment, i) => segment === this.segments[i]);
    this.lowerCase = isLowerCase ? this : new QualifiedName(lowered, 'lowerCase');
    return this.lowerCase;
  }

  toUpperCase(): QualifiedName {
    if (this.variant === 'empty') {
      return this;
    }
    const result = new QualifiedName(this.segments.map((segment) => segment.toUpperCase()));
    result.lowerCase = this.lowerCase;
    return result;
  }

  hashCode(): number {
    return this.hash;
  }

  /** Hash first, then the segments. */
  equals(obj: unknown): boolean {
    if (obj === this) {
      return true;
    }
    if (obj instanceof QualifiedName) {
      return this.hash === obj.hash && this.segmentsEqual(obj, (a, b) => a === b);
    }
    return false;
  }

  /** Whether a ready-to-use lower-case form exists. */
  private hasLowerCase(): boolean {
    return this.variant !== 'plain' || this.lowerCase !== null;
  }

  equalsIgnoreCase(obj: unknown): boolean {
    if (obj === this) {
      return true;
    }
    if (obj instanceof QualifiedName) {
      if (this.hasLowerCase() && obj.hasLowerCase()) {
        return this.toLowerCase().equals(obj.toLowerCase());
      }
      return this.segmentsEqual(obj, equalsIgnoreCase);
    }
    return false;
  }

  private segmentsEqual(other: QualifiedName, same: (a: string, b: string) => boolean): boolean {
    return (
      this.segments.length === other.segments.length &&
      this.segments.every((s, i) => same(s, other.segments[i] as string))
    );
  }

  compareTo(qualifiedName: QualifiedName): number {
    return this.compareWith(qualifiedName, compareStrings);
  }

  compareToIgnoreCase(qualifiedName: QualifiedName): number {
    return this.compareWith(qualifiedName, compareIgnoreCase);
  }

  private compareWith(other: QualifiedName, compare: (a: string, b: string) => number): number {
    const upTo = Math.min(this.segments.length, other.segments.length);
    for (let i = 0; i < upTo; i++) {
      const result = compare(this.segments[i] as string, other.segments[i] as string);
      if (result !== 0) {
        return result;
      }
    }
    return this.segments.length - other.segments.length;
  }

  startsWith(prefix: QualifiedName): boolean {
    return this.startsWithWith(prefix, (a, b) => a === b);
  }

  startsWithIgnoreCase(prefix: QualifiedName): boolean {
    return this.startsWithWith(prefix, equalsIgnoreCase);
  }

  private startsWithWith(prefix: QualifiedName, same: (a: string, b: string) => boolean): boolean {
    // Guava Preconditions.checkArgument(prefix != null, ...) in the Java
    if ((prefix as QualifiedName | null) === null) {
      throw new IllegalArgumentException('prefix must not be null');
    }
    if (prefix.segments.length > this.segments.length) {
      return false;
    }
    return prefix.segments.every((s, i) => same(this.segments[i] as string, s));
  }

  /** A `null` delimiter prints as the text `null`, as `StringBuilder.append((String) null)`. */
  toString(delimiter: string | null = DEFAULT_DELIMITER): string {
    return this.segments.join(delimiter ?? NULL_TEXT);
  }
}
