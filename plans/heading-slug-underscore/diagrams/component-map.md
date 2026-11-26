<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: heading-slug-underscore

```plantuml
@startuml
title Files touched by heading-slug-underscore (proposed)
package "docs-site/.vitepress" {
  [config.ts\nheadingSlug, NOT_SLUG_CHARS] as CFG
  [README.md:132 (prose)] as RD
  [dist/ (build output, gitignored)] as DIST
}
package "test/docs" {
  [site-config.test.ts\nrow 74 + D3 rows] as T
}
package "node_modules (read only)" {
  [github-slugger 2.0.0] as GS
}
T --> CFG : asserts pageHeadingSlug
CFG --> DIST : ids at docs:build
GS ..> T : source of expected values
RD ..> CFG : documents the rule
@enduml
```
