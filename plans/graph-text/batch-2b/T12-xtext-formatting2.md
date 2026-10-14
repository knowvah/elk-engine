<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — Xtext `formatting2` subset: region access, hidden-region formatting, rendering

**Agent:** typescript-pro · **Commit:** `feat(T12): port xtext formatting2 region access and rendering`

## Context
G1 fixes the writer as a grammar-specific sequencer (T19) feeding a minimal `formatting2`: `ElkGraphFormatter`
(T21, line by line) uses `regionFor.keyword/keywords/assignment`, `append`/`prepend` on regions and EObjects,
`interior(open, close, [indent])`, `noSpace/oneSpace/newLine/setNewLines(1,1,2)` and `format` dispatch.
**Both** the formatted and the unformatted oracle output go through this machinery (`Serializer.java:149-157`:
`serializeToRegions` -> `FormatterRequest` with `formatUndefinedHiddenRegionsOnly = !formatting` ->
`IFormatter2.format` -> `TextRegionRewriter.renderToAppendable`), so the default spacing of unformatted text
(`AbstractFormatter2.postProcess` 385-411) is part of this task. Ported from Xtext 2.36.0 EPL source
(`XT` as in [T7](../batch-2a/T7-xtext-converters.md), package `org/eclipse/xtext/formatting2`), file mapping
`src/xtext/formatting2/<sub-package>/<Class>.ts`. Stop 8 applies: a vector that needs more than this subset
halts the mission.

## Task
Port, methods whole unless the caller contract makes a branch unreachable (then list each skipped branch with
its proof in the journal; do not skip silently). Reached classes, with the entry points to trace from
`AbstractFormatter2.format(FormatterRequest)` 271-287:
1. **Driver:** `AbstractFormatter2.ts` (XT `formatting2/AbstractFormatter2.java:171-428`): `_format(EObject)`
   190-196 (children via `eContents()`), `format(request)` 271-287, `postProcess` 385-411 (undefined hidden
   regions the formatter left alone get `" "`, or `""` when at the start/end of the document — this *is* the
   unformatted layout), `createHiddenRegionFormatter/Formatting/Merger/Replacer/Context` 238-268,
   `shouldFormat` 422-426 (the request's `regions` list is always empty here, `Serializer.java:150-155`, so only
   the empty arm of `isInRequestedRange` 354-373 is ported — comment cites those lines),
   `getPreference` 315-317, `handleTraceMissing` 289-298 only with debug tracing off (the retry arm is not
   reached unless a `RegionTraceMissingException` fires; port `RegionTrace`/`RegionTraceMissingException`
   only if `TextSegmentSet.add` needs them for `ConflictingRegionsException` text). The Xtend `dispatch format`
   of T21 is `abstract format(obj: unknown, document: IFormattableDocument): void`.
   `FormatterRequest.ts` (241 lines): `textRegionAccess`, `preferences`, `formatUndefinedHiddenRegionsOnly`,
   `allowIdentityEdits`, `regions` (empty). **Preferences** (`getPreferences` 144-148 builds an *empty*
   `MapBasedPreferenceValues`; `FormatterPreferenceKeys.java:14-74`): `indentation = "\t"`,
   `lineSeparator = "\n"` (JVM `line.separator` of the oracle host: T5 rows decide; encode as named constants),
   `maxLineWidth = 120` (autowrap is unused: `autowrap`/`IAutowrapFormatter` are not ported).
2. **Document and formatting merge:** `internal/{FormattableDocument,RootDocument,HiddenRegionFormatting,
   HiddenRegionFormattingMerger,SingleHiddenRegionFormatter,DoubleHiddenRegionFormatter,
   AbstractHiddenRegionFormatter}.ts` and `IFormattableDocument/IHiddenRegionFormatter/IHiddenRegionFormatting/
   IMerger`. `FormattableDocument.java`: `addReplacer` 66-83, `append/prepend/surround` on regions and EObjects
   85-106, 271-290, 328-349, `format(obj)` 185-199, `interior(first, second, init)` 223-250, `set(...)`
   300-326, `renderToTextReplacements` 292-299, `createReplacements` 124-170. **Conflict semantics (the
   `ConflictingFormattingException` rule):** two formattings of the same hidden region merge through
   `HiddenRegionFormattingMerger.merge` 32-47 -> `HiddenRegionFormatting.mergeValuesFrom` 109-131 / `merge`
   96-107 (per property: equal values merge, a different value with equal priority throws
   `ConflictingFormattingException` 33 lines; higher priority wins; indentation increase/decrease add up).
   Port the exception and the merge strategies exactly; T21's repeated `append` on the same region (e.g.
   `append(one_space)` then `append(new_lines)`) depends on them. `SingleHiddenRegionFormatter` 19-86 and
   `DoubleHiddenRegionFormatter` 100 lines implement `noSpace/oneSpace/newLine/setNewLines/indent/
   highPriority/lowPriority/noIndentation/setSpace`; `AbstractHiddenRegionFormatter` 17-49.
3. **Replacers and rendering:** `internal/{HiddenRegionReplacer(185),WhitespaceReplacer(121),
   TextReplacerContext(435),TextReplacerMerger(79),TextReplacementList,TextSegmentSet(120),
   ArrayListTextSegmentSet(182),ConflictingRegionsException(50),RegionsOutsideFrameException(59)}.ts`,
   `ITextReplacer/ITextReplacerContext/ITextReplacement`, `regionaccess/internal/{TextRegionRewriter,
   TextReplacement,TextRegions}.ts` (`TextRegions.difference` 107 lines is used by `postProcess`).
   Decisive arithmetic: `WhitespaceReplacer.computeNewLineCount` 46-69 (undefined region: default, else min,
   else max; defined: clamp existing line count), `createReplacements` 71-96
   (`newLineCount = max(computed - trailingNewLinesOfPreviousRegion, 0)`; spaces only when no newline; else
   `lineSeparator * n + indentation * level`), `computeNewIndentation` 33-44 (underflow clamps to 0),
   `HiddenRegionReplacer` 29-185 (separator/priority/default formatting, `introduceNewlinesAroundMLComments`
   116-127 only matters with comments: there are none, see below), `TextReplacerContext` 41-435
   (`getIndentationString` via the `indentation` preference, `getNewLinesString` via `lineSeparator`,
   `addReplacement` 248-277, `isInUndefinedRegion` 279-288, `isIdentityEdit` 290-293,
   `withReplacer` 364-383, `getLeadingCharsInLineCount` 108-156 used only by autowrap -> not ported).
   `TextRegionRewriter.renderToAppendable` 34-55 applies the replacements to the region access text.
4. **Region access** (built from the sequencer stream, never from a node model): `regionaccess/{ITextRegionAccess,
   ISemanticRegion,IHiddenRegion,IEObjectRegion,ISemanticRegionsFinder,ISemanticRegionFinder,ITextSegment,
   ITextRegionExtensions}.ts` and `internal/{AbstractRegionAccess(162),StringBasedRegionAccess(83),
   AbstractTextSegment(120),StringRegion(47),StringSemanticRegion(129),AbstractHiddenRegion(198),
   StringHiddenRegion(33),AbstractEObjectRegion(231),StringEObjectRegion(23),AbstractSemanticRegionsFinder
   (425; the finder subset: `keyword/keywords(String..)/keywords(Keyword..)/assignment/assignments/crossRef/
   feature/element/ruleCall` as `ElkGraphFormatter` uses them, predicates 49-210 and
   `collectMatchableElements` 236-257),SemanticRegionMatcher(43),SemanticRegionNullFinder(121),
   SemanticRegionIterable(48),SemanticRegionInIterableFinder(45)}.ts`. The `TextRegionAccessBuildingSequencer`
   (XT `regionaccess/internal/TextRegionAccessBuildingSequencer.java:30-239`) is the model of the **builder**
   below; comments and whitespace regions (`StringComment`, `StringWhitespace`, comment replacers
   `MultilineCommentReplacer`, `Singleline*CommentReplacer`, `CommentReplacer`) are **not ported**: the writer
   input has no node model (G2: `EcoreUtil.copy`), so the builder never receives `acceptComment`/
   `acceptWhitespace` (lines 80-119 are dead for this flow) — state this as the invariant in the builder comment.
5. **Builder contract with T19 (the G1 token stream):**
   ```ts
   export type SemanticKind = 'keyword' | 'assignment' | 'crossref';
   export interface FormattingToken {            // one emitted token
     readonly kind: SemanticKind;
     readonly grammarElement: string;            // id of the terminal element (keyword, rule call, cross reference)
     readonly assignment: string | null;         // id of the enclosing Assignment, null for unassigned keywords
     readonly text: string;                      // exact token text; empty text is ignored (appendSemantic 124-126)
     readonly owner: EObject;                    // semantic object whose region the token belongs to
   }
   export class TextRegionAccessBuilder {        // mirrors forSequence(ctx, root) + the acceptor callbacks
     constructor(root: EObject, rootRule: string);               // withRoot 229-236
     enterObject(grammarElement: string, child: EObject): void;  // enterAssignedParserRuleCall/Action 167-200
     leaveObject(): void;                                        // leaveEObject 207-222
     token(t: FormattingToken): void;                            // appendSemantic 124-146 (creates the trailing hidden region)
     build(): StringBasedRegionAccess;                           // create() 36-44
   }
   ```
   The brief's token shape gains `assignment` because `regionFor.assignment(a)` matches
   `getAssignedGrammarElement` (`AbstractSemanticRegionsFinder.createPredicate` 258-282): T19 reports
   the terminal id *and* its assignment id; T21's grammar-access constants are the same id strings. Ids are
   opaque strings; this task defines no ELK ids (tests use a toy grammar).
6. **Tests (unit, from the Java source; end-to-end replay is T21/T22):** a toy grammar built through the
   builder (`block { a: 1 , b: 2 }`) verifying: region lookup by keyword/assignment; `append(one_space)` +
   `prepend(no_space)` render; `interior(open, close, indent)` indents inner lines with `\t`;
   `setNewLines(1,1,2)` on a defined region clamps, on an undefined one yields the default; two conflicting
   `append`s with equal priority throw `ConflictingFormattingException` while a `highPriority` one wins;
   unformatted request (`formatUndefinedHiddenRegionsOnly = true`, no formatter calls) renders tokens
   separated by single spaces and no leading/trailing space (`postProcess`); output uses `lineSeparator`.

## Write-set
`src/xtext/formatting2/**` (colocated `*.test.ts` implicit).

## Read-set
- `../elk/plugins/org.eclipse.elk.graph.text/src/.../formatting2/ElkGraphFormatter.xtend:35-234` (to know which members are reached)
- XT `formatting2/**` as ranged above; XT `serializer/impl/Serializer.java:139-157`
- XT `preferences/{MapBasedPreferenceValues,TypedPreferenceKey,StringKey,IntegerKey}.java`
- `test/golden/refs/java/graph-text-write.json` (`formatted`/`unformatted` of the small `java-*` and curated rows, for the tab/newline facts)
- `docs/translation-rules.md` section 6 (inner classes, interfaces with default methods)

## Decisions
- [G1](../decisions.md#g1--writer-architecture) · [G2](../decisions.md#g2--writer-input-and-oracle-contract) · AD-13
- Phase 6 stop 8 (this subset is the limit); standing rule: ported behaviour first, no simplification

## Interface contract
Consumed by T19 (`TextRegionAccessBuilder`, `FormattingToken`) and T21 (`AbstractFormatter2`,
`IFormattableDocument`, `IHiddenRegionFormatter`, `ISemanticRegion`, `regionFor`). Produced entry point:
`new Formatter(...).format(request): ITextReplacement[]`, then
`access.getRewriter().renderToString(replacements)`; plus `FormatterPreferenceKeys` constants.

## Acceptance criteria
- Given the toy-grammar fixtures above, then the rendered strings equal hand-derived expectations written
  from the Java source before the code (AD-13: expected values come from the source, not the port).
- Given two equal-priority conflicting formattings, then `ConflictingFormattingException` is thrown with
  the source message; given different priorities, the higher wins.
- Given an unformatted request, then the output is single-space separated with no outer whitespace.
- Given the `formatted`/`unformatted` strings of the simplest T5 row built through the builder by hand, then they
  match byte for byte (this proves indentation string and line separator).

## Quality bar
README gates; TDD; `npm run complexity` clean (Java-method-boundary splits only; this is the largest
`src/xtext` task: split commits are not allowed, so keep it one commit but write it in the order 2, 4, 3, 1);
no recursion deeper than the object nesting depth.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No `src/graph/**` import, no ELK ids. No node-model-based region access (`NodeModelBasedRegionAccess*`), no
diff builders, debug printers, comment replacers, autowrap, or `MaxLineWidthDocument`. No OpenJDK/Guava source
(AD-9). The agent does not commit; the orchestrator commits per task.
