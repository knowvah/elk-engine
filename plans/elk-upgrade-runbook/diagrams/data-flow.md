<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow: the rehearsal

```plantuml
@startuml
title ELK upgrade rehearsal (UP2, UP3, UP6, UP9)
actor Orchestrator as O
participant "queue worktree" as Q
participant "clone\n$R/repo" as C
participant "../elk\n(read only)" as E
participant "scratch m2\n$R/m2" as M
participant "scratch oracle\n$R/oracle" as S

O -> Q : T1 commit runbook + UP5 test
O -> C : git clone, npm ci,\nELK_COMMIT := b715fb10
O -> M : cp -cR ~/.m2/repository; touch marker
C -> E : build.sh: worktree add --detach b715fb10
E --> S : detached worktree
C -> S : git am --3way 0001-0003
C -> M : mvn install (MAVEN_ARGS repo.local)
S --> C : oracle-build.json (b715fb10)
C -> S : vector scripts, regen-*.sh, sweeps, java-tests.sh
S --> C : re-recorded refs, sweep outputs
C -> C : git diff raw; normalize sha; diff content
C --> Q : journal rows only (never refs)
O -> E : worktree remove + prune (UP9)
O -> O : rm -rf $R
@enduml
```
