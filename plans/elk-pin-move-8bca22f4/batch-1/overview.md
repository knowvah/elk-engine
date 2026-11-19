<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: preconditions, bump, oracle build, metadata

One orchestrator task. It covers runbook sections 2-6. At the end, the oracle is built at `8bca22f4`, every recorder
constant names it, and the regenerated option classes are in `src/`.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-bump-build-metadata.md) | Preconditions, pin and recorder constants, `build.sh`, `.melk` sync and `melk:generate`, bundle-deps | orchestrator | `tools/oracle/ELK_COMMIT`, 41 `tools/vectors/*Vectors.java` (constant only), `tools/melk/sources/**`, `test/golden/refs/java/metadata.json`, generated `src/**/options/*.ts`, `test/architecture/bundle-deps.json` | — | [x] |
