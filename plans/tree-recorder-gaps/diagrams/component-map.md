<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: tree-recorder-gaps

The new outputs, and what reads them. The five landed refs and their tests are unchanged, apart from the `REF_FILES` append.

```plantuml
@startuml
skinparam componentStyle rectangle
package "tools/vectors" {
  [RadialVectors.java\n(plan 1 + new plan 2)] as RV
  [VertiFlexVectors.java\n(plan 1 + new plan 2)] as VV
  [MrTreeVectors.java\n(plans 1, 2 + new plan 3)] as MV
}
package "test/golden/refs/java" {
  [radial.json] as R1
  [radial-extra.json (new)] as R2
  [vertiflex.json] as V1
  [vertiflex-extra.json (new)] as V2
  [mrtree.json\nmrtree-extra.json] as M1
  [mrtree-extra2.json (new)] as M2
}
package "src/alg (tests)" {
  [RadialVectors.test.ts] as RT1
  [RadialExtraVectors.test.ts (new)] as RT2
  [VertiFlexVectors.test.ts] as VT1
  [VertiFlexExtraVectors.test.ts (new)] as VT2
  [MrTreeVectors.test.ts\n(REF_FILES += extra2)] as MT
}
[oracle jars 8bca22f4 + 0001-0004] as O
RV --> O : calls
VV --> O : calls
MV --> O : calls
RV --> R1 : writes first, byte-identical
RV --> R2 : writes second
VV --> V1 : writes first, byte-identical
VV --> V2 : writes second
MV --> M1 : writes first, byte-identical
MV --> M2 : writes third
RT1 --> R1 : replays
RT2 --> R2 : replays
VT1 --> V1 : replays
VT2 --> V2 : replays
MT --> M1 : replays
MT --> M2 : replays
@enduml
```
