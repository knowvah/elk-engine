#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Regenerates every committed generated graph (D7) from its seeded .elkr
# config with the source-built oracle's grandom generator, via a staging
# directory and a rename. Output is byte-stable: seeds fix the graphs and
# the harness names the unnamed root.
# Prints one line per config: name, nodes, edges, ms.
# Usage: regen-generated.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GENERATED_PARENT="$ROOT/test/corpus"
GENERATED_DIR="$GENERATED_PARENT/generated"
CONFIG_EXTENSION=".elkr"

die() {
  echo "error: $1" >&2
  exit 1
}

config_names() { # prints each config's name (file name without extension)
  local config
  for config in "$GENERATED_DIR"/*"$CONFIG_EXTENSION"; do
    [ -f "$config" ] || continue
    basename "$config" "$CONFIG_EXTENSION"
  done
}

write_cases() { # write_cases <cases.jsonl>
  local name
  while IFS= read -r name; do
    printf '{"id":"%s","input":"%s/%s%s","mode":"generate"}\n' \
      "$name" "$GENERATED_DIR" "$name" "$CONFIG_EXTENSION"
  done < <(config_names) >"$1"
}

# shellcheck disable=SC2016 # JS template literal, not shell expansion
report() { # report <resultsFile> <outDir>; one line per config, fails on non-ok
  node -e '
    const fs = require("fs");
    const [results, outDir] = process.argv.slice(1, 3);
    const count = (n) => 1 + (n.children ?? []).reduce((s, c) => s + count(c), 0);
    const edges = (n) => (n.edges ?? []).length + (n.children ?? []).reduce((s, c) => s + edges(c), 0);
    let bad = 0;
    for (const line of fs.readFileSync(results, "utf8").split("\n").filter(Boolean)) {
      const r = JSON.parse(line);
      if (r.status !== "ok") {
        console.error(`error: ${r.id}: ${r.status} ${JSON.stringify(r.exception)}`);
        bad++;
        continue;
      }
      const g = JSON.parse(fs.readFileSync(`${outDir}/${r.id}.json`, "utf8"));
      console.log(`${r.id}\t${count(g)}\t${edges(g)}\t${r.ms}`);
    }
    process.exit(bad === 0 ? 0 : 1);
  ' "$1" "$2"
}

stage_configs() { # stage_configs <harnessOut> <stagingDir>
  local name
  while IFS= read -r name; do
    cp "$GENERATED_DIR/$name$CONFIG_EXTENSION" "$2/"
    cp "$1/$name.json" "$2/"
  done < <(config_names)
}

swap_dirs() { # swap_dirs <stagingDir>; replaces GENERATED_DIR in two renames
  local stage="$1" old="$1.old"
  chmod 755 "$stage"
  mv "$GENERATED_DIR" "$old"
  mv "$stage" "$GENERATED_DIR"
  rm -rf "$old"
}

cleanup() {
  rm -rf "${WORK_DIR:-}" "${STAGE_DIR:-}"
}

main() {
  [ -n "$(config_names)" ] || die "no $CONFIG_EXTENSION configs in $GENERATED_DIR"
  WORK_DIR="$(mktemp -d)"
  STAGE_DIR="$(mktemp -d "$GENERATED_PARENT/.generated-staging.XXXXXX")"
  trap cleanup EXIT
  write_cases "$WORK_DIR/cases.jsonl"
  "$ROOT/tools/oracle/run.sh" --cases "$WORK_DIR/cases.jsonl" "$WORK_DIR/out" >"$WORK_DIR/results.jsonl" ||
    true # a failing case is reported by report below
  [ "$(wc -l <"$WORK_DIR/results.jsonl")" -eq "$(config_names | wc -l)" ] ||
    die "oracle returned fewer results than configs"
  report "$WORK_DIR/results.jsonl" "$WORK_DIR/out"
  stage_configs "$WORK_DIR/out" "$STAGE_DIR"
  swap_dirs "$STAGE_DIR"
}

main "$@"
