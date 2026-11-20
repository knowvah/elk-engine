<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: docs and close-out

## Write-set

`docs/architecture/elk-upgrade.md` (lines 214, 228, 231-233, 625), `docs/architecture/deferred-bundles-adr.md`
(line 80), `plans/roadmap.md` (append only), `plans/bundle-deps-pinned-read/README.md` (summary, batch status),
`plans/bundle-deps-pinned-read/decision-journal.md`, `.agent-notes/bundle-deps-pinned-read.md`,
`tools/codeql/accepted.json` (only for an accepted finding, journaled).

## Steps

1. Docs per [D5](../decisions.md#d5-docs-scope): say what is true now. Line 214's comment: needs `$NEW` present in
   `$ELK_SOURCE_DIR`. Line 228's row: the new message, meaning `$NEW` is not fetched there; remedy: fetch it
   (maintainer) or point `ELK_SOURCE_DIR` at a checkout that has it. Lines 231-233: `--write` reads the manifests at
   `tools/oracle/ELK_COMMIT` from `$ELK_SOURCE_DIR`'s object store; drop the "#89 covers…" clause. Line 625: the
   regeneration test runs in both the clone and the original once each holds `$NEW`. ADR line 80: runs whenever the
   checkout contains the pin (since #89). Run `npx vitest run test/docs/elk-upgrade-runbook.test.ts` and
   `npx prettier --check` on both files. Commit `docs(T3): describe pin reads by object id`.
2. Queue gates 1-7 (README "Quality gates"); journal each with its numbers. Gate 7: `test/golden/refs/`,
   `tools/vectors/` and `tools/melk/sources/` diffs against the base are empty, and so is
   `git diff <base> -- test/architecture/bundle-deps.json`.
3. Append `## Revision 2026-MM-DD (bundle-deps-pinned-read)` to `plans/roadmap.md` in the form of earlier revisions:
   the reader change, the CLI now stamping the pin, the new skip rule and the stamp-equals-pin case, the
   `sync-sources.sh` guard, the proofs (counts with `../elk` and `../elk-oracle`, the negative proof), docs changed,
   issues filed. Never edit an earlier line.
4. `.agent-notes/bundle-deps-pinned-read.md` for anything novel (at least: no pin-stamped tool needs the checkout at
   `HEAD` any more; the deferred-bundles-adr archive recipe is no longer needed). Never edit an earlier notes file.
5. Mission summary at the end of `README.md`; mark all batches `[x]`. Squash per README "Landing"; journal the tag and
   the commit. Comment on #89 with the summary (do not close it; it closes when the branch merges).

## Acceptance criteria

- Given gates 1-7, when T3 ends, then all are green and journaled with their numbers.
- Given the branch, then exactly one commit sits on the base, footer `Refs: #89`, and the tag
  `bundle-deps-pinned-read/pre-squash` holds the per-task history.
- Given `plans/roadmap.md`, then only appended lines differ from the base.
- Given `grep -n '#89' docs/architecture/elk-upgrade.md`, then no line says the check is skipped off-pin.

## Observability

N/A.

## Rollback

Reversible: `git reset --soft` to the base undoes the squash; the tag keeps the history.
