<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 10 — Docs, roadmap, summary, 7g and 7h hand-offs

One task, **serial**, orchestrator only. T19 writes the evidence into the documents (append-or-extend, never rewrite), appends the
roadmap revision whose hand-offs bind 7g and 7h, and fills the README's mission summary. It also collects the mission-end gate runs
the README lists (Java baseline end run for stop 18, byte-identity of the vector scripts, `melk:generate`, `regen-goldens.sh`, the
stride-1 sweep) so the summary quotes measured numbers. Then stop 14: regroup into at most five commits and hand the user the landing
commands.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T19 | Docs, roadmap, notes, summary, regroup hand-over ([brief](T19-docs-and-roadmap.md)) | orchestrator (main session) | docs/architecture/{alg-layered-labels,alg-layered,overview}.md, docs/conformance.md, plans/roadmap.md, .agent-notes/layered-labels.md, plans/layered-labels/README.md | T18 | [x] |

The batch is done when `npm run docs:build` is green, `npm run format:check` is clean and every README gate has a measured result in
the journal. The mission ends at stop 14: nothing is signed, pushed, opened or merged by the executor.
