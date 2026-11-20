// SPDX-License-Identifier: EPL-2.0
// The `Factories` objects that more than one layered test built for itself (issue #46). Each export is the body its
// users held, moved here unchanged: a guard (`expect`, `throw`) is part of the body and moves with it. The exports
// differ on purpose: which processors are injected as classes rather than created through
// `IntermediateProcessorStrategy`, which phases are dispatched, and what happens to a phase outside that set (a
// fallback enum, an assertion, or an error). A test keeps the one it had; none is a drop-in for another.
// plans/test-helper-consolidation/inventory.md maps every site to its export.
import { expect } from 'vitest';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { CommentNodeMarginCalculator } from '../../src/alg/layered/intermediate/CommentNodeMarginCalculator.js';
import { CommentPostprocessor } from '../../src/alg/layered/intermediate/CommentPostprocessor.js';
import { CommentPreprocessor } from '../../src/alg/layered/intermediate/CommentPreprocessor.js';
import { EndLabelPostprocessor } from '../../src/alg/layered/intermediate/EndLabelPostprocessor.js';
import { EndLabelPreprocessor } from '../../src/alg/layered/intermediate/EndLabelPreprocessor.js';
import { HierarchicalPortConstraintProcessor } from '../../src/alg/layered/intermediate/HierarchicalPortConstraintProcessor.js';
import { HierarchicalPortDummySizeProcessor } from '../../src/alg/layered/intermediate/HierarchicalPortDummySizeProcessor.js';
import { InLayerConstraintProcessor } from '../../src/alg/layered/intermediate/InLayerConstraintProcessor.js';
import { InnermostNodeMarginCalculator } from '../../src/alg/layered/intermediate/InnermostNodeMarginCalculator.js';
import { IntermediateProcessorStrategy } from '../../src/alg/layered/intermediate/IntermediateProcessorStrategy.js';
import { InvertedPortProcessor } from '../../src/alg/layered/intermediate/InvertedPortProcessor.js';
import { LabelAndNodeSizeProcessor } from '../../src/alg/layered/intermediate/LabelAndNodeSizeProcessor.js';
import { LabelDummyInserter } from '../../src/alg/layered/intermediate/LabelDummyInserter.js';
import { LabelDummyRemover } from '../../src/alg/layered/intermediate/LabelDummyRemover.js';
import { LabelDummySwitcher } from '../../src/alg/layered/intermediate/LabelDummySwitcher.js';
import { LabelManagementProcessor } from '../../src/alg/layered/intermediate/LabelManagementProcessor.js';
import { LabelSideSelector } from '../../src/alg/layered/intermediate/LabelSideSelector.js';
import { LongEdgeSplitter } from '../../src/alg/layered/intermediate/LongEdgeSplitter.js';
import { NodePlacementRepeater } from '../../src/alg/layered/intermediate/NodePlacementRepeater.js';
import { NorthSouthPortPreprocessor } from '../../src/alg/layered/intermediate/NorthSouthPortPreprocessor.js';
import { PortListSorter } from '../../src/alg/layered/intermediate/PortListSorter.js';
import { PortSideProcessor } from '../../src/alg/layered/intermediate/PortSideProcessor.js';
import { SemiInteractiveCrossMinProcessor } from '../../src/alg/layered/intermediate/SemiInteractiveCrossMinProcessor.js';
import { SortByInputModelProcessor } from '../../src/alg/layered/intermediate/SortByInputModelProcessor.js';
import { CrossingMinimizationStrategy } from '../../src/alg/layered/options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../src/alg/layered/options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../src/alg/layered/options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../../src/alg/layered/options/NodePlacementStrategy.js';
import { LayerSweepCrossingMinimizer } from '../../src/alg/layered/p3order/LayerSweepCrossingMinimizer.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../../src/alg/layered/p3order/LayerSweepCrossingMinimizerCrossMinType.js';
import { LinearSegmentsNodePlacer } from '../../src/alg/layered/p4nodes/LinearSegmentsNodePlacer.js';
import { EdgeRouterFactory } from '../../src/alg/layered/p5edges/EdgeRouterFactory.js';
import { OrthogonalEdgeRouter } from '../../src/alg/layered/p5edges/OrthogonalEdgeRouter.js';
import { PolylineEdgeRouter } from '../../src/alg/layered/p5edges/PolylineEdgeRouter.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { EdgeRouting } from '../../src/core/options/EdgeRouting.js';
import type { Factories } from './layered-phase-replay-ops.js';

const CYCLE_PHASE = 'P1_CYCLE_BREAKING';
const LAYERING_PHASE = 'P2_LAYERING';
const ORDERING_PHASE = 'P3_NODE_ORDERING';
const PLACEMENT_PHASE = 'P4_NODE_PLACEMENT';
const ROUTING_PHASE = 'P5_EDGE_ROUTING';

// ------------------------------------------------------------------------------------------------------------
// every processor through the enum; a phase outside the set falls through to the last enum

/** Processors by `IntermediateProcessorStrategy`; `P1_CYCLE_BREAKING` breaks cycles, any other phase is a layering. */
export const LAYERING_PHASE_FACTORIES: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) =>
    phase === CYCLE_PHASE
      ? CycleBreakingStrategy.valueOf(strategy).create()
      : LayeringStrategy.valueOf(strategy).create(),
};

/** Processors by `IntermediateProcessorStrategy`; P1 and P2 by their enums, any other phase is a crossing minimization. */
export const ORDER_PHASE_FACTORIES: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      default:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
    }
  },
};

/** Processors by `IntermediateProcessorStrategy`; P1 to P4 by their enums, any other phase is an edge routing. */
export const ROUTING_PHASE_FACTORIES: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      case ORDERING_PHASE:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case PLACEMENT_PHASE:
        return NodePlacementStrategy.valueOf(strategy).create();
      default:
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
    }
  },
};

/** As {@link ROUTING_PHASE_FACTORIES}, and the fifth phase is asserted to be `P5_EDGE_ROUTING` before it is created. */
export const CHECKED_ROUTING_PHASE_FACTORIES: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      case ORDERING_PHASE:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case PLACEMENT_PHASE:
        return NodePlacementStrategy.valueOf(strategy).create();
      default:
        expect(phase).toBe(ROUTING_PHASE);
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
    }
  },
};

// ------------------------------------------------------------------------------------------------------------
// every processor through the enum; a phase outside the set is an error

/** Processors by `IntermediateProcessorStrategy`; P1 and P2 by their enums, any other phase throws. */
export const STRICT_LAYERING_PHASE_FACTORIES: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      default:
        throw new Error(`unknown phase ${phase}`);
    }
  },
};

/** Processors by `IntermediateProcessorStrategy`; P1 to P3 by their enums, any other phase throws. */
export const STRICT_ORDER_PHASE_FACTORIES: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      case ORDERING_PHASE:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      default:
        throw new Error(`unknown phase ${phase}`);
    }
  },
};

/** Processors by `IntermediateProcessorStrategy`; P1 to P4 by their enums, any other phase throws. */
export const STRICT_PLACEMENT_PHASE_FACTORIES: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      case ORDERING_PHASE:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case PLACEMENT_PHASE:
        return NodePlacementStrategy.valueOf(strategy).create();
      default:
        throw new Error(`unknown phase ${phase}`);
    }
  },
};

/** The real enum-driven factories of all five phases: a staged arm throws at `create()`, any other phase throws. */
export const STRICT_ROUTING_PHASE_FACTORIES: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      case ORDERING_PHASE:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case PLACEMENT_PHASE:
        return NodePlacementStrategy.valueOf(strategy).create();
      case ROUTING_PHASE:
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
      default:
        throw new Error(`unknown phase ${phase}`);
    }
  },
};

// ------------------------------------------------------------------------------------------------------------
// some processors injected as classes (a class test replays rows whatever its enum arm does)

/**
 * The four processors ahead of the port distributors are injected and any other processor throws; `P1_CYCLE_BREAKING`
 * breaks cycles, any other phase is a layering.
 */
export const SPLITTER_TO_SORTER_FACTORIES: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'LONG_EDGE_SPLITTER':
        return new LongEdgeSplitter();
      case 'PORT_SIDE_PROCESSOR':
        return new PortSideProcessor();
      case 'INVERTED_PORT_PROCESSOR':
        return new InvertedPortProcessor();
      case 'PORT_LIST_SORTER':
        return new PortListSorter();
      default:
        throw new Error(`processor ${name} is not available to this test`);
    }
  },
  createPhase: (phase, strategy) =>
    phase === CYCLE_PHASE
      ? CycleBreakingStrategy.valueOf(strategy).create()
      : LayeringStrategy.valueOf(strategy).create(),
};

/**
 * Six processors of the order mission are injected, every other name goes through the enum; `P1_CYCLE_BREAKING`
 * breaks cycles, any other phase is a layering.
 */
export const PORT_PROCESSOR_FACTORIES: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'LONG_EDGE_SPLITTER':
        return new LongEdgeSplitter();
      case 'PORT_SIDE_PROCESSOR':
        return new PortSideProcessor();
      case 'INVERTED_PORT_PROCESSOR':
        return new InvertedPortProcessor();
      case 'PORT_LIST_SORTER':
        return new PortListSorter();
      case 'HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR':
        return new HierarchicalPortConstraintProcessor();
      case 'SEMI_INTERACTIVE_CROSSMIN_PROCESSOR':
        return new SemiInteractiveCrossMinProcessor();
      default:
        return IntermediateProcessorStrategy.valueOf(name).create();
    }
  },
  createPhase: (phase, strategy) =>
    phase === CYCLE_PHASE
      ? CycleBreakingStrategy.valueOf(strategy).create()
      : LayeringStrategy.valueOf(strategy).create(),
};

/**
 * Eight processors of the order mission are injected, every other name goes through the enum; `P1_CYCLE_BREAKING`
 * breaks cycles, any other phase is a layering.
 */
export const ORDER_PROCESSOR_FACTORIES: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'LONG_EDGE_SPLITTER':
        return new LongEdgeSplitter();
      case 'PORT_SIDE_PROCESSOR':
        return new PortSideProcessor();
      case 'INVERTED_PORT_PROCESSOR':
        return new InvertedPortProcessor();
      case 'PORT_LIST_SORTER':
        return new PortListSorter();
      case 'NORTH_SOUTH_PORT_PREPROCESSOR':
        return new NorthSouthPortPreprocessor();
      case 'HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR':
        return new HierarchicalPortConstraintProcessor();
      case 'SEMI_INTERACTIVE_CROSSMIN_PROCESSOR':
        return new SemiInteractiveCrossMinProcessor();
      case 'SORT_BY_INPUT_ORDER_OF_MODEL':
        return new SortByInputModelProcessor();
      default:
        return IntermediateProcessorStrategy.valueOf(name).create();
    }
  },
  createPhase: (phase, strategy) =>
    phase === CYCLE_PHASE
      ? CycleBreakingStrategy.valueOf(strategy).create()
      : LayeringStrategy.valueOf(strategy).create(),
};

/**
 * The eight processors of {@link ORDER_PROCESSOR_FACTORIES} and the two greedy-switch processors are injected, every
 * other name goes through the enum; P1 and P2 by their enums, any other phase is a crossing minimization.
 */
export const GREEDY_SWITCH_FACTORIES: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'LONG_EDGE_SPLITTER':
        return new LongEdgeSplitter();
      case 'PORT_SIDE_PROCESSOR':
        return new PortSideProcessor();
      case 'INVERTED_PORT_PROCESSOR':
        return new InvertedPortProcessor();
      case 'PORT_LIST_SORTER':
        return new PortListSorter();
      case 'NORTH_SOUTH_PORT_PREPROCESSOR':
        return new NorthSouthPortPreprocessor();
      case 'HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR':
        return new HierarchicalPortConstraintProcessor();
      case 'SEMI_INTERACTIVE_CROSSMIN_PROCESSOR':
        return new SemiInteractiveCrossMinProcessor();
      case 'SORT_BY_INPUT_ORDER_OF_MODEL':
        return new SortByInputModelProcessor();
      case 'ONE_SIDED_GREEDY_SWITCH':
        return new LayerSweepCrossingMinimizer(CrossMinType.ONE_SIDED_GREEDY_SWITCH);
      case 'TWO_SIDED_GREEDY_SWITCH':
        return new LayerSweepCrossingMinimizer(CrossMinType.TWO_SIDED_GREEDY_SWITCH);
      default:
        return IntermediateProcessorStrategy.valueOf(name).create();
    }
  },
  createPhase: (phase, strategy) =>
    phase === CYCLE_PHASE
      ? CycleBreakingStrategy.valueOf(strategy).create()
      : phase === LAYERING_PHASE
        ? LayeringStrategy.valueOf(strategy).create()
        : CrossingMinimizationStrategy.valueOf(strategy).create(),
};

/** The 7d processors are injected (T8 wires their enum arms); every other name goes through the real enums. */
export const PLACEMENT_PROCESSOR_FACTORIES: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'INNERMOST_NODE_MARGIN_CALCULATOR':
        return new InnermostNodeMarginCalculator();
      case 'LABEL_AND_NODE_SIZE_PROCESSOR':
        return new LabelAndNodeSizeProcessor();
      case 'IN_LAYER_CONSTRAINT_PROCESSOR':
        return new InLayerConstraintProcessor();
      case 'HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR':
        return new HierarchicalPortDummySizeProcessor();
      case 'NODE_PLACEMENT_REPEATER':
        return new NodePlacementRepeater();
      default:
        return IntermediateProcessorStrategy.valueOf(name).create();
    }
  },
  createPhase(phase, strategy) {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      case ORDERING_PHASE:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      default:
        return NodePlacementStrategy.valueOf(strategy).create();
    }
  },
};

/**
 * Four of the 7d processors are injected, every other name goes through the enum; P1 to P3 by their enums, any other
 * phase is a `LinearSegmentsNodePlacer`, whatever the strategy names.
 */
export const LINEAR_SEGMENTS_FACTORIES: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'INNERMOST_NODE_MARGIN_CALCULATOR':
        return new InnermostNodeMarginCalculator();
      case 'LABEL_AND_NODE_SIZE_PROCESSOR':
        return new LabelAndNodeSizeProcessor();
      case 'IN_LAYER_CONSTRAINT_PROCESSOR':
        return new InLayerConstraintProcessor();
      case 'HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR':
        return new HierarchicalPortDummySizeProcessor();
      default:
        return IntermediateProcessorStrategy.valueOf(name).create();
    }
  },
  createPhase(phase, strategy) {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      case ORDERING_PHASE:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      default:
        return new LinearSegmentsNodePlacer();
    }
  },
};

/**
 * Processors by `IntermediateProcessorStrategy`; P1 to P4 by their enums; the fifth phase is asserted to be
 * `P5_EDGE_ROUTING` with a polyline or orthogonal strategy, and its router is injected.
 */
export const INJECTED_ROUTER_FACTORIES: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    return IntermediateProcessorStrategy.valueOf(name).create();
  },
  createPhase(phase, strategy): ILayoutProcessor<LGraph> {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      case ORDERING_PHASE:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case PLACEMENT_PHASE:
        return NodePlacementStrategy.valueOf(strategy).create();
      default:
        // P5_EDGE_ROUTING: the EdgeRouterFactory arm is T10's; the routers under test are injected
        expect(phase).toBe(ROUTING_PHASE);
        expect(['POLYLINE', 'ORTHOGONAL']).toContain(strategy);
        return strategy === 'POLYLINE' ? new PolylineEdgeRouter() : new OrthogonalEdgeRouter();
    }
  },
};

/** The comment processors as classes, by their `IntermediateProcessorStrategy` name. */
const INJECTED_COMMENT_PROCESSORS: Readonly<Record<string, () => ILayoutProcessor<LGraph>>> = {
  COMMENT_PREPROCESSOR: () => new CommentPreprocessor(),
  COMMENT_NODE_MARGIN_CALCULATOR: () => new CommentNodeMarginCalculator(),
  COMMENT_POSTPROCESSOR: () => new CommentPostprocessor(),
};

/**
 * The three comment processors are injected, every other name goes through the enum; the phases are those of
 * {@link CHECKED_ROUTING_PHASE_FACTORIES}.
 */
export const COMMENT_PROCESSOR_FACTORIES: Factories = {
  createProcessor: (name) =>
    INJECTED_COMMENT_PROCESSORS[name]?.() ?? IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      case ORDERING_PHASE:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case PLACEMENT_PHASE:
        return NodePlacementStrategy.valueOf(strategy).create();
      default:
        expect(phase).toBe(ROUTING_PHASE);
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
    }
  },
};

/**
 * The label and comment processors as classes, by their `IntermediateProcessorStrategy` name. Exported because
 * LabelSideSelector.test.ts also patches them into the enum for its full rows.
 */
export const INJECTED_LABEL_PROCESSORS: Readonly<Record<string, () => ILayoutProcessor<LGraph>>> = {
  LABEL_DUMMY_INSERTER: () => new LabelDummyInserter(),
  LABEL_DUMMY_SWITCHER: () => new LabelDummySwitcher(),
  LABEL_DUMMY_REMOVER: () => new LabelDummyRemover(),
  END_LABEL_PREPROCESSOR: () => new EndLabelPreprocessor(),
  END_LABEL_POSTPROCESSOR: () => new EndLabelPostprocessor(),
  COMMENT_PREPROCESSOR: () => new CommentPreprocessor(),
  COMMENT_NODE_MARGIN_CALCULATOR: () => new CommentNodeMarginCalculator(),
  COMMENT_POSTPROCESSOR: () => new CommentPostprocessor(),
  LABEL_SIDE_SELECTOR: () => new LabelSideSelector(),
  CENTER_LABEL_MANAGEMENT_PROCESSOR: () => new LabelManagementProcessor(true),
  END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR: () => new LabelManagementProcessor(false),
};

/**
 * The processors of {@link INJECTED_LABEL_PROCESSORS} are injected, every other name goes through the enum; the phases
 * are those of {@link CHECKED_ROUTING_PHASE_FACTORIES}.
 */
export const LABEL_PROCESSOR_FACTORIES: Factories = {
  createProcessor: (name) =>
    INJECTED_LABEL_PROCESSORS[name]?.() ?? IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      case ORDERING_PHASE:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case PLACEMENT_PHASE:
        return NodePlacementStrategy.valueOf(strategy).create();
      default:
        expect(phase).toBe(ROUTING_PHASE);
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
    }
  },
};
