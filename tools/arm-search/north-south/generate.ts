// SPDX-License-Identifier: EPL-2.0
// Builds the candidates of the north/south routing arms of issue #59 (plans/layered-arm-search, T2; arms 1-6 of
// tools/arm-search/arms.json) and writes them in the format of tools/arm-search/screen.spec.ts. Nothing is random:
// every graph is solved from the guard it has to satisfy.
// Run: npx tsx tools/arm-search/north-south/generate.ts [<out file>]   (default: candidates.json beside this file;
// the output is formatted with the repository's prettier configuration)
//
// The graph: a root with INCLUDE_CHILDREN and one compound node `c` (FIXED_SIDE ports on one side) around the chain
// x0 -> x1 -> x2 -> x3, four nodes of width 30 in the layers 0..3 of the nested graph.
// - HierarchicalPortConstraintProcessor replaces each north/south external port dummy by one dummy per layer next to
//   a connected node: `port -> x_k` gives a dummy in the layer left of x_k, `x_k -> port` one in the layer right of it
//   (HierarchicalPortConstraintProcessor.java:243-299). A dummy is centred in its layer (ALIGNMENT CENTER, :372).
// - HierarchicalPortOrthogonalEdgeRouter restores the port dummy and routes one hyperedge segment per port: the
//   incoming coordinates are the x of those layer dummies, the outgoing coordinate is the x of the port dummy
//   (HierarchicalPortOrthogonalEdgeRouter.java:160-199, 511-585). In a compound layout the nested graph is never
//   FIXED_POS (CompoundGraphPreprocessor.java:941-945), so the port dummy's x is the mean of its layer dummies' x
//   (calculateNorthSouthDummyPositions, :357-380). Port positions therefore cannot be set; the connections are.
//
// Split segment (arms 1, 2, 5, 6; NorthToSouthRoutingStrategy.java:47 and :72, the south-to-north twin alike): two
//   segments in a critical conflict both ways (OrthogonalRoutingGenerator.java:325-385; countConflicts :397-426): an
//   outgoing coordinate of each within the critical threshold of an incoming coordinate of the other. With layer
//   centres L0 < L1 < L2 < L3 at one spacing, p1 has dummies in the layers 0 and 2 (mean L1) and p2 in the layers 1
//   and 3 (mean L2): p1's outgoing coordinate meets p2's incoming L1, and p2's outgoing meets p1's incoming L2. The
//   threshold is 0.2 times the smallest gap between two incoming or two outgoing coordinates (:176), a fifth of
//   the layer spacing, so the two conflicts are critical however the routing slots widen the layers evenly. The
//   two-cycle of critical dependencies is broken by splitting one segment (:203-205, :455-465,
//   HyperEdgeSegmentSplitter.java:53-73, :160-169): that segment's bend points take the `splitPartner != null` arm, and its new
//   partner is a dummy segment.
// Straight edge (arms 3, 4; :62): a segment that is not a straight line as a whole (OrthogonalRoutingGenerator.java
//   :229-232 skips one that is) with one edge whose ends differ by at most TOLERANCE = 1e-3. One port with dummies in
//   the layers 0, 1 and 2 has the mean L1, the x of its middle dummy. So that the difference is inside the tolerance
//   and not zero, the node of layer 2 is wider by 6 * 5e-4: its layer centre moves by 3 * 5e-4, the mean by 5e-4.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

type Side = 'NORTH' | 'SOUTH';
type ElkObject = Record<string, unknown>;

/** Half of OrthogonalRoutingGenerator.TOLERANCE (1e-3): inside the straight-edge window, and not zero. */
const STRAIGHT_OFFSET = 5e-4;
/** Three layer dummies, and a layer centre moves by half of its node's extra width: 3 * 2. */
const WIDTH_PER_OFFSET = 6;
const PORT_SIZE = 4;
const NODE_SIZE = 30;
const CHAIN_LENGTH = 4;
const SIDES: readonly Side[] = ['NORTH', 'SOUTH'];

const node = (id: string, width: number = NODE_SIZE): ElkObject => ({ id, x: 0, y: 0, width, height: NODE_SIZE });

const edge = (id: string, source: string, target: string): ElkObject => ({ id, sources: [source], targets: [target] });

const port = (id: string, side: Side): ElkObject => ({
  id,
  x: 0,
  y: 0,
  width: PORT_SIZE,
  height: PORT_SIZE,
  layoutOptions: { 'port.side': side },
});

/** The chain edges x0 -> x1 -> x2 -> x3. */
function chain(): ElkObject[] {
  return Array.from({ length: CHAIN_LENGTH - 1 }, (_, i) =>
    edge(`c${String(i)}`, `x${String(i)}`, `x${String(i + 1)}`),
  );
}

/** The root with the compound node `c` around the chain; `widths[k]` is the width of `x<k>`. */
function graph(ports: readonly ElkObject[], portEdges: readonly ElkObject[], widths: readonly number[]): ElkObject {
  const compound = {
    ...node('c'),
    children: widths.map((width, i) => node(`x${String(i)}`, width)),
    layoutOptions: { portConstraints: 'FIXED_SIDE' },
    ports,
    edges: [...portEdges, ...chain()],
  };
  return {
    id: 'root',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    children: [compound],
    layoutOptions: { 'elk.direction': 'RIGHT', hierarchyHandling: 'INCLUDE_CHILDREN' },
  };
}

const equalWidths = (): number[] => Array.from({ length: CHAIN_LENGTH }, () => NODE_SIZE);

/** p1 with dummies in the layers 0 and 2, p2 in the layers 1 and 3: a critical two-cycle, hence a split. */
function splitSegment(side: Side): ElkObject {
  const portEdges = [
    edge('e1', 'p1', 'x1'), // dummy in layer 0
    edge('e2', 'p1', 'x3'), // dummy in layer 2
    edge('e3', 'x0', 'p2'), // dummy in layer 1
    edge('e4', 'x2', 'p2'), // dummy in layer 3
  ];
  return graph([port('p1', side), port('p2', side)], portEdges, equalWidths());
}

/** One port with dummies in the layers 0, 1 and 2; its x is 5e-4 right of the middle dummy. */
function straightEdge(side: Side): ElkObject {
  const portEdges = [edge('e1', 'p1', 'x1'), edge('e2', 'p1', 'x2'), edge('e3', 'p1', 'x3')];
  const widths = equalWidths();
  widths[2] = NODE_SIZE + WIDTH_PER_OFFSET * STRAIGHT_OFFSET;
  return graph([port('p1', side)], portEdges, widths);
}

function candidates(): ElkObject[] {
  const builders: readonly [string, (side: Side) => ElkObject][] = [
    ['splitSegment', splitSegment],
    ['straightEdge', straightEdge],
  ];
  return builders.flatMap(([name, build]) =>
    SIDES.map((side) => ({
      id: `sites/HierarchicalPortOrthogonalEdgeRouter/${name}/${side.toLowerCase()}`,
      kind: 'compound',
      elk: build(side),
      options: {},
    })),
  );
}

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? path.join(here, 'candidates.json');
// Formatted as the repository formats JSON, so that the committed file is the generator's output byte for byte.
const options = await resolveConfig(path.join(here, 'candidates.json'));
writeFileSync(out, await format(JSON.stringify(candidates()), { ...options, parser: 'json' }));
console.log(`wrote ${out}`);
