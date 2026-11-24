// SPDX-License-Identifier: EPL-2.0
// The one encoder of a layout double as hex bits on the port side (issue #72, ruling #53). The JVM gives a computed NaN either sign
// bit (7ff8… or fff8…), by interpreted or compiled code, so the oracle cannot reproduce a NaN's raw bits against itself. Every layout
// comparison therefore encodes NaN in the one canonical form of `Double.doubleToLongBits`; every other value keeps its raw IEEE-754
// bits (-0.0, the infinities and subnormals included). The recorders in tools/vectors encode with the same call. JDK shim vectors
// (hash.json, numeric.json, lang.json, text.json) test the bit-level APIs themselves and stay raw: they do not use this file.
import { doubleToLongBits, longBitsToDouble } from '../../src/java/lang/JavaDouble.js';

/** The bits of every NaN under `Double.doubleToLongBits`, as the recorders write them. */
export const CANONICAL_NAN_HEX = '7ff8000000000000';

/**
 * A NaN with the sign bit set (`fff8000000000000`), the form compiled JVM code gives a computed NaN and V8 gives a negated one: the
 * fixture of the sign tests of every helper that encodes or hashes layout doubles.
 */
export const NEGATIVE_NAN = longBitsToDouble(0xfff8000000000000n);

const LONG_BITS = 64;
const HEX_RADIX = 16;
const HEX_DIGITS = 16;

/**
 * The 16 lowercase hex digits of `Double.doubleToLongBits(value)`: every NaN is {@link CANONICAL_NAN_HEX}, every other value its raw
 * IEEE-754 bits (issue #72).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Double.html#doubleToLongBits(double)
 */
export function canonicalHex(value: number): string {
  return BigInt.asUintN(LONG_BITS, doubleToLongBits(value)).toString(HEX_RADIX).padStart(HEX_DIGITS, '0');
}
