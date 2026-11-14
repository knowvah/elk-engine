<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: deferred-bundles-adr, roadmap row 11 (issue #42; auto-confirmed at planning, 2026-11-13)

This mission was planned unattended (`/plan-mission --unattended`). Every row is the planner's recommendation; the rejected
options and the evidence are under [Auto-confirmed (unattended)](#auto-confirmed-unattended). Rows amend AD-1…AD-16 and earlier
missions' rows, never rewrite them. Cite a row as `deferred-bundles-adr DB3`.

| ID | Decision |
|----|----------|
| DB1 | **Where the ADR lives.** One new file, `docs/architecture/deferred-bundles-adr.md`, in the ADR form (Status, Context, Decision, Consequences; about one page) with a per-bundle evidence summary table. The full evidence, with every command and its output, goes in `plans/deferred-bundles-adr/evidence.md` and the ADR links to it. `plans/elk-engine-skeleton/decisions.md` (AD-1…AD-16) is **not** edited: it holds accepted decisions, and this ADR is Proposed. |
| DB2 | **Status and acceptance.** The ADR lands with `Status: Proposed (2026-11-13), awaiting the maintainer's ruling on #<N>`. T3 files one `needs-ruling` issue asking for acceptance, listing the per-bundle recommendation and what acceptance triggers (an AD-17 row appended to the skeleton's decisions, CLAUDE.md's "Deferred" list, and for any "go" a follow-up mission). This mission makes none of those changes. |
| DB3 | **`bundle-deps.json` is not changed.** "Adopted" means accepted by the maintainer, which happens after this mission. `tools/bundle-deps.ts` `IN_SCOPE_SUFFIXES` and `test/architecture/bundle-deps.json` stay byte-identical. If the ADR recommends "go" for a bundle, it names the exact follow-up: add the suffix to `IN_SCOPE_SUFFIXES`, regenerate with `tools/bundle-deps.ts`, and add a mapping test like the `grammar bundles (conformance-corpus D0)` block. |
| DB4 | **No new fitness test.** `test/architecture/module-boundaries.fitness.test.ts` already blocks an unadopted port: `src tree respects bundle boundaries` › `has no unmapped directories` (with the self-check `flags files in directories that belong to no bundle`), and `regeneration` › `regenerated deps equal the committed file` ties the table to `IN_SCOPE_SUFFIXES`. The ADR cites those tests (by name and line) as the enforcement of "deferred = not ported". The roadmap table's "fitness test updated" is met by that citation; § 11 asks only for `bundle-deps.json` on adoption. |
| DB5 | **Options and evidence per bundle.** For each of `alg.libavoid`, `alg.graphviz.dot`, `alg.graphviz.layouter` the ADR weighs exactly three options: **skip** (stay unported), **port** (line by line, Java as spec), **delegate** (to `@knowvah/dot-engine`; for libavoid: state that no delegate exists). Evidence rows, all gathered at the pin: Java LOC (hand-written, `src-gen` separately), `Require-Bundle`, external process or binary (`Runtime.exec` site), in-scope callers (`git grep` at the pin over every in-scope bundle and test bundle), ELK tests that exercise it, corpus use (elk-models and `test/corpus/census.json`), browser safety (CLAUDE.md "Browser-safe `src/`"), oracle feasibility (can the AD-3 oracle produce goldens without an unpinned external binary?), licence of any external component (tier-1 source, fetched), dependency rules (zero runtime dependencies; AD-14), effort in tasks (the roadmap's 600-800 LOC per task), and for delegation dot-engine's relevant surface (read only). Each recommendation must follow from the rows; a verdict no row supports is a stop (stop 4). |
| DB6 | **Docs touched.** Besides the ADR: `docs/architecture/inventory.md` rows 38-40 and `docs/architecture/port-map.md` near line 625 gain a link to the ADR ("decision proposed: see …"), keeping the `Deferred` status (it changes only on acceptance). CLAUDE.md, `docs/conformance.md`, the skeleton's decisions and `bundle-deps.json` are not edited. `plans/roadmap.md` gains `## Revision <date> (deferred-bundles-adr)` (append only). |
| DB7 | **No oracle or JVM work.** The evaluation reads the pinned source; it does not rebuild the oracle, run a recorder, or run any Graphviz or libavoid binary. `oracle-build.json` is still checked at start and journaled (queue rule), but a stale stamp is journaled, not rebuilt: nothing in this mission trusts oracle output. |

## Auto-confirmed (unattended)

**DB1.** Evidence: no ADR series exists under `docs/` (`ls docs docs/architecture`); per-topic design docs live in
`docs/architecture/*.md` (e.g. `text-sizing-seam.md`); locked AD rows live in `plans/elk-engine-skeleton/decisions.md`. Only
`overview`, `component-map`, `port-map` and `inventory` are published by the docs site (`docs-site/.vitepress/config.ts:66-86`);
other links are rewritten to GitHub blobs, so a new file cannot break `docs:build`'s link handling. Rejected: (A) appending
AD-17 to the skeleton's decisions now, because that file is for accepted decisions and acceptance is the maintainer's (#42);
(B) a `docs/architecture/adr/` series, because one ADR does not justify a new convention (YAGNI).

**DB2.** The issue says "land it as **Proposed** and file a `needs-ruling` issue for acceptance". Rejected: parking #42,
because the issue defines done without the ruling.

**DB3.** Issue #42: "`bundle-deps.json` is updated if any bundle is adopted"; roadmap § 11: "updated if any is adopted".
`tools/bundle-deps.ts:29-46` is the single scope list that generates the table. Rejected: adding a recommended bundle now, which
would pre-empt the ruling and make `has no unmapped directories` vacuous for a bundle with no `src/` directory.

**DB4.** `module-boundaries.fitness.test.ts:306` (`flags files in directories that belong to no bundle`), `:322` (`has no
unmapped directories`), `:342` (`regenerated deps equal the committed file`). Rejected: a test pinning the three bundle names
as deferred, which duplicates `:322` and would need editing on any acceptance.

**DB5.** Planning evidence (the executor re-gathers and records it; nothing here is the verdict):
- No commit `8aaa3c14..HEAD` touches the three bundles in `../elk`.
- In-scope references at the pin: only `core/AbstractLayoutProvider.java:31-33` (Javadoc naming GraphViz) and
  `test/org.eclipse.elk.shared.test/META-INF/MANIFEST.MF:13` (requires `graphviz.layouter`; no source file under that test
  bundle names Graphviz).
- External processes: `LibavoidServer.java:214` and `GraphvizTool.java:206`, both `Runtime.getRuntime().exec`.
- Corpus: no elk-models file names libavoid, graphviz, neato, circo, twopi or fdp (grep; only `NOTICE.md` mentions one).
- `Graphviz.melk` declares five algorithms (`dot`, `neato`, `fdp`, `twopi`, `circo`); `alg.graphviz.dot` is an Xtext grammar
  plus `DotImporter`/`DotExporter`; its only bundle consumer is `graphviz.layouter`.
- `@knowvah/dot-engine`: EPL-2.0, no runtime dependencies, eight layout engines (its README). Using it from `src/` would be a
  runtime dependency, which CLAUDE.md forbids ("Zero runtime dependencies"); a delegation therefore has to be framed as a
  separate package or a ruling on that rule.
Rejected: a single global verdict for all three bundles (the issue asks for one per bundle); a prototype port (roadmap § 11:
"Output is an ADR, not code").

**DB6.** Inventory rows already say `Deferred` with one-line reasons; linking keeps one source of truth. Rejected: editing
CLAUDE.md's "Deferred" list before acceptance.

**DB7.** The evaluation needs no layout output. Rejected: running `GraphvizLayoutProvider` on the oracle with the local
`/opt/homebrew/bin/dot`, because its output depends on an unpinned Graphviz version; the ADR states that as evidence instead.
