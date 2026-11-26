<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions and push-forward: deferred-bundles-acceptance (issue #88)

The queue rules in the system prompt win over this file where they disagree.

## Stop (journal the stop, then act as stated)

1. **AD-13.** A landed test, vector, golden or ref would need a changed expected value. STOP for those rows: file `needs-ruling`
   naming them, leave them as they are, and finish the rest. Adding the new fitness block is not such a change.
2. **`src/` change.** Any edit under `src/` is outside this mission. Stop that part and file a `follow-up`.
3. **Upstream drift.** `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD` on the three bundles lists a commit. Journal it and
   continue; the table is generated at the pin and the pin does not move.
4. **Write-set.** A file outside the README's table needs a change. Stop that part, file a `follow-up`, and finish the rest.
5. **Regeneration.** `git diff test/architecture/bundle-deps.json` after `--write` shows anything but the two new keys of D3
   (an `elkCommit` change, a changed `requires`, a third key), or the new keys differ from D3's table. Halt with the diff: the
   pinned manifests disagree with planning.
6. **Decision contradicted.** A maintainer comment on #88 or #95 newer than 2026-11-23 changes the ruling, or evidence contradicts
   a decision in [decisions.md](decisions.md) (for example the inventory recount is not 32). Halt with the evidence.
7. **Unproven regeneration.** `regeneration › regenerated deps equal the committed file` is skipped in the T2 run. Make
   `ELK_SOURCE_DIR` point at a checkout holding `8bca22f4` (`../elk` held it at planning); if none does, halt.
8. **Gates.** The same gate check fails twice after two fix attempts. Halt with the diagnosis artifact in the journal.

## Push-forward (decide, journal, continue)

- Wording of the ADR ruling section, AD-17, the CLAUDE.md lines, the inventory rationale cells and the port-map paragraph, as long
  as each keeps D1-D4's content and quotes no ruling more strongly than the maintainer wrote it.
- Test titles and helper constants in the new fitness block.
- Prettier's reflow of the edited Markdown tables.
- Whether the closing row in `plans/deferred-bundles-adr/decision-journal.md` also links the roadmap revision.
