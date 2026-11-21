<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: refresh the overview and home page translations

## Context

T1 changed two blocks of `guide/overview.md` and two of `index.md` (front-matter tile and warning). Each of the 23
locales (`LOCALES` in `docs-site/.vitepress/i18n.ts`: cs, da, de, es, et, fi, fr, hu, is, it, ja, ko, nl, no, pl,
pt-br, ro, ru, sk, sv, tr, zh-cn, zh-tw) has a copy of both. D4 sets the rules. At the base every `guide/overview.md`
copy is already stale through its hash alone (D4), and every `index.md` copy is current.

## Read-set

[decisions.md](../decisions.md) D3-D4, `plans/docs-site/translation-spec.md` (§ Hard rules, § Glossary, § Tone),
`.agent-notes/docs-site.md` (translator tool limits, lint runner), `test/docs/translation-lint.test.ts` and
`test/helpers/docs.ts` (what the lint checks), the T1 diff.

## Write-set

`docs-site/<p>/guide/overview.md` and `docs-site/<p>/index.md` for the 23 locales (46 files), and
`plans/overview-status/decision-journal.md`. Each subagent writes only its own locale directories' two files.

## Steps

1. Check that every `docs-site/<p>/guide/overview.md` already holds `8bca22f4afa3371562d2f702d59929818f7f7b71` (the
   pin-move edits). If one does not, that line is part of its T2 edit too. Journal the check.
2. Compute the 46 hashes with `node scripts/i18n-hash.mjs docs-site/<p>/<page>` at the T1 commit, and journal them
   as one table or a file under `$TMPDIR` named in the journal.
3. Dispatch translation subagents in one message, as background agents. Group the locales so that no two agents
   share a directory, about 4 locales each (push-forward). Use an agent type with Read and Edit (for example
   `general-purpose` on `sonnet`), not `technical-writer`: it has no Edit, and a whole-file Write lets unchanged
   lines drift. Each prompt is self-contained (`~/.claude/rules/parallelism.md`). It carries the English old→new
   blocks, the hard rules and glossary verbatim, each target file's path and its new `sourceHash`, the rule "edit
   only the counterparts of the changed blocks and the `sourceHash:` line; keep every other line byte-identical;
   keep the locale's own existing terms", the link rule (`/parity`, `/guide/getting-started` and the #90 GitHub URL
   stay unprefixed; `/guide/roadmap` takes `/<p>/`), and "return only the list of files edited, no preamble, no
   trailing summary".
4. As agents return: `npx prettier --write` on their files, then verify per page that `git diff <T1> --
   <file>` touches only the `sourceHash:` line and the changed blocks (inspect the hunks; journal per locale "hunks:
   N, outside blocks: 0"). Read each translated block for the D3 claims (no "Pre-alpha" left, no "first publish
   freezes" left, `src/index.ts` and other inline code untouched). A locale that fails twice is stop 6.
5. `npx vitest run test/docs`, `npm run docs:i18n-status` (expect: `guide/overview.md` and `index.md` stale in no
   locale; `conformance.md` and `guide/architecture.md` unchanged, still stale), `npm run docs:build`,
   `npm run docs:linkcheck`. Journal each.

## Acceptance criteria

- Given `npm run docs:i18n-status`, when run after T2, then no locale lists `guide/overview.md` or `index.md` as
  stale, and each locale's stale list is the base's minus `guide/overview.md`.
- Given `git diff <T1> -- docs-site/<p>/`, for each of the 23 locales, then only the two files change, and in each
  only the `sourceHash:` line and the counterparts of T1's changed blocks.
- Given `npx vitest run test/docs`, `npm run docs:build` and `npm run docs:linkcheck`, then all pass, with the
  translation lint covering all 23 registered locales.
- Given grep over `docs-site/*/guide/overview.md docs-site/*/index.md` for the container title each locale used for
  "Pre-alpha" at the base (journal the 23 strings at step 1), then nothing matches.

## Interface input

The T1 commit sha and diff (T1 "Interface output").

## Observability

N/A: documentation only.

## Rollback

Reversible: revert the commit. The overview copies go back to stale, which is their state at the base.
