<!-- SPDX-License-Identifier: EPL-2.0 -->

# Agent notes — grandom (mission 4f)

## Observation: a truncated multi-word keyword fails on its first character and re-lexes from the second

- **Context**: T1 lexer vectors (`grandom-lexer.json`, rows `kwp-*`, `kwc-*`)
- **Finding**: `cross-hierarchy` alone lexes as hidden `<invalid>` `"c"`, `RULE_ID` `"ross"`, `RULE_ANY_OTHER` `"-"`,
  `'hierarchy'` with `lexError`; `cross-hierarchy relative` is one `<invalid>` token over the whole text; `+/` is one
  `<invalid>` `"+/"`; `+ /-` is three `RULE_ANY_OTHER` tokens (`-` never has its own token). Only prefixes that
  contain a space or `-` fail; `bipartite` and `bipartitegraphs` are plain `RULE_ID`.
- **Impact**: T6's lexer must reproduce the ANTLR DFA's failure boundary per multi-word keyword, not a generic
  "longest keyword else ID" rule; the rows are the spec.
- **Confidence**: High

## Observation: `.elkr` numbers are `INT`-only; comments and whitespace have no surprises

- **Context**: T1 rows `num-*`, `cmt-*`, `ws-*`, `id-*`
- **Finding**: `1..` → `RULE_INT` `'.'` `'.'`; `1.2.3` → INT `.` INT `.` INT; `.5` → `'.'` INT; `1E5` → `RULE_INT`
  `"1"` + `RULE_ID` `"E5"` (no float or exponent token). `/* /* nested */ */` → one `RULE_ML_COMMENT` then
  `RULE_ANY_OTHER` `*`, `/`; unterminated `/*` → one hidden `<invalid>` `"/*"`; `\r\n` and `\r\r` are each one
  `RULE_WS`; `a.b` → ID `'.'` ID (`RULE_ID` has no dash or dot).
- **Impact**: the grammar's `Double`/`Float` values arrive at the parser as `INT '.' INT` token triples (D2).
- **Confidence**: High

## Observation: `shellcheck` without `-x` reports SC1091 on every `*-vectors.sh`

- **Context**: T1 acceptance (`shellcheck tools/vectors/elkr-vectors.sh`)
- **Finding**: the `# shellcheck source=tools/vectors/vector-cache.sh` directive is honoured only with `-x`; plain
  `shellcheck` prints an info-level SC1091 for `elkt-vectors.sh`, `elkj-vectors.sh` and `elkr-vectors.sh` alike.
- **Impact**: use `shellcheck -x` for a clean run; plain output with only SC1091 is the existing baseline.
- **Confidence**: High

## Observation: the generated `gRandom` model has no unsettable features and a few odd accessor names

- **Context**: T5 port of `src-gen/.../gRandom/*.java` and `impl/*Impl.java`
- **Finding**: `GRandom.ecore` carries no `unsettable` attribute; every `eIsSet` compares against the `_EDEFAULT`
  constant, so there is no `isSetX` state. Defaults: ints 0, booleans false, boxed `Integer`/`Double`/`String` null,
  `Configuration.format` = `ELKT`, `Ports.constraint` = `FREE`, `Flow.flowType` = `INCOMING`, `Flow.side` = `NORTH`,
  `Configuration.form` = `TREES`. Generated accessors kept verbatim: `isMW`/`isMD`/`isPF`, `getNEdges`, `getNNodes`,
  `getReUse`, `getStddv`, `isOutbound`, `isMinMax`. Only `Form` has literals that differ from names
  (`custom` → `graphs`, `bipartite` → `bipartite graphs`, `biconnected`/`triconnected`/`acyclic` + ` graphs`).
- **Impact**: a parse-dump `isSet` must be derived by default comparison; validator messages reference the ecore
  feature names `mW`, `mD`, `pF`.
- **Confidence**: High

## Observation: `GRandom` compound keywords lex by a rival-viability rule of the ANTLR `mTokens` decision

- **Context**: T6 lexer replay of all 433 rows against `InternalGRandomLexer.java`'s `mT__nn` `match("…")` sites
- **Finding**: for a keyword containing a space, `-` or `+/`, a rival rule (`RULE_ID`, or `RULE_ANY_OTHER` for the
  first character) stays viable while every consumed character is an ID character; a keyword-continuation
  character (the space in `self `, the `/` in `+/`) beats the rival. Once no rival is left the keyword is predicted;
  a mismatch emits `<invalid>` over the consumed text plus one recovered character (`self  loops` → `<invalid>`
  `"self  "` + `RULE_ID` `loops`); when several keywords remain (`cross-hierarchy ` prefix) a dead end emits
  `<invalid>` over the first character only and re-lexes from the second. After a full compound match nothing
  further is checked (`re-use1` → `'re-use'`, `RULE_INT`). Word keywords win only on an exact whole-ID match.
- **Impact**: `GRandomLexer.ts` needs no per-row special case; `cross-hierarchy relativex` and `self loopsx` are
  derived from the rule and not pinned by a vector.
- **Confidence**: High (433/433 rows); Medium for the two unpinned inputs

## Observation: `.elkr` parse diagnostics and conversion errors (JVM facts)

- **Context**: T2 `grandom-parse.json` (142 rows) and `grandom-validate.json` (23 rows)
- **Finding**: value-converter failures are `XtextSyntaxDiagnostic`s with code `Diagnostic.Syntax`, so the validator
  path cannot tell them from parser errors; the recorder tags them via an overridden
  `ISyntaxErrorMessageProvider` (message untouched). `Integer` conversion messages are JDK `NumberFormatException`
  text (`For input string: "2.5"`; `2.0` is an error too); the diagnostic spans the whole `INT '.' INT` text, and
  `1 . 5` converts the text `1 . 5` (spaces included). Bad string escapes: `Invalid escape sequence (valid ones are
  \b  \t  \n  \f  \r  \"  \'  \\ )` (double spaces) and `Invalid unicode`. Double overflow is not an error
  (`Infinity`, `1.0E10`). An unset `format` reads `elkt`; other unset enums are `null`. A UTF-8 BOM is not skipped
  (`missing EOF at '<BOM>'`). `missing X at 'tok'` diagnostics have length 1. Diagnostic lines count lone CR and
  CRLF as one break each (node model). Flows must be contiguous inside the `ports` group. Validator issues sit on
  the flag keyword (`maxWidth` length 8, `maxDegree` 9, `partitionFraction` 17); after a duplicate-member syntax
  error the recovered model keeps the first value and the validator still runs.
- **Impact**: the TS parser replays messages exactly for conversion errors and by presence for syntax errors (D2).
- **Confidence**: High

## Observation: `RandomGraphGenerator` seeding and option facts (JVM)

- **Context**: T3 `grandom-generate.json`
- **Finding**: `generate 0` still yields one graph (`max(1, samples)`); every sample draws from the one `Random`
  that `parse` already advanced (a sample is not a re-seed). `ConfigurationParser.parse` draws only for `ports`
  flow amounts (`toRandVal(quant).intVal(r)`; exact amounts draw nothing). `seed` is never stored in
  `GeneratorOptions` (`RANDOMIZATION_SEED` 0, `TIME_BASED_RANDOMIZATION` true). `format`/`filename` are accepted but
  never read. A `ports` block without `constraint` yields `PORT_CONSTRAINTS = FREE` (first enum literal), no
  `ports` block keeps `UNDEFINED`. `hierarchy { levels = N }` without `compound nodes` generates a flat graph.
  `makeGraph` mutates `HIERARCHY_CHANCE`/`CROSS_HIERARCHY_EDGES`, so options must be recorded from a separate
  `parse`. `RandVal.allNil()` is indistinguishable from `gaussian(0,0)` and consumes one `nextGaussian` per draw.
  `cross-hierarchy edges = 0` never reaches the unseeded shuffle, so it is seeded. `PARTITION_FRAC` default
  `exact(0.4f)` widens to `0.4000000059604645`.
- **Impact**: the TS `ConfigurationParser`/generator ports must preserve this draw order and these defaults.
- **Confidence**: High
