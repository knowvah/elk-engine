<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow — `.elkr` text to ELK JSON

The corpus test (T12–T14) mirrors the oracle harness step for step; the vector replays check each stage on its own.

```plantuml
@startuml
participant "Corpus test\n(GRandomCorpus.test.ts)" as T
participant "GRandomText" as F
participant "GRandomLexer /\nGRandomParser" as P
participant "GRandomValidator" as V
participant "RandomGraphGenerator" as G
participant "ConfigurationParser" as C
participant "Random(seed)" as R
participant "ElkGraphJson\nexport" as J

T -> F : parse(.elkr text)
F -> P : tokens -> RandGraph
P --> F : model + syntax/conversion diagnostics
F -> V : validate(Configuration)
V --> F : issues (maxDegree/maxWidth/partition)
F --> T : RandGraph (no errors)
T -> G : new RandomGraphGenerator(null).generate(config)
G -> R : randomGeneratorFromConfig (seed)
G -> C : parse(config, random)
C -> R : draws for RandVal quantities
C --> G : GeneratorOptions
G -> R : nextInt / nextFloat / nextDouble / nextGaussian
G --> T : ElkNode[] (root unnamed)
T -> T : root id := "root"
T -> J : CaseRunner.export flags, pretty
J --> T : JSON + "\n" compared byte for byte with corpus .json
@enduml
```

```plantuml
@startuml
participant "elkr-vectors.sh" as S
participant "vector-cache.sh" as VC
participant "Elkr*Vectors.java\n(JVM, oracle jars)" as J
participant "test/golden/refs/java/\ngrandom-*.json" as O
participant "TS replay tests" as TS

S -> VC : vc_init elkr; vc_run per program
VC -> J : run on cache miss (salted by program + oracle + JDK)
J --> VC : grandom-<lexer|parse|validate|generate>.json
VC --> S : copy to <outDir>
S -> O : outDir = test/golden/refs/java (record) or /tmp (gate cmp)
TS -> O : read rows
TS -> TS : replay against the TS port (exact, presence, or invariants)
@enduml
```
