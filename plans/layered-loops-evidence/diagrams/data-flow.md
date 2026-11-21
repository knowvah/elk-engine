<!-- SPDX-License-Identifier: EPL-2.0 -->

# layered-loops-evidence: data flow

How a candidate graph becomes evidence. Only the oracle run produces expected values (AD-13). The TS pre-screen only
decides which candidates are worth recording.

```plantuml
@startuml
skinparam monochrome true
rectangle "T1-T3 candidate graph\n(ELK JSON, stop)" as cand
rectangle "TS scratch copy\nbase vs mutant" as screen
rectangle "evidenceSites()\nLayeredLoopsVectors*.java" as rec
rectangle "oracle JVM\n8bca22f4 + 0001-0004" as oracle
file "layered-loops.json\n(sites rows appended)" as ref
rectangle "D3 id-keyed diff" as diff
rectangle "LayeredLoopsSites.test.ts\nLayeredLoopsVectors.test.ts" as replay
rectangle "T6 driver\nM1-M10 in scratch" as mut
file "mutants.md / unreached.md" as plan

cand --> screen : pre-screen (dump differs?)
screen --> rec : accepted candidate
rec --> oracle : layered-loops-vectors.sh
oracle --> ref : recorded rows
ref --> diff : base rows byte-equal?
ref --> replay : AD-4 replay
replay --> mut : kill suite
mut --> plan : verdicts and proofs
@enduml
```
