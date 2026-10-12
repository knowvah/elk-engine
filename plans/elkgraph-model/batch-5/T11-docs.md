<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Docs: translation-rules §5 and the port-map graph/core rows

**Agent:** documentation-engineer · **Commit:** `docs: record the elkgraph model port in the translation rules and port map`

## Context
`docs/translation-rules.md` §5 (EMF) still describes the model as a future port with MEDIUM
claims (EMap order, unique lists). After T9 those are proven by `graph.json`. The port map's
`graph`/`core` rows say "not ported" for things this mission ported as constants
(`ElkGraphPackage`) and do not mention `src/emf/`.

## Task
Rewrite in place (the file is capped at 500 lines; `translation-rules.md` is at 499, so replace,
never append):
1. §5 EMF: what `src/emf/` provides (D1/D2/D4 surface), where EMF source may be read (EPL-2.0,
   AD-9 contrast), the unique/inverse/containment contract and `EMap` order now HIGH (cite
   `test/golden/refs/java/graph.json` and `tools/vectors/GraphVectors.java`), type guards (D3),
   public constructors, `ElkGraphPackage` constants-only, `eClass().getName()`, D10 `toString`
   divergence, NPE → `TypeError`, `Cloneable` rule (D6), annotation registries (D7),
   `LinkedList` for `KVectorChain` (D8).
2. §6.7 or M5 reference: add `IllegalStateException`.
3. `docs/architecture/port-map.md`: `graph`, `graph.impl`, `graph.util`, `graph.properties` rows
   → delivered strategy per file class; add a `src/emf/` note under Conventions; `core.math`/
   `core.options` rows note the five + three classes delivered early (mission 2) with the rest
   pending; keep every count reproducible by the documented commands.
4. `docs/translation-rules-collections.md` is **not** in the write-set; if V1 wording must change,
   STOP 1 and say what.

## Write-set
`docs/translation-rules.md`, `docs/architecture/port-map.md`.

## Read-set
- `../decisions.md` (all), `../decision-journal.md` (every push-forward decision taken in T1–T10)
- `docs/translation-rules.md:299-338` (§5), `:401-423` (§6.7), `docs/architecture/port-map.md:113-180`
- `src/emf/**/*.ts` headers, `src/graph/**/*.ts` headers (what landed; no need to read bodies)
- `.agent-notes/elkgraph-model.md`

## Acceptance criteria
- Given §5, when read, then no "future mission"/"MEDIUM" claim about the model remains; every
  cited path exists (`ls` each); `translation-rules.md` ≤ 500 lines; no added prose line > 100 chars.
- Given the port map, then the `graph` rows name `src/emf/` and the constants-only
  `ElkGraphPackage`, and `grep -c 'not ported' docs/architecture/port-map.md` changes only for
  the rows this mission touched (journal the before/after counts).
- Given `npm run format:check`, then exit 0 (Prettier `proseWrap: preserve`).
- Given the docs site build (`npm run docs:build`, which includes these files via wrappers), then
  it still passes (the orchestrator runs it; dead links fail the build).

## Quality bar
README gates (format:check, docs:build by the orchestrator). No OpenJDK mention; EMF cited as EPL-2.0.

## Observability
N/A.

## Rollback
Reversible — revert the commit.

## Boundaries
Docs only; no code, no `CLAUDE.md` edits (the EMF row there already matches AD-11), no
`plans/` edits other than the journal row the orchestrator writes.
