// SPDX-License-Identifier: EPL-2.0
/**
 * PROPOSAL, not shipped: the candidate entry module of `@knowvah/elk-engine`.
 *
 * This file is the export surface proposed in `docs/architecture/public-api.md`, written as code so that the API
 * reference (typedoc), the documentation examples and the pack rehearsal have something real to run on. It awaits the
 * maintainer's ruling (AD-14: the first npm publish freezes the surface). Until that ruling `src/index.ts` exports
 * nothing, and the specifier `@knowvah/elk-engine` is mapped to this file in `tsconfig.json` (`paths`),
 * `vitest.config.ts` (`resolve.alias`) and `tools/typedoc/typedoc.json` (`entryPoints`).
 *
 * Rules (decisions DP1, DP2 of `plans/docs-publish-prep/decisions.md`): named re-exports only, Java names, no new
 * function, no wrapper. `test/public-api/candidate-index.test.ts` keeps this file and the table of the proposal equal.
 */

// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be evaluated first
// (tools/corpus/ts-layout-pipeline.ts:6-7). A bundler keeps this order because the import is the entry's first.
import '../../src/core/options/CoreOptions.js';

// Tier 1: the AD-14 contract. The ElkGraph model (AD-11), its factories, and the types an option value needs.
export type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
export type { ElkShape } from '../../src/graph/ElkShape.js';
export type { ElkConnectableShape } from '../../src/graph/ElkConnectableShape.js';
export type { ElkNode } from '../../src/graph/ElkNode.js';
export type { ElkPort } from '../../src/graph/ElkPort.js';
export type { ElkLabel } from '../../src/graph/ElkLabel.js';
export type { ElkEdge } from '../../src/graph/ElkEdge.js';
export type { ElkEdgeSection } from '../../src/graph/ElkEdgeSection.js';
export type { ElkBendPoint } from '../../src/graph/ElkBendPoint.js';
export { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
export type { IProperty } from '../../src/graph/properties/IProperty.js';
export type { IPropertyHolder } from '../../src/graph/properties/IPropertyHolder.js';
export { Property } from '../../src/graph/properties/Property.js';
export { KVector } from '../../src/core/math/KVector.js';
export { KVectorChain } from '../../src/core/math/KVectorChain.js';
export { ElkPadding } from '../../src/core/math/ElkPadding.js';
export { ElkMargin } from '../../src/core/math/ElkMargin.js';
export { IndividualSpacings } from '../../src/core/util/IndividualSpacings.js';
export { Alignment } from '../../src/core/options/Alignment.js';
export { ContentAlignment } from '../../src/core/options/ContentAlignment.js';
export { Direction } from '../../src/core/options/Direction.js';
export { EdgeCoords } from '../../src/core/options/EdgeCoords.js';
export { EdgeLabelPlacement } from '../../src/core/options/EdgeLabelPlacement.js';
export { EdgeRouting } from '../../src/core/options/EdgeRouting.js';
export { EdgeType } from '../../src/core/options/EdgeType.js';
export { HierarchyHandling } from '../../src/core/options/HierarchyHandling.js';
export { NodeLabelPlacement } from '../../src/core/options/NodeLabelPlacement.js';
export { PortAlignment } from '../../src/core/options/PortAlignment.js';
export { PortConstraints } from '../../src/core/options/PortConstraints.js';
export { PortLabelPlacement } from '../../src/core/options/PortLabelPlacement.js';
export { PortSide } from '../../src/core/options/PortSide.js';
export { ShapeCoords } from '../../src/core/options/ShapeCoords.js';
export { SizeConstraint } from '../../src/core/options/SizeConstraint.js';
export { SizeOptions } from '../../src/core/options/SizeOptions.js';
export { TopdownNodeTypes } from '../../src/core/options/TopdownNodeTypes.js';
export { TopdownSizeApproximator } from '../../src/core/options/TopdownSizeApproximator.js';
export { PackingMode } from '../../src/core/util/PackingMode.js';

// Tier 2: the engine. Lay out a graph, watch progress, register algorithms, set core options.
export { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
export type { IElkProgressMonitor } from '../../src/core/util/IElkProgressMonitor.js';
export { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
export { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
export type { ILayoutMetaDataProvider } from '../../src/core/data/ILayoutMetaDataProvider.js';
export { CoreOptions } from '../../src/core/options/CoreOptions.js';

// Tier 3: the algorithms. The port has no ServiceLoader, so a caller registers the provider of each algorithm it
// uses. CoreOptions registers the three core algorithms (fixed, box, random) itself; they have options only.
export { FixedLayouterOptions } from '../../src/core/options/FixedLayouterOptions.js';
export { BoxLayouterOptions } from '../../src/core/options/BoxLayouterOptions.js';
export { RandomLayouterOptions } from '../../src/core/options/RandomLayouterOptions.js';
export { LayeredMetaDataProvider } from '../../src/alg/layered/options/LayeredMetaDataProvider.js';
export { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
export { MrTreeMetaDataProvider } from '../../src/alg/mrtree/options/MrTreeMetaDataProvider.js';
export { MrTreeOptions } from '../../src/alg/mrtree/options/MrTreeOptions.js';
export { RadialMetaDataProvider } from '../../src/alg/radial/options/RadialMetaDataProvider.js';
export { RadialOptions } from '../../src/alg/radial/options/RadialOptions.js';
export { VertiFlexMetaDataProvider } from '../../src/alg/vertiflex/options/VertiFlexMetaDataProvider.js';
export { VertiFlexOptions } from '../../src/alg/vertiflex/options/VertiFlexOptions.js';
export { ForceMetaDataProvider } from '../../src/alg/force/options/ForceMetaDataProvider.js';
export { ForceOptions } from '../../src/alg/force/options/ForceOptions.js';
export { StressMetaDataProvider } from '../../src/alg/force/options/StressMetaDataProvider.js';
export { StressOptions } from '../../src/alg/force/options/StressOptions.js';
export { DisCoMetaDataProvider } from '../../src/alg/disco/options/DisCoMetaDataProvider.js';
export { DisCoOptions } from '../../src/alg/disco/options/DisCoOptions.js';
export { PolyominoOptions } from '../../src/alg/common/compaction/options/PolyominoOptions.js';
export { RectPackingMetaDataProvider } from '../../src/alg/rectpacking/options/RectPackingMetaDataProvider.js';
export { RectPackingOptions } from '../../src/alg/rectpacking/options/RectPackingOptions.js';
export { SporeMetaDataProvider } from '../../src/alg/spore/options/SporeMetaDataProvider.js';
export { SporeCompactionOptions } from '../../src/alg/spore/options/SporeCompactionOptions.js';
export { SporeOverlapRemovalOptions } from '../../src/alg/spore/options/SporeOverlapRemovalOptions.js';
export { TopdownpackingMetaDataProvider } from '../../src/alg/topdownpacking/options/TopdownpackingMetaDataProvider.js';
export { TopdownpackingOptions } from '../../src/alg/topdownpacking/options/TopdownpackingOptions.js';

// Tier 4: the I/O adapter. ELK JSON in and out.
export { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
