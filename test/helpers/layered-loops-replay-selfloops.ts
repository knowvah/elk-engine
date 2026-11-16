// SPDX-License-Identifier: EPL-2.0
// The TS twin of the self loop summary of tools/vectors/LayeredLoopsVectors.java (mission 7g, W3): the recorder does not
// record the reflected `selfLoopHolder` property (id `InternalProperties.SELF_LOOP_HOLDER`, about a megabyte per node) under
// `changed` or `dump` properties; a row carries `expected.selfLoops` instead, present only when a node holds a holder:
//   { "<node path>": { portsHidden, slotCounts, ports: [{ port, hadOnlySelfLoops, hidden }], loops: [{ type, ports, edges,
//   occupiedSides, slots, leftmost, rightmost, labels }] } }
// `selfLoopsOf` mirrors `selfLoops` / `selfHyperLoop` of the recorder method by method (same field order, list orders and
// element paths: the replay's own path map, hidden ports and removed edges keep their baseline paths). `withoutSelfLoopHolder`
// drops the property from a replayed dump exactly where the recorder ignores it; `compareSelfLoops` compares at AD-4.
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import type { SelfHyperLoop } from '../../src/alg/layered/intermediate/loops/SelfHyperLoop.js';
import type { SelfLoopHolder } from '../../src/alg/layered/intermediate/loops/SelfLoopHolder.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { encodeHex, type HexPair } from './layered-framework-replay.js';
import type { Diff } from './layered-phase-replay-compare.js';
import { contextOf } from './layered-phase-replay-dump.js';
import { compareValues } from './layered-site-replay-compare.js';

type Obj = Record<string, unknown>;

/** The id the recorder ignores (`SELF_LOOP_HOLDER_ID`). */
export const SELF_LOOP_HOLDER_ID: string = InternalProperties.SELF_LOOP_HOLDER.getId();

/** `expected.selfLoops`: node path -> holder summary. */
export type SelfLoopsSummary = Readonly<Record<string, Obj>>;

interface Vector {
  readonly x: number;
  readonly y: number;
}

const pair = (v: Vector): HexPair => [encodeHex(v.x), encodeHex(v.y)];

type PathOf = (element: object) => string;

/** The recorder's `pathOf`: an element without a path is a replay bug. */
function pathResolver(graph: LGraph): PathOf {
  const { paths } = contextOf(graph);
  return (element) => {
    const path = paths.get(element);
    if (path === undefined) {
      throw new Error(`element without a path: ${String(element)}`);
    }
    return path;
  };
}

function pathList(pathOf: PathOf, elements: Iterable<object>): string[] {
  return [...elements].map((element) => pathOf(element));
}

/** `selfHyperLoop` of the recorder, labels included. */
function loopSummary(pathOf: PathOf, loop: SelfHyperLoop): Obj {
  const type = loop.getSelfLoopType();
  const leftmost = loop.getLeftmostPort();
  const rightmost = loop.getRightmostPort();
  const labels = loop.getSLLabels();
  return {
    type: type === null ? null : type.name(),
    ports: pathList(
      pathOf,
      loop.getSLPorts().map((slPort) => slPort.getLPort()),
    ),
    edges: pathList(
      pathOf,
      [...loop.getSLEdges()].map((slEdge) => slEdge.getLEdge()),
    ),
    occupiedSides: [...loop.getOccupiedPortSides()].map((side) => side.name()),
    slots: PortSide.values().map((side) => loop.getRoutingSlot(side)),
    leftmost: leftmost === null ? null : pathOf(leftmost.getLPort()),
    rightmost: rightmost === null ? null : pathOf(rightmost.getLPort()),
    labels:
      labels === null
        ? null
        : {
            labels: pathList(pathOf, labels.getLLabels()),
            side: labels.getSide() === null ? null : labels.getSide()!.name(),
            alignment: labels.getAlignment() === null ? null : labels.getAlignment()!.name(),
            size: pair(labels.getSize()),
            position: pair(labels.getPosition()),
            reference:
              labels.getAlignmentReferenceSLPort() === null
                ? null
                : pathOf(labels.getAlignmentReferenceSLPort()!.getLPort()),
          },
  };
}

/** The holder part of `selfLoops` of the recorder. */
function holderSummary(pathOf: PathOf, holder: SelfLoopHolder): Obj {
  return {
    portsHidden: holder.arePortsHidden(),
    slotCounts: [...holder.getRoutingSlotCount()],
    ports: [...holder.getSLPortMap().values()].map((slPort) => ({
      port: pathOf(slPort.getLPort()),
      hadOnlySelfLoops: slPort.hadOnlySelfLoops(),
      hidden: slPort.isHidden(),
    })),
    loops: holder.getSLHyperLoops().map((loop) => loopSummary(pathOf, loop)),
  };
}

/**
 * The self loop summary of a replayed graph: the holder of every node the replay knows by path, `undefined` when no node
 * has one (the recorder then writes no `selfLoops` key). Call it after the row's dump, which names elements a processor
 * created. Nodes are taken in path-map order; the result is keyed by path, so the order does not matter.
 */
export function selfLoopsOf(graph: LGraph): SelfLoopsSummary | undefined {
  const pathOf = pathResolver(graph);
  const result: Record<string, Obj> = {};
  for (const element of contextOf(graph).paths.keys()) {
    if (element instanceof LNode && element.hasProperty(InternalProperties.SELF_LOOP_HOLDER)) {
      result[pathOf(element)] = holderSummary(pathOf, element.getProperty(InternalProperties.SELF_LOOP_HOLDER));
    }
  }
  return Object.keys(result).length === 0 ? undefined : result;
}

/** A row key present on one side only is a mismatch; both present are compared at AD-4. */
export function compareSelfLoops(actual: SelfLoopsSummary | undefined, expected: unknown): Diff[] {
  if (actual === undefined && expected === undefined) {
    return [];
  }
  if (expected === undefined) {
    return [{ where: 'selfLoops', message: 'unexpected: the row records no selfLoops but the graph has a holder' }];
  }
  if (actual === undefined) {
    return [{ where: 'selfLoops', message: 'missing: the row records selfLoops but no node has a holder' }];
  }
  return compareValues('selfLoops', actual, expected).map((message) => ({ where: 'selfLoops', message }));
}

/** A copy of `value` with `selfLoopHolder` removed from every `properties` map (the recorder's `IGNORED_IDS`). */
function stripHolder(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripHolder);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Obj).map(([key, item]) => [
      key,
      key === 'properties' && item !== null && typeof item === 'object' ? withoutKey(item as Obj) : stripHolder(item),
    ]),
  );
}

function withoutKey(properties: Obj): Obj {
  return Object.fromEntries(Object.entries(properties).filter(([id]) => id !== SELF_LOOP_HOLDER_ID));
}

/** `expected.changed` without the property; an entry that only held it was never recorded, so it goes too. */
function stripChanged(changed: readonly { path: string; props: Obj }[]): unknown[] {
  return changed
    .map((entry) => ({ ...entry, props: withoutKey(entry.props) }))
    .filter((entry, i) => Object.keys(entry.props).length > 0 || Object.keys(changed[i]!.props).length === 0);
}

/**
 * `dump` with the property removed from every element's `properties`, and `changed` with it removed from every entry (the
 * replayed side; the recorded side never has it). `T` is a labels `expected`-shaped object or a bare `LGraphDump`.
 */
export function withoutSelfLoopHolder<T extends object>(dump: T): T {
  const shaped = dump as { changed?: readonly { path: string; props: Obj }[] };
  const stripped = stripHolder(dump) as Obj;
  return (shaped.changed === undefined ? stripped : { ...stripped, changed: stripChanged(shaped.changed) }) as T;
}
