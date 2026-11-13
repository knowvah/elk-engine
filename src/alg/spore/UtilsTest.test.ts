// SPDX-License-Identifier: EPL-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import { CompareFuzzy } from '../common/compaction/oned/CompareFuzzy.js';
import { Node } from '../common/spore/Node.js';
import { Utils } from '../common/utils/Utils.js';
import { ElkMath } from '../../core/math/ElkMath.js';
import { ElkRectangle } from '../../core/math/ElkRectangle.js';
import { KVector } from '../../core/math/KVector.js';
import { Pair } from '../../core/util/Pair.js';

/** @see org.eclipse.elk.alg.spore.test/src/org/eclipse/elk/alg/spore/test/UtilsTest.java */
describe('UtilsTest', () => {
  /**
   * Testing the computed overlap of two rectangles by moving one accordingly and checking whether the distance
   * becomes >= 0.
   *
   * @see UtilsTest.java:43 overlapTest
   */
  it('overlapTest', () => {
    const r1 = new ElkRectangle(0, 0, 40, 80);
    const r2 = new ElkRectangle(0, 0, 70, 20);
    const r3 = new ElkRectangle(10, 50, 70, 20);
    const r4 = new ElkRectangle(-40, 30, 70, 20);
    const r5 = new ElkRectangle(-60, 70, 70, 20);
    const r6 = new ElkRectangle(-10, 70, 70, 20);
    const r7 = new ElkRectangle(-20, -10, 70, 20);
    const r8 = new ElkRectangle(10, 20, 20, 20);
    const r9 = new ElkRectangle(-20, -20, 100, 120);
    const r10 = new ElkRectangle(0, -0.001, 40, 80);

    const rs = [r2, r3, r4, r5, r6, r7, r8, r9, r10];
    rs.forEach((r) => {
      expect(testOverlapComputation(r1, r)).toBe(true);
    });
  });

  /** @see UtilsTest.java:59 testOverlapComputation */
  function testOverlapComputation(r1: ElkRectangle, r2: ElkRectangle): boolean {
    // compute position for r2 to not overlap r1
    const o = Utils.overlap(r1, r2);
    const c1 = r1.getCenter();
    const c2 = r2.getCenter();
    const d = c2.clone().sub(c1);
    const c3 = c1.clone().add(d.scale(o));
    const r3 = new ElkRectangle(r2);
    r3.move(c3.clone().sub(c2));

    return CompareFuzzy.ge(ElkMath.shortestDistance(r1, r3), 0.0);
  }

  let rectangles: ElkRectangle[];
  let r1: ElkRectangle;

  /** @see UtilsTest.java:75 init */
  beforeEach(() => {
    r1 = new ElkRectangle(0, 0, 20, 60);
    const r2 = new ElkRectangle(40, 20, 20, 20);
    const r3 = new ElkRectangle(40, 40, 20, 20);
    const r4 = new ElkRectangle(30, 70, 20, 20);
    const r5 = new ElkRectangle(20, 80, 20, 20);
    const r6 = new ElkRectangle(10, 80, 20, 20);
    const r7 = new ElkRectangle(0, 80, 20, 20);
    const r8 = new ElkRectangle(-30, 70, 20, 20);
    const r9 = new ElkRectangle(-40, 40, 20, 20);
    const r10 = new ElkRectangle(-40, 20, 20, 20);
    const r11 = new ElkRectangle(-30, -20, 20, 20);
    const r12 = new ElkRectangle(-20, -40, 20, 20);
    const r13 = new ElkRectangle(0, -30, 20, 20);
    const r14 = new ElkRectangle(30, -30, 20, 20);
    const r15 = new ElkRectangle(20, 0, 20, 20);
    const r16 = new ElkRectangle(0, 60, 20, 20);

    rectangles = [r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16];
  });

  /**
   * Testing the computed underlap and distance of two nodes by moving one accordingly and checking whether the
   * distance becomes 0.
   *
   * @see UtilsTest.java:101 underlapTest
   */
  it('underlapTest', () => {
    rectangles.forEach((r) => {
      expect(testUnderlapComputation(r1, r)).toBe(true);
    });
  });

  /** @see UtilsTest.java:106 testUnderlapComputation */
  function testUnderlapComputation(r1: ElkRectangle, r2: ElkRectangle): boolean {
    const n1 = new Node(r1.getCenter(), r1);
    const n2 = new Node(r2.getCenter(), r2);

    const underlap = n1.underlap(n2);
    // Additionally, the underlap should be equal to the distance in the direction
    // given by the nodes' centers.
    expect(CompareFuzzy.eq(underlap, n1.distance(n2, n1.vertex.clone().sub(n2.vertex)))).toBe(true);

    // move + check shortest distance
    n2.translate(n1.vertex.clone().sub(n2.vertex).scaleToLength(underlap));

    return CompareFuzzy.eq(ElkMath.shortestDistance(n1.rect, n2.rect), 0.0);
  }

  /**
   * Distance test using different directions.
   *
   * @see UtilsTest.java:125 distanceTest
   */
  it('distanceTest', () => {
    const vectors: Pair<KVector, boolean>[] = [];
    vectors.push(Pair.of(new KVector(-20, 20), true)); // true if the nodes should collide
    vectors.push(Pair.of(new KVector(-80, 0), false));
    vectors.push(Pair.of(new KVector(-20, 9), false));
    vectors.push(Pair.of(new KVector(0, 50), false));
    vectors.push(Pair.of(new KVector(-9.99, 50), false));
    vectors.push(Pair.of(new KVector(60, 60), false));
    vectors.push(Pair.of(new KVector(-30, 50), true));
    vectors.push(Pair.of(new KVector(-20, 130), true));
    vectors.push(Pair.of(new KVector(-20, -21), false));

    const n1 = new Node(r1.getCenter(), r1);
    for (const v of vectors) {
      const n2 = new Node(rectangles[12]!.getCenter(), new ElkRectangle(rectangles[12]!));

      const distance = n1.distance(n2, v.getFirst()!);

      // if they should collide, move them, otherwise check whether the returned distance is infinite
      if (v.getSecond()) {
        // move + check shortest distance
        n2.translate(v.getFirst()!.scaleToLength(distance));
        expect(CompareFuzzy.eq(ElkMath.shortestDistance(n1.rect, n2.rect), 0.0)).toBe(true);
      } else {
        expect(Math.abs(distance) === Number.POSITIVE_INFINITY).toBe(true); // Double.isInfinite
      }
    }
  });
});
