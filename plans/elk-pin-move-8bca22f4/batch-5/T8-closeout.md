<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8: close-out

**Agent:** orchestrator. **Runbook:** §§ 12, 13. **Decisions:** D5, D7, D9.

## Task

1. **Prose that names the pin** (§ 13 step 2). Run `git grep -l e7eaea57 -- . ':!plans'`: `CLAUDE.md`, `NOTICE.md`, the
   pages under `docs/` and the translated pages under `docs-site/`. Change the sha where it names the current pin. A
   historical mention of the last move (`elk-upgrade.md` history, `.agent-notes/elk-pin-move-e7eaea57.md`, the
   `test/helpers/*` comments that say "since the e7eaea57 pin (#99)") stays.
2. **AD-2.** Append an amendment to the AD-2 row of `plans/elk-engine-skeleton/decisions.md` in the #99 form:
   `**Amended 2026-11-18 (maintainer ruling on #104):** …`, naming `8bca22f4…`, the five merged PRs from #104, and this
   journal. Do not edit any earlier line.
3. **Docs line references (D9)** in `docs/` (and in mirrored `docs-site/` pages) for the six changed Java files.
4. **Conformance and packing docs.**
   - `docs/conformance.md`: rewrite the PK7 entry (`:2075`) and the #79 entry (`:2091`) to their outcomes, along with
     the PK4 jitter entry (`:2097`) and the scanline reachability note (`:2055`, #1244).
   - `docs/architecture/alg-packing.md`: rewrite § 3.2 (PK4), § 3.5 (PK7), the #73 hazard in § 4, and the open-items table
     in § 5.
   - The layered docs: add the nested model-order refusal (#84) where the importer is described.
   - Run `npx vitest run test/docs` after the edits.
5. **Runbook** (§ 13 step 5). Replace the "Last move" paragraph and the "Cold" columns with this move's numbers. Add the
   D1 lesson to § 11: a recorder that copies Java code must follow it.
6. **Issues** (D7). Comment on #73 (the hang input terminates on the oracle and the port), #75 (640/640, lists retired),
   #84 (the case throws `UnsupportedConfigurationException` on both sides), and #79 (how the cases and the about 790
   excluded cases came out). Comment on #104 with the result. File the D3 `follow-up` (exact spore `jitter` rows) and
   any `follow-up` found on the way. Close nothing.
7. **Roadmap and notes.** Append `## Revision 2026-11-?? (elk-pin-move-8bca22f4)` to `plans/roadmap.md`. Write
   `.agent-notes/elk-pin-move-8bca22f4.md` (observations in the rules' template), and add the README "Mission summary"
   section in the form of earlier briefs.
8. **Gates 1-7** (README) plus the § 12 checks (`docs:linkcheck`, `pack:smoke` both modes, the 200-warning typedoc
   count, the examples test). Journal each result. The coverage run uses the `/nonexistent` sweep overrides. For gate 6,
   fix each new CodeQL finding, or accept it in `tools/codeql/accepted.json` with a reason (journaled).
9. **Squash** (README "Landing"): tag `elk-pin-move-8bca22f4/pre-squash`, `git reset --soft <base>`, one commit.

## Write-set

`CLAUDE.md`, `NOTICE.md`, `docs/**`, `docs-site/**` (the sha and mirrored line references only), the AD-2 amendment
appended to `plans/elk-engine-skeleton/decisions.md`, `plans/roadmap.md` (append only), `plans/elk-pin-move-8bca22f4/**`,
`.agent-notes/elk-pin-move-8bca22f4.md`, and `tools/codeql/accepted.json` (if needed).

## Acceptance criteria

- Given the close-out, when `git grep -n e7eaea57 -- . ':!plans'` runs, then every hit is a historical mention.
- Given gates 1-7 and the § 12 checks, when each one runs, then each one is green, with its result journaled.
- Given the squash, when `git rev-list --count <base>..HEAD` runs, then it prints 1. The tag holds the per-task history.

## Observability / rollback

N/A: no new observable operations. Reversible: the move is one commit, and a revert plus `build.sh` at `e7eaea57`
restores the old oracle.
