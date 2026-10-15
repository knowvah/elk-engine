// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { StringIndexOutOfBoundsException } from '../../../java/lang/StringIndexOutOfBoundsException.js';
import { buildToyBlock, TOY, ToyObject } from '../../../../test/helpers/xtext/ToyBlockFixture.js';
import type { FeatureRef } from './FeatureRef.js';
import type { ISemanticRegion } from './ISemanticRegion.js';
import { isSemanticRegion } from './ISemanticRegion.js';
import { isHiddenRegion } from './IHiddenRegion.js';
import { countLineBreaks } from './internal/AbstractTextSegment.js';
import { SemanticRegionMatcher } from './internal/SemanticRegionMatcher.js';
import { SemanticRegionIterable } from './internal/SemanticRegionIterable.js';
import { SemanticRegionNullFinder } from './internal/SemanticRegionNullFinder.js';
import { StringBasedRegionAccess } from './internal/StringBasedRegionAccess.js';
import { TextRegions } from './internal/TextRegions.js';
import { TextReplacement } from './internal/TextReplacement.js';
import { TextSegment } from './internal/TextSegment.js';
import { TextRegionAccessBuilder } from './TextRegionAccessBuilder.js';

// Offsets are hand-derived from TextRegionAccessBuildingSequencer.java 124-146 for the unspaced token text
// "block{a:1,b:2}": block 0-5, { 5-6, a 6-7, : 7-8, 1 8-9, "," 9-10, b 10-11, : 11-12, 2 12-13, } 13-14.
const ENTRIES: ReadonlyArray<readonly [string, string]> = [
  ['a', '1'],
  ['b', '2'],
];
const toy = () => buildToyBlock(ENTRIES);
const texts = (regions: Iterable<ISemanticRegion>): string[] => [...regions].map((r) => r.getText());
const offsets = (regions: Iterable<ISemanticRegion>): number[] => [...regions].map((r) => r.getOffset());

describe('the built region access', () => {
  it('holds the token text without any whitespace', () => {
    const { access } = toy();
    expect(access.regionForDocument().getText()).toBe('block{a:1,b:2}');
    expect(access.regionForDocument().getLength()).toBe(14);
    expect(access.textForOffset(5, 3)).toBe('{a:');
    expect(access.hasSyntaxError()).toBe(false);
  });

  it('knows the root, the resource contents and the region of each object', () => {
    const { access, root, entries } = toy();
    const rootRegion = access.regionForRootEObject();
    expect([rootRegion.getOffset(), rootRegion.getLength(), rootRegion.getGrammarElement()]).toEqual([
      0,
      14,
      TOY.BLOCK_RULE,
    ]);
    expect(access.getResource().getContents()).toEqual([root]);
    const a = access.regionForEObject(entries[0]!)!;
    expect([a.getOffset(), a.getLength(), a.getText(), a.getGrammarElement()]).toEqual([6, 3, 'a:1', TOY.ENTRY_ACTION]);
    expect(a.getSemanticElement()).toBe(entries[0]);
    expect(a.getContainingRegion()).toBe(rootRegion);
    expect(rootRegion.getContainingRegion()).toBeNull();
    expect(access.regionForEObject(new ToyObject('stranger'))).toBeNull();
    expect([...rootRegion.getAstRegions()].length).toBe(2 + 2 + 1 + 1); // block { a-obj , b-obj }... tokens and objects
  });

  it('chains semantic and hidden regions in document order', () => {
    const { access } = toy();
    const first = access.regionForRootEObject().getPreviousHiddenRegion();
    expect(isHiddenRegion(first)).toBe(true);
    expect([first.getOffset(), first.getLength(), first.getPreviousSemanticRegion()]).toEqual([0, 0, null]);
    const block = first.getNextSemanticRegion()!;
    expect(isSemanticRegion(block)).toBe(true);
    expect(block.getText()).toBe('block');
    const gap = block.getNextHiddenRegion()!;
    expect([gap.getOffset(), gap.getPreviousSemanticRegion(), gap.getPreviousHiddenRegion()]).toEqual([
      5,
      block,
      first,
    ]);
    expect(gap.getNextHiddenRegion()!.getOffset()).toBe(6);
    expect(gap.getNextSequentialRegion()).toBe(gap.getNextSemanticRegion());
    expect(gap.getPreviousSequentialRegion()).toBe(block);
    expect(block.getPreviousSequentialRegion()).toBe(first);
    expect(block.getNextSequentialRegion()).toBe(gap);
    expect(block.getPreviousSemanticRegion()).toBeNull();
    expect(block.getNextSemanticRegion()!.getText()).toBe('{');
    expect(block.getPreviousHiddenRegion()).toBe(first);
    expect(gap.getMergedSpaces()).toEqual([gap]);
    expect(gap.isUndefined()).toBe(true);
    const last = access.regionForRootEObject().getNextHiddenRegion();
    expect([last.getOffset(), last.getNextSemanticRegion(), last.getNextHiddenRegion()]).toEqual([14, null, null]);
    expect(first.getNextHiddenRegion()!.getOffset()).toBe(5);
  });

  it('gives each hidden region and object region its neighbours through the extensions', () => {
    const { access, entries } = toy();
    const ext = access.getExtensions();
    expect(ext).toBe(access);
    expect(ext.getTextRegionAccess()).toBe(access);
    expect(ext.previousHiddenRegion(entries[0]!)!.getOffset()).toBe(6);
    expect(ext.nextHiddenRegion(entries[0]!)!.getOffset()).toBe(9);
    const stranger = new ToyObject('stranger');
    expect([ext.previousHiddenRegion(stranger), ext.nextHiddenRegion(stranger)]).toEqual([null, null]);
    expect(ext.grammarElement(entries[1]!)).toBe(TOY.ENTRY_ACTION);
    expect(ext.grammarElement(stranger)).toBeNull();
    expect(ext.isMultiline(entries[0]!)).toBe(false);
    expect(ext.isMultiline(stranger)).toBe(false);
    expect(ext.regionForEObject(entries[0]!)).toBe(access.regionForEObject(entries[0]!));
  });

  it('is multiline when its text contains a line feed', () => {
    const root = new ToyObject('root');
    const builder = new TextRegionAccessBuilder(root, 'R');
    builder.token({ kind: 'assignment', grammarElement: 'rc', assignment: null, text: 'p\nq', owner: root });
    const access = builder.build();
    expect(access.isMultiline(root)).toBe(true);
  });
});

describe('finders', () => {
  it('finds keywords by text and by element, assignments, rule calls and elements', () => {
    const { access, root, entries } = toy();
    const rootFor = access.regionFor(root);
    expect(offsets([rootFor.keyword('{')!])).toEqual([5]);
    expect(rootFor.keyword('missing')).toBeNull();
    expect(texts(rootFor.keywords('{', '}'))).toEqual(['{', '}']);
    expect(texts(rootFor.keywords(','))).toEqual([',']);
    expect(texts(rootFor.keywords())).toEqual([]);
    expect(texts(rootFor.keywordElements(TOY.KW_COMMA, TOY.KW_LBRACE))).toEqual(['{', ',']);
    expect(rootFor.keywordElement(TOY.KW_RBRACE)!.getOffset()).toBe(13);
    expect(rootFor.keywordElement(TOY.KW_COLON)).toBeNull();

    const aFor = access.regionFor(entries[0]!);
    expect(aFor.assignment(TOY.AS_VALUE)!.getText()).toBe('1');
    expect(texts(aFor.assignments(TOY.AS_NAME, TOY.AS_VALUE))).toEqual(['a', '1']);
    expect(aFor.assignment('as.other')).toBeNull();
    expect(aFor.element(TOY.RC_ID)!.getText()).toBe('a');
    expect(texts(aFor.elements(TOY.RC_ID, TOY.KW_COLON))).toEqual(['a', ':']);
    expect(aFor.ruleCall(TOY.RC_INT)!.getText()).toBe('1');
    expect(texts(aFor.ruleCalls(TOY.RC_INT, TOY.RC_ID))).toEqual(['a', '1']);
    expect(aFor.keyword('a')).toBeNull(); // 'a' is a rule call, not a keyword
    expect(aFor.crossRef('x')).toBeNull();
    expect(aFor.crossRefs('x')).toEqual([]);
  });

  it('only lists the tokens of the object itself, or of the object and everything inside with allRegionsFor', () => {
    const { access, root } = toy();
    expect(texts(access.semanticRegions(root))).toEqual(['block', '{', ',', '}']);
    expect(texts(access.allSemanticRegions(root))).toEqual([...['block', '{', 'a', ':', '1', ',', 'b', ':', '2', '}']]);
    expect(offsets(access.allRegionsFor(root).keywords(':'))).toEqual([7, 11]);
    expect(offsets(access.regionFor(root).keywords(':'))).toEqual([]);
  });

  it('finds the crossref terminal by its element id', () => {
    const root = new ToyObject('root');
    const builder = new TextRegionAccessBuilder(root, 'R');
    builder.token({ kind: 'crossref', grammarElement: 'cr.target', assignment: 'as.target', text: 'T', owner: root });
    builder.token({ kind: 'assignment', grammarElement: 'cr.target', assignment: null, text: 'U', owner: root });
    const access = builder.build();
    expect(texts(access.regionFor(root).crossRefs('cr.target'))).toEqual(['T']);
    expect(access.regionFor(root).crossRef('cr.target')!.getKind()).toBe('crossref');
    expect(access.regionFor(root).crossRef('cr.other')).toBeNull();
  });

  it('finds by feature name and containing class, and rejects containment features', () => {
    const { access, entries } = toy();
    const feature = (name: string, instance: (o: unknown) => boolean, containment = false): FeatureRef => ({
      name,
      isContainment: containment,
      isInstance: instance,
    });
    const finder = access.regionFor(entries[0]!);
    expect(finder.feature(feature('value', (o) => o === entries[0]))!.getText()).toBe('1');
    expect(finder.feature(feature('value', () => false))).toBeNull();
    expect(finder.feature(feature('other', () => true))).toBeNull();
    expect(finder.feature(feature('missing', () => true))).toBeNull();
    expect(
      texts(
        finder.features(
          feature('name', () => true),
          feature('value', () => true),
        ),
      ),
    ).toEqual(['a', '1']);
    expect(() => finder.feature(feature('x', () => true, true))).toThrow(
      new IllegalStateException('Only EAttributes and CrossReferences allowed.'),
    );
    expect(() => finder.features(feature('x', () => true, true))).toThrow(IllegalStateException);
    expect(finder.feature(feature('name', () => true))!.getFeatureName()).toBe('name');
    expect(finder.keyword(':')!.getFeatureName()).toBeNull();
  });

  it('matches only the neighbouring token for immediatelyFollowing / immediatelyPreceding', () => {
    const { access, root, entries } = toy();
    const open = access.regionFor(root).keyword('{')!;
    expect(open.immediatelyFollowing().element(TOY.RC_ID)!.getText()).toBe('a');
    expect(open.immediatelyFollowing().keyword('}')).toBeNull();
    expect(open.immediatelyPreceding().keyword('block')!.getText()).toBe('block');
    const comma = access.regionFor(root).keyword(',')!;
    expect(comma.immediatelyPreceding().assignment(TOY.AS_VALUE)!.getText()).toBe('1');
    expect(open.getPreviousHiddenRegion()!.immediatelyFollowing().keyword('block')).toBeNull(); // before '{' comes block
    expect(open.getPreviousHiddenRegion()!.immediatelyPreceding().keyword('block')!.getText()).toBe('block');
    expect(access.immediatelyFollowing(entries[0]!).keyword(',')!.getText()).toBe(',');
    expect(access.immediatelyPreceding(entries[1]!).keyword(',')!.getText()).toBe(',');
    expect(access.regionForEObject(entries[0]!)!.immediatelyFollowing().keyword(',')!.getText()).toBe(',');
    expect(access.regionForEObject(entries[1]!)!.immediatelyPreceding().keyword(',')!.getText()).toBe(',');
    expect(open.immediatelyFollowing().element(TOY.KW_COMMA)).toBeNull();
    expect(
      access.regionForRootEObject().getPreviousHiddenRegion().immediatelyFollowing().keyword('block')!.getText(),
    ).toBe('block');
    const stranger = new ToyObject('stranger');
    expect(access.immediatelyFollowing(stranger).keyword(',')).toBeNull();
    expect(access.immediatelyPreceding(stranger).keyword(',')).toBeNull();
  });

  it('finds nothing for objects without region (the null finder)', () => {
    const { access } = toy();
    const stranger = new ToyObject('stranger');
    const finder = access.regionFor(stranger);
    expect(finder).toBe(SemanticRegionNullFinder.INSTANCE);
    expect(access.allRegionsFor(stranger)).toBe(SemanticRegionNullFinder.INSTANCE);
    const none = { name: 'x', isContainment: false, isInstance: () => true };
    expect([
      finder.assignment('a'),
      finder.crossRef('a'),
      finder.element('a'),
      finder.feature(none),
      finder.keywordElement('a'),
      finder.keyword('a'),
      finder.ruleCall('a'),
    ]).toEqual([null, null, null, null, null, null, null]);
    expect([
      finder.assignments('a'),
      finder.crossRefs('a'),
      finder.elements('a'),
      finder.features(none),
      finder.keywordElements('a'),
      finder.keywords('a'),
      finder.ruleCalls('a'),
    ]).toEqual([[], [], [], [], [], [], []]);
    expect([...access.semanticRegions(stranger)]).toEqual([]);
    expect([...access.allSemanticRegions(stranger)]).toEqual([]);
  });

  it('iterates to the end of the document when the last region is not reachable (as Xtext does)', () => {
    const { access } = toy();
    const first = access.regionForRootEObject().getPreviousHiddenRegion().getNextSemanticRegion()!;
    expect(texts(new SemanticRegionIterable(first, null))).toHaveLength(10);
    expect(texts(new SemanticRegionIterable(null, first))).toEqual([]);
    expect(texts(new SemanticRegionIterable(first, first))).toEqual(['block']);
  });
});

describe('semantic region matchers', () => {
  it('match nothing when there is no neighbouring region', () => {
    const { access } = toy();
    const end = access.regionForRootEObject().getNextHiddenRegion().immediatelyFollowing();
    const none = { name: 'x', isContainment: false, isInstance: () => true };
    expect([
      end.assignment('a'),
      end.crossRef('a'),
      end.element('a'),
      end.feature(none),
      end.keywordElement('a'),
      end.keyword('a'),
      end.ruleCall('a'),
    ]).toEqual([null, null, null, null, null, null, null]);
    const matcher = new SemanticRegionMatcher(null);
    expect([
      matcher.assignments('a'),
      matcher.crossRefs('a'),
      matcher.elements('a'),
      matcher.features(none),
      matcher.keywordElements('a'),
      matcher.keywords('a'),
      matcher.ruleCalls('a'),
    ]).toEqual([[], [], [], [], [], [], []]);
  });

  it('expose the owner of a token', () => {
    const { access, root } = toy();
    const brace = access.regionFor(root).keyword('{')!;
    const region = access.regionForRootEObject();
    expect([brace.getContainingRegion(), brace.getEObjectRegion(), brace.getSemanticElement()]).toEqual([
      region,
      region,
      root,
    ]);
    expect([brace.getGrammarElement(), brace.getKind(), brace.getAssignment()]).toEqual([
      TOY.KW_LBRACE,
      'keyword',
      null,
    ]);
  });
});

describe('the builder', () => {
  it('ignores empty tokens', () => {
    const root = new ToyObject('root');
    const builder = new TextRegionAccessBuilder(root, 'R');
    builder.token({ kind: 'keyword', grammarElement: 'k', assignment: null, text: '', owner: root });
    builder.token({ kind: 'keyword', grammarElement: 'k', assignment: null, text: 'x', owner: root });
    const access = builder.build();
    expect(access.regionForDocument().getText()).toBe('x');
    expect(texts(access.semanticRegions(root))).toEqual(['x']);
  });

  it('rejects tokens outside any object and unbalanced leaves', () => {
    const root = new ToyObject('root');
    const builder = new TextRegionAccessBuilder(root, 'R');
    builder.leaveObject();
    expect(() => builder.leaveObject()).toThrow(IllegalStateException);
    expect(() =>
      builder.token({ kind: 'keyword', grammarElement: 'k', assignment: null, text: 'x', owner: root }),
    ).toThrow("token 'x' outside of any object");
  });

  it('refuses the root region of an unbuilt access', () => {
    const access = new StringBasedRegionAccess({ getContents: () => [] });
    expect(() => access.regionForRootEObject()).toThrow(IllegalStateException);
  });

  it('gives an object without tokens equal leading and trailing hidden regions', () => {
    const empty = new ToyObject('empty');
    const root = new ToyObject('root', [empty]);
    const builder = new TextRegionAccessBuilder(root, 'R');
    builder.enterObject('E', empty);
    builder.leaveObject();
    const access = builder.build();
    const region = access.regionForEObject(empty)!;
    expect(region.getPreviousHiddenRegion()).toBe(region.getNextHiddenRegion());
    expect([region.getOffset(), region.getLength()]).toEqual([0, 0]);
    expect(region.getPreviousSemanticRegion()).toBeNull();
    expect(region.getNextSemanticRegion()).toBeNull();
    expect(region.getPreviousSequentialRegion()).toBe(region.getLeadingHiddenRegion());
    expect(region.getNextSequentialRegion()).toBe(region.getTrailingHiddenRegion());
  });
});

describe('text segments, replacements and rewriting', () => {
  it('orders and contains segments by offset and length', () => {
    const { access } = toy();
    const seg = (o: number, l: number) => new TextSegment(access, o, l);
    expect(seg(1, 2).compareTo(seg(2, 0))).toBe(-1);
    expect(seg(1, 2).compareTo(seg(1, 5))).toBe(-3);
    expect(seg(1, 2).compareTo(seg(1, 2))).toBe(0);
    expect(seg(1, 4).contains(seg(2, 2))).toBe(true);
    expect(seg(1, 4).contains(seg(2, 4))).toBe(false);
    expect(seg(1, 4).contains(seg(0, 1))).toBe(false);
    expect(seg(1, 4).getEndOffset()).toBe(5);
    expect(seg(0, 5).getText()).toBe('block');
    expect(seg(0, 5).getTextRegionAccess()).toBe(access);
  });

  it('counts line breaks of LF, CR and CRLF', () => {
    expect(countLineBreaks('a\r\nb\rc\nd')).toBe(3);
    expect(countLineBreaks('')).toBe(0);
    expect(countLineBreaks('\r\r\n\n')).toBe(3);
  });

  it('renders replacements in offset order and keeps the rest of the text', () => {
    const { access } = toy();
    const rewriter = access.getRewriter();
    const b = access.regionForDocument().replaceWith('X');
    const replacements = [
      rewriter.createReplacement(5, 1, '<'),
      rewriter.createReplacement(0, 0, '>'),
      rewriter.createReplacement(14, 0, '!'),
    ];
    expect(rewriter.renderToString(replacements)).toBe('>block<a:1,b:2}!');
    expect(b.getReplacementText()).toBe('X');
    expect(rewriter.renderToString([b])).toBe('X');
    expect(rewriter.renderToString([])).toBe('block{a:1,b:2}');
  });

  it('renders into an appendable and over a sub segment', () => {
    const { access } = toy();
    const rewriter = access.getRewriter();
    const chunks: string[] = [];
    rewriter.renderToAppendable([rewriter.createReplacement(5, 0, '_')], { append: (t) => void chunks.push(t) });
    expect(chunks).toEqual(['block', '_', '{a:1,b:2}']);
    const sub = new TextSegment(access, 5, 5); // "{a:1,"
    expect(rewriter.renderSegmentToString(sub, [rewriter.createReplacement(6, 0, '_')])).toBe('{_a:1,');
    const sink: string[] = [];
    rewriter.renderSegmentToAppendable(sub, [], { append: (t) => void sink.push(t) });
    expect(sink.join('')).toBe('{a:1,');
  });

  it('fails like subSequence for overlapping replacements', () => {
    const { access } = toy();
    const rewriter = access.getRewriter();
    expect(() =>
      rewriter.renderToString([rewriter.createReplacement(0, 5, 'x'), rewriter.createReplacement(3, 0, 'y')]),
    ).toThrow(IndexOutOfBoundsException);
  });

  it("throws String.substring's StringIndexOutOfBoundsException for overlapping replacements", () => {
    const { access } = toy();
    const rewriter = access.getRewriter();
    // the region text is a Java String: subSequence is substring, whose range check throws the subclass
    const render = () =>
      rewriter.renderToString([rewriter.createReplacement(0, 5, 'x'), rewriter.createReplacement(3, 0, 'y')]);
    expect(render).toThrow(StringIndexOutOfBoundsException);
    expect(render).toThrow('begin 5, end 3, length 14');
  });

  it('validates replacement arguments and describes itself', () => {
    const { access } = toy();
    expect(() => new TextReplacement(access, -1, 0, '')).toThrow(new IllegalArgumentException('offset must be >= 0'));
    expect(() => new TextReplacement(access, 0, -1, '')).toThrow(new IllegalArgumentException('length must be >= 0'));
    const r = new TextReplacement(access, 0, 5, 'BLOCK');
    expect([r.getOffset(), r.getLength(), r.getText(), r.getReplacementText()]).toEqual([0, 5, 'block', 'BLOCK']);
  });

  it('counts the lines of a segment', () => {
    const root = new ToyObject('root');
    const builder = new TextRegionAccessBuilder(root, 'R');
    builder.token({ kind: 'assignment', grammarElement: 'rc', assignment: null, text: 'a\r\nb\rc', owner: root });
    const access = builder.build();
    expect(access.regionForDocument().getLineCount()).toBe(3);
    expect(access.regionForDocument().isMultiline()).toBe(true);
  });
});

describe('TextRegions.difference', () => {
  const region = (offset: number, length: number) => ({
    getOffset: () => offset,
    getLength: () => length,
    contains: () => false,
  });
  const pairs = (list: Array<{ getOffset(): number; getLength(): number }>): number[][] =>
    list.map((r) => [r.getOffset(), r.getLength()]);

  it('returns the regions of the first list that are missing in the second, sorted', () => {
    const result = TextRegions.difference([region(5, 0), region(2, 3), region(0, 1)], [region(9, 9), region(2, 3)]);
    expect(pairs(result)).toEqual([
      [0, 1],
      [5, 0],
    ]);
  });

  it('skips regions that only the second list has, and compares lengths at equal offsets', () => {
    expect(pairs(TextRegions.difference([region(5, 0)], [region(1, 1), region(5, 0)]))).toEqual([]);
    expect(pairs(TextRegions.difference([region(5, 2), region(5, 0)], [region(5, 0)]))).toEqual([[5, 2]]);
  });
});
