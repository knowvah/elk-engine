// SPDX-License-Identifier: EPL-2.0
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { Direction } from '../../../core/options/Direction.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { DebugUtil } from './DebugUtil.js';
import { CGraph } from './oned/CGraph.js';
import { CNode } from './oned/CNode.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DebugUtil', () => {
  it('builds the document through getDebugSVG and writes no file (AC4)', () => {
    const graph = new CGraph(EnumSet.allOf(Direction));
    const a = CNode.of()
      .hitbox(new ElkRectangle(0, 0, 10, 10))
      .create(graph);
    const b = CNode.of()
      .hitbox(new ElkRectangle(20, 5, 10, 10))
      .create(graph);
    a.constraints.push(b);
    const svg = vi.spyOn(CNode.prototype, 'getDebugSVG');
    const path = join(tmpdir(), 'elk-ts-debugutil-must-not-exist', 'out.svg');

    expect(DebugUtil.drawHitboxes(graph, path)).toBeUndefined();

    expect(svg).toHaveBeenCalledTimes(2);
    expect(existsSync(path)).toBe(false);
    expect(existsSync(join(tmpdir(), 'elk-ts-debugutil-must-not-exist'))).toBe(false);
  });

  it('copes with an empty graph', () => {
    const graph = new CGraph(EnumSet.allOf(Direction));
    expect(DebugUtil.drawHitboxes(graph, '')).toBeUndefined();
  });
});
