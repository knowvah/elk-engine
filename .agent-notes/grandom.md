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
