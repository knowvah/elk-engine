<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9: docs closure for F1, F2, F4, C1, C3, C6 (documentation-engineer)

**Goal:** every behaviour or layout batches 1–2 changed is described where readers look for it, with its evidence,
and the follow-up rows record their closing task.

## Inputs

The batch 1a/1b/2 journal rows (`decision-journal.md`) and the commits `T2`–`T8` (`git log --format=%s` on the branch;
cite task ids, never SHAs).

## Write-set

| File | Change |
|------|--------|
| `docs/conformance.md` | §8 (`.elkj`, ~line 460-495): F1 open item → closed with the replayed row counts; §7 (`.elkt`): converter rows and the lone-CR diagnostic lines; the proxy `toString` divergence note (D5) |
| `docs/translation-rules.md` | `~:560` node-model lines now apply to both text languages; a row for EMF `EFactory` datatype conversions (T4) |
| `docs/architecture/elk-text.md` | converter evidence (+33 rows), diagnostic lines, the line-source wiring |
| `docs/architecture/elk-json-text.md` | `:240` and `:303` (45 rows now replayed), C1 scope wiring, file map for C3 moves |
| `docs/architecture/elkgraph-model.md` | `:186` proxy suffix per D5 |
| `docs/architecture/port-map.md` | third-party table: a `src/equinox` row (Equinox `org.eclipse.core.runtime`, what Xtext calls) |
| `plans/elkgraph-model/decisions.md` | append an "Amendment (2026-10-20, user decision)" paragraph under D10 per D5 (append only) |
| `plans/graph-json-text/follow-ups.md` | Status column only: F1, F2, F4, C1, C3, C6 → `closed <date> (text-follow-ups T<n>)`; never delete a row |

## Read-set

- `decisions.md` (D5, D6, D7, D8); the journal rows of T2–T8
- The current text of every write-set file at the lines named above

## Rules

- State numbers from the journal and test output, not from memory; a number you cannot find is reported, not guessed.
- Prose typo carve-out and translation-rule style as the surrounding sections.
- Leave the F5 sweep and F6 round-trip paragraphs to T10/T11 (do not edit `conformance.md:491-492` or the sweep table).

## Acceptance criteria

- Given the merged tasks, then each changed behaviour (F1 rows, F2 lines, F4 proxy text, C1 wiring, C3 file moves,
  `src/equinox`) has one place in the docs that states it with its evidence.
- Given `follow-ups.md`, then only the Status cells of F1, F2, F4, C1, C3, C6 changed.
- Given the change, then `npm run docs:build` and `npm run format:check` pass.

## Observability / rollback

N/A (documentation). Reversible: revert the commit.

## Commit

`docs(T9): document the text follow-ups and close their rows`
