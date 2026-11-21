<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow: models-dir-env

How the two test files find the models directory after D1. Before: both passed `{}`, so the override branch was never
taken.

```plantuml
@startuml
title Models directory resolution in census.test.ts and corpus.test.ts (after D1)
start
:resolveModelsDir() — env = process.env;
if (ELK_MODELS_DIR set and non-empty?) then (yes)
  :dir = path.resolve(ELK_MODELS_DIR);
else (no)
  :dir = <repoRoot>/../../eclipse-elk/elk-models;
endif
:resolveModelsDirFrom(dir);
if (dir exists and HEAD = manifest commit?) then (yes)
  :{ dir } — census drift test and golden-input tests run;
else (no)
  :{ skip } — tests skip, text names dir;
endif
stop
@enduml
```
