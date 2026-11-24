<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: drop the two keys, regenerate, prove the diff

One task (D2). It is sequential, and no subagent is used.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-regen-parse-refs.md) | `STRIP_KEYS` → `resolvedAlgorithm`; the test registers layered; regenerate `elk-parse`; D3 proof | orchestrator | `test/golden/json-roundtrip.test.ts`, `tools/oracle/regen-parse-refs.sh`, `test/golden/refs/elk-parse/*` | — | [x] |
