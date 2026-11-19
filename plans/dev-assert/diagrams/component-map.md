<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: dev-assert

```plantuml
@startuml
title Components touched by dev-assert (proposed)
package "src/java/lang" {
  [DevAssert.ts] as DA
  [AssertionError.ts] as AE
}
package "src (call sites, 143 Java asserts)" {
  [core / alg.common / mrtree / force\n(T3, 17)] as L3
  [layered intermediate/loops\n(T4, 42)] as L4
  [layered intermediate\n(T5, 46)] as L5
  [layered phases, graph, ...\n(T6, 38)] as L6
}
package "test" {
  [setup/dev-assertions.ts] as SU
  [architecture fitness tests\n(module-globals, exception-hierarchy)] as FT
  [SelfLoopHolderTest.test.ts] as SLT
}
[vitest.config.ts] as VC

L3 --> DA : devAssert(thunks)
L4 --> DA : devAssert(thunks)
L5 --> DA : devAssert(thunks)
L6 --> DA : devAssert(thunks)
DA --> AE : throws on failure
VC --> SU : setupFiles
SU --> DA : setAssertionsEnabled(true)
FT ..> DA : ALLOWLIST entry (D2)
FT ..> AE : registers parent Error (D3)
SLT ..> AE : imports the shim (D6)
@enduml
```
