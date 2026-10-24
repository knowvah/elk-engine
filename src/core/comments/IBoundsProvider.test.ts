// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Rectangle2D } from '../../java/awt/geom/Rectangle2D.js';
import { IBoundsProvider } from './IBoundsProvider.js';
import type { IDataProvider } from './IDataProvider.js';

class Bounds extends IBoundsProvider<string, string> {
  commentCalls = 0;
  targetCalls = 0;
  cleanups = 0;
  preprocessed: [IDataProvider<string, string>, boolean][] = [];
  override preprocess(dp: IDataProvider<string, string>, includeHierarchy: boolean): void {
    this.preprocessed.push([dp, includeHierarchy]);
  }
  override cleanup(): void {
    this.cleanups++;
  }
  boundsForComment(comment: string): Rectangle2D.Double | null {
    this.commentCalls++;
    return comment === 'none' ? null : new Rectangle2D.Double(1, 2, 3, 4);
  }
  boundsForTarget(target: string): Rectangle2D.Double | null {
    this.targetCalls++;
    return target === 'none' ? null : new Rectangle2D.Double(5, 6, 7, 8);
  }
}

class Plain extends IBoundsProvider<string, string> {
  boundsForComment(): Rectangle2D.Double | null {
    return null;
  }
  boundsForTarget(): Rectangle2D.Double | null {
    return null;
  }
}

describe('IBoundsProvider defaults', () => {
  it('preprocess and cleanup are no-ops that return undefined', () => {
    const p = new Plain();
    expect(p.preprocess(undefined as never, true)).toBeUndefined();
    expect(p.cleanup()).toBeUndefined();
  });
});

describe('IBoundsProvider.cached()', () => {
  it('computes comment and target bounds once per key', () => {
    const b = new Bounds();
    const c = b.cached();
    const r = c.boundsForComment('a');
    expect(r).toBe(c.boundsForComment('a'));
    expect(r?.getWidth()).toBe(3);
    const t = c.boundsForTarget('a');
    expect(t).toBe(c.boundsForTarget('a'));
    expect(t?.getX()).toBe(5);
    expect(b.commentCalls).toBe(1);
    expect(b.targetCalls).toBe(1);
    c.boundsForComment('b');
    expect(b.commentCalls).toBe(2);
  });

  it('caches null results too (containsKey semantics)', () => {
    const b = new Bounds();
    const c = b.cached();
    expect(c.boundsForComment('none')).toBeNull();
    expect(c.boundsForComment('none')).toBeNull();
    expect(c.boundsForTarget('none')).toBeNull();
    expect(c.boundsForTarget('none')).toBeNull();
    expect(b.commentCalls).toBe(1);
    expect(b.targetCalls).toBe(1);
  });

  it('forwards preprocess and, after clearing both caches, cleanup', () => {
    const b = new Bounds();
    const c = b.cached();
    const dp = {} as IDataProvider<string, string>;
    c.preprocess(dp, true);
    expect(b.preprocessed).toEqual([[dp, true]]);
    c.boundsForComment('a');
    c.boundsForTarget('a');
    c.cleanup();
    expect(b.cleanups).toBe(1);
    c.boundsForComment('a');
    c.boundsForTarget('a');
    expect(b.commentCalls).toBe(2);
    expect(b.targetCalls).toBe(2);
  });
});
