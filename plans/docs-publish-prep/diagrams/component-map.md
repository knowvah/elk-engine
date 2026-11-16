<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map (proposed)

```plantuml
@startuml
package "src/ (unchanged)" {
  [index.ts\nexport {}] as idx
  [graph, core, alg.*] as src
}
package "test/public-api" {
  [candidate-index.ts] as cand
}
package "test/docs" {
  [examples/*.ts] as ex
  [examples.test.ts] as ext
}
package "test/golden" {
  [examples-inputs + refs/elk-examples] as gold
}
package "tools" {
  [typedoc/ (TS 6)] as td
  [release/pack-smoke.ts] as ps
  [oracle/regen-goldens.sh] as regen
}
package "docs-site" {
  [guide/getting-started.md] as gs
  [reference/ (generated)] as ref
  [.vitepress/config.ts\ni18nRouting: false] as cfg
}
package "release (not run)" {
  [.releaserc.json + release.yml\nworkflow_dispatch] as rel
  [PUBLISHING.md] as pub
}
cand --> src : re-exports
ex --> cand : @knowvah/elk-engine
ext --> ex : runs
ext --> gold : compares
regen --> gold : writes (oracle)
td --> cand : entry point
td --> ref : generates
gs --> ex : snippet import
ps --> cand : --entry bundle
ps --> gold : compares
rel ..> pub : maintainer runbook
idx ..> cand : on acceptance (DP9)
@enduml
```
