<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: amendment text

**Agent:** `claude` (sonnet) or the orchestrator. **Budget:** 20 min.

## Context

The maintainer's 2026-11-13 ruling (#74 body, [D0](../decisions.md#d0-the-ruling-this-mission-executes)) amends AD-4. AD-4
is locked, so the amendment is appended, never edited in ([D1](../decisions.md#d1-where-the-rule-is-written)).

## Task

1. `plans/elk-engine-skeleton/decisions.md`: append at the end `## AD-4 amendment (2026-11-13)` with the four numbered
   points of #74's "The rule (as recorded)" copied as written (`gh issue view 74`), a provenance line (maintainer ruling,
   #68 item B made general) and the issue link. Then `git diff -U0 plans/elk-engine-skeleton/decisions.md` must show only
   added lines after the old last line (stop 7).
2. `CLAUDE.md` line 48-51 ("Conformance bar (AD-4)" bullet): keep 1e-6; replace the last-ulp sentence with the bound
   (demonstrated HotSpot-vs-V8 `Math.*` mechanism, effect ≤ 0.01 px on every position and size, pinned per case, AD-4
   amendment). Wrap at the file's existing width.
3. `docs/conformance.md:201-207` (the "ulp-level `Math.*` differences" bullet): add the four points and a link to the
   amendment; keep the `nextGaussian` sentences. Leave the rest of the file to T4.
4. `npx prettier --check CLAUDE.md docs/conformance.md plans/elk-engine-skeleton/decisions.md`.

## Write-set

`plans/elk-engine-skeleton/decisions.md` (appended lines only), `CLAUDE.md` (the one bullet), `docs/conformance.md`
(`:201-207` only).

## Read-set

`gh issue view 74`; `plans/elk-engine-skeleton/decisions.md:70-75` and its last 20 lines; `CLAUDE.md:44-60`;
`docs/conformance.md:162-230`.

## Acceptance criteria

- Given the amended `decisions.md`, when diffed against the base, then only lines after the old end are added, and they
  hold the four points of #74 unchanged and the issue link.
- Given `CLAUDE.md`, when read, then the conformance bullet still names 1e-6 and states the 0.01 px bound with both
  conditions.
- Given `docs/conformance.md` § 2, when read, then the policy bullet states all four points and links the amendment.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible (revert the lines).
