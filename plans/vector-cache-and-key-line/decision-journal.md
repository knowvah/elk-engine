<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decision journal: vector-cache-and-key-line (mission 4e)

Append-only. Cite task ids, never SHAs. A diagnosis entry carries mechanism, origin (`file:line`), causal chain and
ruled out.

| Date | Task | Kind | Entry |
|------|------|------|-------|
| 2026-10-21 | B1 | decision | T1 and T2 executed by the orchestrator directly, not by typescript-pro / java-architect agents: each is a few lines with a fully specified contract, so an agent hand-off cost more than the work. Write-sets and one commit per task unchanged. |
| 2026-10-21 | T1 | PF4 | Scenarios `checkPropertyKey-line-lone-cr` (breaks `\r`, `\r\r`, `\r`) and `checkPropertyKey-line-crlf` (same with `\r\n`), two unknown keys inside `node a { }`, `@covers 52-58` line in LF. `git check-attr text` = unset; the committed blobs keep 3 CR bytes each. |
| 2026-10-21 | T1 | evidence | `elkt-vectors.sh`: lexer/parse/write `cmp`-identical to the refs; validate gained exactly the two rows (stop 6 clear). Oracle lines 3 and 5 in both rows. Before the fix the TS replay failed only `checkPropertyKey-line-lone-cr`, on `line` only: received 2 and 2, expected 3 and 5 (D5 observability holds, stop 5 clear); the CRLF row passed. After `#parsePropertyKey` returns `cursor.lineOf(first)`: `src/graph/text` + `src/xtext` 77 files / 3469 tests green. |
| 2026-10-21 | T1 | PF1 | No literal changed: no test counts all validate rows; `ElkGraphValidator.test.ts:204` counts the 11 `@deferred` rows, still 11. |
| 2026-10-21 | T2 | evidence | `javac` against the oracle classpath (34 entries, `build_classpath` from a copy of `elkj-vectors.sh` with ROOT set): rc 0. Key = `sha256(id NUL text)` with text from `Files.readAllBytes` decoded UTF-8, `""` for `java-*` via `texts.getOrDefault`. Output check deferred to T4 as specified. |
| 2026-10-21 | B1 | gate | format:check, typecheck, complexity (rc 0, no violations), coverage (gate ok), `elkt-vectors.sh` 4× `cmp` to refs, `regen-elkt-refs.sh && regen-elkj-refs.sh` + `git diff --exit-code test/golden/refs/` clean. T1 commit ⊆ write-set; T2 commit = `ElkjWriteVectors.java` only. |
