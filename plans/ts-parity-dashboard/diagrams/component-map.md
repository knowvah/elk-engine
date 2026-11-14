<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: what this mission touches

```plantuml
@startuml
package "tools/corpus" {
  [ts-layout-compare.ts\n(CLI, re-exports)] as cli
  [ts-layout-classify.ts\n(pure compare)] as classify
  [ts-layout-shards.ts\n(pool, kill)] as shards
  [ts-layout-worker.ts\n(child)] as worker
  [parity-report.ts] as report
  [parity-report-ts.ts\n(TS sections)] as reportTs
  [ts-findings.json] as findings
  [sweep.ts (frozen)] as sweep
}
package "test" {
  [test/helpers/graph-overlay.ts\ngraph-json-oracle.ts] as helpers
  [test/golden/compare-json.ts] as compare
  [test/architecture/\nmath-call-sites.*] as fitness
}
package "src (read, T6 fixes only)" {
  [RecursiveGraphLayoutEngine\n+ 14 providers] as engine
}
package "docs" {
  [docs/parity-report.md] as md
  [docs/conformance.md] as conf
  [docs-site/copy-reports.mjs] as copy
}
cli --> classify : compareCase
cli --> shards : sharded path
shards --> worker : fork, IPC
worker --> classify : compareCase
classify --> compare : compareLayout
worker --> helpers : overlay, export
worker --> engine : layout
report --> reportTs : TS cells
reportTs --> findings : annotations
report --> md : writes
copy --> md : mirrors
fitness --> engine : scans Math.* sites
fitness ..> conf : listed in
report ..> sweep : reads its output
@enduml
```
