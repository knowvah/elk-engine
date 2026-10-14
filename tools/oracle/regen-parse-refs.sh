#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Records the oracle's import->export (no layout) of the committed layout
# goldens (test/golden/refs/elk) as test/golden/refs/elk-parse (J7).
# Output is byte-stable: no timestamps.
#
# ELK cannot re-import its own layout export (it writes `resolvedAlgorithm`,
# which LayoutOptionData rejects), and the port registers CoreOptions only, so
# it drops the layered-only `layering.layerId` / `crossingMinimization.positionId`
# (J7 amendments 1 and 2). The oracle parses STRIPPED copies of the goldens.
# Transform (the T18 test must reproduce it byte for byte):
#   STRIP_KEYS = resolvedAlgorithm, layering.layerId, crossingMinimization.positionId
#   obj = JSON.parse(raw golden text)
#   walk obj recursively (objects and arrays); in every object that has a
#   `layoutOptions` member which is an object, delete each key of that member
#   equal to a STRIP_KEYS entry or ending in `.<entry>`
#   text = JSON.stringify(obj, null, 2) + "\n"
# Stripped copies live in a scratch dir only; _meta.json records both the raw
# (inputSha256) and the stripped (strippedSha256) digests.
# Usage: regen-parse-refs.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INPUT_DIR="$ROOT/test/golden/refs/elk"
REFS_PARENT="$ROOT/test/golden/refs"
REFS_DIR="$REFS_PARENT/elk-parse"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
GSON_BSN="com.google.gson"
EXPORT_SEED=1 # keep in sync with run.sh
STRIP_KEYS="resolvedAlgorithm layering.layerId crossingMinimization.positionId"
TRANSFORM="delete layoutOptions keys {$STRIP_KEYS} and *.<key> recursively; JSON.stringify(obj, null, 2) + newline"
GENERATED_BY="tools/oracle/regen-parse-refs.sh"
META_FILE="_meta.json"

die() {
  echo "error: $1" >&2
  exit 1
}

input_ids() { # prints one golden id per line (every json but _meta.json)
  local f
  for f in "$INPUT_DIR"/*.json; do
    [ "$(basename "$f")" = "$META_FILE" ] || basename "$f" .json
  done
}

strip_inputs() { # strip_inputs <destDir>; applies the transform in the header
  node -e '
    const fs = require("fs");
    const path = require("path");
    const [inputDir, destDir, stripKeys, ...ids] = process.argv.slice(1);
    const keys = stripKeys.split(" ");
    const isKey = (k) => keys.some((s) => k === s || k.endsWith("." + s));
    const walk = (v) => {
      if (Array.isArray(v)) {
        v.forEach(walk);
      } else if (v !== null && typeof v === "object") {
        const lo = v.layoutOptions;
        if (lo !== null && typeof lo === "object" && !Array.isArray(lo)) {
          for (const k of Object.keys(lo)) if (isKey(k)) delete lo[k];
        }
        Object.values(v).forEach(walk);
      }
    };
    for (const id of ids) {
      const obj = JSON.parse(fs.readFileSync(path.join(inputDir, id + ".json"), "utf8"));
      walk(obj);
      fs.writeFileSync(path.join(destDir, id + ".json"), JSON.stringify(obj, null, 2) + "\n");
    }
  ' "$INPUT_DIR" "$1" "$STRIP_KEYS" "${INPUT_IDS[@]}"
}

write_cases() { # write_cases <stripped dir> <dest file>
  local id
  : >"$2"
  for id in "${INPUT_IDS[@]}"; do
    printf '{"id":"%s","input":"%s/%s.json","mode":"parse"}\n' "$id" "$1" "$id" >>"$2"
  done
}

gson_version() { # Bundle-Version of the newest Gson bundle run.sh puts on the classpath
  local dir="$P2_BUNDLES/$GSON_BSN" ver jar
  ver="$(find "$dir" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; 2>/dev/null | sort -V | tail -n1)"
  [ -n "$ver" ] || die "bundle $GSON_BSN not in p2 cache $P2_BUNDLES"
  for jar in "$dir/$ver"/*.jar; do
    case "$jar" in *-sources.jar) continue ;; esac
    unzip -p "$jar" META-INF/MANIFEST.MF | tr -d '\r' | sed -n 's/^Bundle-Version: //p'
    return 0
  done
  die "no $GSON_BSN jar under $dir/$ver"
}

write_meta() { # write_meta <dest file> <gson version> <stripped dir>
  node -e '
    const fs = require("fs");
    const crypto = require("crypto");
    const path = require("path");
    const [build, generatedBy, dest, gson, inputDir, stripDir, seed, transform, ...ids] = process.argv.slice(1);
    const b = JSON.parse(fs.readFileSync(build, "utf8"));
    const sha = (dir, id) =>
      crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, id + ".json"))).digest("hex");
    const inputs = {};
    const stripped = {};
    for (const id of ids) {
      inputs[id + ".json"] = sha(inputDir, id);
      stripped[id + ".json"] = sha(stripDir, id);
    }
    const meta = {
      elkCommit: b.commit,
      patches: b.patches,
      exportSeed: Number(seed),
      gsonVersion: gson,
      jdk: b.jdk,
      generatedBy,
      transform,
      inputSha256: inputs,
      strippedSha256: stripped,
    };
    fs.writeFileSync(dest, JSON.stringify(meta, null, 2) + "\n");
  ' "$ELK_ORACLE_DIR/oracle-build.json" "$GENERATED_BY" "$1" "$2" "$INPUT_DIR" "$3" "$EXPORT_SEED" "$TRANSFORM" "${INPUT_IDS[@]}"
}

stage_refs() { # stage_refs <harnessOut> <stagingDir> <strippedDir>; prints the count
  local id count=0
  while IFS= read -r id; do
    cp "$1/$id.json" "$2/$id.json"
    count=$((count + 1))
  done < <(input_ids)
  write_meta "$2/$META_FILE" "$(gson_version)" "$3"
  echo "$count"
}

swap_dirs() { # swap_dirs <stagingDir>; replaces REFS_DIR in two renames
  local stage="$1" old="$1.old"
  chmod 755 "$stage"
  if [ -d "$REFS_DIR" ]; then
    mv "$REFS_DIR" "$old"
  fi
  mv "$stage" "$REFS_DIR"
  rm -rf "$old"
}

cleanup() {
  rm -rf "${OUT_DIR:-}" "${STRIP_DIR:-}" "${STAGE_DIR:-}" "${CASES_FILE:-}"
}

main() {
  local count id
  [ -d "$INPUT_DIR" ] || die "$INPUT_DIR missing"
  mkdir -p "$REFS_PARENT"
  OUT_DIR="$(mktemp -d)"
  STAGE_DIR="$(mktemp -d "$REFS_PARENT/.elk-parse-staging.XXXXXX")"
  CASES_FILE="$(mktemp)"
  STRIP_DIR="$(mktemp -d)"
  trap cleanup EXIT
  INPUT_IDS=()
  while IFS= read -r id; do INPUT_IDS+=("$id"); done < <(input_ids)
  strip_inputs "$STRIP_DIR"
  write_cases "$STRIP_DIR" "$CASES_FILE"
  ELK_ORACLE_DIR="$ELK_ORACLE_DIR" "$ROOT/tools/oracle/run.sh" --cases "$CASES_FILE" "$OUT_DIR"
  count="$(stage_refs "$OUT_DIR" "$STAGE_DIR" "$STRIP_DIR")"
  swap_dirs "$STAGE_DIR"
  echo "wrote $count refs + $META_FILE to test/golden/refs/elk-parse" >&2
}

main "$@"
