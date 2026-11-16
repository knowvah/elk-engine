<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 7 — Site rows

One task. T14 records T12's site scenarios as the `sites` group of `layered-compound.json` (re-running T1's recorder; the other
three groups must stay byte-identical) and replays them.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T14 | Site rows for T12's scenarios ([brief](T14-site-rows.md)) | java-architect, then typescript-pro | tools/vectors/LayeredCompoundVectors.java (sites), test/golden/refs/java/layered-compound.json, src/alg/layered/LayeredCompoundSites.test.ts | T12, T13 | [x] |
