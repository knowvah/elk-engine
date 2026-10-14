<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — ELK value converters and `ElkGraphQualifiedNameConverter`

**Agent:** typescript-pro · **Commit:** `feat(T13): port elkgraph value converters and qualified name converter`

## Context
`ElkGraphValueConverterService` is what the parser (T15) and the linker (T16) call for every converted token;
the four ELK converters decide how numbers, property keys (via the layout-option registry) and property values
(strings, qualified ids, numbers, booleans, `LayoutOptionProxy`) become model values and back (the writer, T19,
uses the `toString` directions). All run on the CoreOptions-only registry (G3/C8: `LayoutMetaDataService.getInstance()`).
Ported line by line from Xtend (`docs/translation-rules.md` section 8 for `==`, `?:`, `=>`, lambdas).

## Task
Layout `src/graph/text/{conversion,naming}/`, one class per file, Java/Xtend names, `@see` to the `.xtend`
(`../elk/plugins/org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/...`). Injection becomes constructor
parameters; the converters take the T7 `TokenSource` (built from `tokenize` of T9) and the keyword set
`ELK_GRAPH_KEYWORDS` (T9) where they build their `IDValueConverter` (`rule = grammarAccess.IDRule` = the `ID`
terminal rule: pass an `AbstractRule` with name `ID`, `isTerminalRule() = true`).
1. `naming/ElkGraphQualifiedNameConverter.ts` (`ElkGraphQualifiedNameConverter.xtend:25-53`): `DELIMITER = '.'`
   (27); `toQualifiedName` (38-45): null -> `IllegalArgumentException("Qualified name cannot be null")`, empty ->
   `("Qualified name cannot be empty")`, then `Strings.split(text, DELIMITER).map[idValueConverter.toValue(it,
   null)]` and `QualifiedName.create(list)` (empty list -> `EMPTY`); `toString(name)` (47-52): null -> IAE
   `"Qualified name cannot be null"`, else `segments.map[idValueConverter.toString(it)].join('.')` (the ID converter's
   exceptions propagate; `EMPTY` yields `""`).
2. `conversion/NumberValueConverter.ts` (`NumberValueConverter.xtend:21-41`): `toString` (23-30): `null` ->
   `ValueConverterException("Double value may not be null.", null, null)`; `Math.floor(value) == value` ->
   `Integer.toString(value.intValue)` (`intValue` = saturating `JavaMath.d2i`, `src/java/lang/JavaMath.ts:91`: so
   `1e10` prints `2147483647`, `-0.0` prints `0`, `±Infinity` print `2147483647`/`-2147483648` if the `==` holds);
   else `value.toString` (`DoubleToString.toString`). **Settle the `==` semantics from the generated Java, not
   from a guess:** Xtend compiles `double == Double` either to a primitive compare (NaN: false -> prints `NaN`) or
   to `Double.equals` (NaN: true -> prints `0`); read
   `$ELK_ORACLE_DIR/plugins/org.eclipse.elk.graph.text/xtend-gen/.../conversion/NumberValueConverter.java` (ELK EPL
   build output; path per T5) and check against the T2 `NaN`, `-0.0`, `±Infinity` rows. `toValue` (32-40):
   `string.nullOrEmpty` -> `ValueConverterException("Cannot convert empty string to a double value.", node, null)`;
   `Double.valueOf(string)` = `JavaDouble.parseDouble` (trims, accepts `NaN`, `Infinity`, hex floats, `d`/`f`
   suffix); `NumberFormatException` -> `ValueConverterException("Cannot convert '" + string + "' to a double
   value.", node, e)` — the diagnostic text the parser reports is the **cause's** message
   (`ValueConverterException` ctor and `AbstractInternalAntlrParser.getValueConverterExceptionMessage` 477-485,
   [T15](../batch-4/T15-parser.md)): keep `cause` = the shim's `NumberFormatException`.
3. `conversion/PropertyKeyValueConverter.ts` (`PropertyKeyValueConverter.xtend:28-75`): `toString` (39-58): null
   -> VCE `"IProperty value may not be null."`; `Strings.split(value.id, '.')`; loop `i = size-1 .. 0`
   building `suffix` (`idValueConverter.toString(seg)` prepended with `'.'`), `getOptionDataBySuffix(suffix)`,
   return `suffix` when `knownOption != null && (knownOption.group.nullOrEmpty || suffix.contains(knownOption.group))`
   (54-55); after the loop `split.map[toString].join('.')`. `toValue` (60-74): `string.nullOrEmpty` -> VCE
   `"Cannot convert empty string to a property identifier."`; `idSuffix = split(string).map[idValueConverter
   .toValue(it, node)].join('.')`; `getOptionDataBySuffix(idSuffix)` null -> `new Property<Object>(string)` with the
   **verbatim** `string` (not `idSuffix`; not registered); else the `LayoutOptionData`.
4. `conversion/PropertyValueValueConverter.ts` (`PropertyValueValueConverter.xtend:31-98`), all branches:
   `toString` 35-56 (proxy -> its `toString`; `null` -> `'null'`; integral `Double` -> `Integer.toString(intValue)`;
   `Boolean | Number | Enum` -> `toString`; `String`: the literals `true|false|null` verbatim, else
   `Double.parseDouble` success -> verbatim, `NumberFormatException` -> `quoteIfNecessary`; any other object ->
   `v.toString.quoteIfNecessary`). TS has one `number` type: a Java `Integer` prints identically to an integral
   `Double` within int range, so the single `typeof v === 'number'` arm is exact (write this in the class
   comment); `bigint` -> `toString`; enums/`EnumSet`/`KVector`/`ElkPadding` through their `toString`.
   `quoteIfNecessary` 58-65: `QualifiedName.create(Strings.split(s, '.'))` -> `qualifiedNameConverter.toString`;
   `ValueConverterException` -> `'"' + s + '"'` (no escaping; `""` yields `""` via `EMPTY`). `toValue` 67-79:
   `!nullOrEmpty && != 'null'` else `null`; `unquoteIfNecessary` 81-89 (length >= 2 with matching `"…"` or `'…'`
   -> inner text **without** unescaping; else length >= 1 with `Character.isJavaIdentifierStart(first) ||
   startsWith('^')` -> `toQualifiedName(s).toString('.')`; else `s`); node branch: `node?.semanticElement
   instanceof ElkPropertyToValueMapEntryImpl` -> `entry.key.toLayoutOption` (`LayoutOptionData` itself, or
   `LayoutMetaDataService.getInstance().getOptionData(key.id)`, 91-96) -> `option?.parseValue(unquoted)`;
   non-null wins, else `new LayoutOptionProxy(unquoted)`.
   `Character.isJavaIdentifierStart`: no shim exists and OpenJDK is off limits (AD-9). The lexer (T9) only emits
   ASCII-start tokens for these rules (`RULE_ID` is ASCII; strings start with a quote; numbers with a digit or
   sign), so from `.elkt` only the ASCII set is reachable: implement it exactly (`A-Za-z`, `_`, `$`), and for
   code units >= 0x80 the Javadoc definition via `/[\p{L}\p{Nl}\p{Sc}\p{Pc}]/u` (Javadoc: letter, letter-number,
   currency symbol, connector punctuation), as a private function with that reasoning in a comment. A T2 row that
   disagrees is a stop-7 case, not a patch.
5. `conversion/ElkGraphValueConverterService.ts` (`ElkGraphValueConverterService.xtend:23-64`): extends T7's
   `DefaultTerminalConverters`; registers `Number` -> `NumberValueConverter`, `PropertyKey` ->
   `PropertyKeyValueConverter`, `StringValue`, `QualifiedIdValue`, `NumberValue`, `BooleanValue` -> the one
   `PropertyValueValueConverter` instance (as the Xtend fields do: shared instances), plus the inherited `ID`
   (`IDValueConverter` over `ELK_GRAPH_KEYWORDS`, rule `ID`), `INT`, `STRING` and the datatype rule `QualifiedId`
   (T7's EFactory identity converter). Rule table (`ElkGraph.xtext:92-114`): `Number`, `QualifiedId`, `PropertyKey`
   Key`, `StringValue`, `QualifiedIdValue`, `NumberValue`, `BooleanValue` are datatype rules; `ID`, `INT`, `STRING`,
   `SIGNED_INT`, `FLOAT` terminals. Unknown rule names resolve to the no-op converter (T7).
6. Tests: replay the T2 `converters` rows for `NumberValueConverter`, `PropertyKeyValueConverter`,
   `PropertyValueValueConverter`, `ElkGraphQualifiedNameConverter` and, deferred from T7, every `ID`/`STRING`/`INT`
   row that depends on the real lexer, with `tokenSource = tokenize` and the registry
   `LayoutMetaDataService.getInstance()`; for the `toValue`-with-node rows use a stub `INode` whose
   `getSemanticElement()` is an `ElkPropertyToValueMapEntryImpl` with its `key` set (the parser does the same:
   key is converted and set before the value is converted, `ParseRecords` in T15); `PropertyKey` rows compare
   `{class, id}` (`Property` vs `LayoutOptionData`), qualified names `{segments, text}`.

## Write-set
`src/graph/text/conversion/{ElkGraphValueConverterService,NumberValueConverter,PropertyKeyValueConverter,PropertyValueValueConverter}.ts`,
`src/graph/text/naming/ElkGraphQualifiedNameConverter.ts` (colocated `*.test.ts` implicit).

## Read-set
- The four Xtend files above (full), `ElkGraphQualifiedNameConverter.xtend`, `ElkGraph.xtext:92-114`, `ElkGraphRuntimeModule.xtend:30-49`
- `test/golden/refs/java/graph-text-lexer.json` (`converters`), `$ELK_ORACLE_DIR/plugins/org.eclipse.elk.graph.text/xtend-gen/` (Number/PropertyValue converters)
- `src/xtext/{conversion,naming,util}/**` (T7/T8), `src/graph/text/parser/{ElkGraphLexer,ElkGraphTokenType}.ts` (T9), `src/core/util/internal/LayoutOptionProxy.ts` (T10)
- `src/core/data/{LayoutMetaDataService,LayoutOptionData}.ts` (`getOptionDataBySuffix` 423, `getOptionData` 391, `getGroup`, `parseValue`), `src/java/lang/{JavaDouble,DoubleToString,JavaMath}.ts`, `src/graph/impl/ElkPropertyToValueMapEntryImpl.ts`

## Decisions
- [G3](../decisions.md#g3--option-registry-for-refs) · [G5](../decisions.md#g5--diagnostic-fidelity) · [G6](../decisions.md#g6--lexer)
- AD-13; translation-rules section 8; mission-3 C8 (registry); D10

## Interface contract
Produced for T15/T16/T19: `ElkGraphValueConverterService` implementing `IValueConverterService`
(`toValue(text, lexerRule, node)`, `toString(value, lexerRule)`, `getConverter(rule)`); the converters above;
`ElkGraphQualifiedNameConverter implements IQualifiedNameConverter` (consumed by T14/T16/T17 as the injected
converter). Rule names exactly those of `ElkGraph.xtext`.

## Acceptance criteria
- Given every T2 converter row of the four classes (plus the lexer-dependent `ID`/`STRING`/`INT` rows), when
  replayed, then output or `{cls, msg}` equals the recording (the TS error class name maps to the recorded Java
  `cls`; message text exact, incl. the cause-message rule).
- Given `NumberValueConverter.toString` of `NaN`, `-0.0`, `1e21`, `±Infinity`, then the strings equal the
  generated-Java behaviour recorded by T2 (the step-2 decision is journaled with the xtend-gen evidence).
- Given a property key `org.eclipse.elk.spacing.nodeNode`, then `toString` returns the shortest unambiguous
  suffix that satisfies the group rule, and `toValue("spacing.nodeNode")` returns the registered
  `LayoutOptionData`; an unknown key returns a fresh unregistered `Property` with the verbatim string.

## Quality bar
README gates; TDD from the T2 rows; `npm run complexity` clean (Xtend method boundaries; extract
`unquoteIfNecessary`/`quoteIfNecessary`/`toLayoutOption` as in the source); no regex per call in hot paths
(parse 253 KB budget: ~10^4 conversions).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No OpenJDK source (`Character`, `Double`); edit no vector or ref; do not touch `src/core/**` or `src/xtext/**`
(a missing helper is journaled and added in the owning task's scope or kept local). The agent does not commit;
the orchestrator commits per task.
