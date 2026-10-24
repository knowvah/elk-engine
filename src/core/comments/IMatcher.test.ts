// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IExplicitAttachmentProvider } from './IExplicitAttachmentProvider.js';
import { IFilter } from './IFilter.js';
import { IMatcher } from './IMatcher.js';

class M extends IMatcher<string, string> {
  raw(): number {
    return 2;
  }
  normalized(): number {
    return 1;
  }
}
class F extends IFilter<string> {
  eligibleForAttachment(comment: string): boolean {
    return comment !== '';
  }
}
class E extends IExplicitAttachmentProvider<string, string> {
  findExplicitAttachment(comment: string): string | null {
    return comment === 'x' ? 'y' : null;
  }
}
class OverridingMatcher extends M {
  log: string[] = [];
  override preprocess(_dp: never, includeHierarchy: boolean): void {
    this.log.push(`pre:${includeHierarchy}`);
  }
  override cleanup(): void {
    this.log.push('clean');
  }
}

describe('default preprocess/cleanup', () => {
  it('IMatcher defaults are no-ops', () => {
    const m = new M();
    expect(m.preprocess(undefined as never, false)).toBeUndefined();
    expect(m.cleanup()).toBeUndefined();
    expect([m.raw(), m.normalized()]).toEqual([2, 1]);
  });
  it('IFilter defaults are no-ops', () => {
    const f = new F();
    expect(f.preprocess(undefined as never, true)).toBeUndefined();
    expect(f.cleanup()).toBeUndefined();
    expect([f.eligibleForAttachment(''), f.eligibleForAttachment('a')]).toEqual([false, true]);
  });
  it('IExplicitAttachmentProvider defaults are no-ops', () => {
    const e = new E();
    expect(e.preprocess(undefined as never, true)).toBeUndefined();
    expect(e.cleanup()).toBeUndefined();
    expect([e.findExplicitAttachment('x'), e.findExplicitAttachment('z')]).toEqual(['y', null]);
  });
  it('subclasses can override the defaults', () => {
    const m = new OverridingMatcher();
    m.preprocess(undefined as never, true);
    m.cleanup();
    expect(m.log).toEqual(['pre:true', 'clean']);
  });
});
