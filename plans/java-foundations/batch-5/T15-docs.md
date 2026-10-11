<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — Update translation-rules + collections docs

**Agent:** documentation-engineer · **Commit:** `docs(translation): close jvm vector gaps and name each shim`

## Context
`docs/translation-rules.md` §9 and `docs/translation-rules-collections.md` §2.4 list vector gaps
and shims as future work. Batches 1–4 closed them. The docs must now describe what exists.

## Task
Edit both docs so every rule that needed a shim names it (path + export) and its vector file, every
listed gap is marked closed with its vector file, and the collections doc gains a runbook entry.

## Write-set
`docs/translation-rules.md`, `docs/translation-rules-collections.md`.

## Read-set
- `docs/translation-rules.md:82-149` (§1.2–1.6), `:173-188` (§1.9), `:256-288` (§4), `:386-403`
  (§6.7), `:425-448` (§7), `:478-496` (§9)
- `docs/translation-rules-collections.md:66-102`, `:168-194`
- `../decision-journal.md` (model revisions, sampling decisions, any log10 shim)
- `ls src/java/lang src/java/util src/guava test/golden/refs/java`

## Specification
- §9 and §2.4: each gap → "closed: `<vector file>` → `<shim path>`".
- §1.5 `l2i`, §1.6 `Float32`, §1.4 `Int64`, §1.9 `log10` outcome, §6.7 exception classes, §7
  `DoubleToString`/`JavaDouble.parseDouble`/`JavaString.hashCode`/`JavaInteger.valueOf`,
  §2 / collections §2.1 `JavaHashMap` + `HashStrategy`, §2.3 `PriorityQueue`, §4 `src/guava/*`.
- Collections doc: a runbook entry "JavaHashMap order mismatch in a ported site": detection
  (golden/sweep tie-order diff), mitigation (add the key set as a new JVM vector, revise the model,
  journal). Describe the `JavaHashMap` model only as observed behavior with script names.
- No OpenJDK-derived prose.

## Acceptance criteria
- Given `rg -n 'gap|no vector exists|needs a .* shim' docs/translation-rules*.md`, then every hit is
  marked closed or names an existing file.
- Given every path the docs name, then it exists (`ls` each).
- Given the collections doc, then the runbook entry has detection and mitigation.

## Quality bar
README gates. SPDX line 1; prose lines ≤ 100 chars except tables; keep each file < 500 lines.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Docs only. Do not edit CLAUDE.md (its rows were corrected in `e2d5456`).
