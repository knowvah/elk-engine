// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Pair } from '../../../core/util/Pair.js';
import type { PolyominoSuccessor } from './PolyominoSuccessor.js';
import { Direction } from './structures/Direction.js';
import { Polyomino } from './structures/Polyomino.js';
import { SuccessorCombination } from './SuccessorCombination.js';
import { SuccessorJitter } from './SuccessorJitter.js';
import { SuccessorLineByLine } from './SuccessorLineByLine.js';
import { SuccessorManhattan } from './SuccessorManhattan.js';
import { SuccessorMaxNormWindingInMathPosSense } from './SuccessorMaxNormWindingInMathPosSense.js';
import { SuccessorQuadrantsGeneric } from './SuccessorQuadrantsGeneric.js';

/** Walks `steps` successors from (0,0), returning the visited positions including the start. */
function walk(fun: PolyominoSuccessor, poly: Polyomino, steps: number): [number, number][] {
  let cur = new Pair<number, number>(0, 0);
  const out: [number, number][] = [[0, 0]];
  for (let i = 0; i < steps; i++) {
    cur = fun.apply(cur, poly);
    out.push([cur.getFirst() as number, cur.getSecond() as number]);
  }
  return out;
}

const plain = new Polyomino(1, 1);

function withExtensions(...dirs: Direction[]): Polyomino {
  const poly = new Polyomino(1, 1);
  for (const d of dirs) {
    poly.addExtension(d, 0, 0);
  }
  return poly;
}

describe('SuccessorMaxNormWindingInMathPosSense', () => {
  it('follows the Javadoc 3x3 example, then leaves the first ring', () => {
    expect(walk(new SuccessorMaxNormWindingInMathPosSense(), plain, 9)).toEqual([
      [0, 0],
      [-1, 0],
      [-1, -1],
      [0, -1],
      [1, -1],
      [1, 0],
      [1, 1],
      [0, 1],
      [-1, 1],
      [-2, 1],
    ]);
  });
});

describe('SuccessorLineByLine', () => {
  it('follows the Javadoc 3x3 example', () => {
    expect(walk(new SuccessorLineByLine(), plain, 9)).toEqual([
      [0, 0],
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
      [-2, -2],
    ]);
  });
});

describe('SuccessorManhattan', () => {
  it('follows the Javadoc example', () => {
    expect(walk(new SuccessorManhattan(), plain, 4)).toEqual([
      [0, 0],
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]);
  });

  it('starts the next level after (-1,0)', () => {
    expect(new SuccessorManhattan().apply(new Pair(-1, 0), plain)).toEqual(new Pair(0, -2));
  });
});

describe('SuccessorJitter', () => {
  it('follows the Javadoc 3x3 example', () => {
    expect(walk(new SuccessorJitter(), plain, 8)).toEqual([
      [0, 0],
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
      [1, -1],
      [1, 1],
      [-1, 1],
      [-1, -1],
    ]);
  });
});

describe('SuccessorCombination', () => {
  const normal: PolyominoSuccessor = { apply: () => new Pair(1, 1) };
  const external: PolyominoSuccessor = { apply: () => new Pair(2, 2) };

  it('uses normalFun without extensions', () => {
    expect(new SuccessorCombination(normal, external).apply(new Pair(0, 0), plain)).toEqual(new Pair(1, 1));
  });

  it('uses externalFun with extensions', () => {
    const poly = withExtensions(Direction.NORTH);
    expect(new SuccessorCombination(normal, external).apply(new Pair(0, 0), poly)).toEqual(new Pair(2, 2));
  });
});

describe('SuccessorQuadrantsGeneric', () => {
  const make = (): SuccessorQuadrantsGeneric => new SuccessorQuadrantsGeneric(new SuccessorLineByLine());

  it('passes the wrapped function through without extensions', () => {
    expect(walk(make(), plain, 3)).toEqual(walk(new SuccessorLineByLine(), plain, 3));
  });

  it('restricts to y<0 for NORTH-only extensions', () => {
    const positions = walk(make(), withExtensions(Direction.NORTH), 6);
    expect(positions.slice(1)).toEqual([
      [-1, -1],
      [0, -1],
      [1, -1],
      [-2, -2],
      [-1, -2],
      [0, -2],
    ]);
  });

  it('restricts to x>=0, y<0 for NORTH and EAST extensions', () => {
    const positions = walk(make(), withExtensions(Direction.NORTH, Direction.EAST), 4);
    expect(positions.slice(1)).toEqual([
      [0, -1],
      [1, -1],
      [0, -2],
      [1, -2],
    ]);
  });

  it('restricts to y>=0, x<0 for SOUTH and WEST extensions', () => {
    const positions = walk(make(), withExtensions(Direction.SOUTH, Direction.WEST), 3);
    expect(positions.slice(1)).toEqual([
      [-1, 0],
      [-1, 1],
      [-2, 0],
    ]);
  });

  it('restricts to x<0 for WEST-only extensions and re-derives for a new polyomino', () => {
    const fun = make();
    const west = withExtensions(Direction.WEST);
    expect(fun.apply(new Pair(0, 0), west)).toEqual(new Pair(-1, -1));
    expect(fun.apply(new Pair(0, 0), plain)).toEqual(new Pair(-1, -1));
    expect(fun.apply(new Pair(-1, 1), plain)).toEqual(new Pair(0, 1));
  });
});
