<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1b — Validation + `ElkUtil`, vendored `.melk`, JVM metadata dump

Three independent tasks; runs in parallel with batch 1a (write-sets disjoint). T7 records the
oracle's metadata **before** any generator code exists (AD-13, C4); T6 gives the generator its
inputs in CI (C9).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T5 | Visitors, `GraphIssue`, `ElkUtil.printElementPath`, `StringBuilder`/identity-hash shims | typescript-pro | src/core/util/{IGraphElementVisitor,ElkUtil}.ts, src/core/validation/{GraphIssue,IValidatingGraphElementVisitor}.ts, src/java/lang/{StringBuilder,IdentityHashCode}.ts (+ .test.ts) | — | [ ] |
| T6 | Vendor the 13 `.melk` files + manifest + sync script | tooling-engineer | tools/melk/sources/*.melk, tools/melk/sources/manifest.json, tools/melk/sync-sources.sh, test/melk/sources.test.ts | — | [ ] |
| T7 | JVM metadata dump (`metadata.json`) | java-architect | tools/vectors/MetaDataVectors.java, tools/vectors/metadata-vectors.sh, test/golden/refs/java/metadata.json | — | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
