<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — Java → TypeScript translation rules

**Agent:** java-architect · **Commit:** `docs(translation): add java to typescript translation rules`

## Context
dot-engine learned C→TS hazards the hard way (calloc zeroing, `int`
truncation, `round()`). This doc front-loads the Java→TS hazards for ELK,
each grounded in real ELK code, so every future port task applies them
consistently. CLAUDE.md (T3) links here.

## Task
Survey the in-scope ELK sources and write `docs/translation-rules.md`.

## Write-set
`docs/translation-rules.md`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/<in-scope bundles>/src/**` (grep/ast-grep surveys)
- `../decisions.md#ad-9…`, `#ad-10…`, `#ad-11…`
- Javadoc / JLS only for Java semantics; never OpenJDK source.

## Specification
Sections, each with: rule, TS idiom (or `src/java/*` shim), and ≥ 1 ELK
citation as `bundle/src/.../File.java:line`:
1. Numeric types: `int` overflow, `long` (when `bigint`), `float`
   (`Math.fround`), `double`, `char`, integer division/remainder, casts
   (`d2i`), `Math.round`/`floor`/`ceil`, `Math.*` transcendental ulp risk
   (AD-4 known divergences), `Double.compare`/`compareTo`, `-0.0`, NaN.
2. Collections & iteration order (AD-10) — **counted inventory**: number
   of `HashMap`/`HashSet` declarations, how many are iterated, and of those
   which key kinds (value-hashed vs identity-hashed vs enum); `EnumMap`/
   `EnumSet`; `LinkedHash*`; `TreeMap`; `PriorityQueue` (heap order on
   ties!); `List.sort`/`Collections.sort` stability (both stable — note
   comparator contract violations); `Iterator.remove`; `ListIterator`.
3. Randomness: `new Random()` vs seeded; `randomSeed = 0` means time-seeded
   (`core/Core.melk:608`); `Collections.shuffle`; where each ELK algorithm
   gets its `Random` (cite `GraphConfigurator.java:119`,
   `ForceLayoutProvider.java:91`).
4. Guava: inventory of every Guava type/method used in scope with counts
   and the TS replacement (local helper vs native).
5. EMF: ElkGraph containment, `EList` semantics (unique, containment moves
   on add), `EMapPropertyHolder`, notifications not ported (AD-11).
6. Java language: `equals`/`hashCode` (and where ELK relies on them as
   map keys), interfaces with default methods, enums with fields/methods
   (`ordinal()`), inner/anonymous classes, static init order, checked
   exceptions, `assert`, `instanceof` chains, overloading (name
   disambiguation rule for TS), varargs, `Optional`, streams (eager vs
   lazy order of side effects), `Iterable` laziness.
7. Strings & text: `String.format`, `Double.toString` formatting (affects
   JSON/text output), `String.hashCode` (if used as key ordering).
8. Xtend specifics in `graph.json` (extension methods, `=>`, null-safe
   `?.`).
Front-load a one-page summary table (hazard → rule → shim) in the first 50
lines.

## Acceptance criteria
- Given the doc, then every section 1–8 exists and each hazard cites ≥ 1
  real ELK `file:line` (spot-check: each citation's line contains the
  construct).
- Given section 2 and 4, then numeric counts are present with the exact
  command used to obtain them (reproducible).
- Given the doc, then no absolute filesystem paths appear and OpenJDK
  source is never cited.

## Quality bar
Gates in README.md (brief). < 500 lines; if longer, split section 2 into
`docs/translation-rules-collections.md` (pre-approved addition).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.
