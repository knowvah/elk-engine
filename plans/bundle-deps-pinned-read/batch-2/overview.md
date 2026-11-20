<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: `sync-sources.sh` presence check

One task, after batch 1 (sequenced only to keep one executor and one commit per task; no file overlap).

| Task | Writes | Status |
| ---- | ------ | ------ |
| [T2](T2-sync-sources-guard.md) | `tools/melk/sync-sources.sh`; `test/melk/sync-sources.test.ts`; `decision-journal.md` | [x] |

Done when T2's acceptance criteria hold and it is committed as
`fix(T2): let sync-sources run on any checkout holding the pin`, followed by `docs(plans): mark batch 2 done`.
