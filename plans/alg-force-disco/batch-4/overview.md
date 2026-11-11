<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Stress and unstaging

One task: the only writer of `staged-classes.json` after T4.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T10 | Stress, replay, unstaging ([brief](T10-stress.md)) | typescript-pro | src/alg/force/stress/{StressMajorization,StressLayoutProvider}*, src/alg/force/stress/StressVectors.test.ts, test/helpers/force-replay-*.ts, the three staged markers, test/architecture/staged-classes.json | T8, T9 | [x] |
