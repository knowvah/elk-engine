<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-engine Skeleton — Mission Brief

## Objective

Lay the skeleton for **elk-engine** (`@knowvah/elk-engine`, GitHub
`knowvah/elk-engine`): a faithful TypeScript port of the Eclipse Layout
Kernel. This mission builds the project scaffold, guardrails (fitness
tests, CI), the oracle pipeline (ELK built from source with a patch
series), the corpus and golden-comparison machinery, the architecture and
translation documentation, and the roadmap of follow-on missions. The only
real port is `java.util.Random` plus Java-semantics shims — enough to prove
the *oracle → frozen test → TS implementation* loop. Modeled on
`~/git/knowvah/dot-engine` (the Graphviz port).

**The repo directory will be renamed** (currently `elk-ts`). Use
repo-relative paths only; never write the absolute repo path into any file.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md).
3. If `git log` shows no commits: `git commit --allow-empty -m "chore: initialize repository"`
   on `main`, then `git switch -c feature/elk-engine-skeleton`.
   Then commit the brief itself as the branch's first commit:
   `git add .gitignore plans/ && git commit -m "docs(plans): add mission brief for elk-engine skeleton"`
   (`.gitignore` already ignores local `.claude/` settings; T1 extends it).
   Otherwise `git switch feature/elk-engine-skeleton`.
4. Find the first batch below with `[ ]`; read its `overview.md`; resume
   from its first incomplete task.

## Branch

`feature/elk-engine-skeleton` off `main`. One commit per task
(Conventional Commits, no attribution lines). Merge to `main` with a
**merge commit** at mission end. Never push.

## External inputs (never modify; read-only)

| Var | Default (relative to repo root) | What | Pinned |
|-----|---------------------------------|------|--------|
| `ELK_SOURCE_DIR` | `../elk` | ELK Java source (the spec) | `8aaa3c14` (full sha below)* |
| `ELK_ORACLE_DIR` | `../elk-oracle` | git worktree of ELK_SOURCE_DIR, built by T8 | same + patches |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | test models | `ac5af2ba511c0037e4f347e8bd91f013950951c7` |

\* Full ELK sha: `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`.

## Quality gates (after every task)

```bash
npm run typecheck                 # exit 0 (from T1 on)
npm run coverage                  # exit 0; 90/90/90/90 thresholds (from T1 on)
git show --name-only --format= HEAD   # ⊆ the task's write-set
```

Oracle tasks additionally: `tools/oracle/build.sh` (T8),
`tools/oracle/run.sh` on one model (T11), `tools/oracle/regen-goldens.sh`
is a no-op diff when re-run (T16).

## Stop conditions — halt, journal, wait for the user

1. A task needs a change to a file outside its write-set.
2. The same gate check fails twice in a row after fix attempts.
3. An implementation would contradict a locked decision (AD-1…AD-15).
4. AD-13: a failing test can only pass by changing an assertion, a
   JVM-generated vector, or a golden ref.
5. Tycho oracle build fails on JDK 21 **and** a JDK 17 retry, or needs ELK
   source edits outside the patch-series mechanism.
6. A Java shim cannot match JVM vectors bit-for-bit and the mechanism
   cannot be stated (`~/.claude/rules/diagnosis.md`).
7. Any outward-facing action: creating the GitHub repo, `git push`,
   `npm publish`, or modifying the ELK / elk-models clones (adding the
   oracle *worktree* is allowed; changing their HEAD or files is not).
8. A dependency incompatible with EPL-2.0, or **any** runtime dependency.
9. A shim would require reading or copying OpenJDK source (AD-9).
10. More than 3 files beyond planned write-sets needed mission-wide.

## Push-forward — decide and (if non-trivial) journal

- Stylistic choices with no behavioral impact.
- Which 3–5 small elk-models JSON files become goldens (<50 nodes each;
  together cover ports, labels, hierarchy).
- Minor/patch dev-dependency bumps with no API change.
- Tycho/Maven CLI flags (`-o`, `-DskipTests`, `-pl`, memory) without
  changing ELK sources.
- Adding (never changing) vector cases in T6's generator.
- A task simpler than estimated.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
|-------|------|-------|------------|--------|
| 1 | Scaffold | T1 | — | [ ] |
| 2a | Repo guardrails & docs root | T2–T5 | 1 | [ ] |
| 2b | Vectors, comparator, oracle build | T6–T8 | 1 | [ ] |
| 3a | Java shims, harness, corpus | T9–T12 | 2a, 2b | [ ] |
| 3b | Architecture & translation docs | T13–T15 | 2a | [ ] |
| 4 | Goldens, conformance, roadmap | T16–T18 | 3a, 3b | [ ] |

Batches 2a ‖ 2b run in parallel; 3a ‖ 3b run in parallel. Within a batch,
the overview's `Depends On` column decides parallelism.

## Document index

- [decisions.md](decisions.md) — AD-1…AD-15 (locked)
- [decision-journal.md](decision-journal.md) — append during execution
- [diagrams/component-map.md](diagrams/component-map.md) — what this mission builds
- [diagrams/data-flow.md](diagrams/data-flow.md) — vector, oracle, golden flows
- Batches: [1](batch-1/overview.md) · [2a](batch-2a/overview.md) ·
  [2b](batch-2b/overview.md) · [3a](batch-3a/overview.md) ·
  [3b](batch-3b/overview.md) · [4](batch-4/overview.md)

## Mission end

All batches `[x]`; gates green; `.agent-notes/` updated with any novel
observations; merge `feature/elk-engine-skeleton` → `main` (merge commit);
report to the user the manual follow-ups: create GitHub repo
`knowvah/elk-engine`, push, and (later) claim the npm name.

## Startup sequence (after compaction)

1. Re-read this file. 2. Re-read `decision-journal.md`. 3. First batch with
`[ ]` → its `overview.md` → first incomplete task.
