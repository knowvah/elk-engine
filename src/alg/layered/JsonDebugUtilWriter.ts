// SPDX-License-Identifier: EPL-2.0
import { repeat } from '../../guava/Strings.js';
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';

/** Java's `JsonDebugUtil.INDENT`. */
export const INDENT = '  ';

/** `Strings.repeat(INDENT, count)`. */
export const indentOf = (count: number): string => repeat(INDENT, count);

/** The Java string concatenation of a `double`: `Double.toString`. */
export const dbl = doubleToString;

/** The Java string concatenation of an `int`. */
export const int = (value: number): string => String(value);

/**
 * The stand-in for `java.io.StringWriter` in `JsonDebugUtil`: a string accumulator.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/JsonDebugUtil.java
 */
export class JsonDebugUtilWriter {
  #text = '';

  write(text: string): void {
    this.#text += text;
  }

  toString(): string {
    return this.#text;
  }
}

/**
 * Begins a new list of child nodes with the given indentation.
 *
 * @see JsonDebugUtil.java:279
 */
export function beginChildNodeList(writer: JsonDebugUtilWriter, indentation: number): void {
  writer.write(`,\n${indentOf(indentation)}"children": [`);
}

/**
 * Ends the list of child nodes.
 *
 * @see JsonDebugUtil.java:292
 */
export function endChildNodeList(writer: JsonDebugUtilWriter, indentation: number): void {
  writer.write(`\n${indentOf(indentation)}],\n`);
}

/**
 * Ends the graph.
 *
 * @see JsonDebugUtil.java:303
 */
export function endGraph(writer: JsonDebugUtilWriter): void {
  writer.write('\n}\n');
}
