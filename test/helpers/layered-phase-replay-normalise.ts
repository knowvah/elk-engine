// SPDX-License-Identifier: EPL-2.0
// B4: the property normalisation `GraphConfigurator.prepareGraphForLayout` performs before any processor runs,
// mirrored for the replay because `GraphConfigurator` itself is ported in 7f (SC4). Every statement of
// `configureGraphProperties` and `copyPortContraints` cites its Java line (J = org.eclipse.elk.alg.layered/src/org/
// eclipse/elk/alg/layered/GraphConfigurator.java at the pinned commit).
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LGraphUtil } from '../../src/alg/layered/graph/LGraphUtil.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { Spacings } from '../../src/alg/layered/options/Spacings.js';
import { Direction } from '../../src/core/options/Direction.js';
import { EdgeRouting } from '../../src/core/options/EdgeRouting.js';
import { Random } from '../../src/java/util/Random.js';
import { rebaseline } from './layered-phase-replay-dump.js';

/** J:92 `MIN_EDGE_SPACING`. */
const MIN_EDGE_SPACING = 2.0;
/** J:118-119 a seed of 0 selects `new Random()`, a clock seed no recorded row can reproduce (B4: a stop). */
const CLOCK_SEED = 0;

function copyPortConstraints(node: LNode): void {
  // J:147 PortConstraints originalPortconstraints = node.getProperty(LayeredOptions.PORT_CONSTRAINTS);
  const original = node.getProperty(LayeredOptions.PORT_CONSTRAINTS);
  // J:148 node.setProperty(InternalProperties.ORIGINAL_PORT_CONSTRAINTS, originalPortconstraints);
  node.setProperty(InternalProperties.ORIGINAL_PORT_CONSTRAINTS, original);

  // J:150 LGraph nestedGraph = node.getNestedGraph();
  const nestedGraph = node.getNestedGraph();
  // J:151 if (nestedGraph != null) {
  if (nestedGraph !== null) {
    // J:152 copyPortContraints(nestedGraph);
    copyPortContraints(nestedGraph);
  }
}

function copyPortContraints(lgraph: LGraph): void {
  // J:139-140 lgraph.getLayerlessNodes().stream().forEach(lnode -> copyPortConstraints(lnode));
  lgraph.getLayerlessNodes().forEach((lnode) => copyPortConstraints(lnode));
  // J:141-143 lgraph.getLayers().stream().flatMap(layer -> layer.getNodes().stream()).forEach(...)
  lgraph
    .getLayers()
    .flatMap((layer) => layer.getNodes())
    .forEach((lnode) => copyPortConstraints(lnode));
}

function clampEdgeSpacing(lgraph: LGraph): void {
  // J:105 double edgeSpacing = lgraph.getProperty(LayeredOptions.SPACING_EDGE_EDGE);
  const edgeSpacing = lgraph.getProperty(LayeredOptions.SPACING_EDGE_EDGE);
  // J:106 if (edgeSpacing < MIN_EDGE_SPACING) {
  if (edgeSpacing < MIN_EDGE_SPACING) {
    // J:108 lgraph.setProperty(LayeredOptions.SPACING_EDGE_EDGE, MIN_EDGE_SPACING);
    lgraph.setProperty(LayeredOptions.SPACING_EDGE_EDGE, MIN_EDGE_SPACING);
  }
}

function resolveDirection(lgraph: LGraph): void {
  // J:111 Direction direction = lgraph.getProperty(LayeredOptions.DIRECTION);
  const direction = lgraph.getProperty(LayeredOptions.DIRECTION);
  // J:112 if (direction == Direction.UNDEFINED) {
  if (direction === Direction.UNDEFINED) {
    // J:113 lgraph.setProperty(LayeredOptions.DIRECTION, LGraphUtil.getDirection(lgraph));
    lgraph.setProperty(LayeredOptions.DIRECTION, LGraphUtil.getDirection(lgraph));
  }
}

function seedRandom(lgraph: LGraph): void {
  // J:117 Integer randomSeed = lgraph.getProperty(LayeredOptions.RANDOM_SEED);
  const randomSeed = lgraph.getProperty(LayeredOptions.RANDOM_SEED);
  // J:118-119 if (randomSeed == 0) { lgraph.setProperty(InternalProperties.RANDOM, new Random());
  if (randomSeed === CLOCK_SEED) {
    throw new Error('RANDOM_SEED 0 selects a clock-seeded Random; the replay cannot reproduce it (B4)');
  }
  // J:120-121 } else { lgraph.setProperty(InternalProperties.RANDOM, new Random(randomSeed)); }
  lgraph.setProperty(InternalProperties.RANDOM, new Random(randomSeed));
}

function defaultFavorStraightness(lgraph: LGraph): void {
  // J:124 Boolean favorStraightness = lgraph.getProperty(LayeredOptions.NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES);
  // (the option has no default: a graph that never set it answers null at run time)
  const favorStraightness = lgraph.getProperty(LayeredOptions.NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES) as boolean | null;
  // J:125 if (favorStraightness == null) {
  if (favorStraightness === null || favorStraightness === undefined) {
    // J:126-127 lgraph.setProperty(NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES, getProperty(EDGE_ROUTING) == ORTHOGONAL);
    lgraph.setProperty(
      LayeredOptions.NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES,
      lgraph.getProperty(LayeredOptions.EDGE_ROUTING) === EdgeRouting.ORTHOGONAL,
    );
  }
}

/**
 * `GraphConfigurator.configureGraphProperties(lgraph)` (J:99-136), then the phase dump's baseline moves to the state
 * it leaves (see layered-phase-replay-dump.ts).
 */
export function normalise(lgraph: LGraph): void {
  clampEdgeSpacing(lgraph);
  resolveDirection(lgraph);
  seedRandom(lgraph);
  defaultFavorStraightness(lgraph);
  // J:131 copyPortContraints(lgraph);
  copyPortContraints(lgraph);
  // J:134 Spacings spacings = new Spacings(lgraph);
  const spacings = new Spacings(lgraph);
  // J:135 lgraph.setProperty(InternalProperties.SPACINGS, spacings);
  lgraph.setProperty(InternalProperties.SPACINGS, spacings);
  rebaseline(lgraph);
}
