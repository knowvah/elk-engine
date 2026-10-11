#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Fetch the pinned eclipse-elk/elk-models clone if it is missing.
# Never modifies an existing clone: exit 2 if it is at another commit.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
manifest="${script_dir}/manifest.json"

readonly DEFAULT_MODELS_RELATIVE_PATH="../../eclipse-elk/elk-models"

commit="$(node -p "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')).commit" "${manifest}")"
repo="$(node -p "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')).repo" "${manifest}")"
models_dir="${ELK_MODELS_DIR:-${repo_root}/${DEFAULT_MODELS_RELATIVE_PATH}}"

if [ -d "${models_dir}" ]; then
  actual="$(git -C "${models_dir}" rev-parse HEAD 2>/dev/null || echo "unknown")"
  if [ "${actual}" = "${commit}" ]; then
    echo "already present: ${models_dir} at ${commit}"
    exit 0
  fi
  echo "error: ${models_dir} is at ${actual}, expected ${commit}; not modifying it" >&2
  exit 2
fi

mkdir -p "$(dirname "${models_dir}")"
git clone "https://github.com/${repo}" "${models_dir}"
git -C "${models_dir}" checkout --detach "${commit}"
echo "fetched ${models_dir} at ${commit}"
