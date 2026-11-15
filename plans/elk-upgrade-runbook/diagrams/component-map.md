<!-- SPDX-License-Identifier: EPL-2.0 -->

# Component map: what the mission touches

```plantuml
@startuml
title elk-upgrade-runbook: touched components
package "queue worktree (committed)" {
  [docs/architecture/elk-upgrade.md] as RB
  [test/docs/elk-upgrade-runbook.test.ts] as FT
  [tools/oracle/README.md] as RM
  [plans/roadmap.md] as RD
}
package "queue worktree (read only)" {
  [tools/vectors/*-vectors.sh] as VS
  [tools/oracle/regen-*.sh, *sweep*.sh] as OS
  [tools/oracle/ELK_COMMIT + patches] as PIN
  [test/golden/refs/**] as REFS
}
package "scratch ($TMPDIR, deleted)" {
  [clone] as CL
  [scratch oracle b715fb10] as SO
  [scratch m2] as SM
}
FT --> RB : parses inventory
FT --> VS : lists on disk
FT --> OS : lists on disk
RM --> RB : links
CL --> PIN : copy, ELK_COMMIT bumped
CL --> SO : build.sh
SO --> SM : maven.repo.local
CL --> REFS : re-recorded copy (evidence)
@enduml
```
