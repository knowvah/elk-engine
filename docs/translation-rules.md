<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java to TypeScript translation rules (ELK port)

Surveyed: the 13 in-scope bundles (decisions.md "Bundle scope") at ELK
`8aaa3c145c2a18a38aabbc725aa3791ddc517a76` (677 .java, 5 .xtend, 13 .melk). Java semantics come
from the Javadoc/JLS only (AD-9). See also [overview](architecture/overview.md),
[port map](architecture/port-map.md), [section 2 detail](translation-rules-collections.md).

| Hazard                     | Rule                                             | Shim / idiom             | Sec  |
| -------------------------- | ------------------------------------------------ | ------------------------ | ---- |
| `int` `+ - *` overflow     | wrap to int32 after every op                     | `Int32.add/sub/mul`      | 1.1  |
| `int` `/` `%`              | truncate; `/0` throws                            | `Int32.div/rem`          | 1.2  |
| shifts, `>>>`              | distance masked (31); unsigned                   | `Int32.shl/shr/ushr`     | 1.3  |
| `long`                     | `number` unless > 2^53, then `bigint`            | documented sites only    | 1.4  |
| `(int)` of double          | NaN to 0, trunc, saturate                        | `d2i`                    | 1.5  |
| `(int)` of long            | keeps low 32 bits (wraps)                        | `JavaMath.l2i`           | 1.5  |
| `float`                    | round to binary32 after each op                  | `Float32.*`              | 1.6  |
| `char`                     | UTF-16 unit as `number`; math promotes           | `charCodeAt`             | 1.7  |
| `Math.round`               | ties to +inf, NaN to 0, saturate                 | `Math.round` shim        | 1.8  |
| `Math.sin/cos/pow/...`     | <= 1 ulp only                                    | native; divergence list  | 1.9  |
| `Double.compare`           | -0.0 < 0.0, NaN greatest                         | `Double.compare` shim    | 1.10 |
| `Double.MIN_VALUE`         | smallest positive, not negative                  | `Number.MIN_VALUE`       | 1.10 |
| HashMap, value keys        | reproduce Java order                             | `JavaHashMap` (AD-10)    | 2    |
| HashMap, identity keys     | order undefined: insertion, journal              | `Map`/`Set`              | 2    |
| `Linked*`, `HashBiMap`     | insertion order                                  | `Map`/`Set`              | 2    |
| `EnumMap/EnumSet`          | ordinal order                                    | ordinal-indexed          | 2    |
| `TreeSet`                  | `compare == 0` is a duplicate                    | sorted array             | 2    |
| `PriorityQueue`            | tie order = heap algorithm                       | binary heap + vectors    | 2    |
| sort                       | stable; bad comparators differ                   | native stable sort       | 2    |
| `ListIterator`, `remove()` | cursor semantics                                 | `ListIterator` class     | 2    |
| `Random(seed)`             | 48-bit LCG per Javadoc                           | `java/util/Random`       | 3    |
| seed `0`                   | time-seeded; inject the clock                    | seed provider            | 3    |
| Guava views                | `reverse/filter/get` are live                    | local helpers            | 4    |
| `DoubleMath.fuzzy*`        | Javadoc formula                                  | local `fuzzyEquals`      | 4    |
| EMF containment            | add moves; inverse refs update; no notifications | plain classes (AD-11)    | 5    |
| `equals/hashCode` keys     | value equality (Pair, KVector)                   | key function             | 6.1  |
| enum with fields           | static init order                                | class + static instances | 6.3  |
| overloading                | one TS signature set                             | merged/suffixed names    | 6.5  |
| language exceptions        | `IndexOutOfBounds`, `NumberFormat` caught        | explicit checks          | 6.7  |
| `assert`                   | disabled by default                              | dev-only helper          | 6.8  |
| streams                    | eager vs lazy; `parallelStream`                  | arrays, sequential       | 6.9  |
| `Double.toString`, concat  | Java format                                      | `Double.toString` shim   | 7    |
| Xtend `==`, `?.`, `=>`     | `equals`, null-safe, `with`                      | see table                | 8    |

## Conventions

- Citation form `bundle/src/.../Rest.java:line`: `bundle` omits `org.eclipse.elk.`; `...` stands for
  `org/eclipse/elk/<bundle path>/`. Resolve and print a cited line with (bash or zsh):

```bash
cite() { local b=${1%%/src/*} r=${1#*/src/.../}; local f=${r%:*} l=${r##*:} d; d=$(printf %s "$b" | tr . /)
  sed -n "${l}p" "$ELK_SOURCE_DIR/plugins/org.eclipse.elk.$b/src/org/eclipse/elk/$d/$f"; }
cite 'alg.layered/src/.../p4nodes/NetworkSimplexPlacer.java:333'   # double offset = y - Math.round(y);
```

- Counts use the `G` helper and `SRC` list in
  [collections 2.0](translation-rules-collections.md#20-how-the-inventory-was-built).
- Proof: JVM vectors in `test/golden/refs/java/`: `tools/vectors/JavaVectors.java` (JDK 21) writes
  all but `guava.json` (`tools/vectors/GuavaVectors.java`, Guava 33.3.0-jre). `lang.json` (`round`
  52, `roundFloat` 28, `floorDiv` 72, `floorMod` 72, `d2i` 52, `d2l` 52, `i32` 558 with ops add
  sub mul div rem shl shr ushr neg, `doubleCompare` 1024), `random.json` (seeds 0, 1, -1, 42,
  2^63-1, -2^63, 25214903917 x 32 calls: nextInt, nextIntBound, nextLong, nextDouble, nextFloat,
  nextBoolean, nextGaussian, shuffle); the other files are cited per rule.
- Shims live in `src/java/lang/`, `src/java/util/`, `src/guava/`; each rule below names its export.
  Javadoc base: `https://docs.oracle.com/en/java/javase/21/docs/api/java.base/`.
- Confidence (research-sources.md): HIGH = checked this run against Javadoc/JLS/ELK source;
  MEDIUM = single source or not re-measured; stated inline.

## 1. Numeric types

### 1.1 `int` overflow

- Rule: every `+ - *` on `int` wraps to 32 bits; `x op= e` means `x = (T)(x op e)` (JLS 15.26.2),
  so `intVar += doubleExpr` adds in double, then truncates with `d2i`. TS: `Int32.add/sub/mul`
  (`Math.imul` for `*`), never bare `+` on ints that can exceed 2^31.
- ELK: `Integer.MAX_VALUE - modelOrderMap.size()`
  `alg.layered/src/.../p1cycles/BFSNodeOrderCycleBreaker.java:189`; wrapping hash sum
  `core/src/.../math/KVector.java:155`; `Integer.MAX_VALUE` is a sentinel 51 times: port it as
  `2147483647`, never `Infinity` (`G 'Integer\.MAX_VALUE'`).
- Proof: `lang.json` `i32` (add, sub, mul include wrapping cases). Confidence HIGH (JLS 15.26.2).

### 1.2 Integer division and remainder

- Rule: `/` rounds toward zero (JLS 15.17.2); `int` division by zero throws `ArithmeticException` (JS
  gives `Infinity`/`NaN`); `MIN / -1` is MIN. `%` takes the dividend's sign, as in JS, so it
  differs only for a zero divisor (throws) and `-0` results (`-4 % 2` is `-0` in JS, `0` in Java).
  TS: `Int32.div/rem` throw on zero and return `r | 0`. `Math.floorDiv/floorMod` have **0** in-scope
  callers (`G 'Math\.floor(Div|Mod)\('`); their shims serve no current port.
- ELK `/`: `(layers - 1) / 2` `alg.layered/src/.../intermediate/LabelDummySwitcher.java:332`.
- ELK `%`: 17 lines (`G '[A-Za-z0-9_)] ?% ?[A-Za-z0-9_(]'`, 19 hits minus a `String.format`
  pattern and a URL): 15 integer, 2 double. Negative-guarded `(i - k + n) % n`
  `core/src/.../math/CubicSplineInterpolator.java:84`; `Long % int` from `Collectors.counting()`
  `alg.common/src/.../polyomino/PolyominoCompactor.java:299`; double fmod `retval % Math.PI`
  `alg.layered/src/.../p5edges/splines/SplinesMath.java:128`.
- Proof: `i32` div/rem (72 each) include `MIN / -1` and `rem(-1, 1) = 0` (pins the `-0` rule).
  Closed: `numeric.json` `divZero` (40 rows) pins the throws (`Int32.div/rem`). HIGH.

### 1.3 Shifts and bit operations

- Rule: shift distance is masked to 5 bits for `int` (6 for `long`); `>>>` is unsigned (JLS 15.19).
  JS `>>>` yields uint32 (`| 0` if the Java result is an `int`). TS: `Int32.shl/shr/ushr`; `long`
  shifts use `Int64` (`bigint`) or paired int32 halves.
- ELK: the only 64-bit bit twiddling in scope is `TwoBitGrid`: `grid[y][xWord] >>> (xRest << 1)`
  `alg.common/src/.../polyomino/structures/TwoBitGrid.java:185`, `:211` (shifts up to 62 on a
  `long[][]`). 7 `<<` lines in scope in total.
- Proof: `i32` shl/shr/ushr (54 each). HIGH.

### 1.4 `long` and `bigint`

- Rule: `number` while |v| < 2^53 is provable; otherwise `bigint` at a **documented** site. Shim
  `src/java/lang/Int64.ts` (`add sub mul div rem neg shl shr ushr`, wrapping to 64 bits;
  `numeric.json` `i64`, 4056 rows).
- Sites: `ElkMath.FACT_TABLE`, `factl`, `binomiall` (20! > 2^53)
  `core/src/.../math/ElkMath.java:36`, `:51`, `:97`; `TwoBitGrid` words (above; a `Uint32Array`
  pair-of-halves rewrite is equivalent and avoids `bigint`); `Random` state and `nextLong` (48/64
  bit, internal to the shim); `long randomSeed = random.nextLong()` fed to `setSeed`
  `alg.layered/src/.../p3order/LayerSweepCrossingMinimizer.java:95`, `:612`, `:188` (full 64 bits:
  `bigint`). `System.currentTimeMillis()` fits `number`; `serialVersionUID` fields are dropped.
- `Math.round` returns `long`: `JavaMath.roundToLong` returns `bigint` (vector value
  `"9223372036854775807"` is a string); `JavaMath.round` returns `number` and throws `RangeError`
  outside the safe-integer range. In-scope consumers narrow or subtract from a small double. HIGH.

### 1.5 Casts

- `(int)` of `double`/`float`: NaN to 0, round toward zero, then saturate to int range (JLS 5.1.3)
  -> `d2i`. ELK: `(int) (xe / cellSizeX)` truncates negatives, it does not floor
  `alg.disco/src/.../structures/DCPolyomino.java:227`. A comparator that casts a double
  difference gives ties for |diff| < 1: `alg.layered/src/.../InteractiveLayeredGraphVisitor.java:849`.
- `(int)` of `long`: **keeps the low 32 bits, wraps** (JLS 5.1.3), unlike double to int. ELK:
  `(int) Math.round(xTemp)` `alg.mrtree/src/.../p3place/NodePlacer.java:329`,
  `alg.layered/src/.../intermediate/wrapping/ARDCutIndexHeuristic.java:57`. Identical to
  `d2i(round(x))` only while |x| < 2^31. Closed: `numeric.json` `l2i` (78 rows) -> `l2i(bigint)`
  in `src/java/lang/JavaMath.ts`, used as `l2i(roundToLong(x))`.
- Other casts: `(float)` see 1.6; `(long)` has 1 site (`G '\(long\)'`); 38 `(int)` casts in
  scope (`G '\(int\)'`). Proof: `d2i`, `d2l`. HIGH.

### 1.6 `float`

- Rule: a `float` is a binary32; every float operation and cast rounds to binary32; widening to
  `double` is exact, so a stored float carries its rounding error into later double math. TS:
  `Math.fround(...)` after each float op, cast and `floatValue()`.
- ELK: `float barycenter = (float) sum / inLayerConnections`
  `alg.layered/src/.../p3order/AbstractBarycenterPortDistributor.java:258`; ratios
  `(float) (newSize.x / oldSize.x)` `alg.layered/src/.../graph/LGraphUtil.java:95`; a list element
  rounded to float, then compared with a double
  `alg.layered/src/.../p5edges/orthogonal/HyperEdgeSegment.java:149`; metadata literal
  `aspectRatio = 1.6f` `core/src/.../Core.melk:163` (AD-12 generator, [melk-codegen](architecture/melk-codegen.md):
  `Math.fround(1.6)` = 1.600000023841858). 89 `float` tokens in scope (`G '\bfloat\b'`).
- Shim `src/java/lang/Float32.ts`: `fromDouble` (narrowing; `numeric.json` `d2f`, 72 rows) and
  `add sub mul div` (`Math.fround(a op b)`; `f32`, 2704 rows). Also `roundFloat`; `random.json`
  `nextFloat` values are float bits widened to double. HIGH.

### 1.7 `char`

- Rule: UTF-16 code unit (0..65535); arithmetic promotes to `int`; `(char) i` is `i & 0xFFFF`;
  `String + char` appends the character, `String + int` its digits. Java and JS strings are both
  UTF-16, so `length`/`charAt` agree. TS: `number` plus `charCodeAt` / `String.fromCharCode`.
- ELK (6 sites): `(char) ('a' + (int) (Math.random() * validCharacterRange))`
  `core/src/.../util/BasicProgressMonitor.java:541`; `charAt`
  `core/src/.../comments/NodeReferenceMatcher.java:342`; `toCharArray`
  `graph/src/.../util/GraphIdentifierGenerator.java:227`. CLAUDE.md row confirmed (JLS 5.1.3). HIGH.

### 1.8 `Math.round`, `floor`, `ceil`

- `Math.round(double)` returns the closest `long`, **ties toward positive infinity**; NaN gives 0;
  out-of-range values saturate to `Long.MIN/MAX_VALUE` (Javadoc `Math#round(double)`). CLAUDE.md row
  confirmed. JS `Math.round` has the same tie rule but returns NaN/-0/+-Infinity, so the shim is
  `Math.round` plus NaN to 0, clamp to +-2^63, and `r + 0` (normalizes -0). **Never**
  `Math.floor(x + 0.5)`: vector `3fdfffffffffffff` (0.49999999999999994) must give 0. `round(float)`
  returns `int` (vectors `roundFloat`).
- ELK: `double offset = y - Math.round(y)` `alg.layered/src/.../p4nodes/NetworkSimplexPlacer.java:333`
  (long promoted to double); `(int) Math.round(rowsd)` `ARDCutIndexHeuristic.java:57` (see 1.5).
- `floor`/`ceil` are bit-identical to JS (return `double`; `ceil(-0.5)` is -0.0 in both):
  `(int) Math.floor((d + 1.0) / 2.0)` `alg.layered/src/.../p4nodes/bk/BKAligner.java:118`,
  `(int) Math.ceil(spacing)` `NetworkSimplexPlacer.java:414`. HIGH.

### 1.9 `Math.*` accuracy (AD-4 known divergences)

- Rule: Javadoc requires only <= 1 ulp for `sin cos tan exp log log10 pow` (2 ulp for `atan2`,
  semi-monotonic); `sqrt` and `+ - * /` are correctly rounded. JVM and V8 may differ in the last
  bit for the transcendental ones. Use native `Math.*`; the 1e-6 tolerance (AD-4) absorbs value
  drift. If a golden difference is traced to a last-ulp flip of a discrete decision (`==`,
  comparator tie), record it in the known-divergences list (created then, AD-4). Do not hand-port
  fdlibm.
- ELK: 23 trig sites (`core/src/.../math/KVector.java:95` `cos`/`sin`,
  `alg.radial/src/.../RadialUtil.java:156` `atan2`), 11 `pow/exp/log/log10`
  (`core/src/.../options/TopdownSizeApproximatorUtil.java:66` `Math.exp`), 38 `sqrt`.
  `(int) (Math.floor(Math.log10(size)) + 1)` `alg.mrtree/src/.../intermediate/FanProcessor.java:96`
  needs `log10(10^n) == n` exactly (Javadoc requires it). Closed, no shim: native `Math.log10`
  matched all 1264 `numeric.json` `log10` rows (powers of ten included).
- `Math.min/max` propagate NaN and order -0.0 below 0.0 in both languages; `Math.abs(Integer.MIN_VALUE)`
  stays MIN (Javadoc) -> `Int32.abs`; `Math.signum` matches `Math.sign`:
  `alg.layered/src/.../p4nodes/bk/NeighborhoodInformation.java:200`. Javadoc HIGH; V8 MEDIUM (not measured).

### 1.10 `Double.compare`, `-0.0`, NaN, constants

- `Double.compare` / `Double.compareTo` give a total order: `-0.0 < 0.0`, NaN equals itself and is
  greater than +Infinity (Javadoc). `<`, `==` follow IEEE (`NaN != NaN`, `-0 == 0`). Use the
  shim, never `a - b`. 83 `Double.compare` sites; e.g. heap comparator with ties
  `core/src/.../util/BoxLayoutProvider.java:551`; boxed `compareTo` `alg.common/src/.../NaiveMinST.java:59`.
- `-0.0`: `KVector.equals` uses `==` (`core/src/.../math/KVector.java:120`, `0.0` equals `-0.0`)
  while `hashCode` hashes the bits (`:155`, they differ). Port both faithfully; a string key such
  as `` `${x},${y}` `` would conflate them (`String(-0) === "0"`).
- NaN as an "unset" sentinel: `alg.layered/src/.../p5edges/orthogonal/HyperEdgeSegment.java:74`, test
  `Double.isNaN` `:353` -> `Number.isNaN`, never `=== NaN`.
- `Double.MIN_VALUE` is the smallest **positive** value (4.9e-324), not the most negative; ELK uses
  it as a running-max seed: `alg.layered/src/.../p3order/MedianHeuristic.java:118`,
  `alg.radial/src/.../intermediate/CalculateGraphSize.java:40`. Port literally as `Number.MIN_VALUE`;
  do not "fix". `Double.MAX_VALUE` is `Number.MAX_VALUE`; `POSITIVE_INFINITY` (69 sites) is `Infinity`.
- Proof: `doubleCompare` (1024 pairs including NaN, +-0). HIGH.

## 2. Collections and iteration order (AD-10)

Inventory, commands, per-site tables and container rows:
[translation-rules-collections.md](translation-rules-collections.md).

- 179 `HashMap`/`HashSet` creations = **142 distinct containers**; **42 are iterated**: 8
  value-hashed (IProperty, String, KVector-derived), 2 Integer-keyed but sorted through a `TreeSet`,
  2 enum-keyed (identity hash), 30 identity-hashed.
- Clearest AD-10 site: spore `NaiveMinST` sorts a `HashSet<TEdge>` by weight, so equal-weight tie
  order is HashSet order: `alg.common/src/.../NaiveMinST.java:58`, `:59`.
- Shims: `src/java/util/{HashStrategy,JavaHashMap,JavaHashSet,PriorityQueue,Collections}.ts`
  (models, skipped scripts and runbook in the collections doc). Rows for `LinkedHash*`,
  `EnumMap/EnumSet`, `TreeSet/TreeMultimap`, `PriorityQueue`, sorts, `Iterator.remove`,
  `ListIterator` are in collections 2.3.

## 3. Randomness

- `java.util.Random(long seed)`: 48-bit LCG, seed scrambled with `0x5DEECE66D`; `nextInt(bound)`,
  `nextLong`, `nextDouble` (53 bits), `nextFloat` (24 bits), `nextBoolean`, `nextGaussian`
  (polar method, cached second value). The Javadoc states these algorithms and requires them for
  portability ("Java implementations must use all the algorithms shown here"), so the shim
  `src/java/util/Random.ts` is written from the Javadoc and proven by `random.json`.
- Seeds: `new Random(randomSeed)` with an `Integer` widens with sign extension; negative seeds occur
  (`random.json` seed `-1`): `alg.layered/src/.../GraphConfigurator.java:121`.
- **Seed 0 means time-seeded.** Option text: `core/src/.../Core.melk:608` (`randomSeed`), `:612`
  ("If the value is 0, the seed shall be determined pseudo-randomly"). Core default is 0
  (`Core.melk:162`); layered and force default to 1 (`alg.layered/src/.../Layered.melk:124`,
  `alg.force/src/.../Force.melk:50`). Unseeded `new Random()`: `GraphConfigurator.java:119`,
  `alg.force/src/.../ForceLayoutProvider.java:91`, `core/src/.../util/RandomLayoutProvider.java:63`;
  a null seed in force falls back to `new Random(1)` (`ForceLayoutProvider.java:96`). TS: inject
  the seed provider (testability.md); golden inputs use a nonzero seed.
- Who owns a `Random`: layered stores it as `InternalProperties.RANDOM`
  (`alg.layered/src/.../options/InternalProperties.java:147`); force passes it to its models
  (`alg.force/src/.../model/AbstractForceModel.java:70`); `KVector.wiggle` takes one
  (`core/src/.../math/KVector.java:398`). Radial, disco, rectpacking, topdownpacking, vertiflex
  create none (`G 'new Random\('`: 9 sites in total).
- Draw order is observable: port every draw in sequence, including re-seeding
  (`random.setSeed(randomSeed)` `LayerSweepCrossingMinimizer.java:188`, which also clears the cached
  Gaussian; `random-setseed.json`). Used: `nextInt(bound)`
  (`alg.layered/src/.../p1cycles/GreedyCycleBreaker.java:232`), `nextDouble`, `nextFloat`,
  `nextBoolean`, `nextLong`; `nextGaussian`: 0 sites.
- **`Collections.shuffle`: 0 uses in scope** (`G 'Collections\.shuffle'`; the two textual hits are
  comments, `alg.layered/src/.../options/InternalProperties.java:439`). `Collections.shuffle` in
  `src/java/util/Collections.ts` (Javadoc algorithm) is vector-proven but has no caller.
- Non-seedable randomness stays nondeterministic: `Math.random()` (4 sites): debug folder names
  `BasicProgressMonitor.java:541`; a discarded call `alg.layered/src/.../p3order/MedianHeuristic.java:40`;
  jitter when two spore vertices coincide `alg.spore/src/.../ElkGraphImporter.java:169`; JSON id
  generator `graph.json/src/.../JsonExporter.xtend:489`. Goldens must not depend on them. HIGH.

## 4. Guava

AD-10: local helpers, never a dependency: `src/guava/{Lists,Iterables,Iterators,Strings,DoubleMath,
Joiner,Splitter,Range,Table,ImmutableMap,ImmutableSet,Sets,Maps,HashBiMap,Multimap,HashMultimap,
ArrayListMultimap,LinkedListMultimap,LinkedHashMultimap,TreeMultimap}.ts`. The hash-ordered `Maps`,
`Sets.newHashSet*`, `HashBiMap` and multimaps replay `guava.json` (1518 scripts); the rest follow
the Javadoc. Known gap: `Sets.newTreeSet` (`src/guava/Sets.ts`) is a snapshot, not live. Inventory:
355 import lines in 203 files (`G 'import (static )?com\.google\.common' | wc -l`; `G -l ... | wc -l`).
Per-call counts: `grep -rhoE --include='*.java' --include='*.xtend' PATTERN "${SRC[@]}" | sort | uniq -c`
with `PATTERN='\b(Lists|Maps|Sets|Iterables|Iterators|Strings|DoubleMath|Joiner|Splitter|Streams|Predicates|HashBiMap|Immutable(Map|Set))\.[a-zA-Z]+'`.

| Guava                                                                                               |              Count | TS replacement and semantics                                                                                                                                      |
| --------------------------------------------------------------------------------------------------- | -----------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Lists.newArrayList`                                                                                |                271 | `[]` / `[...it]` (copies)                                                                                                                                         |
| `Lists.newLinkedList` / `ArrayListWithCapacity` / `WithExpectedSize`                                |        42 / 26 / 7 | `[]`                                                                                                                                                              |
| `Lists.reverse`                                                                                     |                 33 | **live view**; copy only if consumed before the source changes: `alg.common/src/.../RectilinearConvexHull.java:131`                                               |
| `Maps.newHashMap` / `newLinkedHashMap` / `newEnumMap`                                               |         68 / 7 / 4 | see section 2                                                                                                                                                     |
| `Sets.newHashSet` / `newLinkedHashSet` / `newTreeSet`                                               |        44 / 17 / 6 | see section 2                                                                                                                                                     |
| `Sets.immutableEnumSet` / `intersection`                                                            |             15 / 5 | frozen ordinal set; `intersection` is a live view                                                                                                                 |
| `Iterables.concat/size/isEmpty`                                                                     |       21 / 20 / 13 | lazy `concat`; `size` iterates unless a collection                                                                                                                |
| `Iterables.filter/getFirst/all/any/getLast/get/transform/addAll`                                    |    8/5/5/4/3/2/1/1 | `filter`/`transform` are lazy, re-iterable views: `alg.layered/src/.../graph/LNode.java:247`                                                                      |
| `Iterators.filter/concat/singletonIterator/unmodifiableIterator`                                    |            2/1/1/1 | generators: `core/src/.../util/ElkUtil.java:989`                                                                                                                  |
| `Strings.isNullOrEmpty` / `repeat`                                                                  |            33 / 18 | `s == null \|\| s.length === 0`; `repeat` (negative count throws)                                                                                                 |
| `DoubleMath.fuzzyCompare` / `fuzzyEquals`                                                           |            28 / 19 | below                                                                                                                                                             |
| `Joiner.on` / `Splitter.on`                                                                         |              4 / 1 | `join` converts elements with `toString` (Java double text, section 7); `Splitter` keeps empty parts like JS `split`: `graph.json/src/.../JsonExporter.xtend:456` |
| `HashBiMap.create`                                                                                  |                  8 | local BiMap; insertion-ordered keys (Guava Javadoc); `put` of a duplicate value throws                                                                            |
| `HashMultimap` / `ArrayListMultimap` / `LinkedListMultimap` / `LinkedHashMultimap` / `TreeMultimap` | 12 / 4 / 1 / 1 / 1 | local `Multimap`; `get(k)` is a live, never-null view; `HashMultimap` is hash-ordered (section 2)                                                                 |
| `Table`/`ArrayTable`, `Range.closed`                                                                |               1, 1 | 2-D array with index maps (`alg.layered/src/.../intermediate/loops/ordering/PortRestorer.java:96`); `{lo, hi}` (`.../p2layers/MinWidthLayerer.java:107`)          |
| `ImmutableMap` / `ImmutableSet` (`of`, `copyOf`)                                                    |              2 / 2 | frozen insertion-ordered copy: `core/src/.../util/ElkSpacings.java:209`                                                                                           |
| `Function`, `Predicate`, `Predicates.and`, `Streams`, guava `Optional`                              |      5, 8, 1, 2, 1 | plain functions / generators / `T \| undefined`                                                                                                                   |

`DoubleMath` (Guava Javadoc, fetched): `fuzzyEquals(a, b, tol)` is
`Math.abs(a - b) <= tol || Double.valueOf(a).equals(Double.valueOf(b))` (all NaNs equal, +-0 equal,
`tol < 0 || NaN` throws `IllegalArgumentException`); `fuzzyCompare(a, b, tol)` is
`fuzzyEquals(a, b, tol) ? 0 : Double.compare(a, b)`. Neither is transitive, so never feed them to
`sort`. ELK: `core/src/.../math/ElkMath.java:1030`, `core/src/.../util/ElkSpacings.java:279`.

## 5. EMF (ElkGraph, AD-11)

- `src/emf/` is a minimal EMF runtime (D1); EMF is EPL-2.0, so unlike OpenJDK (AD-9) its source may
  be read and ported. It mirrors EMF's paths and class names (`EList`, `EObject`, `EcoreEMap`,
  `EcoreUtil`), D2/D4 surface only (no notifications, adapters, proxies, `eGet/eSet/eIsSet`,
  resources). Detail: [architecture/elkgraph-model.md](architecture/elkgraph-model.md).
- List contract (D2), HIGH: `test/golden/refs/java/graph.json` (40 JVM scenarios, 654 steps,
  `tools/vectors/GraphVectors.java`; replay `src/graph/impl/ElkGraph.replay.test.ts`). Lists are
  live and unique (`add` of a present element returns `false`; `set` throws
  `IllegalArgumentException`); inverse lists sync both ends; containment lists move elements between
  containers; `EcoreEMap` is insertion-ordered, `put` in place, `put` after `removeKey` appends.
- **Only the generated setters check recursive containment** (`setParent`, `setContainingNode`, via
  `EcoreUtil.isAncestor`); a containment-list `add` can build a cycle, after which `eAllContents()`
  never terminates (D2 amendment).
- Model (D3): interface/impl split in `src/graph/` and `src/graph/impl/`, Java accessor names;
  `instanceof <interface>` is an exported guard (`isElkNode(o)`) over a registry in
  `src/graph/ElkGraphPackage.ts` (constants only). D4: `eContainer`, `eContents`, `eAllContents`
  (pre-order: `properties`, `labels`, `ports`, `children`, `containedEdges`, then
  `sections`/`bendPoints`). D10: identity-hash `toString()`s drop the `@hash`; NPE is `TypeError`.
- `IProperty` equality is by id (D5, `src/graph/properties/MapPropertyHolder.ts`); `ElkReflect` keys
  by constructor (D6), cloners come from `LayoutMetaDataService` (mission 5), until then
  `Property.test.ts`; annotations: registries (D7); `KVectorChain` is a `LinkedList` (D8).

## 6. Java language

### 6.1 `equals` / `hashCode` as map keys

- 21 `equals` and 21 `hashCode` overrides in scope (`G 'boolean equals\('`, `G 'int hashCode\('`);
  everything else is identity. JS `Map` has identity keys only: value-keyed containers use a key
  function or `JavaHashMap` with a `HashStrategy` (`src/java/util/HashStrategy.ts`: `hash`,
  `equals`, optional `compare`; `STRING`, `INTEGER`, `DOUBLE`, `hashable()`).
- Value-equal keys that matter: `KVector` (mutable! `core/src/.../math/KVector.java:117`), `Pair`
  (`core/src/.../util/Pair.java:152`), `IProperty` (id, `Property.java:102`), `TEdge`/`TTriangle`
  (`alg.common/src/.../TEdge.java:44`), and **sets as keys**: `Set<PortSide>` in a `HashMultimap`
  (`alg.layered/src/.../components/ComponentGroup.java:96`), where `Set.equals` is element equality.
  Keys that mutate after insertion (`KVector`) behave like Java only if `hashCode` is recomputed
  on lookup: `JavaHashMap` does, a string key does not.

### 6.2 Interfaces with default methods

- 17 `default` methods (`core/src/.../comments/IDataProvider.java:70`). TS interfaces carry no bodies:
  use an abstract base class, mixin or helper function; a class implementing several such
  interfaces must receive each default explicitly.

### 6.3 Enums with fields, methods, `ordinal()`

- 120 enums, 66 `ordinal()` calls. Port as a class with `static readonly` instances created in
  declaration order, an `ordinal` field, `values()`, `valueOf`, `name()`, `compareTo` by ordinal.
  Static blocks run after all constants: `alg.common/src/.../polyomino/structures/Direction.java:28`
  (sets `horizontal` after construction). `ordinal()` indexes arrays and builds comparators:
  `alg.common/src/.../nodespacing/cellsystem/StripContainerCell.java:89`,
  `alg.common/src/.../nodespacing/internal/NodeContext.java:251`. `switch` on enums becomes a
  `switch` on the instance with an exhaustive `default: never`.

### 6.4 Inner and anonymous classes, static init order

- 42 anonymous `new X() { ... }` bodies: arrow functions when single-method, otherwise a named
  class (e.g. `alg.layered/src/.../intermediate/HierarchicalPortOrthogonalEdgeRouter.java:423`).
  Non-static inner classes capture `this`: pass the outer explicitly.
- 7 `static {}` blocks (`G '^\s*static \{'`): ES class static blocks run in textual order with
  the field initializers, as in Java. Registration code (`graph/src/.../util/ElkReflect.java:46`,
  `core/src/.../data/LayoutMetaDataService.java:125`) must run before first use; avoid
  import-order-dependent module side effects (the module-global fitness test forbids them).

### 6.5 Overloading and varargs

- TS cannot declare two methods of one name with different bodies. Rule: same name when arity or
  runtime type distinguishes the overloads (TS overload signatures, one implementation with an
  `instanceof`/`typeof`/argument-count dispatch, call sites unchanged); when parameter types are
  indistinguishable at runtime (`int` vs `double`, `Number` vs `Boolean`), suffix the Java
  type or purpose (`addInt`, `addDouble`) and note the Java name in the `@see`.
- ELK: `KVector.add(KVector)` / `add(double, double)` `core/src/.../math/KVector.java:219`, `:234`;
  Xtend dispatch overloads `addJsonObj(JsonObject, String, Number|boolean|String|...)`
  `graph.json/src/.../JsonAdapter.xtend:169-185`. Java picks overloads by compile-time type; a
  runtime dispatch can differ when a `double` holds an integer.
- Varargs (34 sites): `...` becomes a rest parameter; `Arrays.asList(array)` aliasing is gone:
  `core/src/.../math/ElkMath.java:671` (`long... values`).

### 6.6 `instanceof` chains

- 171 `instanceof`: class checks stay `instanceof`; interface checks (`instanceof IProperty<?>`
  `graph/src/.../properties/Property.java:103`) need a brand or type-guard function (TS interfaces
  vanish at run time); check-then-cast `core/src/.../math/KVector.java:118` becomes a guard.

### 6.7 Exceptions: checked, language-raised, and caught

- The 6 custom ELK exceptions are all `RuntimeException`, e.g.
  `core/src/.../UnsupportedGraphException.java:22` (`G 'extends (Exception|RuntimeException)'`).
  Checked ones are JDK: `IOException` (6 catches), `InstantiationException`/`IllegalAccessException`
  (reflection, 7), `NoSuchFieldException` (2). TS has no checked exceptions; keep every throw site
  and message. **Hierarchy (AD-16a):** every exception class extends its Java parent; JS `Error` stands in
  for `Throwable`, with `src/java/lang/Exception.ts` and `RuntimeException.ts` below it (unchecked under
  `RuntimeException`, `IOException` under `Exception`), so a handler for a parent catches the family. The
  Java parent wins over a JS built-in (`ArithmeticException extends RuntimeException`, not `RangeError`).
  A ported `catch (Exception | RuntimeException)` stays a catch-all (D10's `TypeError` is not under them);
  a narrower catch is an `instanceof` check. New code adds no Java-named shim for a JVM error nothing
  catches: use `TypeError`/`RangeError` (AD-16b). Idiomatic errors belong to the AD-14 public layer
  (AD-16c). `test/architecture/exception-hierarchy.fitness.test.ts` pins every class's parent.
  Classes (M5), in `src/java/lang/`:
  `IllegalArgumentException`, `NumberFormatException`, `IndexOutOfBoundsException`,
  `ArrayIndexOutOfBoundsException`, `ArithmeticException`; amendments
  `UnsupportedOperationException` (immutable helpers), `IllegalStateException`
  (`Property.getDefault`, unregistered cloneable), `StringIndexOutOfBoundsException` (`String.charAt`/
  `substring` range checks in the Xtext ports); `src/java/util/NoSuchElementException.ts`.
- **Language-raised exceptions that ELK catches** (10 sites,
  `G 'catch \((Array)?IndexOutOfBounds'`): array indexing outside bounds throws in Java, yields
  `undefined` in JS. `alg.common/src/.../polyomino/structures/TwoBitGrid.java:224` wraps
  `ArrayIndexOutOfBoundsException` into `IndexOutOfBoundsException`;
  `.../polyomino/structures/PlanarGrid.java:79` catches `IndexOutOfBoundsException`. Rule: port with
  an explicit bounds check that throws the same type and message. Likewise `NumberFormatException`
  from `Double.parseDouble` (`core/src/.../math/KVector.java:531`): `Number(s)` accepts `""` (0) and
  hex, Java rejects them and accepts a trailing `d`/`f` and surrounding whitespace (Javadoc trims)
  -> `JavaDouble.parseDouble` (`src/java/lang/JavaDouble.ts`; `text.json` `parseDouble`, 96 rows).
- **Erased generic casts.** Where a ported generic is reached through an `unknown` boundary (Xtext's
  `IValueConverterService.toString(Object, String)`), the JVM's bridge-method checkcast becomes an explicit
  `checkCast(value, guard, javaName)` (`src/java/lang/JavaCast.ts`) at the method that binds the type, so a
  wrong-typed value throws `ClassCastException` before the body runs; null passes. `Integer` and `Double` share
  `isNumber`. Evidence: 8 converter rows of `graph-text-lexer.json` (class only; the JDK text is unspecified).
- `catch (Exception e)` that cleans up and rethrows (`core/src/.../RecursiveGraphLayoutEngine.java:463`,
  disposes the provider, `throw exception`): a plain `try/catch` rethrow in TS.

### 6.8 `assert`

- 141 `assert` statements (`G '^\s*assert '`); assertions are disabled unless the JVM runs with
  `-ea` (JLS 14.10). None has a side effect (`G` for `++ -- add( remove( put( set*( next(` inside
  asserts returns 0). Port to a `devAssert(cond, msg?)` helper compiled out of production; keep the
  expressions free of effects. CLAUDE.md row confirmed: `ElkSpacings.java:80`. HIGH.

### 6.9 `Optional`, streams, `Iterable` laziness

- 5 `Optional<` declarations, 226 `.stream()`, 12 `parallelStream()`, 48 `Collectors.` uses. Java
  streams are lazy (one element flows through the whole pipeline); TS arrays are eager per stage,
  visible only with side effects or short circuits (`findFirst`
  `alg.layered/src/.../p3order/counting/CrossingsCounter.java:432`): arrays for pure lambdas,
  generators when side-effect order matters. `parallelStream()` (`PolyominoCompactor.java:236`)
  `collect(toSet())`/`forEach` are unordered: treat as sequential, journal where order feeds output.
- `Collectors.toSet()` is a `HashSet` (section 2); `toList()` keeps encounter order; `Stream.sorted()`
  is stable (`alg.layered/src/.../p5edges/orthogonal/HyperEdgeSegmentSplitter.java:71`). Guava
  `Iterables.filter` views are lazy and see later mutation (section 4): port as an `Iterable`
  that re-evaluates in `[Symbol.iterator]`, not a materialized array.

## 7. Strings and text

- `Double.toString` (and `"" + double`) follows the Javadoc: shortest decimal that round-trips
  (closest, ties to even significand; one or two digits when the shortest has length 1), plain
  notation for 1e-3 <= |v| < 1e7 else computerized scientific (`1.0E10`), always at least one
  fraction digit (`100.0`), `-0.0`, `NaN`, `Infinity`. JS prints `100`, `1e+21`, `5e-324`
  (Java: `4.9E-324`). Closed: `DoubleToString.toString` in `src/java/lang/DoubleToString.ts`
  (shortest digits, Java layout; `text.json` `toString`, 14,939 rows). ELK: `KVector.toString`
  `"(" + x + "," + y + ")"` `core/src/.../math/KVector.java:113`, the stored text of a vector
  option; `IndividualSpacings.toString` joins `getId() + ":" + value` over the (hash-ordered) map
  `core/src/.../util/IndividualSpacings.java:122`. `String.format` has 4 sites, all debug or file
  names (`NaiveMinST.java:76`, `BasicProgressMonitor.java:553`); `%d`/`%02d`/`%.2f` need
  `Formatter` rules (HALF_UP for `%.2f`); port only the used specifiers.
- `String.hashCode` is `s[0]*31^(n-1) + ... + s[n-1]` in int arithmetic (Javadoc, verified); it
  decides `HashMap<String,...>` order (collections V3, V4): `JavaString.hashCode` (`hash.json`
  `stringHash`). `Double.hashCode` is `(int)(v ^ (v >>> 32))` over `doubleToLongBits` (Javadoc,
  verified): `JavaDouble.hashCode` (`doubleHash`, `doubleToLongBits`); `JavaInteger.reverse` serves
  `KVector.hashCode` (`integerReverse`, `kvectorHash`).
- Parsing: `Integer.valueOf` (`core/src/.../data/LayoutOptionData.java:245`) rejects `"1.0"`:
  `JavaInteger.valueOf` (`text.json` `integerValueOf`, 33 rows); `Double.parseDouble` see 6.7.
- JSON numbers (Gson): integral doubles print as `100.0` in Java, `100` in JS. The oracle
  comparison is numeric (AD-4), so only parse differences matter: ids parsed as double then
  `intValue()` (`graph.json/src/.../JsonAdapter.xtend:46`) lose precision above 2^53 (MEDIUM).

## 8. Xtend in `graph.json`

5 files: `JsonAdapter.xtend` (225 lines), `JsonExporter.xtend` (509), `JsonImporter.xtend` (866),
`JsonMetaDataConverter.xtend` (91), `JsonImportException.xtend` (36). Counts via
`grep -rEn --include='*.xtend' -e PATTERN graph.json/src | wc -l`.

| Xtend                          | Meaning                                   | TS                                     | Example                                     |
| ------------------------------ | ----------------------------------------- | -------------------------------------- | ------------------------------------------- |
| `a == b`, `a != b` (2 / 7)     | `equals()`, null-safe                     | `Objects.equals` helper, **not** `===` | `graph.json/src/.../JsonExporter.xtend:459` |
| `a === b`, `a !== b` (27 / 46) | reference identity                        | `===`                                  | `JsonExporter.xtend:179`                    |
| `a?.b` (18)                    | null-safe call                            | `a?.b`                                 | `graph.json/src/.../JsonAdapter.xtend:93`   |
| `a ?: b` (10)                  | elvis (`null` only)                       | `a ?? b`                               | `graph.json/src/.../JsonImporter.xtend:199` |
| `x => [ it\| ... ]` (33)       | `with`: run lambda on `x`, return `x`     | helper `with(x, f)`                    | `JsonImporter.xtend:124`                    |
| `list += e` (6)                | `list.add(e)` (EList semantics, sec. 5)   | `list.add(e)`                          | `JsonImporter.xtend:199`                    |
| `extension JsonAdapter` (3)    | static/instance methods called as members | explicit `adapter.fn(x)` calls         | `JsonImporter.xtend:53`                     |
| `[ a \| ... ]`, `it` (43 / 26) | lambdas; implicit `it`                    | arrow functions                        | `JsonExporter.xtend:117`                    |
| `switch o { String: ... }` (7) | type-guard switch                         | `typeof`/`instanceof` chain            | `JsonAdapter.xtend:186`                     |
| `obj.prop` / `.size`           | getter / `size()`                         | `getX()` / `.length`                   | `JsonImporter.xtend:387`                    |
| `def` without type (114)       | inferred return type                      | declare explicit return types          | `JsonImporter.xtend:99`                     |
| `x as T` (2)                   | checked cast                              | type guard + throw                     | `JsonAdapter.xtend:72`                      |

Operators per the Xtend docs (`https://eclipse.dev/Xtext/xtend/documentation/203_xtend_expressions.html`:
`==` is `operator_equals`, `=>` the with-operator, `?:` elvis; MEDIUM on the exact null-safety of `==`).
Other rules: a method returns its last expression; `if` is an expression; `val`/`var` are
final/mutable; `x + ""` concatenates with Java formatting (section 7, `JsonExporter.xtend:491`);
`implementationError` returns a plain `new Error(...)` (`graph.json/src/.../JsonAdapter.xtend:60`),
`JsonImportException` extends `RuntimeException`. Port layout, Gson subset, evidence: [elk-json.md](architecture/elk-json.md).

## 9. Corrections to CLAUDE.md and vector gaps

CLAUDE.md rows confirmed: `int`, `long`, `double`, `Math.round`, `char`, `String`, `assert`, checked
exceptions (with the additions in 6.7), Guava, EMF. Corrections or additions:

- **`(int)` cast row**: true for `double`/`float`; a `long` operand wraps. Closed: `JavaMath.l2i`
  (1.5); ELK's `(int) Math.round(x)` is the long case.
- **integer division row**: `floorDiv/floorMod` have vectors (`numeric.json` `divZero`, `lang.json`)
  and shims in `src/java/lang/JavaMath.ts` but no in-scope caller; ported code uses truncating
  `Int32.div/rem` that throw on zero and normalize `-0` (1.2).
- **Hash row**: enum keys are identity-hashed (collections 2.0); KVector-derived keys (`TEdge`,
  `TTriangle`) are value-hashed and need `JavaHashMap` (`NaiveMinST`).
- **Hazards line**: `Collections.shuffle` has no in-scope caller (shim in `Collections.ts`);
  `Random` draws (`nextInt`, `nextDouble`, `nextFloat`, `nextBoolean`, `nextLong`, `setSeed`) do.

Vector gaps, all closed (frozen files in `test/golden/refs/java/`; AD-9, AD-13): `l2i` ->
`numeric.json` `l2i` -> `JavaMath.l2i`; `fround` arithmetic -> `numeric.json` `f32`, `d2f` ->
`Float32.ts`; `Math.log10` powers of ten -> `numeric.json` `log10`, no shim (native);
`Double.toString`, `parseDouble` -> `text.json` -> `DoubleToString.ts`, `JavaDouble.parseDouble`;
`String.hashCode`, `Double.hashCode` -> `hash.json` -> `JavaString.hashCode`, `JavaDouble.hashCode`;
`HashMap` order -> `collections.json` -> `JavaHashMap.ts`, `JavaHashSet.ts`; `PriorityQueue` ties ->
`collections.json` -> `PriorityQueue.ts`; `Random.setSeed` mid-sequence -> `random-setseed.json` ->
`Random.ts`; Guava helpers -> `guava.json` -> `src/guava/*` (section 4).

## 10. Xtend and Xtext in `graph.text` {#xtend-xtext}

17 Xtend files in `graph.text/src` (1,232 LOC). Xtext classes the port needs live in `src/xtext`
(mapping rule: `org.eclipse.xtext.<pkg>.<C>` is `src/xtext/<pkg>/<C>.ts`). Rows below add to section 8;
they cover what `graph.json` did not use. Design and runbook: [elk-text.md](architecture/elk-text.md).

| Xtend / Xtext                                                       | Meaning                                                     | TS                                                                                                                                                                            | Example                                                                                                                   |
| ------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `def dispatch` overloads                                            | runtime-type overload selection                             | one method with a guarded `instanceof` ladder; each overload keeps its Java name (`_format`)                                                                                  | `ElkGraphFormatter.xtend:44-184`; `qualifiedName(ElkGraphElement)/(ElkEdgeSection)` in `ElkGraphQualifiedNameProvider.ts` |
| `@Check def void m(T x)`                                            | validator check method                                      | registered check method; registration order is the Java emission order                                                                                                        | `ElkGraphValidator.xtend:52`                                                                                              |
| `@Inject` field                                                     | Guice field injection                                       | constructor parameter or plain construction, no DI framework                                                                                                                  | `ElkGraphValidator.xtend:49-50` (`LayoutOptionValidator`)                                                                 |
| `@Inject extension X`, `import static extension A.*`                | extension methods                                           | explicit calls: `ElkGraphTextUtil.f(x)`                                                                                                                                       | `ElkGraphFormatter.xtend:42`, `ElkGraphValidator.xtend:41`                                                                |
| `switch x { A: ... B: ... }`                                        | type-guard switch; falls off to `null` when nothing matches | `instanceof` ladder ending in `return null`                                                                                                                                   | `ElkGraphTextUtil.xtend:38`                                                                                               |
| `static val X = #{ ... }`                                           | immutable set or closure constant                           | module `const`, typed `ReadonlySet`                                                                                                                                           | `ElkGraphLinker.xtend:27-30` (`OPPOSITE_REFS`)                                                                            |
| `static val Procedure1<...> f = [ ... ]`                            | closure constant                                            | arrow function `const`                                                                                                                                                        | `ElkGraphFormatter.xtend:37-40`                                                                                           |
| `override protected m(...)`                                         | overriding a protected hook                                 | `protected override m(...)`                                                                                                                                                   | `ElkGraphLinker.xtend:34`                                                                                                 |
| expression whose result the compiler drops                          | the `xtend-gen` Java is the behaviour                       | keep the compiled behaviour, comment the dropped call                                                                                                                         | `ElkGraphSemanticSequencer.xtend:67-74` (`isQuotingNecessary` always `false`)                                             |
| Java overloads in Xtext (`getExportedObjects`, `format`, `keyword`) | resolved by argument type                                   | renamed by role: `getExportedObjectsByName`, `formatRequest`, `keyword`/`keywords` (text) vs `keywordElement(s)` (grammar id), `setPair`, `interiorOfPair`/`interiorOfObject` | `src/xtext/resource/ISelectable.ts`, `src/xtext/formatting2/`                                                             |
| `convertFromJavaString`, quoting escapes                            | Java string escapes                                         | `convertFromJavaStringFrom` in `src/xtext/util/JavaStringConverter.ts`; a trailing backslash throws `StringIndexOutOfBoundsException` (Java's `charAt`)                       | `src/xtext/util/JavaStringConverter.ts:96`                                                                                |
| Java `a ^ b < c`                                                    | `^` binds looser than `<`: `a ^ (b < c)`                    | write the parenthesised form                                                                                                                                                  | `AbstractDeclarativeValueConverterService.java:132-165` (Xtext)                                                           |
| `a.b` text of a cross-reference                                     | `NodeModelUtils.getTokenText`: one blank per hidden gap     | reference text joins tokens with one `' '`; converters get the plain concatenation                                                                                            | `src/graph/text/parser/ElkGraphParserEdges.ts`                                                                            |

Other rules: the `@Check` methods of Xtend are found by reflection in Java; the port registers them
explicitly. Xtext's `Guice` modules and `Standalone` setup become plain construction in
`src/graph/text/ElkGraphText.ts` (no module-level state, AD-8). A throw from a check is swallowed as
Xtext's `handleExceptionDuringValidation` does (`GuardException`, `TypeError`).

## 11. Lazy linking, EMF proxies and the shared parse runtime in `graph.json.text` {#lazy-linking}

Mission 4c (D13) ported Xtext's `LazyLinker` family and the EMF proxy and resource subset (amending mission-2
D4 for exactly these surfaces). Rows add to sections 5 and 10. Design and evidence:
[elk-json-text.md](architecture/elk-json-text.md#lazy-linking).

| Java / Xtext / EMF                                           | Meaning                                                                          | TS                                                                                                                                                                                         | Example                                                                                |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `LazyLinker`, `LazyLinkingResource`, `LazyURIEncoder`        | cross-references are proxies until read                                          | ported with every branch except `OPTION_RESOLVE_ALL` and the eager-linking flag (no caller passes them); `.elkt` keeps the eager `Linker`                                                  | `src/xtext/linking/lazy/`                                                              |
| `InternalEObject.eProxyURI`, `eIsProxy`, `eResolveProxy`     | EMF proxy state                                                                  | on `InternalEObject`, not `EObject`: adding to `EObject` breaks structural fixtures                                                                                                        | `src/emf/ecore/InternalEObject.ts`                                                     |
| `EcoreUtil.resolve(proxy, context)` overloads                | resolve by object or by resource set                                             | split by name: `resolve`, `resolveFromObject`                                                                                                                                              | `src/emf/ecore/util/EcoreUtil.ts`                                                      |
| `EObjectResolvingEList`, `EObjectWithInverseResolvingEList`  | lists that replace a proxy in the slot when it is read                           | ported with `ManyInverse` in its own file; `indexOf` scans for proxies only when `hasProxies()` (same result as EMF's scan, no O(n) `eIsProxy` on misses); no notifications                | `src/emf/ecore/util/`; the four `ElkEdge`/`ElkConnectableShape` lists                  |
| `Resource.getEObject(fragment)` with a multi-segment path    | reflective segment lookup                                                        | throws `UnsupportedOperationException`; `.elkj` fragments are `\|n` indices                                                                                                                | `src/emf/ecore/resource/impl/ResourceImpl.ts`                                          |
| `ResourceImpl` subclass                                      | `getResource(uri, true)` loads on demand                                         | a subclass must mark itself loaded, or the call reaches `demandLoad`                                                                                                                       | `src/emf/ecore/resource/impl/ResourceImpl.ts`                                          |
| `String.split` on a proxy fragment                           | Java regex split                                                                 | the existing Xtext `Strings.split` port (trailing empties dropped), as Java imports `org.eclipse.xtext.util.Strings`                                                                       | `src/xtext/linking/lazy/LazyURIEncoder.ts`                                             |
| `CyclicLinkingException`, `OperationCanceledError`           | `AssertionError`, `java.lang.Error` subclasses                                   | extend JS `Error` (unshimmed per D10); Java's cyclic-counter leak on throw is ported faithfully; registered in `exception-hierarchy.fitness.test.ts`                                       | `src/xtext/linking/lazy/`                                                              |
| `EValidatorRegistrar.register` with no registered validator  | `validator == null`: fresh composite, `initDefaults` adds one `EObjectValidator` | ported branch; `.elkt` passes a non-null default (two validators), `.elkj` passes `null` (one)                                                                                             | `src/xtext/validation/EValidatorRegistrar.ts`                                          |
| `NodeModelUtils` line of a diagnostic (LF, lone CR, CRLF)    | node-model line numbers                                                          | `InternalNodeModelUtils.computeLineBreaks`/`getLine`, injected through `LineSource`; `.elkt` default is the ANTLR `token.line` (LF only); a text-final `\r` is not `\n`                    | `src/xtext/nodemodel/impl/InternalNodeModelUtils.ts`, `src/xtext/parser/LineSource.ts` |
| Grammar-specific token names inside the shared parse session | `.elkt` and `.elkj` name different tokens and rules                              | `SessionVocabulary` passed to `ParseSession`; `.elkt` supplies `ELK_GRAPH_VOCABULARY`                                                                                                      | `src/xtext/parser/SessionVocabulary.ts`                                                |
| Erased-generic cast in a converter                           | `ClassCastException` from the checkcast                                          | `checkCast` (`src/java/lang/JavaCast.ts`) as in `.elkt`; a `number` cannot carry Java's `Integer`/`Float` box, so 3 `.elkj` rows stay documented skips (`INT.toString(double:1.5)` is new) | `src/graph/json/text/conversion/`                                                      |

Other rules: a `ResourceNode` fixture for EMF tests lives in `test/helpers/emf/ResourceNode.ts`. Never assert
`expect(x).not.toBe(y)` on EMF graphs in vitest: the failure message inspects a cyclic graph and hangs; compare
with `===`. An Xtext runtime module that binds no `ILinker` gets `LazyLinker` from `DefaultRuntimeModule`: check the
module before assuming the eager linker.
