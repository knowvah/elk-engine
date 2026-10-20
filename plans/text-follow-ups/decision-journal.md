<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decision journal: text-follow-ups (mission 4d)

Append-only. Cite task ids, never SHAs. A diagnosis entry carries mechanism, origin (`file:line`), causal chain and
ruled out.

| Date | Task | Kind | Entry |
|------|------|------|-------|
| 2026-10-20 | start | STOP 6 | Precondition D1 not met: the C5 commit `test(xtext): size the scope lookup budget for efficiency cores` exists only on `fix/scope-lookup-budget` / `origin/fix/scope-lookup-budget`; `origin/main` ends at the PR #13 merge, and `gh pr list --head fix/scope-lookup-budget --state all` returns no PR. The other preconditions hold: no tracked changes (only `.claude/`, `.serena/`, `plans/text-follow-ups/` untracked), and `../elk-oracle/oracle-build.json` exists. No branch created, no sweep launched. Resume once C5 is on `origin/main`. |
