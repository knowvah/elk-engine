// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { AlgorithmAssembler } from '../../core/alg/AlgorithmAssembler.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import type { Graph } from './graph/Graph.js';
import { CompactionStrategy } from './options/CompactionStrategy.js';
import { OverlapRemovalStrategy } from './options/OverlapRemovalStrategy.js';
import { StructureExtractionStrategy } from './options/StructureExtractionStrategy.js';
import { TreeConstructionStrategy } from './options/TreeConstructionStrategy.js';
import { DelaunayTriangulationPhase } from './p1structure/DelaunayTriangulationPhase.js';
import { MaxSTPhase } from './p2processingorder/MaxSTPhase.js';
import { MinSTPhase } from './p2processingorder/MinSTPhase.js';
import { GrowTreePhase } from './p3execution/GrowTreePhase.js';
import { ShrinkTreeCompactionPhase } from './p3execution/ShrinkTreeCompactionPhase.js';
import { SPOrEPhases } from './SPOrEPhases.js';

const DECLARED = ['P1_STRUCTURE', 'P2_PROCESSING_ORDER', 'P3_EXECUTION'] as const;

describe('SPOrEPhases', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(SPOrEPhases.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(SPOrEPhases.P3_EXECUTION.compareTo(SPOrEPhases.P1_STRUCTURE)).toBe(2);
    expect(SPOrEPhases.P1_STRUCTURE.compareTo(SPOrEPhases.P2_PROCESSING_ORDER)).toBe(-1);
    expect(SPOrEPhases.P2_PROCESSING_ORDER.compareTo(SPOrEPhases.P2_PROCESSING_ORDER)).toBe(0);
  });

  it('valueOf resolves each constant by name and throws the Java message for an unknown one', () => {
    for (const name of DECLARED) {
      expect(SPOrEPhases.valueOf(name)).toBe(SPOrEPhases[name]);
    }
    expect(() => SPOrEPhases.valueOf('P4')).toThrow(IllegalArgumentException);
    expect(() => SPOrEPhases.valueOf('P4')).toThrow('No enum constant org.eclipse.elk.alg.spore.SPOrEPhases.P4');
  });
});

describe('AlgorithmAssembler over SPOrEPhases (what the providers of T11 do, ShrinkTree.java:53-60)', () => {
  const assemble = (tree: TreeConstructionStrategy, p3: CompactionStrategy | OverlapRemovalStrategy) => {
    const assembler = AlgorithmAssembler.create<SPOrEPhases, Graph>(SPOrEPhases);
    assembler.reset();
    assembler.setPhase(SPOrEPhases.P1_STRUCTURE, StructureExtractionStrategy.DELAUNAY_TRIANGULATION);
    assembler.setPhase(SPOrEPhases.P2_PROCESSING_ORDER, tree);
    assembler.setPhase(SPOrEPhases.P3_EXECUTION, p3);
    return assembler.build({} as Graph).map((processor) => processor.constructor);
  };

  it('builds the three phases of the shrink-tree compaction in phase order', () => {
    expect(assemble(TreeConstructionStrategy.MINIMUM_SPANNING_TREE, CompactionStrategy.DEPTH_FIRST)).toEqual([
      DelaunayTriangulationPhase,
      MinSTPhase,
      ShrinkTreeCompactionPhase,
    ]);
  });

  it('builds the three phases of the overlap removal with a maximum spanning tree', () => {
    expect(assemble(TreeConstructionStrategy.MAXIMUM_SPANNING_TREE, OverlapRemovalStrategy.GROW_TREE)).toEqual([
      DelaunayTriangulationPhase,
      MaxSTPhase,
      GrowTreePhase,
    ]);
  });
});

describe('the phases of SPOrE', () => {
  it('state no additional processors for any graph (LayoutProcessorConfiguration.create())', () => {
    const phases = [
      new DelaunayTriangulationPhase(),
      new MinSTPhase(),
      new MaxSTPhase(),
      new GrowTreePhase(),
      new ShrinkTreeCompactionPhase(),
    ];
    for (const phase of phases) {
      const configuration = phase.getLayoutProcessorConfiguration({} as Graph);
      for (const slot of SPOrEPhases.values()) {
        expect(configuration.processorsBefore(slot).size).toBe(0);
        expect(configuration.processorsAfter(slot).size).toBe(0);
      }
    }
  });
});
