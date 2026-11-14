<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9: hand-off, gates and squash

**Agent:** orchestrator. **Decisions:** DP9. **Commit:** the final squash (README § Landing).

## Steps

1. **Rulings (DP9).** `gh issue create --label needs-ruling`:
   - "api: accept the proposed export surface (roadmap 12)": link `docs/architecture/public-api.md`; list the open
     questions; list the acceptance steps from its "On acceptance" section, including the pinned rows of
     `test/docs/locale-complete.test.ts` (`:91-105`, `:107-115`, `:117-119`) that adding the two pages to the nav would
     change (AD-13), and the CLAUDE.md line.
   - "release: claim the npm name and make the first publish (roadmap 12)": link `PUBLISHING.md`; first version; trusted
     publisher; switching `release.yml` to `push: main`; note AD-14's freeze and that the surface ruling comes first.
   Put both issue numbers into `public-api.md` and the getting-started notice (the T9 write-set allows only those links).
2. **Follow-ups** (`gh issue create --label follow-up`, not `queue:ready`): translate the getting-started page and the nav
   labels after acceptance; external link findings from T5 if any; anything else found on the way.
3. Comment on #43: brief path, exit items with their evidence, the two ruling issues, the DP decisions.
4. `docs/architecture/overview.md`: a short section on the docs and release toolchain (typedoc package, link check,
   examples set, pack rehearsal, release trigger) linking the decisions; no other edits.
5. Append `## Revision <date> (docs-publish-prep)` to `plans/roadmap.md` in the form of the earlier revisions: row 12
   status (done except the maintainer parts), evidence, decisions held and deviations, changes to landed code (expected:
   none under `src/`), hand-offs (to row 13: the typedoc TS 6 package and `pack:smoke` are part of an upgrade check; to
   the surface ruling), flags for the maintainer. Never edit an earlier line.
6. `.agent-notes/docs-publish-prep.md`: novel observations only (template in `~/.claude/rules/memory.md`).
7. Gates 1-6 (README § Quality gates), each a `gate` row with its result; the regen loop includes `examples`.
8. Fill the README's mission summary (exit items → journal rows, as `plans/deferred-bundles-adr/README.md` does) and tick
   the batches.
9. Squash: `git tag docs-publish-prep/pre-squash`, `git reset --soft <base>`, one commit with `-F`; footer `Refs: #43`;
   no attribution lines. `git show --stat HEAD` must list no file under `src/` and no ref outside `elk-examples/`.

## Acceptance criteria

- Given the two ruling issues, when read, then each names the decision, the files and the exact steps for the maintainer.
- Given the final commit, when diffed against the base, then `src/index.ts`, CLAUDE.md, the AD rows, every landed test and
  every pre-existing ref are unchanged.
- Given the journal, when read, then every exit item of the README has a `gate` or `note` row with its evidence.

**Observability:** N/A. **Rollback:** Reversible (revert the squash commit; close the issues).
