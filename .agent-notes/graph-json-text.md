<!-- SPDX-License-Identifier: EPL-2.0 -->

# Agent notes — graph-json-text (mission 4c)

## Observation: the `.elkj` standalone setup does not register the ElkGraph EPackage

- **Context**: T1–T5 JVM recorders
- **Finding**: `ElkGraphJsonStandaloneSetup.doSetup()` leaves `ElkGraphPackage` uninitialised; the first load fails
  with `Unresolved proxy http://www.eclipse.org/elk/ElkGraph#//ElkNode` unless `ElkGraphPackage.eINSTANCE` is touched
  first. Until `doSetup()` runs, `createResource(*.elkj)` returns null.
- **Impact**: every JVM harness or recorder for `.elkj` touches the package first; the TS port is unaffected.
- **Confidence**: High

## Observation: `.elkj` lexing differs from `.elkt` in recovery and keyword handling

- **Context**: T2 lexer rows, T3 parse rows
- **Finding**: `10.` → `<invalid>"1"`, `<invalid>"0"`, `ANY_OTHER "."` (two error tokens, unlike `.elkt`); `1ex` →
  `<invalid>"1e"` + keyword `'x'`; `-.5` → `ANY_OTHER '-'`, `ANY_OTHER '.'`, `SIGNED_INT`. Known keys lex as keyword
  tokens in all three spellings, so any string value or reference equal to a quoted keyword (`"id"`, `"x"`, `"text"`,
  `"children"`) is a syntax error — real ELK JSON with `sections` (`"id"`, `"x"` inside unknown members) fails.
  `x`/`y` bare are keywords. Bare dotted keys, `null` values and comma-less members are syntax errors.
- **Impact**: T8 follows the rows, not the 4b lexer; tier-2 ELK JSON inputs with sections parse with errors.
- **Confidence**: High

## Observation: `.elkj` linking is lazy but eager resolution reproduces it

- **Context**: T3 (439 rows), T4
- **Finding**: no linking diagnostic at load; `sources`/`targets` are proxies with fragments `|n` (document-order
  counter). Resolving yields the same list whether references are touched in model order first or not: containment
  order (nested children's edges before the node's own edges; sources before targets). Duplicate ids resolve to the
  first in containment pre-order (node before its own ports) with no diagnostic; references to labels/edges are plain
  unresolved references (scope `ElkConnectableShape`); `"a.b"` never resolves (qualified-name conversion). The
  parse-only export throws a message-less `NullPointerException` at the first unresolved reference in **exporter**
  order (root edges before nested ones), leaving exactly that one diagnostic.
- **Impact**: D11 B holds; T12/T13 must compute the export-time diagnostic in exporter order.
- **Confidence**: High

## Observation: `.elkj` property keys keep their quotes when unknown

- **Context**: T2 `Document` rows, T3 `prop-*`
- **Finding**: an unknown quoted key becomes a `Property` whose id includes the quotes (`"custom.key"`) with a
  `LayoutOptionProxy` value; known quoted keys resolve by suffix to `LayoutOptionData` and typed values; unparsable
  known values become proxies. Duplicate keys keep both entries at parse time; validation reports
  `org.eclipse.emf.ecore.14` once per collision (`EObjectValidator` registered once, unlike `.elkt`). No
  `LayoutOptionValidator` runs for `.elkj`.
- **Impact**: T9/T13/T14 follow these rows.
- **Confidence**: High

## Observation: the `.elkj` serializer is slow, lossy, and its output often does not reparse

- **Context**: T1 `convert`, T5 write rows
- **Finding**: Xtext's stack-pruning PDA search makes `serialize`/`save` cost seconds of CPU for a 2-node graph and
  15–200 s per small corpus model under load; T5's 126 cases took ~1 h on 8 threads (one injector per thread; Xtext
  caches are not thread-safe). `unformatted == formatted` and `save(EMPTY_MAP) == serialize(copy)`. Each list entry is
  written under its own keyword; element order is fixed per rule (node: id, children, ports, labels, edges,
  layoutOptions, x, y, width, height). Edge sections and KVectorChain/List values throw; known keys print as bare
  dotted suffixes, null values as `null`, NaN/hex/`4.9E-324` and unescaped quotes — none reparse.
- **Impact**: `convert` needs `ELK_SWEEP_TIMEOUT_MS=0`; a corpus-wide convert/write is many CPU-hours; tier-1 files
  carry syntax errors (presence-only, D6). Keep recorded graphs tiny.
- **Confidence**: High
