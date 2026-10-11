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
jar of every in-scope bundle (including the D0 bundles `graph.text`,
`graph.json.text`, `core.debug.grandom`). Output is teed to `.oracle-build.log`.

`tools/oracle/build.sh --record-only` skips Maven (and the Maven version
check) and only rewrites `oracle-build.json` from the jars already built in
the worktree; use it after adding a bundle to `BUNDLES`.

Exit codes: `0` ok, `1` missing precondition (tool, Maven version, source
repo), `2` existing worktree out of date or dirty (left untouched), `3` an
in-scope bundle jar is missing.

## Run

```sh
tools/oracle/run.sh <outDir> <input.json|input.elkt>...
tools/oracle/run.sh --cases <cases.jsonl> <outDir>
```

Positional form: lays out each input (layout mode); output is
`<outDir>/<input basename without extension>.json`, so basenames must be
unique per run. `regen-goldens.sh` uses this form.

Case-file form: JSON Lines, one `{"id": string, "input": string, "mode":
"layout" | "parse"}` per line. `parse` reads the model and exports it without
running layout. Output is `<outDir>/<id with "/" replaced by "__">.json`
(so ids are unique across folders). One result line per case on stdout:

```json
{"id":"...","status":"ok|throws|oracle-error","exception":{"class":"...","message":"..."},"ms":12}
```

`exception` is present unless `ok`. `throws`: the ELK call threw (JSON
import, layout, or an Xtext resource error for `.elkt`; the latter is class
`ElkTextException` with the first resource error as message); no output file
is written. `oracle-error`: the harness failed (unreadable input, bad case
line, I/O). Input format is chosen by extension (`.elkt` is parsed by the
Xtext standalone setup of `graph.text`; anything else is ELK JSON). The
exporter keeps layout, zero dimensions and zero positions, and omits unknown
layout options, in both modes.

Third-party bundles come from the p2 cache (`P2_BUNDLES`, default
`~/.m2/repository/p2/osgi/bundle`); a missing one is a `die` naming it.

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
