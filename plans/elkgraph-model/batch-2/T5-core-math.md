<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — core.math: KVector, KVectorChain, Spacing, ElkMargin, ElkPadding, IDataObject

**Agent:** typescript-pro · **Commit:** `feat(core): port kvector, kvectorchain and the spacing classes`

## Context
The ported `PropertyTest` (T7) clones `KVector`, `KVectorChain`, `ElkMargin`, `ElkPadding`
defaults; mission 3 would otherwise pull these in — the user chose to port them now with their
JUnit tests. Faithful port (AD-1): every method, every branch, Java method boundaries.

## Task
TDD: port `KVectorTest.java` (216 lines) and `KVectorChainTest.java` (87 lines) first, case by
case, then the classes. Write additional unit tests for the methods the JUnit classes do not
cover (`parse`, `hashCode`, `equalsFuzzily`, `wiggle` with a seeded `Random`, `pointOnLine`,
`angleOnLine`, `Spacing.parse/add/copy`), with expected values computed from the Java bodies.

## Write-set
`src/core/util/IDataObject.ts`, `src/core/math/KVector.ts`, `src/core/math/KVectorChain.ts`,
`src/core/math/Spacing.ts`, `src/core/math/ElkMargin.ts`, `src/core/math/ElkPadding.ts`,
`src/core/math/KVector.test.ts`, `src/core/math/KVectorChain.test.ts`, `src/core/math/Spacing.test.ts`.

## Read-set
- `../decisions.md#d8--linkedlist`, `#d6--cloneable-and-elkreflect` (every class has `clone()`)
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/math/{KVector,KVectorChain,Spacing,ElkMargin,ElkPadding}.java`,
  `…/core/util/IDataObject.java`
- `$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core/math/{KVectorTest,KVectorChainTest}.java`
- `docs/translation-rules.md:70-212` (§1 numerics: `Math.round`, `Double.compare`, `float`), `:381-393` (§6.5 overloads), `:444-466` (§7 strings)
- `src/java/lang/{JavaDouble,JavaInteger,DoubleToString,JavaMath}.ts` exports; `src/java/util/Random.ts`
- `src/java/util/LinkedList.ts` (T1 contract)

## Interface contract (consumed by T7)
```ts
export interface IDataObject { parse(string: string): void; toString(): string }
export class KVector implements IDataObject { x: number; y: number;
  constructor(); constructor(x: number, y: number); constructor(v: KVector); constructor(start: KVector, end: KVector);
  static fromAngle(angle: number): KVector;           // Java KVector(double angle) — arity clash, suffixed
  clone(): KVector; equals(o: unknown): boolean; hashCode(): number; toString(): string; parse(s: string): void;
  add(v: KVector): KVector; add(dx: number, dy: number): KVector; sub(…); scale(…); normalize(); negate();
  length(); squareLength(); reset(); set(…); static sum(...vs); static diff(a, b); scaleToLength(l);
  toDegrees(); toRadians(); wiggle(random: Random, amount: number); distance(v); dotProduct(v);
  static crossProduct(v, w); rotate(angle); angle(other); bound(lowx, lowy, highx, highy); isNaN(); isInfinite();
  equalsFuzzily(other, fuzzyness?) }
export class KVectorChain extends LinkedList<KVector> implements IDataObject { … all Java methods … }
export abstract class Spacing implements IDataObject { top; bottom; left; right; abstract clone(): Spacing; … }
export class ElkMargin extends Spacing {…}  export class ElkPadding extends Spacing {…}
```
- `KVector.hashCode()` = `Int32.add(JavaDouble.hashCode(x), JavaInteger.reverse(JavaDouble.hashCode(y)))`.
- `toString()` uses `DoubleToString` (Java `"" + double` formatting): `(1.0,2.0)`.
- `parse` throws `IllegalArgumentException` with the Java messages; the Java appends
  `exception` (its `toString()`, e.g. `java.lang.NumberFormatException: For input string: "x"`) —
  reproduce as `NumberFormatException: <message>` and journal the class-name prefix difference.
- `Spacing.hashCode()` uses `Int32.shl`/`|`/`^`/`& 0xffff` as in Java.

## Acceptance criteria
- Given the ported `KVectorTest` and `KVectorChainTest`, then every assertion passes unchanged.
- Given `new KVector(1, 2).hashCode()`, then it equals the `kvectorHash` row for `(1.0, 2.0)` in
  `test/golden/refs/java/hash.json`.
- Given `Spacing.parse('[top=1,left=2,bottom=3,right=4]')` on an `ElkMargin`, then the four fields
  match; given `'top=x'`, then `IllegalArgumentException`.
- Given `new KVectorChain(new KVector(0,0), new KVector(3,4)).pointOnLine(2.5)`, then `(1.5,2.0)`;
  `totalLength()` is 5; `reverse(chain)` yields copies in reverse order.
- Given `v.wiggle(new Random(1), 2)`, then `x`/`y` equal values computed from the Java body with
  the `random.json`-proven `Random` (state them in the test).

## Quality bar
README gates; ≥ 90% coverage of the new files (aim 100%); functions ≤ 30 NLOC, CCN ≤ 10 (split
only where the Java is already split; `pointOnLine`/`angleOnLine` may need an extracted helper per
branch — journal the split). Keep the Java method order.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not port `ElkMath`, `BezierSpline`, `KielerMath*` or other `core.math` classes (mission 3/5).
Do not change `src/java/**`.
