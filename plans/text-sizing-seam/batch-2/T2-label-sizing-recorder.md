<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: label-sizing recorder and ref

**Agent:** `java-architect`, sonnet, with [agent-rules.md](../agent-rules.md). **Decisions:** TX3, TX4, TX6, TX7.
**Writes:** `tools/vectors/LabelSizingVectors.java`, `tools/vectors/label-sizing-vectors.sh`,
`tools/vectors/label-sizing-texts.txt`, `test/golden/refs/java/label-sizing.json` (new; written only by the script).
Scratch under `$TMPDIR/text-sizing-seam/T2/`.

## Context

Patch 0003 (T1) is in the oracle. `TestConfiguration.computeLabelSize` now measures through
`TextMeasurer.fromSystemProperty()`, which reads the property `org.eclipse.elk.alg.test.textMeasurer` (`awt` by default,
or `fixed`). This recorder supplies the oracle's side of "TS and oracle sizes agree on label-bearing models". It must run
the real framework code (`TestConfiguration.apply`), never a copy of it.

## Read-set

- `tools/vectors/layered-label-metrics-vectors.sh`, `LayeredLabelMetricsVectors.java` (the closest precedent: a JDK-only
  single-file program and how it writes JSON)
- `tools/oracle/java-tests.sh:18-95` (classpath: oracle jars, the `alg.test` and `alg.layered.test` classes, JUnit 4.13.2,
  Hamcrest, the Xtext standalone bundles); `tools/vectors/elkt-vectors.sh:1-60` (Xtext standalone `.elkt` loading, `die`,
  `oracle_field`)
- `tools/vectors/LayeredLabelsVectors.java:180-270` (loading `.elkt`, the `ElkGraphJson` export used for layouts)
- `$ELK_ORACLE_DIR/test/org.eclipse.elk.alg.test/src/.../framework/config/{TestConfiguration,TextMeasurer}.java` (patched)
- `test/corpus/census.json` (`labels`, `parse`, `id`) for the corpus mode

## Program contract

`java -cp <cp> -Dorg.eclipse.elk.alg.test.textMeasurer=<mode> LabelSizingVectors.java <args>`; the script sets `-XX:hashCode=2`
in `JAVA_TOOL_OPTIONS` as `java-tests.sh` does.

| Mode (script flag) | Property | Inputs | Output |
|--------------------|----------|--------|--------|
| default (`<outDir>`) | `fixed` | `label-sizing-texts.txt`; every label-bearing `.elkt` under `test/golden/inputs/labels/` and `test/corpus/elkt-curated/` (sorted repo-relative paths; a model whose bytes repeat an earlier one is skipped by content hash) | `<outDir>/label-sizing.json` |
| `--corpus <modelsDir> <outDir>` | `fixed` | the census ids with `labels > 0` and `parse: ok` | `<outDir>/label-sizing-corpus.json` (sizes only, no layout) |
| `--remeasure-awt <outDir>` | unset | `layered-label-metrics-texts.txt` | `<outDir>/awt-remeasure.json`, the same shape as `layered-label-metrics.json` |

`label-sizing.json` shape (the interface T3 and T4 consume):

```json
{ "jdk": "21.0.1", "os": "Mac OS X aarch64", "measurer": "fixed",
  "texts": [ { "text": "P1", "size": [12.0, 12.0] } ],
  "models": [ { "path": "test/golden/inputs/labels/…/x.elkt",
                "labels": [ { "key": "<element path>#<label index>", "text": "…", "size": [w, h], "preset": false } ],
                "layout": { …ElkGraphJson export after layout… } } ] }
```

- `key`: the identifier path of the label's parent from the root (for example `n1/p2`; an element with no identifier uses
  `@<index in its containment list>`), then `#` and the label's index in `getLabels()`. A label of a label nests:
  `n1#0#0`. Document the format in the program header so that T3 derives the same key.
- `preset`: true when the label already had a nonzero size or an empty text before `apply`. Its size is recorded as it was.
- Sizes print as Java `Double.toString`. The layout export uses the options of the existing layout recorders (layout
  included, zero dimensions included). A model whose layout throws records `"throws": "<class>: <message>"` instead of
  `layout`.
- Sizing goes through `TestConfiguration.fromTestClass(new TestClass(NoDefaults.class)).apply(new NoDefaults(), graph)`,
  where `NoDefaults` is an empty public static nested class with no `@DefaultConfiguration`, so every default stays off
  (`TestConfiguration.java:41-48`) and only `ensureSensibleLabelSize` acts.

## Steps

1. Write the program, the script (the usage line, `set -euo pipefail`, the oracle stamp check and the platform check of
   stop 5) and the text list (the push-forward rows of [stop-conditions.md](../stop-conditions.md)).
2. Run the default mode into scratch twice: the two outputs must be byte-equal. Then write the ref through the script into
   `test/golden/refs/java/`.
3. Run `--remeasure-awt`, then compare every `[width, height]` with `layered-label-metrics.json` `sizes`. They must be
   equal on every key (stop 4). Report the count.
4. Run `--corpus "$ELK_MODELS_DIR" "$ELK_ORACLE_DIR/label-sizing"`, detached under `nice -n 10` if it is slow. Report the
   number of models and labels, and every model that failed to parse or size.

## Acceptance criteria

- Given the patched oracle and the fixed property, when the script runs twice, then the two `label-sizing.json` files are
  byte-equal and every `texts` row equals `[length × 6, 12]`.
- Given a vendored model with a label whose size is preset, when it is recorded, then that row has `preset: true` and its
  original size.
- Given no property, when `--remeasure-awt` runs on the reference platform, then every size equals the committed
  `layered-label-metrics.json` value.
- Given the corpus, when `--corpus` runs, then every census model with `labels > 0` and `parse: ok` has an entry (759 at
  planning) or a named failure.

**Observability:** N/A, no new observable operations. **Rollback:** Reversible (delete the four files).
