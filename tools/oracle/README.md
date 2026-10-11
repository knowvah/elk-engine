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
tools/oracle/run.sh --list-algorithms
```

Positional form: lays out each input (layout mode); output is
`<outDir>/<input basename without extension>.json`, so basenames must be
unique per run. `regen-goldens.sh` uses the case-file form (variant and retarget).

Case-file form: JSON Lines, one `{"id": string, "input": string, "mode":
"layout" | "parse" | "generate", "algorithm"?: string, "variant"?: string}` per line. `parse` reads the model and exports it without
running layout. `generate` reads a grandom config (`.elkr`, one `generate 1 <form> { ... seed = N ... }`)
and exports the generated graph without layout (see Generated graphs). Output is `<outDir>/<id with "/" replaced by "__">.json`
(so ids are unique across folders). One result line per case on stdout:

```json
{"id":"...","status":"ok|throws|oracle-error|timeout","exception":{"class":"...","message":"..."},"ms":12}
```

`exception` is present unless `ok`. `throws`: the ELK call threw (JSON
import, layout, or an Xtext resource error for `.elkt`; the latter is class
`ElkTextException` with the first resource error as message); no output file
is written. `oracle-error`: the harness failed (unreadable input, bad case
line, I/O). Input format is chosen by extension (`.elkt` is parsed by the
Xtext standalone setup of `graph.text`; anything else is ELK JSON). The
exporter keeps layout, zero dimensions and zero positions, and omits unknown
layout options, in both modes.

Per case, in order: read, apply `variant`, apply `algorithm`, lay out (layout
mode) or export (parse mode, so the overlays are visible in the output).
`variant` is a key of `test/corpus/variants.json` (D6; option values are parsed
through `LayoutOptionData.parseValue` and set on the root). `algorithm` is a
full id (D2): it is set on every node with children, replacing any declared
value, and `org.eclipse.elk.randomSeed = 1` is set on the root. An unknown
variant, algorithm or option is `oracle-error` (class `OracleFault`).
`exception.class` is fully qualified and every `@[0-9a-f]+` in
`exception.message` becomes `@<hash>` (D4). `--list-algorithms` prints a sorted
JSON array of all registered algorithm ids.

Timeout (OR-2): `ELK_SWEEP_TIMEOUT_MS` (default `30000`, read only by
`run.sh`) bounds each case in the case-file form. A case past the limit prints
`{"id":...,"status":"timeout","ms":...}`, a stderr line naming it, and the
JVM exits with code 75; `run.sh` restarts a JVM on the cases that have no
result line yet, so every case gets exactly one result line. `run.sh --cases`
exits 0 when all cases were ok or timed out, 1 if any case was `throws` or
`oracle-error`. The positional form has no variant, retarget or timeout.

## Generated graphs

`test/corpus/generated/<algorithmSuffix>-<shape>.elkr` plus its sibling `.json`
hold the D7 inputs for algorithms no elk-models model uses. The `.json` files
are produced only by `tools/oracle/regen-generated.sh` (staging directory and
rename; prints `name nodes edges ms` per config). Constraints: at most 50 nodes
in total, no edge labels (`BlindTextGenerator` is unseeded), `seed` set. The
generator leaves the root unnamed, which the JSON exporter would number `n0` and
then rename with an unseeded random suffix when it collides with the generated
`n0` (`JsonExporter.xtend:505`); the harness sets the root identifier to `root`
so output is byte-stable.

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
