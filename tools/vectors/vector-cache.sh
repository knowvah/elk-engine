# shellcheck shell=bash
# SPDX-License-Identifier: EPL-2.0
# Result cache for the vector scripts (mission 4e, C4; decisions D1, D3, D4). Sourced by elkt-vectors.sh and
# elkj-vectors.sh after their own definitions; not executed. A program's results are reused only when everything they
# depend on is byte-identical, so a warm run proves the refs equal the cached outputs (a cold run or a miss proves
# they equal the oracle).
#   salt   = sha256 over the program source, the calling script, this file, $ELK_ORACLE_DIR/oracle-build.json, the
#            classpath string and `java -version` output: a recorder edit, oracle rebuild or JDK change starts afresh.
#            The JVM's "Picked up JAVA_TOOL_OPTIONS: ..." banners are left out: heap and GC flags (the round-trip
#            recorder needs a large heap) do not change what is recorded, and must not turn a warm run cold.
#   inputs = sha256 over every file under tools/vectors/, test/corpus/elkt-curated/ and test/corpus/elkj-curated/
#            (sorted relative paths and bytes).
# Layout under $ELK_ORACLE_DIR/vector-cache/<elkt|elkj>/<Program>/<salt>/:
#   <inputs>/  whole-program entry: the program's output file(s) plus a .done marker written last (anything without
#              .done is discarded and recorded again).
#   rows/      per-row programs (VC_ROW_PROGRAMS): passed as the recorder's <cacheDir>; each row is keyed by
#              sha256(id NUL text) inside the recorder, so a new scenario records one row.
# Old salts are never pruned; `rm -rf "$ELK_ORACLE_DIR/vector-cache"` clears everything.
# ELK_VECTORS_CACHE=off reads and writes no cache and passes no <cacheDir>.
# stderr, one line per program: "cache: <Program> hit" | "cache: <Program> recorded" |
#   "cache: <Program> rows <hit>/<recorded>" (the recorder's "cached"/"done" lines) | "cache: off".
# Expects from the caller: ROOT, ELK_ORACLE_DIR, VECTORS_DIR and die(). Callers run vc_run as `vc_run ... || rc=$?`,
# where errexit does not apply, so every step below that can fail returns its status explicitly.

VC_ROW_PROGRAMS="ElkjRoundTripVectors ElkjWriteVectors"
VC_SELF="$VECTORS_DIR/vector-cache.sh"
VC_INPUT_DIRS=(tools/vectors test/corpus/elkt-curated test/corpus/elkj-curated)
VC_ROOT=""
VC_INPUTS=""
VC_JAVA_VERSION=""

vc_digest() { # vc_digest (f:<path> | s:<string>)...; sha256 of each part framed as "<kind> <byte length>\n<bytes>"
  node -e '
    const fs = require("fs");
    const h = require("crypto").createHash("sha256");
    for (const arg of process.argv.slice(1)) {
      const bytes = arg.startsWith("f:") ? fs.readFileSync(arg.slice(2)) : Buffer.from(arg.slice(2), "utf8");
      h.update(`${arg.slice(0, 1)} ${bytes.length}\n`);
      h.update(bytes);
    }
    console.log(h.digest("hex"));
  ' "$@"
}

vc_inputs_digest() { # sha256 over the sorted relative paths and bytes of every file under VC_INPUT_DIRS
  node -e '
    const fs = require("fs");
    const path = require("path");
    const root = process.argv[1];
    const files = [];
    const walk = (rel) => {
      for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
        const child = path.posix.join(rel, e.name);
        if (e.isDirectory()) walk(child);
        else if (e.isFile()) files.push(child);
      }
    };
    for (const dir of process.argv.slice(2)) walk(dir);
    files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const h = require("crypto").createHash("sha256");
    for (const rel of files) {
      const bytes = fs.readFileSync(path.join(root, rel));
      h.update(`${rel}\0${bytes.length}\n`);
      h.update(bytes);
    }
    console.log(h.digest("hex"));
  ' "$ROOT" "${VC_INPUT_DIRS[@]}"
}

vc_enabled() {
  case "${ELK_VECTORS_CACHE:-}" in
    "") return 0 ;;
    off) return 1 ;;
    *) die "ELK_VECTORS_CACHE must be unset or off, not '$ELK_VECTORS_CACHE'" ;;
  esac
}

vc_init() { # vc_init <lang>; once per script run, before the first vc_run
  vc_enabled || return 0
  VC_ROOT="$ELK_ORACLE_DIR/vector-cache/$1"
  VC_INPUTS="$(vc_inputs_digest)"
  VC_JAVA_VERSION="$(java -version 2>&1 | grep -v '^Picked up ')"
}

vc_salt() { # vc_salt <callingScript> <classpath> <program>
  vc_digest "f:$3" "f:$1" "f:$VC_SELF" "f:$ELK_ORACLE_DIR/oracle-build.json" "s:$2" "s:$VC_JAVA_VERSION"
}

vc_is_row_program() { # vc_is_row_program <Program>
  case " $VC_ROW_PROGRAMS " in *" $1 "*) return 0 ;; *) return 1 ;; esac
}

vc_run() { # vc_run <callingScript> <classpath> <program> <outDir>; runs (or reuses) one vector program
  local script="$1" cp="$2" program="$3" out="$4" name salt
  name="$(basename "$program" .java)"
  if ! vc_enabled; then
    echo "cache: off" >&2
    java -cp "$cp" "$program" "$out" "$VECTORS_DIR"
    return
  fi
  salt="$(vc_salt "$script" "$cp" "$program")"
  if vc_is_row_program "$name"; then
    vc_run_rows "$cp" "$program" "$out" "$name" "$VC_ROOT/$name/$salt/rows"
  else
    vc_run_whole "$cp" "$program" "$out" "$name" "$VC_ROOT/$name/$salt/$VC_INPUTS"
  fi
}

vc_run_whole() { # vc_run_whole <classpath> <program> <outDir> <Program> <entryDir>
  local cp="$1" program="$2" out="$3" name="$4" entry="$5" stage rc f
  if [ -f "$entry/.done" ]; then
    for f in "$entry"/*; do
      cp "$f" "$out/" || return
    done
    echo "cache: $name hit" >&2
    return 0
  fi
  rm -rf "$entry" && mkdir -p "$(dirname "$entry")" || return
  stage="$(mktemp -d "$(dirname "$entry")/.stage.XXXXXX")" || return
  rc=0
  java -cp "$cp" "$program" "$stage" "$VECTORS_DIR" || rc=$?
  if [ "$rc" -ne 0 ]; then
    rm -rf "$stage"
    return "$rc"
  fi
  for f in "$stage"/*; do
    cp "$f" "$out/" || return
  done
  mv "$stage" "$entry" && : >"$entry/.done" || return
  echo "cache: $name recorded" >&2
}

vc_run_rows() { # vc_run_rows <classpath> <program> <outDir> <Program> <rowsDir>
  local cp="$1" program="$2" out="$3" name="$4" rows="$5" log rc hit recorded
  mkdir -p "$rows" || return
  log="$(mktemp "${TMPDIR:-/tmp}/vector-cache.XXXXXX")" || return
  rc=0
  # The recorder's stderr stays live (tee) and is kept for the hit/recorded counts; its stdout passes through on fd 3.
  { java -cp "$cp" "$program" "$out" "$VECTORS_DIR" "$rows" 2>&1 >&3 3>&- | tee "$log" >&2; } 3>&1 || rc=$?
  hit="$(grep -c '^cached ' "$log" || true)"
  recorded="$(grep -c '^done ' "$log" || true)"
  rm -f "$log"
  [ "$rc" -eq 0 ] || return "$rc"
  echo "cache: $name rows $hit/$recorded" >&2
}
