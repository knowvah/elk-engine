// SPDX-License-Identifier: EPL-2.0
// Name tables of the layered site replay (tools/vectors/LayeredSiteVectors.java: ENUM_TYPES, PROPS, load): the enum
// classes addressed by simple or binary name, and the properties addressed by id. The Java discovers both by
// reflection over the jar; the TS twin lists the classes and scans their static `IProperty` fields.
import { LayeredPhases } from '../../src/alg/layered/LayeredPhases.js';
import { ComponentOrderingStrategy } from '../../src/alg/layered/components/ComponentOrderingStrategy.js';
import { NodeType } from '../../src/alg/layered/graph/LNodeNodeType.js';
import { LabelDummySwitcher } from '../../src/alg/layered/intermediate/LabelDummySwitcher.js';
import { CenterEdgeLabelPlacementStrategy } from '../../src/alg/layered/options/CenterEdgeLabelPlacementStrategy.js';
import { ConstraintCalculationStrategy } from '../../src/alg/layered/options/ConstraintCalculationStrategy.js';
import { CrossingMinimizationStrategy } from '../../src/alg/layered/options/CrossingMinimizationStrategy.js';
import { CuttingStrategy } from '../../src/alg/layered/options/CuttingStrategy.js';
import { CycleBreakingStrategy } from '../../src/alg/layered/options/CycleBreakingStrategy.js';
import { DirectionCongruency } from '../../src/alg/layered/options/DirectionCongruency.js';
import { EdgeConstraint } from '../../src/alg/layered/options/EdgeConstraint.js';
import { EdgeLabelSideSelection } from '../../src/alg/layered/options/EdgeLabelSideSelection.js';
import { EdgeStraighteningStrategy } from '../../src/alg/layered/options/EdgeStraighteningStrategy.js';
import { FixedAlignment } from '../../src/alg/layered/options/FixedAlignment.js';
import { GraphCompactionStrategy } from '../../src/alg/layered/options/GraphCompactionStrategy.js';
import { GraphProperties } from '../../src/alg/layered/options/GraphProperties.js';
import { GreedySwitchType } from '../../src/alg/layered/options/GreedySwitchType.js';
import { GroupOrderStrategy } from '../../src/alg/layered/options/GroupOrderStrategy.js';
import { InLayerConstraint } from '../../src/alg/layered/options/InLayerConstraint.js';
import { InteractiveReferencePoint } from '../../src/alg/layered/options/InteractiveReferencePoint.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { LayerConstraint } from '../../src/alg/layered/options/LayerConstraint.js';
import { LayerUnzippingStrategy } from '../../src/alg/layered/options/LayerUnzippingStrategy.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { LayeringStrategy } from '../../src/alg/layered/options/LayeringStrategy.js';
import { LongEdgeOrderingStrategy } from '../../src/alg/layered/options/LongEdgeOrderingStrategy.js';
import { NodeFlexibility } from '../../src/alg/layered/options/NodeFlexibility.js';
import { NodePlacementStrategy } from '../../src/alg/layered/options/NodePlacementStrategy.js';
import { NodePromotionStrategy } from '../../src/alg/layered/options/NodePromotionStrategy.js';
import { OrderingStrategy } from '../../src/alg/layered/options/OrderingStrategy.js';
import { PortSortingStrategy } from '../../src/alg/layered/options/PortSortingStrategy.js';
import { PortType } from '../../src/alg/layered/options/PortType.js';
import { SelfLoopDistributionStrategy } from '../../src/alg/layered/options/SelfLoopDistributionStrategy.js';
import { SelfLoopOrderingStrategy } from '../../src/alg/layered/options/SelfLoopOrderingStrategy.js';
import { SelfLoopPlacementStrategy } from '../../src/alg/layered/options/SelfLoopPlacementStrategy.js';
import { SplineRoutingMode } from '../../src/alg/layered/options/SplineRoutingMode.js';
import { ValidifyStrategy } from '../../src/alg/layered/options/ValidifyStrategy.js';
import { WrappingStrategy } from '../../src/alg/layered/options/WrappingStrategy.js';
import { LabelManagementOptions } from '../../src/core/labels/LabelManagementOptions.js';
import { Alignment } from '../../src/core/options/Alignment.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { Direction } from '../../src/core/options/Direction.js';
import { EdgeLabelPlacement } from '../../src/core/options/EdgeLabelPlacement.js';
import { HierarchyHandling } from '../../src/core/options/HierarchyHandling.js';
import { LabelSide } from '../../src/core/options/LabelSide.js';
import { PortConstraints } from '../../src/core/options/PortConstraints.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';

/** A Java enum class object as every ported enum exposes it. */
export interface EnumClass {
  readonly name: string;
  values(): readonly EnumConstant[];
  valueOf(name: string): EnumConstant;
}

/** A Java enum constant as every ported enum exposes it. */
export interface EnumConstant {
  name(): string;
  ordinal(): number;
  toString(): string;
  compareTo(other: EnumConstant): number;
}

const PACKAGE_OPTIONS = 'org.eclipse.elk.alg.layered.options';
const PACKAGE_LAYERED = 'org.eclipse.elk.alg.layered';

const OPTION_ENUMS: readonly EnumClass[] = [
  CenterEdgeLabelPlacementStrategy,
  ConstraintCalculationStrategy,
  CrossingMinimizationStrategy,
  CuttingStrategy,
  CycleBreakingStrategy,
  DirectionCongruency,
  EdgeConstraint,
  EdgeLabelSideSelection,
  EdgeStraighteningStrategy,
  FixedAlignment,
  GraphCompactionStrategy,
  GraphProperties,
  GreedySwitchType,
  GroupOrderStrategy,
  InLayerConstraint,
  InteractiveReferencePoint,
  LayerConstraint,
  LayerUnzippingStrategy,
  LayeringStrategy,
  LongEdgeOrderingStrategy,
  NodeFlexibility,
  NodePlacementStrategy,
  NodePromotionStrategy,
  OrderingStrategy,
  PortSortingStrategy,
  PortType,
  SelfLoopDistributionStrategy,
  SelfLoopOrderingStrategy,
  SelfLoopPlacementStrategy,
  SplineRoutingMode,
  ValidifyStrategy,
  WrappingStrategy,
] as unknown as readonly EnumClass[];

/** The 35 enums of `site/enums/*`, by Java binary name (the `enumInfo` argument). */
export const ENUM_INFO_CLASSES: Readonly<Record<string, EnumClass>> = {
  ...Object.fromEntries(OPTION_ENUMS.map((k) => [`${PACKAGE_OPTIONS}.${k.name}`, k])),
  [`${PACKAGE_LAYERED}.LayeredPhases`]: LayeredPhases as unknown as EnumClass,
  [`${PACKAGE_LAYERED}.components.ComponentOrderingStrategy`]: ComponentOrderingStrategy as unknown as EnumClass,
  [`${PACKAGE_LAYERED}.graph.LNode$NodeType`]: NodeType as unknown as EnumClass,
};

/** Enum types addressed by name in C4 values (`ENUM_TYPES`): the simple name, "LNode.NodeType" for the nested one. */
export const ENUM_TYPES: Readonly<Record<string, EnumClass>> = {
  ...Object.fromEntries(Object.values(ENUM_INFO_CLASSES).map((k) => [k.name, k])),
  'LNode.NodeType': NodeType as unknown as EnumClass,
  Alignment: Alignment as unknown as EnumClass,
  Direction: Direction as unknown as EnumClass,
  EdgeLabelPlacement: EdgeLabelPlacement as unknown as EnumClass,
  HierarchyHandling: HierarchyHandling as unknown as EnumClass,
  LabelSide: LabelSide as unknown as EnumClass,
  PortConstraints: PortConstraints as unknown as EnumClass,
  PortSide: PortSide as unknown as EnumClass,
};

/** Classes whose static `IProperty` fields are addressable by id (`discoverProperties`). */
const PROPERTY_HOLDERS: readonly object[] = [
  CoreOptions,
  LayeredOptions,
  InternalProperties,
  LabelManagementOptions,
  LabelSide,
  LabelDummySwitcher,
];

function isProperty(value: unknown): value is IProperty<unknown> {
  return typeof value === 'object' && value !== null && typeof (value as { getId?: unknown }).getId === 'function';
}

function discoverProperties(): ReadonlyMap<string, IProperty<unknown>> {
  const found = new Map<string, IProperty<unknown>>();
  for (const holder of PROPERTY_HOLDERS) {
    for (const key of Object.getOwnPropertyNames(holder)) {
      const value = (holder as Record<string, unknown>)[key];
      if (isProperty(value) && !found.has(value.getId())) {
        found.set(value.getId(), value); // equal ids are equal properties (Property.equals)
      }
    }
  }
  return found;
}

/** Every property addressable by id: first definition wins, as in `PROPS.putIfAbsent`. */
export const PROPS: ReadonlyMap<string, IProperty<unknown>> = discoverProperties();
