<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow: docs build, example check and pack rehearsal (proposed)

## Docs build and link check (CI, every PR)

```plantuml
@startuml
actor CI
participant "npm run docs:build" as build
participant "tools/typedoc\n(TS 6.0.3)" as td
participant "candidate-index.ts" as cand
participant "VitePress" as vp
participant "linkinator" as lc
CI -> build : run
build -> td : npm ci --prefix; typedoc
td -> cand : read entry + src types
td --> build : docs-site/reference/*.md
build -> vp : build (snippets from test/docs/examples)
vp --> build : .vitepress/dist
CI -> lc : docs:linkcheck (internal + fragments)
lc --> CI : 0 broken or fail
@enduml
```

## Example check (inside `npm run coverage`)

```plantuml
@startuml
participant "regen-goldens.sh\n--set examples" as regen
participant "oracle JVM" as jvm
database "refs/elk-examples" as refs
participant "examples.test.ts" as test
participant "test/docs/examples/*.ts" as ex
regen -> jvm : lay out examples-inputs/*.json
jvm --> refs : oracle JSON + _meta.json
test -> ex : run example (imports @knowvah/elk-engine)
ex --> test : laid-out graph
test -> refs : compare at 1e-6
@enduml
```

## Pack rehearsal (`pack:smoke --entry`)

```plantuml
@startuml
participant "pack-smoke.ts" as ps
participant "esbuild" as eb
participant "npm pack / install\n($TMPDIR)" as npm
participant "clean node process" as node
ps -> eb : bundle candidate-index.ts
ps -> npm : pack, install tarball offline
ps -> node : lay out first example input
node --> ps : ELK JSON on stdout
ps -> ps : compare with elk-examples ref (1e-6)
@enduml
```
