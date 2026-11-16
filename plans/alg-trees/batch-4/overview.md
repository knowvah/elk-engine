<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — mrtree ordering + placement; radial wiring; mrtree processors

Three tasks **in parallel** after batch 3. T13 is the only writer of `tools/melk/config.ts` and `staged-classes.json` in this batch;
T12 and T14 replace T6 staged bodies and keep their markers and rows.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T12 | mrtree `OrderBalance`, `NodeOrderer`, `NodePlacer` ([brief](T12-mrtree-order-place.md)) | typescript-pro | src/alg/mrtree/{p2order/**,p3place/**} | T9 | [x] |
| T13 | radial EadesRadial, router, size/angle processors, provider, unstaging, wiring, replay, `CenterOnRootTest` ([brief](T13-radial-wiring.md)) | typescript-pro | src/alg/radial/{p1position/EadesRadial*,p2routing/**,intermediate/{EdgeAngleCalculator,CalculateGraphSize}*,RadialLayoutProvider*,RadialVectors.test.ts,CenterOnRootTest.test.ts,options/**}, the 16 radial staged markers, tools/melk/config.ts, test/architecture/staged-classes.json | T10 | [x] |
| T14 | mrtree simple processors (9) ([brief](T14-mrtree-processors.md)) | typescript-pro | src/alg/mrtree/intermediate/{Root,Level,Neighbors,LevelHeight,LevelCoordinates,Direction,NodePosition,GraphBounds}Processor*, Untreeifyer* | T9 | [x] |
