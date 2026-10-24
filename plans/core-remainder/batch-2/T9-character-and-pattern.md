<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — `JavaCharacter` and narrow `Pattern` shims (R2)

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T9): add java character predicates and narrow regex shim`

## Context
Mission 5b (README). `NodeReferenceMatcher` (T16) segments target names with `Character.isUpperCase`, `isLowerCase`
and `isWhitespace`, then matches with `java.util.regex.Pattern`. JS regular expressions differ:
- JS has no `\h`, and JS `\v` matches only the vertical tab.
- Java `CASE_INSENSITIVE` is ASCII-only.
- With the `u` and `i` flags, JS `\b` also treats `ſ` and `K` (Kelvin) as word characters.

Both shims are written from the JDK 21 Javadoc only (AD-9) and proven by T2's `character.json` and `regex.json`.

## Task
1. **`src/java/lang/JavaCharacter.ts`**: `isUpperCase(codeUnit)`, `isLowerCase(codeUnit)`, `isWhitespace(codeUnit)`,
   `toUpperCase(codeUnit)` and `toLowerCase(codeUnit)` on one UTF-16 code unit.
   - Also add `equalsIgnoreCase(a, b)` to the landed `src/java/lang/JavaString.ts`, exactly as the `String` Javadoc
     defines it in terms of `Character.toUpperCase` and `toLowerCase`. `TextPrefixFilter` (T15) needs it.
   - The predicates use embedded range tables generated from `character.json`, not JS `\p{…}`; V8's Unicode version
     may differ from JDK 21's (R2).
   - Keep the tables compact (a range array plus binary search). Document how they were derived from the vector
     file, and pin them with a test that compares the embedded tables to `character.json`.
2. **`src/java/util/regex/Pattern.ts`**: `Pattern.quote(s)`, `Pattern.compile(regex, flags = 0)`, `Pattern.DOTALL`,
   `Pattern.CASE_INSENSITIVE`, `pattern.matcher(text).find(): boolean`.
   - `compile` parses only this grammar: `\b`, `\Q…\E` quoted literals (exactly as `quote` emits them, including the
     `\E` escaping the Javadoc describes), the class `[\h\v]` with `*`, and concatenation. Anything else throws
     `UnsupportedOperationException` with the offending construct.
   - **Translation to a JS `RegExp`:**
     - `\h` and `\v` become their Javadoc sets: `\h` = `[ \t\xA0 ᠎ -   　]`,
       `\v` = `[\n\x0B\f\r\x85  ]`.
     - `\b` becomes ASCII-word lookarounds over `[A-Za-z0-9_]`.
     - With `CASE_INSENSITIVE`, each ASCII letter in a literal becomes `[xX]`. Non-ASCII stays exact. The JS `i` flag
       is never used.
     - `DOTALL` has no observable effect on this grammar (no `.`). Accept the flag and journal that observation.
   - `find()` is `RegExp.test` on a non-global regexp.
3. Write the tests:
   - every `character.json` range replays, all 65,536 units, in under 1 s (stop 12);
   - every `regex.json` row's `regex` + `flags` + `text` gives the recorded `found`;
   - `quote` and the throw path have their own cases.

## Write-set
`src/java/lang/JavaCharacter.ts`, `src/java/util/regex/Pattern.ts`, `src/java/lang/JavaString.ts` (add
`equalsIgnoreCase` only), colocated tests (including `JavaString.test.ts`, adding cases only).

## Read-set
- `test/golden/refs/java/{character,regex}.json`.
- `src/java/lang/{JavaString,UnsupportedOperationException}.ts`.
- The JDK 21 Javadoc for `java.util.regex.Pattern` (summary table, `quote`, `CASE_INSENSITIVE`) and
  `java.lang.Character` (`isUpperCase`, `isLowerCase`, `isWhitespace`).
- `decisions.md#r2--java-text-semantics-for-nodereferencematcher`.

## Interface contracts (outputs, consumed by T16)
- `isUpperCase(c: number): boolean`, `isLowerCase(c: number): boolean`, `isWhitespace(c: number): boolean`,
  `toUpperCase(c: number): number`, `toLowerCase(c: number): number`.
- `JavaString.equalsIgnoreCase(a: string, b: string): boolean` (consumed by T15).
- `Pattern.quote(s: string): string`, `Pattern.compile(regex: string, flags?: number): Pattern`.
- `Pattern.DOTALL`, `Pattern.CASE_INSENSITIVE`, using the Javadoc constant values.
- `Pattern#matcher(text).find(): boolean`.

## Acceptance criteria
- Given every `character.json` range, when the predicates run over all 65,536 units, then they match exactly, in
  under 1 s.
- Given every `regex.json` row, when compiled and matched, then `found` equals the JVM value.
- Given `Pattern.quote("a\\Eb")`, when compiled and matched against `a\Eb`, then the match succeeds, consistent with
  the recorded rows.
- Given a regex containing `.` or `(`, when compiled, then `UnsupportedOperationException` is thrown.
- Given every `character.json` case mapping and `equalsIgnoreCase` row, when replayed, then the TS results equal the
  JVM results.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
