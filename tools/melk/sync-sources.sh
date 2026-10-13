#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Vendors the 13 in-scope .melk metadata sources from the pinned ELK checkout
# (AD-2) into tools/melk/sources/ and writes manifest.json (C9).
# Usage: sync-sources.sh [--check]   (--check: exit 1 on any difference, write nothing)
# Honours ELK_SOURCE_DIR (default <repo>/../elk, AD-15).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ELK_SOURCE_DIR="${ELK_SOURCE_DIR:-$ROOT/../elk}"
DEST="$ROOT/tools/melk/sources"
PLUGINS=plugins/org.eclipse.elk
# Upstream paths, relative to the ELK checkout; the file name is the basename.
UPSTREAM_PATHS=(
  "$PLUGINS.core/src/org/eclipse/elk/core/Core.melk"
  "$PLUGINS.core/src/org/eclipse/elk/core/labels/Labels.melk"
  "$PLUGINS.alg.common/src/org/eclipse/elk/alg/common/compaction/Polyomino.melk"
  "$PLUGINS.alg.disco/src/org/eclipse/elk/alg/disco/Disco.melk"
  "$PLUGINS.alg.force/src/org/eclipse/elk/alg/force/Force.melk"
  "$PLUGINS.alg.force/src/org/eclipse/elk/alg/force/stress/Stress.melk"
  "$PLUGINS.alg.layered/src/org/eclipse/elk/alg/layered/Layered.melk"
  "$PLUGINS.alg.mrtree/src/org/eclipse/elk/alg/mrtree/Tree.melk"
  "$PLUGINS.alg.radial/src/org/eclipse/elk/alg/radial/Radial.melk"
  "$PLUGINS.alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/RectPacking.melk"
  "$PLUGINS.alg.spore/src/org/eclipse/elk/alg/spore/SPOrE.melk"
  "$PLUGINS.alg.topdownpacking/src/org/eclipse/elk/alg/topdownpacking/Topdownpacking.melk"
  "$PLUGINS.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/VertiFlex.melk"
)

die() {
  echo "error: $1" >&2
  exit 1
}

CHECK=0
case "${1:-}" in
  "") ;;
  --check) CHECK=1 ;;
  *) die "usage: sync-sources.sh [--check]" ;;
esac

PINNED="$(tr -d '[:space:]' <"$ROOT/tools/oracle/ELK_COMMIT")"
ACTUAL="$(git -C "$ELK_SOURCE_DIR" rev-parse HEAD 2>/dev/null)" ||
  die "ELK_SOURCE_DIR is not a git checkout: $ELK_SOURCE_DIR"
[ "$ACTUAL" = "$PINNED" ] ||
  die "ELK checkout is at $ACTUAL but ELK_COMMIT pins $PINNED"

# Build the expected tree (files + manifest) in a temp dir, then compare or install.
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

entries=()
for upstream in "${UPSTREAM_PATHS[@]}"; do
  name="$(basename "$upstream")"
  git -C "$ELK_SOURCE_DIR" show "$PINNED:$upstream" >"$STAGE/$name" ||
    die "missing upstream file: $upstream"
  blob="$(git -C "$ELK_SOURCE_DIR" rev-parse "$PINNED:$upstream")"
  entries+=("$name|$upstream|$blob")
done

printf '%s\n' "${entries[@]}" | node -e '
  const lines = require("fs").readFileSync(0, "utf8").trim().split("\n");
  const files = lines.map((l) => {
    const [name, upstreamPath, blobSha] = l.split("|");
    return { name, upstreamPath, blobSha };
  });
  console.log(JSON.stringify({ elkCommit: process.argv[1], files }, null, 2));
' "$PINNED" >"$STAGE/manifest.json"

if [ "$CHECK" -eq 1 ]; then
  status=0
  for f in "$STAGE"/*; do
    cmp -s "$f" "$DEST/$(basename "$f")" || {
      echo "differs: $(basename "$f")" >&2
      status=1
    }
  done
  for f in "$DEST"/*.melk; do
    [ -f "$STAGE/$(basename "$f")" ] || {
      echo "unexpected: $(basename "$f")" >&2
      status=1
    }
  done
  exit "$status"
fi

mkdir -p "$DEST"
cp "$STAGE"/* "$DEST/"
echo "synced ${#UPSTREAM_PATHS[@]} files at $PINNED"
