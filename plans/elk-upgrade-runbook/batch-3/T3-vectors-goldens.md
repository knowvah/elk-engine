<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: re-record vectors and goldens; metadata diff; TS suite in the clone

## Context

UP6 and UP7. At planning, 60 vector refs live under `test/golden/refs/java/` (163 MB), and 44 of them plus 10 golden
`_meta.json` carry the commit sha. Every recorder runs cold on a new oracle. The cold `elkj` run took about 4 h in
mission 4e.

## Task

Follow runbook sections 6-8 and 11 in the clone with `. "$R/env.sh"`.

1. Metadata (section 6): run `metadata-vectors.sh` first (short), then `npm run melk:generate`, then `git diff --stat src/`
   in the clone, then `npx vitest run test/melk`. Journal each result. Expect no generated-source diff and no
   `metadata.json` content diff.
2. Vectors (section 7): run every `tools/vectors/*-vectors.sh` with the runbook's arguments, each detached under
   `nice -n 10`, at most two at a time. Journal each script's start, end, wall time, exit code and output byte count.
   This feeds the runbook's cost table. Include the AWT remeasure (`--remeasure-awt "$R/awt"`): compare it with the
   committed `awt.json` as the text-sizing note says, and journal the TX1 re-proof (grep the `b715fb10` plugins for text
   measurement, expecting none).
3. Goldens (section 8): run every `regen-*.sh` and every `regen-goldens.sh --set` value.
4. Triage (section 11, UP6): journal the raw `git diff --stat test/golden/refs src` in the clone. Then normalize the sha
   in a throwaway copy, diff again, and journal the content diff file list, which planning expects to be empty. Classify
   every changed file. A content diff goes to stop condition 5 (diagnosis against both oracles; never a `src/` port).
5. TS suite in the clone: run `env $SWEEPS npm test` (the README's `SWEEPS` list), detached. Journal the counts. Classify
   every failure (stop condition 6): planning expects green, because the clone's refs now carry the clone's `ELK_COMMIT`.
6. Cap (UP7): if the re-record phase passes 10 hours of wall time, stop starting new scripts, let the running ones finish
   or kill them, and journal the unfinished list with an impact note (stop condition 8).

## Write-set

In the clone: `test/golden/refs/**`, `src/**` (only by `melk:generate`) and `$R/awt/`. In the queue worktree:
`plans/elk-upgrade-runbook/decision-journal.md` only.

## Read-set

`docs/architecture/elk-upgrade.md` §§ 6-8, 11; `tools/vectors/vector-cache.sh:1-30`; `.agent-notes/vector-cache-and-key-line.md`;
`.agent-notes/text-sizing-seam.md`; `decisions.md#up6`, `#up7`; `stop-conditions.md` items 5-8.

## Interface contracts

Input: `$R/env.sh` and the scratch oracle (T2). Output for T5: journal rows holding (a) a per-script cost table
(`script | ref | wall | exit | bytes`), (b) the raw and normalized diff lists with a class per file, and (c) TS suite
counts and failures with a class each.

## Acceptance criteria

- Given every vector and regen script, when each finishes (or the cap hits), then the journal holds its wall time and exit
  code, and the scripts not run are listed with the reason.
- Given the re-recorded refs, when the sha is normalized, then the journal lists every remaining diff with a class.
  "Clean" is claimed only if that list is empty.
- Given the clone, when `npm test` runs after the re-record, then the journal records pass and fail counts, with every
  failure classified.
- Given the queue worktree, when T3 ends, then `git status --short test/golden/refs src` there is empty.

## Quality bar

Diagnosis-mode artifact for every content diff. No number in the journal rests on an estimate; mark measured against
estimated.

## Observability requirements

N/A — journal rows only.

## Rollback notes

Reversible: everything written is in `$TMPDIR` and is deleted by UP9.
