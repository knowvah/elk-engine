<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: text-sizing-seam (roadmap row 10, issue #41)

## Observation: the pin's only text measurement is in the JUnit framework

- **Context**: Finding the site that patch 0003 should normalize (the roadmap and AD-3 assumed "text-sizing seams" by
  analogy with dot-engine).
- **Finding**: No plugin in scope measures text. `Core.melk:712-730` only declares the programmatic options `font.name`
  and `font.size`. The single AWT measurement is `test/org.eclipse.elk.alg.test/.../framework/config/TestConfiguration.java:179-198`.
  The golden harness (`tools/oracle/harness/*.java`) and every vector recorder lay labels out at their given size (zero
  when the text format gives none). Only `tools/oracle/java-tests.sh` puts `org.eclipse.elk.alg.test` on a classpath.
- **Impact**: A text-sizing patch can only touch the test bundle, so it cannot move a golden or vector value. Rebuilding
  still re-stamps `patches` in the nine `_meta.json` and the parity report header.
- **Confidence**: High

## Observation: `java-tests.sh` takes JVM system properties through `JAVA_TOOL_OPTIONS`

- **Context**: Choosing how to switch the oracle's JUnit runs into a non-default mode.
- **Finding**: `java-tests.sh:95` appends `-XX:hashCode=2` to an existing `JAVA_TOOL_OPTIONS` and does not replace it, so
  `JAVA_TOOL_OPTIONS=-D<prop>=<value>` reaches every class's JVM without a script change.
- **Impact**: A property-gated seam needs no change to the frozen oracle scripts.
- **Confidence**: High (read from the script; T1 confirms it at run time)

## Observation: label-bearing inputs already vendored

- **Context**: Choosing CI-runnable inputs for an oracle comparison with labels.
- **Finding**: `test/golden/inputs/labels/` holds 123 `.elkt` files, 115 of which contain `label`. `test/corpus/elkt-curated/`
  holds 31, of which 22 contain `label`. The census lists 759 parse-ok models with `labels > 0` (21,753 labels).
- **Impact**: Label comparisons can run in CI without elk-models. The corpus-wide run stays local (AD-5).
- **Confidence**: High
