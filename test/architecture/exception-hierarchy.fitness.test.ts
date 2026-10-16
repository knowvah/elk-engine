// SPDX-License-Identifier: EPL-2.0
/**
 * Fitness function (AD-16a): every exception class in `src/` extends its Java parent, so a handler for a
 * parent class catches the whole family as in Java. JS `Error` stands in for `Throwable`. Parents are those
 * of the Java classes (JDK Javadoc, Gson, EMF, Xtext 2.36.0 and ELK sources at the pinned commits); the two
 * port-local errors have no Java counterpart and extend `Error`. A new exception class must be added here.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BasicIndexOutOfBoundsException } from '../../src/emf/common/util/BasicIndexOutOfBoundsException.js';
import { JsonImportException } from '../../src/graph/json/JsonImportException.js';
import { SyntaxFailure } from '../../src/xtext/parser/SyntaxFailure.js';
import { ElkGraphSerializationError } from '../../src/graph/text/serializer/ElkGraphSerializationError.js';
import { JsonIOException } from '../../src/gson/JsonIOException.js';
import { JsonParseException } from '../../src/gson/JsonParseException.js';
import { JsonSyntaxException } from '../../src/gson/JsonSyntaxException.js';
import { MalformedJsonException } from '../../src/gson/stream/MalformedJsonException.js';
import { EOFException } from '../../src/java/io/EOFException.js';
import { IOException } from '../../src/java/io/IOException.js';
import { ArithmeticException } from '../../src/java/lang/ArithmeticException.js';
import { ArrayIndexOutOfBoundsException } from '../../src/java/lang/ArrayIndexOutOfBoundsException.js';
import { ClassCastException } from '../../src/java/lang/ClassCastException.js';
import { Exception } from '../../src/java/lang/Exception.js';
import { IllegalArgumentException } from '../../src/java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../src/java/lang/IllegalStateException.js';
import { IndexOutOfBoundsException } from '../../src/java/lang/IndexOutOfBoundsException.js';
import { NumberFormatException } from '../../src/java/lang/NumberFormatException.js';
import { RuntimeException } from '../../src/java/lang/RuntimeException.js';
import { StringIndexOutOfBoundsException } from '../../src/java/lang/StringIndexOutOfBoundsException.js';
import { UnsupportedOperationException } from '../../src/java/lang/UnsupportedOperationException.js';
import { NoSuchElementException } from '../../src/java/util/NoSuchElementException.js';
import { ValueConverterException } from '../../src/xtext/conversion/ValueConverterException.js';
import { ValueConverterWithValueException } from '../../src/xtext/conversion/ValueConverterWithValueException.js';
import { ConflictingFormattingException } from '../../src/xtext/formatting2/ConflictingFormattingException.js';
import { ConflictingRegionsException } from '../../src/xtext/formatting2/internal/ConflictingRegionsException.js';
import { RegionTrace } from '../../src/xtext/formatting2/internal/RegionTrace.js';
import { RegionTraceMissingException } from '../../src/xtext/formatting2/internal/RegionTraceMissingException.js';
import { RegionsOutsideFrameException } from '../../src/xtext/formatting2/internal/RegionsOutsideFrameException.js';
import { IllegalNodeException } from '../../src/xtext/linking/impl/IllegalNodeException.js';
import { GuardException } from '../../src/xtext/validation/GuardException.js';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type ErrorClass = Function;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'src');
const CLASS_DECLARATION = /^export\s+(?:abstract\s+)?class\s+(\w+)\s+extends\s+(\w+)\b/gm;
const JS_ERROR_ROOTS: ReadonlySet<string> = new Set(['Error', 'RangeError', 'TypeError', 'SyntaxError']);

/** Each exception class and the class it must extend directly (its Java parent; `Error` = `Throwable`). */
const JAVA_PARENTS: ReadonlyMap<ErrorClass, ErrorClass> = new Map<ErrorClass, ErrorClass>([
  // java.lang, java.util, java.io (Javadoc)
  [Exception, Error],
  [RuntimeException, Exception],
  [IllegalArgumentException, RuntimeException],
  [NumberFormatException, IllegalArgumentException],
  [IllegalStateException, RuntimeException],
  [UnsupportedOperationException, RuntimeException],
  [ArithmeticException, RuntimeException],
  [ClassCastException, RuntimeException],
  [IndexOutOfBoundsException, RuntimeException],
  [ArrayIndexOutOfBoundsException, IndexOutOfBoundsException],
  [StringIndexOutOfBoundsException, IndexOutOfBoundsException],
  [NoSuchElementException, RuntimeException],
  [IOException, Exception],
  [EOFException, IOException],
  // Gson
  [JsonParseException, RuntimeException],
  [JsonIOException, JsonParseException],
  [JsonSyntaxException, JsonParseException],
  [MalformedJsonException, IOException],
  // EMF: BasicEList.BasicIndexOutOfBoundsException
  [BasicIndexOutOfBoundsException, IndexOutOfBoundsException],
  // ELK
  [JsonImportException, RuntimeException],
  // Xtext 2.36.0
  [ValueConverterException, RuntimeException],
  [ValueConverterWithValueException, ValueConverterException],
  [IllegalNodeException, RuntimeException],
  [GuardException, RuntimeException],
  [ConflictingFormattingException, RuntimeException],
  [ConflictingRegionsException, RuntimeException],
  [RegionTraceMissingException, RuntimeException],
  [RegionsOutsideFrameException, RuntimeException],
  [RegionTrace, RuntimeException],
  // port-local, no Java class
  [SyntaxFailure, Error],
  [ElkGraphSerializationError, Error],
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) return sourceFiles(full);
    return ent.name.endsWith('.ts') && !ent.name.endsWith('.test.ts') ? [full] : [];
  });
}

/** Every class in `src/` whose `extends` chain reaches a JS error class, by name, with its file. */
function declaredErrorClasses(): Map<string, string> {
  const declarations: { name: string; parent: string; file: string }[] = [];
  for (const file of sourceFiles(SRC)) {
    for (const match of readFileSync(file, 'utf8').matchAll(CLASS_DECLARATION)) {
      declarations.push({ name: match[1]!, parent: match[2]!, file: relative(ROOT, file) });
    }
  }
  const found = new Map<string, string>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const d of declarations) {
      if (!found.has(d.name) && (JS_ERROR_ROOTS.has(d.parent) || found.has(d.parent))) {
        found.set(d.name, d.file);
        grew = true;
      }
    }
  }
  return found;
}

describe('exception hierarchy (AD-16a)', () => {
  it.each([...JAVA_PARENTS].map(([cls, parent]) => [cls.name, parent.name, cls, parent] as const))(
    '%s extends %s',
    (_name, _parentName, cls, parent) => {
      expect(Object.getPrototypeOf(cls)).toBe(parent);
    },
  );

  it('lists every exception class declared in src/', () => {
    const listed = [...JAVA_PARENTS.keys()].map((cls) => cls.name).sort();
    expect([...declaredErrorClasses().keys()].sort()).toEqual(listed);
  });

  it('puts every Java exception under Exception, so a catch of the parent catches the family', () => {
    for (const [cls, parent] of JAVA_PARENTS) {
      if (parent === Error && cls !== Exception) continue; // port-local errors
      expect(cls === Exception || cls.prototype instanceof Exception, cls.name).toBe(true);
    }
  });
});
