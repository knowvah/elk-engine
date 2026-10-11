<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2b — JVM vectors, layout comparator, oracle build

Runs in parallel with Batch 2a after Batch 1. Tasks are independent.
T8 is long-running (Tycho build, 10–20 min cold) — start it first.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T6 | JVM vector generator + vectors | java-architect | tools/vectors/JavaVectors.java, test/golden/refs/java/random.json, test/golden/refs/java/lang.json | T1 | [x] |
| T7 | Layout JSON comparator | typescript-pro | test/golden/compare-json.ts, test/golden/compare-json.test.ts | T1 | [x] |
| T8 | Oracle worktree + Tycho build script | build-engineer | tools/oracle/build.sh, tools/oracle/ELK_COMMIT, tools/oracle/patches/.gitkeep, tools/oracle/README.md | T1 | [x] |

Pre-req for T8: `mvn -v` ≥ 3.9 (pre-flight). If missing at execution time,
STOP (installing system tools is the user's call).
