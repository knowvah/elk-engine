<!-- SPDX-License-Identifier: EPL-2.0 -->

# T19 — `NodeReferenceMatcher` and the `comments.json` oracle replay

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T19): port node reference matcher and replay comment scenarios`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
Mission 5b (README). This task finishes `comments/*` and proves it against the oracle (R6).
- `NodeReferenceMatcher` matches comment text against target names with Java regular expressions. T9 shims those
  (`Pattern`, `JavaCharacter`, `JavaString.trim`), and their behaviour is pinned by `regex.json`.
- It calls `DistanceMatcher.distance` (T15).
- T14's `comments.json` holds about 10 tie-free scenarios; T16's `CommentAttacher` runs them.

## Task
1. Port `J/comments/NodeReferenceMatcher.java`:
   - the configuration methods (`:100-178`) and `checkConfiguration` (three `IllegalStateException`s with Java's
     messages);
   - `preprocess` (recursing into sub-hierarchies), `cleanup`;
   - `raw`: identity comparison `foundAttachments.get(comment) == target ? 1 : 0`;
   - `normalized`, `goFindMatches` (a unique match only; a second match resets to `null` and breaks; the
     `maxDistance` check through `DistanceMatcher.distance`), and `getAttachments`.
   - `foundAttachments` is an identity-keyed `HashMap` with lookups only; use a JS `Map` and journal it (P2).
2. **`fuzzyRegexpFor` and `strictRegexpFor`** (`:320-385`): port them character for character.
   - Use `trim` from `JavaString`, `isUpperCase`/`isLowerCase`/`isWhitespace` from `JavaCharacter` on UTF-16 units,
     `Pattern.quote`, and `Pattern.compile(…, DOTALL | CASE_INSENSITIVE)` or `DOTALL`.
   - Use a `StringBuilder` for Java's `StringBuffer`.
   - Fuzzy segments start from `new StringBuffer(targetName.length())`, sized by the untrimmed name: harmless, but
     keep it.
3. In the unit tests, compare each built pattern **string** with `regex.json`'s `regex` field for every recorded
   name. This proves the construction; T9 already proved the matching.
4. **Scenario configuration helper** `test/helpers/comment-scenario-config.ts`: implement exactly T14's documented
   vocabulary. Read it from the header of `tools/vectors/CommentVectors.java`. It covers the attacher flags, the
   explicit provider, the bounds provider (cached or not), the filters, the matchers and the decider. The `firstLabel`
   text and name functions use the node's first label text, as the recorder does.
5. **Replay test** `src/core/comments/CommentVectors.test.ts`: for each scenario,
   1. load the input with the landed loader matching T14's format (`ElkGraphText.load` for `.elkt`, the JSON
      importer for JSON);
   2. build the attacher from the configuration and run `attachComments`;
   3. read the created edges back as sorted `[commentId, targetId]` pairs;
   4. assert equality with `attachments`.
   - On a mismatch, name the mechanism before touching anything (stop 5). Never edit the vector.

## Write-set
`src/core/comments/NodeReferenceMatcher.ts`, `src/core/comments/NodeReferenceMatcher.test.ts`,
`src/core/comments/CommentVectors.test.ts`, `test/helpers/comment-scenario-config.ts`.

## Read-set
- `J/comments/NodeReferenceMatcher.java`.
- `test/golden/refs/java/{regex,comments}.json`, `tools/vectors/CommentVectors.java` (header vocabulary),
  `tools/vectors/comment-scenarios/`.
- T9's `src/java/{lang/JavaCharacter,util/regex/Pattern,lang/JavaString}.ts`; T13, T15 and T16's
  `src/core/comments/*.ts`.
- `src/graph/text/ElkGraphText.ts` or the JSON importer.

## Interface contracts
- `NodeReferenceMatcher<C, T> extends IMatcher<C, T>`: `withCommentTextProvider(f)`, `withTargetNameProvider(f)`,
  `withFuzzyMatching()`, `withMaximumAttachmentDistance(d)`, `withBoundsProvider(p)`, `getAttachments()`.
- `buildCommentAttacher(config)` in `test/helpers/comment-scenario-config.ts` returns the configured
  `CommentAttacher<ElkNode, ElkNode>` and a data provider factory.

## Acceptance criteria
- Given every `regex.json` name, when `fuzzyRegexpFor` and `strictRegexpFor` build patterns, then the pattern strings
  equal the recorded `regex` values.
- Given every `comments.json` scenario, when replayed, then the TS attachments equal the oracle's as a set of pairs.
- Given a comment that matches two target names, when preprocessed, then no attachment is recorded for it
  (`goFindMatches` reset rule).
- Given `withMaximumAttachmentDistance(d)` without a bounds provider, when `preprocess` runs, then
  `IllegalStateException` is thrown with Java's message.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
