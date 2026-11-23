// SPDX-License-Identifier: EPL-2.0
/**
 * `@knowvah/elk-engine` — faithful TypeScript port of the Eclipse Layout Kernel.
 *
 * The public contract (AD-14) is the ElkGraph object model, the `ElkGraphUtil` factories, the engine, one options
 * class per algorithm and the ELK JSON adapter, each under its Java name, plus one port-local async entry point,
 * `layout` (`plans/npm-1-0-release/decisions.md` N3). The surface is listed, with the Java source of every export, in
 * `docs/architecture/public-api.md`; `src/index.test.ts` keeps this file and that table equal. Java runtime shims under
 * `src/java/` and the other internal families are never re-exported here.
 */

import './core/options/CoreOptions.js';

export type { ElkGraphElement } from './graph/ElkGraphElement.js';
export type { ElkShape } from './graph/ElkShape.js';
export type { ElkConnectableShape } from './graph/ElkConnectableShape.js';
export type { ElkNode } from './graph/ElkNode.js';
export type { ElkPort } from './graph/ElkPort.js';
export type { ElkLabel } from './graph/ElkLabel.js';
export type { ElkEdge } from './graph/ElkEdge.js';
export type { ElkEdgeSection } from './graph/ElkEdgeSection.js';
export type { ElkBendPoint } from './graph/ElkBendPoint.js';
export { ElkGraphUtil } from './graph/util/ElkGraphUtil.js';
export type { IProperty } from './graph/properties/IProperty.js';
export type { IPropertyHolder } from './graph/properties/IPropertyHolder.js';
export { Property } from './graph/properties/Property.js';
export { KVector } from './core/math/KVector.js';
export { KVectorChain } from './core/math/KVectorChain.js';
export { ElkPadding } from './core/math/ElkPadding.js';
export { ElkMargin } from './core/math/ElkMargin.js';
export { IndividualSpacings } from './core/util/IndividualSpacings.js';
export { Alignment } from './core/options/Alignment.js';
export { ContentAlignment } from './core/options/ContentAlignment.js';
export { Direction } from './core/options/Direction.js';
export { EdgeCoords } from './core/options/EdgeCoords.js';
export { EdgeLabelPlacement } from './core/options/EdgeLabelPlacement.js';
export { EdgeRouting } from './core/options/EdgeRouting.js';
export { EdgeType } from './core/options/EdgeType.js';
export { HierarchyHandling } from './core/options/HierarchyHandling.js';
export { NodeLabelPlacement } from './core/options/NodeLabelPlacement.js';
export { PortAlignment } from './core/options/PortAlignment.js';
export { PortConstraints } from './core/options/PortConstraints.js';
export { PortLabelPlacement } from './core/options/PortLabelPlacement.js';
export { PortSide } from './core/options/PortSide.js';
export { ShapeCoords } from './core/options/ShapeCoords.js';
export { SizeConstraint } from './core/options/SizeConstraint.js';
export { SizeOptions } from './core/options/SizeOptions.js';
export { TopdownNodeTypes } from './core/options/TopdownNodeTypes.js';
export { TopdownSizeApproximator } from './core/options/TopdownSizeApproximator.js';
export { PackingMode } from './core/util/PackingMode.js';
export { RecursiveGraphLayoutEngine } from './core/RecursiveGraphLayoutEngine.js';
export type { IElkProgressMonitor } from './core/util/IElkProgressMonitor.js';
export { BasicProgressMonitor } from './core/util/BasicProgressMonitor.js';
export { LayoutMetaDataService } from './core/data/LayoutMetaDataService.js';
export type { ILayoutMetaDataProvider } from './core/data/ILayoutMetaDataProvider.js';
export { CoreOptions } from './core/options/CoreOptions.js';
export { FixedLayouterOptions } from './core/options/FixedLayouterOptions.js';
export { BoxLayouterOptions } from './core/options/BoxLayouterOptions.js';
export { RandomLayouterOptions } from './core/options/RandomLayouterOptions.js';
export { LayeredMetaDataProvider } from './alg/layered/options/LayeredMetaDataProvider.js';
export { LayeredOptions } from './alg/layered/options/LayeredOptions.js';
export { MrTreeMetaDataProvider } from './alg/mrtree/options/MrTreeMetaDataProvider.js';
export { MrTreeOptions } from './alg/mrtree/options/MrTreeOptions.js';
export { RadialMetaDataProvider } from './alg/radial/options/RadialMetaDataProvider.js';
export { RadialOptions } from './alg/radial/options/RadialOptions.js';
export { VertiFlexMetaDataProvider } from './alg/vertiflex/options/VertiFlexMetaDataProvider.js';
export { VertiFlexOptions } from './alg/vertiflex/options/VertiFlexOptions.js';
export { ForceMetaDataProvider } from './alg/force/options/ForceMetaDataProvider.js';
export { ForceOptions } from './alg/force/options/ForceOptions.js';
export { StressMetaDataProvider } from './alg/force/options/StressMetaDataProvider.js';
export { StressOptions } from './alg/force/options/StressOptions.js';
export { DisCoMetaDataProvider } from './alg/disco/options/DisCoMetaDataProvider.js';
export { DisCoOptions } from './alg/disco/options/DisCoOptions.js';
export { PolyominoOptions } from './alg/common/compaction/options/PolyominoOptions.js';
export { RectPackingMetaDataProvider } from './alg/rectpacking/options/RectPackingMetaDataProvider.js';
export { RectPackingOptions } from './alg/rectpacking/options/RectPackingOptions.js';
export { SporeMetaDataProvider } from './alg/spore/options/SporeMetaDataProvider.js';
export { SporeCompactionOptions } from './alg/spore/options/SporeCompactionOptions.js';
export { SporeOverlapRemovalOptions } from './alg/spore/options/SporeOverlapRemovalOptions.js';
export { TopdownpackingMetaDataProvider } from './alg/topdownpacking/options/TopdownpackingMetaDataProvider.js';
export { TopdownpackingOptions } from './alg/topdownpacking/options/TopdownpackingOptions.js';
export { ElkGraphJson } from './graph/json/ElkGraphJson.js';

export { layout } from './layout.js';
export type { ElkJsonGraph } from './layout.js';
export type { LayoutOptions } from './layout.js';
