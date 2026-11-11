<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — mrtree import + treeify; radial compaction + overlaps; vertiflex wiring

Three tasks **in parallel** after batch 2, disjoint write-sets. T11 is the only writer of `tools/melk/config.ts` in this batch.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T9 | mrtree importer, components (V1), interactive visitor, `DFSTreeifyer` ([brief](T9-mrtree-import-treeify.md)) | typescript-pro | src/alg/mrtree/{IGraphImporter,ElkGraphImporter,InteractiveMrTreeGraphVisitor,ComponentsProcessor,p1treeify/DFSTreeifyer}* | T6 | [x] |
| T10 | radial compactors and overlap removal (I30 twin) ([brief](T10-radial-compaction.md)) | typescript-pro | src/alg/radial/intermediate/{compaction/**,overlaps/RadiusExtensionOverlapRemoval*} | T7 | [x] |
| T11 | vertiflex P1, P3, P4, provider, wiring, replay ([brief](T11-vertiflex-wiring.md)) | typescript-pro | src/alg/vertiflex/{p1yplacement/**,p3absolute/**,p4edgerouting/**,VertiFlexLayoutProvider*,VertiFlexVectors.test.ts,options/**}, tools/melk/config.ts | T8 | [x] |
