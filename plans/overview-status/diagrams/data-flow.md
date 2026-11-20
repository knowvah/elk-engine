<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow: overview-status

No runtime data flow changes: the mission edits documentation prose. The flow below is the executor's path from the
English text to the locale copies, and why the hashes must come after the T1 commit.

```plantuml
@startuml
title English text to locale copies
start
:T1: rewrite overview, home page, README\n(D3 claims, each journaled with a source);
:commit T1 (English frozen from here);
:T2: hash each locale page against\nthe T1 English (scripts/i18n-hash.mjs);
fork
  :subagent A: locales group 1\n(Edit changed blocks + sourceHash);
fork again
  :subagent B..F: other groups\n(disjoint directories);
end fork
:orchestrator: prettier, hunk check,\ntranslation lint, i18n status;
if (locale passes?) then (yes)
  :commit T2;
else (twice no)
  :restore that locale; follow-up (stop 6);
endif
:T3: comment on #90, gates 1-7,\nroadmap revision, squash;
stop
@enduml
```
