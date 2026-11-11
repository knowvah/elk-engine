<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Layered golden set (`regen-goldens.sh --set layered`)

**Agent:** build-engineer (sonnet) · **Commit:** `test(T3): add layered goldens per direction and hierarchy mode`
Scratch: `$TMPDIR/7h/T3/`.

## Context

Mission 7h, H4. Issue #36 asks for "a layered golden per direction and per hierarchy-handling mode equal to the oracle".
`tools/oracle/regen-goldens.sh` has two sets (`default` → `refs/elk`, `algorithms` → `refs/elk-algorithms`). `run.sh` passes
each golden's `variant` to the harness (`tools/oracle/harness/GraphOverlay.java`), with the variants defined in
`test/corpus/variants.json` (never edited, because `tools/corpus/sweep.ts:120-151` enumerates them). `run.sh` sets no
`-XX:hashCode`. Every vector and sweep since 7b does, so the new set exports it.

## Task

1. Add a set `layered` to `regen-goldens.sh` (`select_set`): `MANIFEST=test/golden/layered.json`, `REFS_NAME=elk-layered`,
   `VENDORED_DIR=test/golden/inputs/pipeline`, and
   `export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:+$JAVA_TOOL_OPTIONS }-XX:+UnlockExperimentalVMOptions -XX:hashCode=2"`
   for this set only. `write_meta` adds `"jvmFlags": "-XX:hashCode=2"` only for this set. Update the usage comment. The
   `default` and `algorithms` paths stay byte-for-byte as they behave today.
2. `test/golden/layered.json`: 24 entries, the four models of `test/corpus/manifest.json` (same `path`s) × `direction-right`,
   `direction-left`, `direction-down`, `direction-up`, `hierarchy-include`, `hierarchy-separate`. Ids are
   `<manifest id>--<variant>`, `algorithm` is `org.eclipse.elk.layered`, there is no `retarget`, and each `note` names the cell.
3. Run `tools/oracle/regen-goldens.sh --set layered` (detached, `nice`, after an `uptime` check) and commit the 24 refs plus
   `_meta.json`. Then run `regen-goldens.sh` and `--set algorithms`: `git diff --exit-code test/golden/refs/elk test/golden/refs/elk-algorithms`.
4. Evidence: run the 24 cases once more through `run.sh` **without** the flag, into scratch, and journal per id whether the output
   is byte-equal to the ref (H4). Do not commit that output.

## Write-set

`tools/oracle/regen-goldens.sh`, `test/golden/layered.json`, `test/golden/refs/elk-layered/**`.

## Read-set

`tools/oracle/regen-goldens.sh` (whole, 197 lines), `tools/oracle/run.sh:20-30,95-115`, `test/corpus/{manifest,variants}.json`,
`test/corpus/corpus.ts:50-95` (entry guard: the TS loader T10 reuses), `decisions.md` H4.

## Interface contract (consumed by T10)

`test/golden/layered.json` uses `{ golden: GoldenEntry[] }` in the `corpus.ts` shape. The refs are
`test/golden/refs/elk-layered/<id>.json`, and `_meta.json` carries `jvmFlags`.

## Acceptance criteria

- Given `--set layered` run twice, when compared, then the refs are byte-identical.
- Given `regen-goldens.sh` and `--set algorithms`, when run after the edit, then `refs/elk` and `refs/elk-algorithms` are
  byte-identical to HEAD.
- Given the manifest, when loaded by `corpus.ts`'s guard, then every variant is known and there are 24 entries.
- Given `shellcheck -x tools/oracle/regen-goldens.sh`, then it is clean.

## Observability / Rollback

The harness timing line on stderr, and the H4 evidence table in the journal. Reversible: revert the commit.
