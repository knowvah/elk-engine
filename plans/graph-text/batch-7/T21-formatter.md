<!-- SPDX-License-Identifier: EPL-2.0 -->

# T21 — `ElkGraphFormatter`

**Agent:** typescript-pro · **Commit:** `feat(T21): port the elkgraph formatter line by line`

## Context
D10/G1: the formatter is ported line by line on the minimal T12 `formatting2` subset so that serialising
with `format()` is byte-exact against the oracle. T22 adds it to `serialize`. Evidence: T5 `formatted` rows.

## Task
Source: `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/formatting2/ElkGraphFormatter.xtend`.
1. `ElkGraphFormatter.ts`: the Xtend `dispatch` methods become one class with the Java method names and a
   type switch (`instanceof` ladder over ElkNode, ElkEdge, ElkPort, ElkLabel, ElkEdgeSection, ElkBendPoint,
   `ElkPropertyToValueMapEntryImpl`; translation-rules §8 dispatch row). The grammar-access names
   (`rootNodeAccess.graphKeyword_1_0`, ...) map to T12's grammar element handles for the same grammar positions
   (the generated `ElkGraphGrammarAccess.java` in `src-gen/.../services/` is the index; T19 defines them).
   Constants (`:38-40`): `new_lines = setNewLines(1, 1, 2)`; `one_space`, `no_space`, `new_line` come from
   the formatting extension (T12). Cite per method:
   - `format(ElkNode)` `:44-73`: root (`parent === null`) -> `graph` keyword `append(one_space)`, identifier
     assignment `append(new_lines)`; else `node` keyword `append(one_space)` and `interior(`{`
     `prepend(one_space).append(new_line)`, `}`, indent`)`; `regionFor.keywords(':', ',')` -> `prepend(no_space).append(one_space)`;
     then `formatShapeLayout`, properties, then children / contained edges / ports / labels each
     `append(new_lines).format` in that order.
   - `format(ElkEdge)` `:75-96`, `format(ElkPort)` `:98-113`, `format(ElkLabel)` `:115-130`.
   - `format(ElkEdgeSection)` `:132-169` — both forms: no identifier (single section without keyword:
     four assignments `append(new_line)`, `|` keywords spaced) vs identifier (`section` keyword,
     `->`, and `hasAtLeastOneProperty` `:171-178` branch: bracket interior + assignments vs empty `[ ]`
     with `prepend(one_space)` / `prepend(no_space)`); `bendPoints.lastOrNull.append(new_line)` `:166`.
   - `format(ElkBendPoint)` `:180-182`; `format(ElkPropertyToValueMapEntryImpl)` `:184-191`: **last property of
     its container gets `new_lines`, others `new_line`** (index comparison against `container.properties.size - 1`).
   - `formatShapeLayout` `:193-218`: `propCount` 0 / 1 / many branches (`x||y` set counts 1, `width||height` set
     counts 1); `formatEdgeLayout` `:220-234`: `sectionCount == 0` vs interior.
   Keep call order exactly: later `append`/`prepend` on the same region merge via T12's conflict rules, so
   reordering changes bytes.
2. Wire to T19's sequence stream through T12's `format(document)` entry point: `formatSerialized(root): string`
   in the test only (T22 owns the entry point) — a test-local helper
   `serializeFormatted(root) = render(formatter.format(sequence(root)))`.
3. Tests (first): all T5 rows with `formatted` byte-exact; error rows throw; unit tests per branch:
   `propCount` 0/1/2, edge with 0 and ≥1 sections, single vs named section, empty vs non-empty section,
   last-property `new_lines` vs `new_line`, nested nodes indentation, labels in ports/edges/labels.

## Write-set
`src/graph/text/formatting2/ElkGraphFormatter.ts` (colocated test implicit).

## Read-set
- `ElkGraphFormatter.xtend:15-234`; `src-gen/.../services/ElkGraphGrammarAccess.java` (element names); `ElkGraph.xtext:1-120`
- `src/xtext/formatting2/**` (T12), `src/graph/text/serializer/**` (T19)
- Xtext `formatting2/` (`regionaccess`, `internal`, `FormatterRequest`) only where T12's port leaves a gap
- `test/golden/refs/java/graph-text-write.json` (T5)

## Decisions
- [G1](../decisions.md#g1--writer-architecture) subset only (stop 8 otherwise); D10 byte-exact;
  [G2](../decisions.md#g2--writer-input-and-oracle-contract).

## Interface contract
Consumes T12 (`IFormattableDocument`-like with `regionFor.keyword/keywords/assignment`, `append/prepend`,
`interior`, `setNewLines`, `indent`), T19 stream. Produces `class ElkGraphFormatter` with
`format(root, document)` for T22's `serialize`.

## Acceptance criteria
- Given each T5 row with `formatted`, then serializer + formatter output equals the text byte for byte.
- Given a shape with only size set, then its layout section is written on one line; with position and size, on multiple lines with `indent`.
- Given an edge section with no properties, then it renders as `section s -> t [ ]` exactly per the vector.

## Quality bar
README gates; TDD from T5; `npm run complexity` clean (dispatch methods are short; `formatEdgeSection` is the longest: split at the existing if/else, keep method boundaries); `@see` with line ranges.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No formatting2 beyond the G1 subset (stop 8). No edits to T12/T19 files. Do not simplify or reorder the Java
calls. No OpenJDK/Guava source. Do not commit.
