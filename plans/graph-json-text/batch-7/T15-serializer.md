<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — Serializer: transient values, semantic and syntactic sequencers, grammar access, token writer

**Agent:** typescript-pro · **Commit:** `feat(T15): add the grammar-specific elkj serializer sequencer`

## Context
D3 / carried G1: no port of Xtext's generic NFA sequencer. One sequencer method per grammar rule, emitting assignments
in the order fixed by the constraint comments of the generated `AbstractElkGraphJsonSemanticSequencer` (`src-gen/
.../serializer/`); `ElkGraphJsonSemanticSequencer.xtend` and `ElkGraphJsonSyntacticSequencer.xtend` are empty
extensions; the generated syntactic sequencer decides unassigned tokens (which spelling of each key keyword, the
commas). `ElkGraphJsonTransientValueService.xtend` makes `incomingEdges`, `outgoingEdges`, `incomingSections` list-
transient (else `LegacyTransientValueService`). Cross references serialize as the target's identifier through the
T10 name provider and the `STRING` converter. 4b precedent: `src/graph/text/serializer/*` (sequencer, token writer,
grammar access, cross-reference serializer).

## Task
1. `serializer/` files mirroring 4b's split, `.elkj`-specific: grammar access (keyword spellings as the generated
   syntactic sequencer chooses them), transient-value service, semantic sequencer (one method per rule), syntactic
   sequencer, token writer (unformatted output), cross-reference serializer, serialization error class (port-local,
   `Error` subclass, listed in the exception fitness test — that test file is T15's to update for this one entry).
2. Graphs the grammar cannot express follow the T5 rows (output or error, presence for errors).
3. Tests: replay every T5 row's `unformatted` output (token sequence equal; byte-exact where the spacing rule is
   reproducible — journal which), error rows by presence, and the T5 Java scenarios rebuilt in TS.

## Write-set
`src/graph/json/text/serializer/**` (+ tests), `test/architecture/exception-hierarchy.fitness.test.ts` (one entry).

## Read-set
`src-gen/.../serializer/*`, upstream `serializer/*.xtend`, `src/graph/text/serializer/*.ts`, T5/T9/T10 contracts.

## Interface contracts (outputs)
`serializeUnformatted(graph)` / the token stream API the formatter consumes (push-forward names, as 4b's), consumed
by T16.

## Acceptance criteria
- Given every T5 row, when serialized without formatting, then the tokens equal the recorded `unformatted` tokens.
- Given a graph with a node incident to edges, when serialized, then `incomingEdges`/`outgoingEdges` are not written.
- Given a recorded serializer error row, when serialized, then the port fails too (presence).

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
