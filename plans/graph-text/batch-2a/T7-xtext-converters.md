<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — Xtext `Strings`, value-converter core, ID/INT/STRING converters

**Agent:** typescript-pro · **Commit:** `feat(T7): port xtext string utils and terminal value converters`

## Context
`ElkGraph.xtext` inherits `ID`, `INT`, `STRING` from Xtext's common `Terminals`; the ELK converters
(T13) extend `AbstractValueConverter`, call `IDValueConverter` and `Strings`, and the parser (T15)
and linker (T16) call the converter service. This task ports exactly the Xtext classes those callers
reach, with every branch of each ported method, and fixes the **file-mapping rule** for all `src/xtext`
tasks (T7, T8, T11, T12, T14, T16): Xtext class `org.eclipse.xtext.<pkg>.<Class>` becomes
`src/xtext/<pkg with dots as slashes>/<Class>.ts`, whichever Xtext bundle (`org.eclipse.xtext` or
`org.eclipse.xtext.util`) holds it; one top-level class per file, named as the Java class; a nested
type `Outer.Inner` is `Outer.Inner.ts`. Every file starts `// SPDX-License-Identifier: EPL-2.0` and
each class carries `@see org.eclipse.xtext/src/org/eclipse/xtext/<path>.java` (util bundle:
`@see org.eclipse.xtext.util/src/org/eclipse/xtext/util/<File>.java`). Guice injection becomes
constructor parameters; reflection-driven registration becomes an explicit table (translation-rules
section 6). No logging (`LOG.warn` calls are dropped, noted in a comment).

## Task
Sources (EPL, read-only; unpack each jar with `unzip -qo` into its own new empty directory outside the
repo and read the files there): `XT` = `org/eclipse/xtext` inside
`~/.m2/repository/p2/osgi/bundle/org.eclipse.xtext.source/2.36.0.v20240825-0714/org.eclipse.xtext.source-2.36.0.v20240825-0714.jar`;
`XU` = `org/eclipse/xtext/util` inside the sibling `org.eclipse.xtext.util.source` jar of the same
version (ISO-8859-1 text: use `grep -a`). Port, in this order, test first from the T2 rows and the source:
1. `util/Strings.ts` (XU `Strings.java`): `EMPTY_ARRAY` 27, `notNull` 39-41, `isEmpty` 96-98,
   `convertFromJavaString` 132-134, `convertToJavaString` 142-154, `toHex` 156-158,
   `split(String,String)` 181-208 and `split(String,char)` 231-258 (both: trailing empty segments are
   dropped, interior empties kept via `pendingEmptyStrings`, one TS function with two overloads is fine
   because behaviour is identical). The rest of the class is not reached.
2. `util/JavaStringConverter.ts` (XU `JavaStringConverter.java` 18-274, whole class; STRING extends it and
   the writer T19 calls `convertToJavaString`). `char[]` overloads collapse to string versions; keep
   `doIsHexSequence`, `isHex` (258-270).
3. `conversion/ValueConverterException.ts` (XT 19-32: `message == null && cause != null ?
   cause.getMessage()` — keep), `ValueConverterWithValueException.ts` (21-76), `IValueConverter.ts`
   (21-74 incl. `NO_OP_CONVERTER` 23-32 and `RuleSpecific` 67-73), `IValueConverterService.ts` (17-36).
   `ValueConverterException.getNode()` returns T7's minimal `nodemodel/INode.ts`:
   `{ getStartLine(): number; getText(): string; getSemanticElement(): EObject | null }` (T15 implements
   it; line = line of the node's first non-hidden leaf, `nodemodel/impl/AbstractNode.java:180-187`).
   Two further adapter interfaces live beside it because T15 (parser) and T16 (linker) are parallel tasks
   that must not import each other: `nodemodel/ICrossReferenceNode.ts` = `INode & { readonly ruleName: string;
   readonly feature: string; readonly index: number }` (one cross-reference occurrence: the token text without
   hidden tokens, the called rule `QualifiedId` or `ID`, the feature name, the value index within the owner's
   feature) and `nodemodel/INodeModel.ts` = `{ getCrossReferenceNodes(obj: EObject): readonly ICrossReferenceNode[]
   | null }` (source order across features; `null` = the object has no node, the Java `Linker.ensureLinked`
   early return, `Linker.java:56-58`). T15 implements both.
   `AbstractRule.ts` (top-level, Xtext's `org.eclipse.xtext.AbstractRule`, reduced to
   `{ getName(): string; isTerminalRule(): boolean }`).
4. `conversion/impl/AbstractValueConverter.ts` (17-19), `AbstractLexerBasedConverter.ts` (33-153):
   `toString` 46-51 (assertValidValue -> toEscapedString -> assertTokens), `assertTokens` 57-76 (first
   token only; text mismatch, then rule-name mismatch `getRuleName().toUpperCase()` vs
   `getRuleName(token)`, then `toValue(token.getText(), null)` re-parse equality
   `value != reparsed && !value.equals(reparsed)`), the two `create*MismatchException` 78-84, 86-92,
   `assertValidValue` 94-98, `getLexer()` 108-112 (a lexer exists only when a `TokenSource` was supplied
   and the rule is a terminal rule), `getRuleName(Token)` 115-118 via `parser/antlr/TokenTool.ts`
   (XT `parser/antlr/TokenTool.java:58-74`: `LEXER_RULE_PREFIX`, `isLexerRule`, `getLexerRuleName`),
   `setRule` 128-135. Contract replacing the ANTLR lexer and `ITokenDefProvider`:
   ```ts
   export interface LexerToken { readonly type: string; readonly text: string } // type = ANTLR token-def name, e.g. 'RULE_ID'
   export type TokenSource = (text: string) => readonly LexerToken[];            // all tokens incl. hidden, in order
   ```
   An empty token list stands for Java's EOF token (never equal to the escaped string) -> content
   mismatch exception. The constructor takes `tokenSource: TokenSource | null` (Java's optional
   `@Inject(optional=true) lexerProvider`).
5. `conversion/impl/AbstractIDValueConverter.ts` (36-123) and `IDValueConverter.ts` (21-36). The
   keyword set (`GrammarUtil.getAllKeywords`, XT `GrammarUtil.java:553-570`: keywords of parser and
   enum rules only) is a constructor input `valuesToEscape: ReadonlySet<string>`; T13 passes
   `ELK_GRAPH_KEYWORDS` from T9. Keep `collectInvalidCharacters` 92-107 and
   `getInvalidCharactersMessage` 82-90 exactly: the invalid characters are collected in a Java
   `HashSet<Character>` whose iteration order is part of the message
   (`ID 'a b' contains invalid characters: ' ' (0x20)`); use `src/java/util/JavaHashSet` (a one-char
   string hashes to its code unit, so `JavaString.hashCode` order equals `Character.hashCode` order) and
   `Integer.toHexString` = `charCode.toString(16)`. `toValue` 109-114 strips one leading `^`.
6. `conversion/impl/INTValueConverter.ts` (18-48; `Integer.parseInt(s, 10)` = `JavaInteger.valueOf`,
   the `NumberFormatException` is the `cause` of the thrown `ValueConverterException`),
   `STRINGValueConverter.ts` (20-181: all four error messages, `convertFromString` 50-58, the
   `Implementation` subclass 70-158 with `errorMessage/errorIndex/errorLength/nextIndex`,
   `getInvalidEscapeSequenceMessage` 163-165, `getStringNotClosedMessage` 170-172).
7. `conversion/impl/AbstractDeclarativeValueConverterService.ts` (XT 49-244, reduced) and
   `common/services/DefaultTerminalConverters.ts` (24-84). Reflection scanning of `@ValueConverter`
   methods becomes `register(ruleName, converter, qualifiedName?)` calls made by the subclass
   constructor, keeping: simple-name entries registered before dotted ones (138), the two
   `IllegalStateException`s (141-147), `registerIfMissing` first-wins (167-194), `getConverter` with
   `NO_OP_CONVERTER` fallback (86-94), and `RuleSpecific.setRule` on registration (181-183). The
   `registerEFactoryConverters` fallback (206-219) is reduced to the one case ELK reaches — a datatype
   rule converted by `EFactoryValueConverter` for `EString` (rule `QualifiedId`, used by the linker's
   `getCrossRefNodeAsString`) — implement `EFactoryValueConverter` (XT 22-49) only for the identity
   `EString` conversion and journal that `DefaultTerminalConverter` / terminal fallbacks are not reached
   (SIGNED_INT/FLOAT only occur inside datatype rules `Number`/`NumberValue`, which have their own
   converters; ANY_OTHER/WS/comments are hidden or syntax errors). `DefaultTerminalConverters` takes the
   three explicit converters `ID`, `INT`, `STRING` (+ the `org.eclipse.xtext.common.Terminals.*` aliases).

## Write-set
`src/xtext/util/Strings.ts`, `src/xtext/util/JavaStringConverter.ts`, `src/xtext/conversion/**`,
`src/xtext/common/services/DefaultTerminalConverters.ts`, `src/xtext/parser/antlr/TokenTool.ts`,
`src/xtext/nodemodel/{INode,ICrossReferenceNode,INodeModel}.ts`, `src/xtext/AbstractRule.ts` (colocated `*.test.ts` implicit).

## Read-set
- XT `conversion/**` as ranged above; XT `common/services/DefaultTerminalConverters.java:24-84`
- XT `parser/antlr/TokenTool.java:58-74`; XT `GrammarUtil.java:553-570`
- XU `Strings.java`, `JavaStringConverter.java`
- `test/golden/refs/java/graph-text-lexer.json` (`converters` rows with `converter` in {ID, INT, STRING}),
  `docs/translation-rules.md` sections 6, 7
- `src/java/lang/{JavaInteger,JavaString,NumberFormatException}.ts`, `src/java/util/JavaHashSet.ts`

## Decisions
- [G6](../decisions.md#g6--lexer) · [G5](../decisions.md#g5--diagnostic-fidelity) · AD-9, AD-13
- D8 (`plans/conformance-corpus/decisions.md`): STRING escapes come from Xtext EPL source.

## Interface contract
Consumed: T2 `converters[{converter, op, input, output | error{cls, msg}}]`. Produced: `IValueConverter<T>`
(`toValue(string, INode | null)`, `toString(T)`), `TokenSource`, `INode`, `Strings`, converter classes
above, the declarative service base class for T13 (`ElkGraphValueConverterService`) and T15/T16
(`getConverter(lexerRule)`), `ValueConverterException.getMessage()` including the cause-message rule.

## Acceptance criteria
- Given each T2 converter row for `STRING`/`INT` and the `toValue` rows for `ID`, when replayed, then
  output text or error class+message equals the recording.
- Given `IDValueConverter.toString` with a test-local `TokenSource` double (a regex tokenizer satisfying
  the contract), then `"a b"` throws the invalid-characters message, `"node"` yields `^node` for a
  keyword set containing it, `""` and `null` throw `ID may not be empty.` / `ID may not be null.`.
  Rows that need the real ANTLR lexer are replayed in T13 against `ElkGraphLexer` (this task cannot
  import `src/graph/text`).
- Given `Strings.split("a..b.", ".")`, then `["a","","b"]` (source lines 181-208).

## Quality bar
README gates; TDD from T2 rows and the Java source; `npm run complexity` clean on the new files (split
at Java method boundaries only); no `process`/Node built-ins.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No OpenJDK/Guava/ANTLR-runtime source (AD-9, stop 5); Xtext/EMF EPL only. Do not edit `src/java/**` (add
shims in the right task, or journal). Do not import `src/graph/**`. The agent does not commit; the
orchestrator commits per task.
