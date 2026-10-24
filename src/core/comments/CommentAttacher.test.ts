// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { AggregatedMatchDecider } from './AggregatedMatchDecider.js';
import { CommentAttacher } from './CommentAttacher.js';
import { IBoundsProvider } from './IBoundsProvider.js';
import { IDataProvider } from './IDataProvider.js';
import type { IDecider, MatcherClass } from './IDecider.js';
import { IExplicitAttachmentProvider } from './IExplicitAttachmentProvider.js';
import { IFilter } from './IFilter.js';
import { IMatcher } from './IMatcher.js';

type Log = string[];

class FakeData extends IDataProvider<string, string> {
  readonly attached: [string, string][] = [];
  constructor(
    private readonly comments: string[],
    private readonly targets: string[],
    private readonly subs: FakeData[] = [],
  ) {
    super();
  }
  override provideComments(): string[] {
    return this.comments;
  }
  override provideTargets(): string[] {
    return this.targets;
  }
  override provideSubHierarchies(): FakeData[] {
    return this.subs;
  }
  override attach(comment: string, target: string): void {
    this.attached.push([comment, target]);
  }
}

class FakeExplicit extends IExplicitAttachmentProvider<string, string> {
  constructor(
    private readonly map: Record<string, string>,
    private readonly log: Log = [],
  ) {
    super();
  }
  override findExplicitAttachment(comment: string): string | null {
    return this.map[comment] ?? null;
  }
  override preprocess(): void {
    this.log.push('explicit.pre');
  }
  override cleanup(): void {
    this.log.push('explicit.clean');
  }
}

class FakeFilter extends IFilter<string> {
  constructor(
    private readonly veto: string[],
    private readonly log: Log = [],
  ) {
    super();
  }
  override eligibleForAttachment(comment: string): boolean {
    return !this.veto.includes(comment);
  }
  override preprocess(): void {
    this.log.push('filter.pre');
  }
  override cleanup(): void {
    this.log.push('filter.clean');
  }
}

class FakeMatcher extends IMatcher<string, string> {
  constructor(
    private readonly score: (c: string, t: string) => number,
    private readonly log: Log = [],
  ) {
    super();
  }
  override raw(c: string, t: string): number {
    return this.score(c, t);
  }
  override normalized(c: string, t: string): number {
    return this.score(c, t);
  }
  override preprocess(): void {
    this.log.push('matcher.pre');
  }
  override cleanup(): void {
    this.log.push('matcher.clean');
  }
}
class OtherMatcher extends FakeMatcher {}

class FakeBounds extends IBoundsProvider<string, string> {
  constructor(private readonly log: Log) {
    super();
  }
  override boundsForComment(): null {
    return null;
  }
  override boundsForTarget(): null {
    return null;
  }
  override preprocess(): void {
    this.log.push('bounds.pre');
  }
  override cleanup(): void {
    this.log.push('bounds.clean');
  }
}

const prefer = (target: string) => (_c: string, t: string) => (t === target ? 1 : 0.1);

describe('CommentAttacher', () => {
  it('runs preprocess then cleanup in Java order: explicit, filters, matchers, bounds', () => {
    const log: Log = [];
    new CommentAttacher<string, string>()
      .withExplicitAttachmentProvider(new FakeExplicit({}, log))
      .addFilter(new FakeFilter([], log))
      .addMatcher(new FakeMatcher(prefer('t1'), log))
      .withBoundsProvider(new FakeBounds(log))
      .attachComments(new FakeData([], []));
    expect(log).toEqual([
      'explicit.pre',
      'filter.pre',
      'matcher.pre',
      'bounds.pre',
      'explicit.clean',
      'filter.clean',
      'matcher.clean',
      'bounds.clean',
    ]);
  });

  it('applies explicit attachments before heuristic ones', () => {
    const data = new FakeData(['c1', 'c2'], ['t1', 't2']);
    new CommentAttacher<string, string>()
      .keepHeuristicsEnabledWithExplicitAttachments(true)
      .withExplicitAttachmentProvider(new FakeExplicit({ c2: 't2' }))
      .addMatcher(new FakeMatcher(prefer('t1')))
      .attachComments(data);
    expect(data.attached).toEqual([
      ['c2', 't2'],
      ['c1', 't1'],
    ]);
  });

  it('with explicit attachments disabling heuristics: skips later comments and discards earlier heuristic ones', () => {
    const data = new FakeData(['c0', 'c1', 'c2'], ['t1', 't2']);
    new CommentAttacher<string, string>()
      .withExplicitAttachmentProvider(new FakeExplicit({ c1: 't2' }))
      .addMatcher(new FakeMatcher(prefer('t1')))
      .attachComments(data);
    // c0 was matched before the explicit one, c2 skipped; the heuristic c0 attachment is discarded
    expect(data.attached).toEqual([['c1', 't2']]);
  });

  it('skips matcher evaluation for comments after the first explicit one when heuristics are disabled', () => {
    const calls: string[] = [];
    const data = new FakeData(['c1', 'c2'], ['t1']);
    new CommentAttacher<string, string>()
      .withExplicitAttachmentProvider(new FakeExplicit({ c1: 't1' }))
      .addMatcher(
        new FakeMatcher((c) => {
          calls.push(c);
          return 1;
        }),
      )
      .attachComments(data);
    expect(calls).toEqual([]);
  });

  it('treats a null explicit provider as none', () => {
    const data = new FakeData(['c1'], ['t1']);
    new CommentAttacher<string, string>()
      .withExplicitAttachmentProvider(null)
      .addMatcher(new FakeMatcher(prefer('t1')))
      .attachComments(data);
    expect(data.attached).toEqual([['c1', 't1']]);
  });

  it('includes sub-hierarchies breadth first by default and only the top level when limited', () => {
    const build = (): FakeData[] => {
      const grandchild = new FakeData(['g'], ['tg']);
      const child1 = new FakeData(['a'], ['ta'], [grandchild]);
      const child2 = new FakeData(['b'], ['tb']);
      return [new FakeData(['r'], ['tr'], [child1, child2]), child1, child2, grandchild];
    };
    const matcher = new FakeMatcher((_c, t) => (t.length > 0 ? 1 : 0));

    // attachments are always applied through the root data provider (edgeifyFoundAttachments)
    const all = build();
    new CommentAttacher<string, string>().addMatcher(matcher).attachComments(all[0] as FakeData);
    expect(all.map((d) => d.attached)).toEqual([
      [
        ['r', 'tr'],
        ['a', 'ta'],
        ['b', 'tb'],
        ['g', 'tg'],
      ],
      [],
      [],
      [],
    ]);

    const limited = build();
    new CommentAttacher<string, string>()
      .limitToCurrentHierarchyLevel(true)
      .addMatcher(matcher)
      .attachComments(limited[0] as FakeData);
    expect(limited.map((d) => d.attached)).toEqual([[['r', 'tr']], [], [], []]);
  });

  it('lets filters veto a comment (all must agree)', () => {
    const data = new FakeData(['c1', 'c2', 'c3'], ['t1']);
    new CommentAttacher<string, string>()
      .addFilter(new FakeFilter(['c1']))
      .addFilter(new FakeFilter(['c2']))
      .addMatcher(new FakeMatcher(prefer('t1')))
      .attachComments(data);
    expect(data.attached).toEqual([['c3', 't1']]);
  });

  it('attaches nothing without matchers, or with no candidates', () => {
    const noMatchers = new FakeData(['c1'], ['t1']);
    new CommentAttacher<string, string>().attachComments(noMatchers);
    expect(noMatchers.attached).toEqual([]);

    const noCandidates = new FakeData(['c1'], []);
    new CommentAttacher<string, string>().addMatcher(new FakeMatcher(prefer('t1'))).attachComments(noCandidates);
    expect(noCandidates.attached).toEqual([]);
  });

  it('does not attach when the default decider rejects a zero maximum', () => {
    const data = new FakeData(['c1'], ['t1']);
    new CommentAttacher<string, string>().addMatcher(new FakeMatcher(() => 0)).attachComments(data);
    expect(data.attached).toEqual([]);
  });

  it('keys matcher results by class so two matchers of one class collide (last wins)', () => {
    let seen: Map<string, Map<MatcherClass<string>, number>> | null = null;
    const decider: IDecider<string> = {
      makeAttachmentDecision(h) {
        seen = h;
        return null;
      },
    };
    const data = new FakeData(['c1'], ['t1', 't2']);
    new CommentAttacher<string, string>()
      .withAttachmentDecider(decider)
      .addMatcher(new FakeMatcher(() => 0.2))
      .addMatcher(new FakeMatcher(() => 0.7))
      .addMatcher(new OtherMatcher(() => 0.4))
      .attachComments(data);
    const results = seen as unknown as Map<string, Map<MatcherClass<string>, number>>;
    expect([...results.keys()]).toEqual(['t1', 't2']);
    expect([...(results.get('t1') as Map<MatcherClass<string>, number>).entries()]).toEqual([
      [FakeMatcher, 0.7],
      [OtherMatcher, 0.4],
    ]);
  });

  it('uses a configured decider and returns this from configuration methods', () => {
    const attacher = new CommentAttacher<string, string>();
    expect(attacher.addMatcher(new FakeMatcher(prefer('t2')))).toBe(attacher);
    expect(attacher.withAttachmentDecider(new AggregatedMatchDecider<string>().withLowerAttachmentBoundary(2))).toBe(
      attacher,
    );
    const data = new FakeData(['c1'], ['t1', 't2']);
    attacher.attachComments(data);
    expect(data.attached).toEqual([]);
  });

  it('rejects null filters, matchers, bounds providers and deciders', () => {
    const attacher = new CommentAttacher<string, string>();
    expect(() => attacher.addFilter(null as never)).toThrow('The filter must not be null.');
    expect(() => attacher.addMatcher(null as never)).toThrow('The matcher must not be null.');
    expect(() => attacher.withBoundsProvider(null as never)).toThrow('The bounds provider must not be null.');
    expect(() => attacher.withAttachmentDecider(null as never)).toThrow('The attachment decider must not be null.');
  });
});
