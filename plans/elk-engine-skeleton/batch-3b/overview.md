<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3b — Architecture and translation documentation

Runs in parallel with Batch 3a after Batch 2a (T13 cross-checks T5's
`bundle-deps.json`). Tasks independent; they read the same ELK sources.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T13 | Overview, plugin inventory, component map | documentation-engineer | docs/architecture/overview.md, inventory.md, component-map.md | T5 | [x] |
| T14 | Java package → TS module port map | documentation-engineer | docs/architecture/port-map.md (+ optional port-map-alg-layered.md) | T1 | [x] |
| T15 | Java→TS translation rules with ELK citations | java-architect | docs/translation-rules.md (+ optional translation-rules-collections.md) | T1 | [x] |
