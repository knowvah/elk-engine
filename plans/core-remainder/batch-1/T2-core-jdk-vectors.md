<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Pure-JDK vector recorder: `Rectangle2D`, regex, `Character` (R7)

**Agent:** java-architect (sonnet) · **Commit:** `test(T2): record rectangle2d, regex and character jvm vectors`

## Context
Mission 5b (README). R2 and R3 replace JDK classes that `comments/*` uses with narrow shims written from the Javadoc
only (AD-9). This task records the JVM behaviour they must match, **before** any shim exists (AD-13).
- The recorder only **calls** the JDK and records the results, as `tools/vectors/GuavaVectors.java` does. Read that
  file's header and its JSON writer.
- Never read OpenJDK source, never edit `tools/vectors/JavaVectors.java` or `tools/vectors/vector-cache.sh`, and never
  touch a landed file in `test/golden/refs/java/`.

## Task
1. Write `tools/vectors/CoreJdkVectors.java`:
   - pure JDK 21 (`java.desktop` is fine headless), no classpath, a single source file;
   - run as `java tools/vectors/CoreJdkVectors.java test/golden/refs/java`;
   - SPDX header and a header comment naming the Javadoc URLs it relies on;
   - each file starts with `"jdk": System.getProperty("java.version")`;
   - doubles are encoded as IEEE-754 hex bit strings, following `JavaVectors.hex`.
2. Write **`awt.json`** for `java.awt.geom.Rectangle2D.Double`. Each row is
   `{rect: [x,y,w,h], op, args, result}`, with these ops:
   - `outcode(x,y)`
   - `intersects(x,y,w,h)`
   - `intersects(Rectangle2D)`, with the other rectangle in `args`
   - `isEmpty()`

   Cover:
   - points inside, on each edge, on each corner, and outside on all 8 sides;
   - zero-width, zero-height and negative-size rectangles;
   - NaN coordinates and NaN sizes;
   - rectangles that touch at an edge or corner, that contain one another, that are disjoint, and empty ones.
3. Write **`regex.json`**. Copy `fuzzyRegexpFor` and `strictRegexpFor` verbatim from
   `J/comments/NodeReferenceMatcher.java:320-385`, citing it with `@see` (EPL code; the recorder is test tooling).
   - Each row is `{name, mode: "fuzzy"|"strict", regex: <the Java pattern string>, flags, text, found}`, recording
     `matcher(text).find()`.
   - Names cover camelCase splits, spaces and runs of whitespace, leading and trailing whitespace (`trim`),
     metacharacters (`.*+?()[]{}\|^$`) and the `\Q…\E` edge case of a literal `\E`, digits, `_`, non-ASCII letters
     (`é/É`, `ß`, `ſ`, Kelvin `K`, Greek, Cyrillic), and empty or blank names.
   - Texts cover each name at the start, middle and end; next to `_`, a digit, a non-ASCII letter and punctuation; in
     a different ASCII case; in a different non-ASCII case; across line breaks (DOTALL); and separated by every `\h`
     member and every `\v` member.
4. Write **`character.json`**:
   - For `Character.isUpperCase(char)`, `isLowerCase(char)` and `isWhitespace(char)` over all 65,536 `char` values,
     store sorted inclusive `[start, end]` ranges where the predicate is true.
   - For `Character.toUpperCase(char)` and `toLowerCase(char)`, store `[unit, mapped]` pairs for every unit whose
     mapping differs from itself. `TextPrefixFilter` uses `String.equalsIgnoreCase`, whose Javadoc is defined through
     these two (R2, extended at planning).
   - Add `equalsIgnoreCase` rows `{a, b, result}`: ASCII, `é/É`, `ß/SS`, `ſ/s/S`, Kelvin `K/k`, Turkish `İ/i/ı/I`,
     Greek sigma forms, and different lengths.
5. Run the recorder twice. The second run must be byte-identical (stop 8). Check that
   `git diff --exit-code main -- test/golden/refs/java/` shows only the three new files as untracked.
6. Format the JSON so prettier passes, or follow how existing vector files are excluded via `.prettierignore`; check
   that file first.

## Write-set
`tools/vectors/CoreJdkVectors.java`, `test/golden/refs/java/{awt,regex,character}.json`.

## Read-set
- `tools/vectors/GuavaVectors.java` (header and writer), `tools/vectors/JavaVectors.java:1-95` (hex encoding;
  read only).
- `J/comments/NodeReferenceMatcher.java:300-390`.
- The JDK 21 Javadoc for `Rectangle2D`, `Rectangle2D.Double`, `Pattern` and `Character`.
- `plans/core-remainder/decisions.md#r2--java-text-semantics-for-nodereferencematcher`, `#r3--rectangle2d`.

## Interface contracts (outputs)
These shapes are consumed by T8, T9 and T16. Field names are fixed; case counts are free:
- `awt.json`: `{ jdk, rows: [{ rect: [hex,hex,hex,hex], op: "outcode"|"intersects4"|"intersectsRect"|"isEmpty", args: [...], result: number|boolean }] }`
- `regex.json`: `{ jdk, rows: [{ name, mode, regex, flags, text, found }] }`
- `character.json`: `{ jdk, isUpperCase: [[s,e],...], isLowerCase: [[s,e],...], isWhitespace: [[s,e],...], toUpperCase: [[u,m],...], toLowerCase: [[u,m],...], equalsIgnoreCase: [{a,b,result}] }`

## Acceptance criteria
- Given two consecutive runs, when the outputs are compared, then all three files are byte-identical.
- Given the recording, when `git status` runs, then no landed file under `test/golden/refs/java/` changed.
- Given `regex.json`, when inspected, then it has rows for every `\h` and `\v` member, at least 4 non-ASCII case
  pairs, and a name containing `\E`.
- Given `character.json`, when inspected, then `U+0041` is upper, `U+0061` is lower, and `U+00A0` is not whitespace
  (Javadoc: non-breaking spaces are excluded).

## Observability / Rollback
N/A — test tooling only. Reversible: revert the commit.
