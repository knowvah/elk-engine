<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: live read-only proof and docs

One task, run by the orchestrator, after batch 1.

| Task | Writes | Status |
| ---- | ------ | ------ |
| [T2](T2-live-proof-and-docs.md) | `docs/conformance.md`; `docs/architecture/elk-upgrade.md`; `docs/architecture/elk-json-text.md`; `tools/oracle/README.md` (only if D5's check says so); `decision-journal.md` | [x] |

Done when T2's acceptance criteria hold and it is committed as
`docs(T2): say the oracle rebuild keeps the vector cache` (unsigned, `-F <file>`), followed by
`docs(plans): mark batch 2 done`.
