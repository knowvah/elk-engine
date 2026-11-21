<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: what each task touches

```plantuml
@startuml
title layered-stress-cases: components and owning tasks
package "test/helpers" {
  [layout-test-runner.ts] as R
  [stress-pending.ts] as P #pink
}
package "src/alg/layered/issues" {
  [Issue665Test.test.ts] as S1
  [Issue700Test.test.ts] as S2
}
package "test/golden" {
  [inputs/compound (+2 .elkt)] as I
  [inputs/manifest.json] as MF
  [algorithm-refs.test.ts] as AR
  [refs/java/layered-label-metrics.json] as LM
}
package "tools/vectors" {
  [layered-label-metrics-texts.txt] as TX
  [LayeredLabelMetricsVectors.java] as LV
}
package "src/alg/force/options" {
  [Force/StressMetaDataProvider] as FP
}
S1 --> R : T4 uses
S2 --> R : T4 uses
S1 ..> P : deleted by T4
S2 ..> P : deleted by T4
R --> FP : T3 registers
S1 --> I : T2 vendors
S2 --> I : T2 vendors
AR --> MF : T2 checks inventory
TX --> LV : T1 input
LV --> LM : T1 records (append 4)
@enduml
```
