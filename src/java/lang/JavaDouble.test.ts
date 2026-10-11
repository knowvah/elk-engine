// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  doubleToLongBits,
  doubleToRawLongBits,
  hashCode,
  longBitsToDouble,
  parseDouble,
} from "./JavaDouble.js";
import { NumberFormatException } from "./NumberFormatException.js";

const HASH_URL = new URL(
  "../../../test/golden/refs/java/hash.json",
  import.meta.url,
);
const TEXT_URL = new URL(
  "../../../test/golden/refs/java/text.json",
  import.meta.url,
);
const HEX_RADIX = 16;
const BITS_HEX_WIDTH = 16;
const HASH_ROWS = 65;
const LONG_BITS_ROWS = 65;
const PARSE_ROWS = 96;
const CANONICAL_NAN = 0x7ff8000000000000n;

type HashRow = readonly [string, number];
type LongBitsRow = readonly [string, string];
interface Rejection {
  readonly throws: string;
  readonly message: string;
}
type ParseRow = readonly [string, string | Rejection];

const hashVectors = JSON.parse(readFileSync(HASH_URL, "utf8")) as {
  readonly doubleHash: readonly HashRow[];
  readonly doubleToLongBits: readonly LongBitsRow[];
};
const textVectors = JSON.parse(readFileSync(TEXT_URL, "utf8")) as {
  readonly parseDouble: readonly ParseRow[];
};

function fromHex(hex: string): number {
  return longBitsToDouble(BigInt(`0x${hex}`));
}

function toHex(v: number): string {
  return BigInt.asUintN(64, doubleToRawLongBits(v))
    .toString(HEX_RADIX)
    .padStart(BITS_HEX_WIDTH, "0");
}

function thrownBy(input: string): unknown {
  try {
    parseDouble(input);
  } catch (e) {
    return e;
  }
  return undefined;
}

describe("hashCode", () => {
  it("replays every JVM vector", () => {
    expect(hashVectors.doubleHash.length).toBe(HASH_ROWS);
    for (const [hex, expected] of hashVectors.doubleHash) {
      expect(hashCode(fromHex(hex)), hex).toBe(expected);
    }
  });

  it("is identical for every NaN payload", () => {
    const payloadNaN = longBitsToDouble(0x7ff8000000000123n);
    expect(hashCode(payloadNaN)).toBe(hashCode(NaN));
  });
});

describe("doubleToLongBits", () => {
  it("replays every JVM vector", () => {
    expect(hashVectors.doubleToLongBits.length).toBe(LONG_BITS_ROWS);
    for (const [hex, expected] of hashVectors.doubleToLongBits) {
      expect(doubleToLongBits(fromHex(hex)), hex).toBe(BigInt(expected));
    }
  });

  it("canonicalises NaN but not the raw form of other values", () => {
    expect(doubleToLongBits(NaN)).toBe(CANONICAL_NAN);
    expect(doubleToLongBits(-0)).toBe(-(2n ** 63n));
    expect(doubleToRawLongBits(1)).toBe(0x3ff0000000000000n);
  });
});

describe("longBitsToDouble", () => {
  it("round-trips and wraps unsigned input to 64 bits", () => {
    expect(longBitsToDouble(0x3ff0000000000000n)).toBe(1);
    expect(longBitsToDouble(0xbff0000000000000n)).toBe(-1);
    expect(longBitsToDouble(-(2n ** 63n))).toBe(-0);
  });
});

describe("parseDouble", () => {
  it("replays every JVM accept and reject vector", () => {
    expect(textVectors.parseDouble.length).toBe(PARSE_ROWS);
    for (const [encoded, expected] of textVectors.parseDouble) {
      const input = JSON.parse(JSON.stringify(encoded)) as string;
      if (typeof expected === "string") {
        expect(toHex(parseDouble(input)), JSON.stringify(input)).toBe(expected);
      } else {
        const error = thrownBy(input);
        expect(error, JSON.stringify(input)).toBeInstanceOf(
          NumberFormatException,
        );
        expect((error as Error).message, JSON.stringify(input)).toBe(
          expected.message,
        );
      }
    }
  });

  it("rounds hex floats to nearest-even including subnormal ties", () => {
    expect(toHex(parseDouble("0x1p-1075"))).toBe("0000000000000000");
    expect(toHex(parseDouble("0x1.0000000000001p-1075"))).toBe(
      "0000000000000001",
    );
    expect(toHex(parseDouble("0x3p-1075"))).toBe("0000000000000002");
    expect(toHex(parseDouble("0x1.00000000000008p0"))).toBe("3ff0000000000000");
    expect(toHex(parseDouble("0x1.00000000000018p0"))).toBe("3ff0000000000002");
    expect(toHex(parseDouble("0x1.fffffffffffff8p1023"))).toBe(
      "7ff0000000000000",
    );
    expect(toHex(parseDouble("0x1p-99999999999"))).toBe("0000000000000000");
    expect(toHex(parseDouble("-0x0p0"))).toBe("8000000000000000");
    expect(toHex(parseDouble("0x0.0000000000001p-1022"))).toBe(
      "0000000000000001",
    );
  });
});
