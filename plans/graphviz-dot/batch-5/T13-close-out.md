<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13: close-out, issues, gates, squash

**Owner:** orchestrator. **Budget:** 75 min.

## Steps

1. Journal one `omission` row per D1 omission, with its reason.
2. `gh issue create --label follow-up`: "graphviz: port alg.graphviz.layouter (#95 step 3) and the end-to-end suite" (D11).
   The body has the scope left, what landed for it (`GraphvizDot`, `DotExporter` with `protected` members for
   `LayoutDotExporter`, the D4 error-text note), "Blocked by #177", and knowvah/dot-engine#220 for
   step 5. Do not add `queue:ready`.
3. Comment on #173 with the six new non-stamping programs (D7). Comment on #95 with the brief path, what landed, and the new
   issue number. Leave the labels on #95 alone.
4. Append `## Revision <date> (graphviz-dot)` to `plans/roadmap.md` (never edit an earlier line). Write
   `.agent-notes/graphviz-dot.md` for anything novel (Xtext autowrap behaviour, DOT converter facts, oracle classpath facts).
5. Queue gates 1-7 on the final tree, in order, and journal each result with numbers:
   `npm run format:check`; `npm run typecheck`; `npm run complexity` (read the report); `npm run coverage` (detached, polled;
   90/90/90/90 totals; journal the new files' own figures, since per-file gating is #146); `npm run docs:build`; `npm run codeql` (journal each new
   `accepted.json` entry); then rerun `tools/vectors/dot-vectors.sh test/golden/refs/java`,
   `tools/vectors/elkt-vectors.sh test/golden/refs/java` and `tools/oracle/regen-elkt-refs.sh`, and run
   `git diff --exit-code test/golden/refs/` against the base apart from the six new `graphviz-dot-*.json` refs.
6. Fill the README's batch table and add a `## Mission summary (<date>)` section (result, landed, not as planned, decisions,
   gates, issues, planning lesson), as `plans/spore-recursion-depth/README.md` does.
7. Squash: `git tag graphviz-dot/pre-squash`; `git reset --soft <base>`; one commit with
   `git -c commit.gpgsign=false commit -F <file>`:

   ```text
   feat(graphviz-dot): port the alg.graphviz.dot bundle

   <why, ≤ 80 columns: step 2 of #95; the writer follows graph-text G1; the
   xtext autowrap path is ported for GraphvizDotFormatter; evidence is six
   jvm refs written before the code plus the local export sweep>

   Refs: #95
   ```

   No attribution lines (the queue rules). Never push.

## Acceptance criteria

- Given the final tree, when queue gates 1-7 run, then each passes, and the journal holds each command's result.
- Given `git log <base>..HEAD`, when read, then there is exactly one commit, with footer `Refs: #95`, and the tag
  `graphviz-dot/pre-squash` holds the per-task history.
- Given the issue tracker, when read, then the `follow-up` issue for step 3 exists and #95 and #173 have the comments.

**Observability:** N/A. **Rollback:** reversible: `git reset --hard graphviz-dot/pre-squash` is the maintainer's choice, not
the executor's.
