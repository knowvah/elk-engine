<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: recorder-pin-source (issue #96, 2026-11-20)

## Observation: each of the 41 recorders reads `ELK_COMMIT` exactly once, at the stamp

- **Context**: `git grep -n ELK_COMMIT -- tools/vectors/*.java` while choosing how the sha reaches the programs.
- **Finding**: 41 declarations (25 package-private `static final`, 16 `private static final`) and 41 uses, every use
  on the line that writes `"elkCommit"` or `"oracle"` into the vector file. No `--sweep` / `--dump` path reads it.
  No other quoted 40-hex literal exists in `tools/vectors/*.java`.
- **Impact**: a lazy accessor leaves the eight sweep scripts that run recorders in `--sweep` mode untouched.
- **Confidence**: High

## Observation: 30 scripts run the 41 stamping programs, 26 of them through `vc_run`

- **Context**: Mapping call sites for `-Delk.commit`.
- **Finding**: 26 `tools/vectors/*-vectors.sh` call `vc_run` (`vector-cache.sh:93`), whose `java` lines are at 98
  (cache off), 121 (whole program) and 139 (per-row). `graph`, `graph-json`, `metadata` and `transfer` call `java`
  themselves, each with `pinned` in scope. `metadata-vectors.sh` passes only `<outDir>`, so a program cannot rely on
  being told the vectors dir.
- **Impact**: one helper in `vector-cache.sh` plus four direct edits cover every stamping program.
- **Confidence**: High

## Observation: 13 recorder scripts do not pin identity hashes

- **Context**: Assessing whether editing 41 recorder sources can move a ref (`recorder-identity-hash.md`).
- **Finding**: `grep -l hashCode=2 tools/vectors/*.sh` lists 19 scripts; `alg-common`, `comment`, `elkt`, `elkj`,
  `elkr`, `graph`, `graph-json`, `metadata`, `transfer`, `node-micro-layout`, `nodespacing-site`, `layered-framework`
  and `layered-site` do not pin. If any of their outputs follows `System.identityHashCode`, a source edit can shift it
  (javac compiles in the recording JVM). Earlier pin moves changed only a same-length string literal in each
  constant, which is weaker evidence than adding a method.
- **Impact**: the cold run is a real test, not a formality; stop 3 carries the diagnosis recipe.
- **Confidence**: Medium (the risk is real for `JavaVectors.java`; whether any of these 13 is exposed is unknown)

## Observation: the sweep before-side lives in the queue worktree, freshness unknown

- **Context**: Planning the sweep byte-comparison.
- **Finding**: `test/corpus/.{compound,json,labels,loops,order,phase,pipeline,placement,routing}-sweep/` exist in the
  queue worktree at planning. Their `.stamp` hashes oracle build, recorder source, models commit and inputs; the
  consumer tests read `results.jsonl` without checking it.
- **Impact**: rerun each sweep on the base first (it skips in seconds when fresh), copy, then compare after T1.
- **Confidence**: High

## Observation: p2 cache versions for the Guava script

- **Context**: Designing `guava-vectors.sh`.
- **Finding**: `~/.m2/repository/p2/osgi/bundle/com.google.guava/33.3.0.jre/` and
  `com.google.guava.failureaccess/1.0.2/`; `GuavaVectors.java` prints `33.3.0-jre`. JDK on PATH: 21.0.1 (Microsoft
  build), the reference platform.
- **Impact**: the script checks the OSGi `Bundle-Version` (`33.3.0.jre`), not the Maven form.
- **Confidence**: High (both manifests read: `Bundle-Version: 33.3.0.jre`, `Bundle-Version: 1.0.2`)
