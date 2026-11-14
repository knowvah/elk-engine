<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: text-sizing seam (proposed)

Patch 0003 in the oracle, its TS twin in `test/helpers/`, and the evidence that compares them. Plugins and `src/` are not
touched.

```plantuml
@startuml
skinparam componentStyle rectangle
package "Oracle (../elk-oracle, patch 0003)" {
  [TestConfiguration\n(alg.test)] as JTC
  [TextMeasurer\nfromSystemProperty()] as JTM
  [AwtTextMeasurer\n(verbatim AWT body)] as JAWT
  [FixedAdvanceTextMeasurer\n[len×6, 12]] as JFIX
}
package "TS test framework (test/helpers)" {
  [layout-test-runner.ts] as TR
  [layout-test-labels.ts\nensureSensibleLabelSize] as TL
  [layout-test-text-measurer.ts\ntextMeasurerFrom(env)] as TTM
  [FX8 snapshot\nlayered-label-metrics.json] as SNAP
}
package "Evidence" {
  [LabelSizingVectors.java] as REC
  [label-sizing.json\n(ref)] as REF
  [label-sizing.test.ts\nlabel-sizing-sweep.test.ts] as CMP
}
JTC --> JTM : computeLabelSize
JTM --> JAWT : unset / awt
JTM --> JFIX : fixed
TR --> TL : passes measurer
TL --> TTM : measure(text)
TTM --> SNAP : awt (default)
TTM ..> JFIX : fixed = same formula
REC --> JTC : apply() with fixed
REC --> REF : writes
CMP --> REF : expected values
CMP --> TL : fixed measurer
@enduml
```
