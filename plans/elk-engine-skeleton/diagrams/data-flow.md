<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flows

## 1. JVM vectors → frozen tests → shim (proof loop, T6 → T9/T10)

```plantuml
@startuml
actor Executor
participant "JavaVectors.java\n(JDK 21)" as V
database "test/golden/refs/java" as R
participant "vitest" as T
participant "src/java/*" as S
Executor -> V : java tools/vectors/JavaVectors.java <outDir>
V -> R : random.json, lang.json (hex-bit doubles)
Executor -> T : write tests replaying vectors (frozen, AD-13)
Executor -> S : implement from Javadoc spec (AD-9)
T -> S : replay every case
S --> T : bit-identical values
@enduml
```

## 2. Oracle build and golden generation (T8 → T11 → T16)

```plantuml
@startuml
actor Executor
participant "build.sh" as B
participant "git (ELK clone)" as G
participant "Maven/Tycho" as M
participant "run.sh / ElkOracle" as H
participant "regen-goldens.sh" as RG
database "test/golden/refs/elk" as Refs
Executor -> B : build
B -> G : worktree add --detach $ELK_ORACLE_DIR <ELK_COMMIT>
B -> G : git am patches/*.patch (none yet)
B -> M : -P elk-meta install; default profile package (tests skipped)
M --> B : plugin jars
B -> B : write oracle-build.json
Executor -> RG : regen
RG -> H : run.sh <tmp> <manifest golden inputs>
H --> RG : laid-out ELK JSON (one JVM)
RG -> Refs : refs + _meta.json {elkCommit, patches, modelsCommit}
@enduml
```

## 3. Golden check in CI (no JVM)

```plantuml
@startuml
participant "oracle-refs.test.ts" as T
database "test/golden/refs/elk" as Refs
participant "manifest.json" as Man
participant "compareLayout" as C
T -> Man : golden ids
T -> Refs : load refs + _meta.json
T -> C : compareLayout(ref, ref)
C --> T : ok, no diffs
note right of T : Later missions compare\nTS layout output vs refs
@enduml
```
