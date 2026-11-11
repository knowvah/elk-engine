<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations — layered-compound (mission 7h, 2026-11-10)

## Observation: the hierarchical driver is already ported; only the compound classes and the resizer are not

- **Context**: Sizing row 7h against the landed tree.
- **Finding**: `ElkLayered.doCompoundLayout`, `hierarchicalLayout`, `ElkLayeredHierarchy.ts` and the test-controller notify
  hooks landed in 7f. `doCompoundLayout` throws only at the staged `CompoundGraphPreprocessor`. `CrossHierarchyEdgeComparator`
  was neither staged nor ported. `ElkLayered` constructs both compound processors directly, with no enum.
- **Impact**: 7h ports about 1,735 Java lines and proves the driver. The facades must keep throwing until wiring (H11, sections
  behind facades), or the landed staged-throw tests break mid-mission.
- **Confidence**: High

## Observation: `tools/oracle/run.sh` sets no `-XX:hashCode`

- **Context**: Choosing how to record layered goldens under `INCLUDE_CHILDREN`.
- **Finding**: every vector and sweep script exports `-XX:hashCode=2`, while `run.sh` (used by `regen-goldens.sh`) does not. The
  compound processors iterate identity-keyed `HashMultimap`/`HashMap`/`HashSet` (`CompoundGraphPreprocessor.java:107,129,252`,
  `CompoundGraphPostprocessor.java:86,89,117`).
- **Impact**: the new golden set exports the flag for itself only, and records the no-flag run as evidence (H4).
- **Confidence**: High

## Observation: `test/corpus/variants.json` feeds the corpus sweep's enumeration

- **Context**: Considering combined direction × hierarchy variants for goldens.
- **Finding**: `tools/corpus/sweep.ts:120-151` plans one case per variant per model. A new variant changes the sweep. No corpus
  `.json` sets `INCLUDE_CHILDREN` (23 `.elkt` do), and the harness reads ELK JSON only.
- **Impact**: goldens use the existing single variants (direction-_, hierarchy-_). Direction × `INCLUDE_CHILDREN` cells are
  vector rows.
- **Confidence**: High

## Observation: three 7h suite cases need `elk.stress`

- **Context**: Mapping the 9 unported `JT` files (exactly the 9 allocated to 7h; 88 of 97 ported at planning).
- **Finding**: `665_includeChildrenDoesntStop.elkt:21` and `examples/hierarchy/hierarchicalLayoutMixing.elkt:49` lay out a child
  with stress. That hits `Issue665Test` (1 case) and `Issue700Test` (2 of 4). The oracle passes them (its classpath has
  `alg.force`).
- **Impact**: a `needs-ruling` issue (H13). The planning session's `gh issue create` was denied, so the executor files it.
- **Confidence**: High

## Observation: the graph.json test classes are compiled in the oracle but not on `java-tests.sh`'s classpath

- **Context**: Baseline for the 3 graph.json methods deferred to 7h.
- **Finding**: `$ELK_ORACLE_DIR/test/org.eclipse.elk.graph.json.test/target/classes` exists. `java-tests.sh:33` lists only the
  layered and alg test bundles.
- **Impact**: use a scratch copy with the bundle added (7f S1 precedent).
- **Confidence**: High
