// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Rectangle2D } from '../../java/awt/geom/Rectangle2D.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { IBoundsProvider } from './IBoundsProvider.js';
import { IDataProvider } from './IDataProvider.js';
import { NodeReferenceMatcher } from './NodeReferenceMatcher.js';

interface RegexRow {
  readonly name: string;
  readonly mode: 'fuzzy' | 'strict';
  readonly regex: string;
  readonly flags: number;
}

const rows = (
  JSON.parse(readFileSync(new URL('../../../test/golden/refs/java/regex.json', import.meta.url), 'utf8')) as {
    rows: RegexRow[];
  }
).rows;

class Data extends IDataProvider<string, string> {
  constructor(
    private readonly comments: string[],
    private readonly targets: string[],
    private readonly subs: Data[] = [],
  ) {
    super();
  }
  override provideComments(): string[] {
    return this.comments;
  }
  override provideTargets(): string[] {
    return this.targets;
  }
  override provideSubHierarchies(): Data[] {
    return this.subs;
  }
  override attach(): void {
    // not needed
  }
}

class FixedBounds extends IBoundsProvider<string, string> {
  constructor(
    private readonly commentBounds: Rectangle2D.Double,
    private readonly targetBounds: Rectangle2D.Double,
  ) {
    super();
  }
  override boundsForComment(): Rectangle2D.Double {
    return this.commentBounds;
  }
  override boundsForTarget(): Rectangle2D.Double {
    return this.targetBounds;
  }
}

const identity = (s: string): string => s;

function matcher(): NodeReferenceMatcher<string, string> {
  return new NodeReferenceMatcher<string, string>().withCommentTextProvider(identity).withTargetNameProvider(identity);
}

describe('NodeReferenceMatcher pattern construction (regex.json)', () => {
  it('has recorded rows', () => {
    expect(rows.length).toBe(5044);
  });

  it('builds the recorded pattern string and flags for every name and mode', () => {
    const mismatches: string[] = [];
    for (const row of rows) {
      const pattern =
        row.mode === 'fuzzy'
          ? NodeReferenceMatcher.fuzzyRegexpFor(row.name)
          : NodeReferenceMatcher.strictRegexpFor(row.name);
      if (pattern.pattern() !== row.regex || pattern.flags() !== row.flags) {
        mismatches.push(`${row.mode} ${JSON.stringify(row.name)}: ${pattern.pattern()} vs ${row.regex}`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe('NodeReferenceMatcher', () => {
  it('attaches a comment to the single target it mentions', () => {
    const m = matcher();
    m.preprocess(new Data(['see Foo here'], ['Foo', 'Bar']), false);

    expect(m.getAttachments()).toEqual(new Map([['see Foo here', 'Foo']]));
    expect(m.raw('see Foo here', 'Foo')).toBe(1);
    expect(m.normalized('see Foo here', 'Foo')).toBe(1);
    expect(m.raw('see Foo here', 'Bar')).toBe(0);
  });

  it('records no attachment when two targets match (reset rule)', () => {
    const m = matcher();
    m.preprocess(new Data(['Foo and Bar'], ['Foo', 'Bar', 'Baz']), false);

    expect(m.getAttachments().size).toBe(0);
    expect(m.raw('Foo and Bar', 'Foo')).toBe(0);
  });

  it('skips empty or null texts and names', () => {
    const m = new NodeReferenceMatcher<string, string>()
      .withCommentTextProvider((s) => (s === 'x' ? null : s))
      .withTargetNameProvider((s) => (s === 'n' ? null : s));
    m.preprocess(new Data(['x', '', 'Foo'], ['n', '', 'Foo']), false);

    expect([...m.getAttachments()]).toEqual([['Foo', 'Foo']]);
  });

  it('is case sensitive and word bounded in strict mode, lenient in fuzzy mode', () => {
    const strict = matcher();
    strict.preprocess(new Data(['my foo bar node'], ['Foo Bar']), false);
    expect(strict.getAttachments().size).toBe(0);

    const fuzzy = matcher().withFuzzyMatching();
    fuzzy.preprocess(new Data(['my foo\n  bar node', 'FooBar'], ['FooBar']), false);
    expect([...fuzzy.getAttachments().keys()]).toEqual(['my foo\n  bar node', 'FooBar']);
  });

  it('recurses into sub hierarchies only when asked, and cleanup clears', () => {
    const data = new Data(['A'], ['A'], [new Data(['B'], ['B'])]);
    const shallow = matcher();
    shallow.preprocess(data, false);
    expect([...shallow.getAttachments().keys()]).toEqual(['A']);

    const deep = matcher();
    deep.preprocess(data, true);
    expect([...deep.getAttachments().keys()]).toEqual(['A', 'B']);
    deep.cleanup();
    expect(deep.getAttachments().size).toBe(0);
  });

  it('applies the maximum attachment distance through DistanceMatcher.distance', () => {
    const near = new Rectangle2D.Double(0, 0, 10, 10);
    const far = new Rectangle2D.Double(100, 0, 10, 10);

    const within = matcher().withBoundsProvider(new FixedBounds(near, far)).withMaximumAttachmentDistance(110);
    within.preprocess(new Data(['Foo'], ['Foo']), false);
    expect(within.getAttachments().size).toBe(1);

    const beyond = matcher().withBoundsProvider(new FixedBounds(near, far)).withMaximumAttachmentDistance(109.5);
    beyond.preprocess(new Data(['Foo'], ['Foo']), false);
    expect(beyond.getAttachments().size).toBe(0);
  });

  it('throws Java messages for invalid configuration', () => {
    const noData = new Data([], []);
    expect(() => new NodeReferenceMatcher<string, string>().preprocess(noData, false)).toThrow(
      new IllegalStateException('A comment text function is required.'),
    );
    expect(() =>
      new NodeReferenceMatcher<string, string>().withCommentTextProvider(identity).preprocess(noData, false),
    ).toThrow(new IllegalStateException('A node name function is required.'));
    expect(() => matcher().withMaximumAttachmentDistance(5).preprocess(noData, false)).toThrow(
      new IllegalStateException('A bounds provider must be installed if a maximum attachment distance is set.'),
    );
  });

  it('rejects null configuration arguments with the Java messages', () => {
    const m = new NodeReferenceMatcher<string, string>();
    expect(() => m.withCommentTextProvider(null)).toThrow(new TypeError('Comment text function cannot be null.'));
    expect(() => m.withTargetNameProvider(null)).toThrow(new TypeError('Node name function cannot be null.'));
    expect(() => m.withBoundsProvider(null)).toThrow(new TypeError('Bounds provider must not be null.'));
  });
});
