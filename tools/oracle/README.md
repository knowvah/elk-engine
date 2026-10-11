<!-- SPDX-License-Identifier: EPL-2.0 -->

# Oracle build

The conformance oracle (AD-3) is upstream ELK built **from source** in a
detached git worktree, so that seam patches (for example text-sizing
normalization) can be layered on as a versioned patch series. elkjs is not
an oracle.

## Prerequisites

- Maven 3.9.x (not 3.10: Tycho 4.0.12 fails to start on it), git
- JDK 21 (JDK 17 is the fallback ELK CI uses; select it via `JAVA_HOME`)
- Network access on the first run (Tycho downloads p2 and Maven artifacts)
- A clean clone of ELK at `ELK_SOURCE_DIR` (never modified; read-only)

## Environment variables

| Variable | Default | Meaning |
|----------|---------|---------|
| `ELK_SOURCE_DIR` | `<repo>/../elk` | ELK git clone |
| `ELK_ORACLE_DIR` | `<repo>/../elk-oracle` | worktree created here |
| `ELK_MVN` | `mvn` | Maven executable (must be 3.9.x) |
| `MAVEN_OPTS` | `-Xmx3g` | JVM options for Maven |

## Usage

```sh
tools/oracle/build.sh
```

Steps: create the worktree at `tools/oracle/ELK_COMMIT`, apply
`tools/oracle/patches/*.patch` with `git am --3way` (lexical order), run
`mvn -P elk-meta clean install -DskipTests` (melk compiler) and then
`mvn clean install -DskipTests -Dmaven.test.skip=true` (default profile)
from `build/`, and write `$ELK_ORACLE_DIR/oracle-build.json` listing the
jar of every in-scope bundle. Output is teed to `.oracle-build.log`.

Exit codes: `0` ok, `1` missing precondition (tool, Maven version, source
repo), `2` existing worktree out of date or dirty (left untouched), `3` an
in-scope bundle jar is missing.

## Add a seam patch

1. Commit the change in the oracle worktree (`$ELK_ORACLE_DIR`).
2. `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <sha>..HEAD`
   (files are named `NNNN-*.patch`).
3. Reset (below) and rebuild.

## Reset

```sh
git -C "$ELK_SOURCE_DIR" worktree remove --force "$ELK_ORACLE_DIR"
tools/oracle/build.sh
```

## Quality gates

`shellcheck tools/oracle/build.sh` is clean; functions stay <= 30 lines.
