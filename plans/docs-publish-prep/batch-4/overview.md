<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4: release configuration

One task, orchestrator. Nothing in it may run a release (stop 2).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T6](T6-release-config.md) | semantic-release config, manual-only `release.yml`, publish scripts, registry pins, `PUBLISHING.md` | orchestrator | `.releaserc.json`, `.github/workflows/release.yml`, `package.json`, `package-lock.json`, `PUBLISHING.md`, `CONTRIBUTING.md` | T5 | [x] |

Gate after the batch: `npm run publish:check` (typecheck, build, `npm pack --dry-run`), format, typecheck; the dry-run
file list is journaled.
