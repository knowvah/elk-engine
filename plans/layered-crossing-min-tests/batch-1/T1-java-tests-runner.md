<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Java baseline runner

**Agent:** main session · **Commit:** `feat(T1): run oracle junit suites with tools/oracle/java-tests.sh`

## Context

T1 and T2 in [decisions.md](../decisions.md). The planning session proved the classpath by hand (2026-11-02): oracle
jars from `$ELK_ORACLE_DIR/oracle-build.json` (`jars` is an object keyed by bundle id), the third-party list of
`tools/vectors/layered-order-vectors.sh` (`THIRD_PARTY`, `newest_jar`), the two test bundles'
`target/classes` (`org.eclipse.elk.alg.layered.test`, `org.eclipse.elk.alg.test`), and from the p2 cache
`org.eclipse.equinox.common`, `org.eclipse.core.runtime`, `org.eclipse.osgi`, `org.eclipse.xtext.common.types`,
`org.objectweb.asm`, `org.apache.log4j` (1.2.25), `org.hamcrest` (3.0; `hamcrest-core` 1.3 has no jar in `~/.m2`),
plus `~/.m2/repository/junit/junit/4.13.2/junit-4.13.2.jar`. Without log4j, Xtext's standalone setup throws
`NoClassDefFoundError: org/apache/log4j/Logger`; without equinox.common, Guice throws on
`org/eclipse/core/runtime/OperationCanceledException`.

## Task

Write `tools/oracle/java-tests.sh <fqcn…>`: SPDX `#` header, `set -euo pipefail`, `ELK_ORACLE_DIR` and `P2_BUNDLES`
defaults as the sibling scripts, check `oracle-build.json`'s commit equals `tools/oracle/ELK_COMMIT`, build the
classpath (a missing bundle exits non-zero naming it), run `java … org.junit.runner.JUnitCore <fqcn>` once per class
with the `-XX:+UnlockExperimentalVMOptions -XX:hashCode=2` flags the vector scripts use, print one line per class
(`<fqcn> runs=<n> failures=<n>`), keep each log under a temp dir and print its path on failure, exit non-zero if any
class fails. No argument: print usage. Then run it over the fourteen suites and journal the counts.

## Write-set

`tools/oracle/java-tests.sh`.

## Acceptance criteria

- Given the built oracle, when run with the fourteen suites, then the per-suite runs equal the
  [baseline](../decisions.md#baseline) (280 total) and failures are 0.
- Given `P2_BUNDLES` pointing at an empty directory, when run, then it exits non-zero and names the first missing bundle.
- Given `shellcheck -x tools/oracle/java-tests.sh`, then clean.

## Observability / Rollback

N/A — no new observable operations. Reversible (new file).
