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

## Observation: correction, proxy fragments and writer order in the notes above

- **Context**: T11 parse replay, T15 sequencer
- **Finding**: the `|n` fragment counter follows model traversal (nested children's edges first, sources before
  targets), not text order; only `references` are in text order, and `sources+=` indexes continue across repeated
  keys. The writer's element order (`FollowerSorter`, fragment declaration order) is node: id, children, ports,
  **edges, labels**, layoutOptions, x, y, width, height — the "labels, edges" order in the serializer note above is wrong.
- **Impact**: trust the T11/T15 rows over the earlier wording; D13 reproduces the traversal order.
- **Confidence**: High

## Observation: lazy resolution leaves precise inverse-list state

- **Context**: T12h (69 cases x load/access/resolve/export)
- **Finding**: at load each proxy holds the edge in its inverse list (`addUnique`); an access-only `get(i)` replaces
  the slot with no inverse add on the target and the replaced proxy keeps the edge; export matches access-only;
  `resolveLazyCrossReferences` (`setUnique`) moves the edge from the proxy to the target (repeated references are
  added twice; a self-loop appears in both lists). Reference-less `indexOf` scans proxies only when `hasProxies()`.
- **Impact**: any change to `EObjectWithInverseResolvingEList` must keep `graph-json-text-inverse.json` green.
- **Confidence**: High

## Observation: diagnostic lines (node model) differ from token lines (ANTLR)

- **Context**: T12f `link-cr-line-numbers`, `fix(T11)`
- **Finding**: Xtext diagnostics count lines by the node model (LF, lone CR and CRLF break lines); ANTLR token rows
  count LF only (`a\rb` -> `b` at line 1, required by the 554 frozen token rows). The shared runtime takes a
  `LineSource`; `.elkj` uses the node-model one. `.elkt` has no bare-CR diagnostic vector, so it likely carries the
  old deviation.
- **Impact**: record a 4b bare-CR diagnostic vector before touching `.elkt` lines.
- **Confidence**: High for `.elkj`; Medium for `.elkt` (inferred, no vector)

## Observation: `.elkj` registers `EObjectValidator` once through the registrar's null branch

- **Context**: T4 validate rows, T14
- **Finding**: `EValidatorRegistrar.register` with no registry validator builds a fresh composite whose
  `initDefaults` adds one `EObjectValidator`; `.elkt`'s registry default adds a second. The 4b port had dropped the
  `null` branch because `.elkt` always held a default.
- **Impact**: `.elkj` reports each EMF constraint once, `.elkt` twice; both are recorded.
- **Confidence**: High

## Observation: oracle sweep cost and nondeterminism sources

- **Context**: T17
- **Finding**: the Xtext serializer costs 30 to 1,100 CPU-seconds per corpus graph; serial GC uses ~3.5x less CPU
  than G1 on a shared machine. Xtext error messages embed the output URI, which made two sweep runs differ until
  `ElkjSweep.java` normalised the directory. Of 351 sampled graphs 7 fail `convert` and 29 more fail `write`
  (missing or duplicate ids: no id generator on the write path).
- **Impact**: size-capped sweep (D2 amendment); a nondeterministic verdict after a change usually means another
  environment-dependent string in a diagnostic.
- **Confidence**: High

## Observation: vitest and EMF graphs, and the timing flake

- **Context**: T13, batch gates
- **Finding**: `expect(x).not.toBe(y)` on EMF graphs hangs (the failure message inspects a cyclic graph); tests use
  `===`. The intermittent full-suite failure is `ImportedNamespaceAwareLocalScopeProvider.test.ts` (5,000 lookups
  under 300 ms; 450 ms at load ~40), pre-existing from 4b; the 712 KB curated round trip needed an explicit 60 s
  timeout (5.4 s at load 26 against the 5 s default).
- **Impact**: do not treat these as defects of a change; capture full-run output to name a flaky test.
- **Confidence**: High

## Observation: `ElkGraphCopy` lacked EMF's bidirectional many-valued copy branch

- **Context**: T16b1/T16b2, oracle round-trip vectors
- **Finding**: `EcoreUtil.copy` on `sources: ["a","a"]` throws `IndexOutOfBoundsException: targetIndex=1, size=1`
  (`copyReference`: second `a` found at position 0 while index is 1, so `move(1, a)` on a size-1 list). The TS copy
  skipped the `indexOf`/`addUnique`/`move` branch. Ported in `ElkGraphCopy.ts`. 4b's `copyGraph` has the same gap (F3).
- **Impact**: unresolved-endpoint class is 27 (was 28) plus one `copy-failure`; check any other EMF copy port.
- **Confidence**: High

## Observation: round-trip recorder cost and transport artifact

- **Context**: T16b1
- **Finding**: `ElkjRoundTripVectors` costs about 2.8 CPU-hours, mostly the 712 KB `ptolemy_Trilateration_largest`
  (3.7 h wall alone); `elkj-vectors.sh` and the replay now take hours. The recorder reloads via `getBytes(UTF_8)`,
  so a lone surrogate becomes `?`; the test applies the same transport for `input-lone-surrogate-escape` only.
  `edgesBefore` flags all endpoints as proxies (lazy linking).
- **Impact**: use the `[cacheDir [idsFile]]` args for partial reruns; a lone-surrogate mismatch is transport, not port.
- **Confidence**: High

## Observation: `.elkt` cannot carry a repeated reference; the writer tests skipped the copy

- **Context**: follow-ups F3 + C2 (shared `src/graph/util/ElkGraphCopy.ts`), 2026-10-19
- **Finding**: the JVM `.elkt` reader rejects `edge a, a -> b` at link time ("Too many matches for reference to 'a'.
  Feature sources can only hold -1 references but found 1 candidate"), so `ElktWriteVectors` scenario files cannot
  record a repeated endpoint; the java scenarios use `((InternalEList) list).addUnique(x)` twice instead. Before this
  change, `ElkGraphSerializer.test.ts` and `ElkGraphFormatter.test.ts` serialized without the recorder's
  `EcoreUtil.copy`, so copy-stage failures were invisible to them.
- **Impact**: a writer vector whose JVM error comes from the copy needs `recordedErrorClass` (test helper) and a copied
  input. Separate, unfixed: `ElktWriteVectors.sectionWithoutIdentifier` builds its first node as `n` (via `node(root)`)
  while its header and the TS rebuild say `a`; it is an error row (class only), so no output differs.
- **Confidence**: High

## Observation: timing tests flake on efficiency cores, not on load

- **Context**: follow-up C5 (`ImportedNamespaceAwareLocalScopeProvider.test.ts` lookup budget)
- **Finding**: on this 12-core Mac (8 performance + 4 efficiency) the lookup loop takes ~85 ms on a performance core
  and 230–330 ms on an efficiency core (`taskpolicy -b <cmd>` reproduces it on demand); a vitest worker placed on an
  efficiency core failed the old 300 ms budget at load ≈ 8 while a separate probe stayed at 85 ms. Budget now 600 ms.
- **Impact**: size any wall-clock assertion for an efficiency core (~3–4x a performance core), and use
  `taskpolicy -b` to measure it rather than relying on load.
- **Confidence**: High
