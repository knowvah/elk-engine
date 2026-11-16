// SPDX-License-Identifier: EPL-2.0
// Three adaptations of the landed replay for the rows of the wrapping processors (mission 7g, T11); no landed helper, ref or
// recorder is edited, nothing is skipped and no comparison is weakened.
//
// 1. `breakingPoint.info`. The recorder (tools/vectors/LayeredLoopsVectors.java, `Encoder.object`) reflects a `BPInfo` as
//      { t: 'obj', c: 'BPInfo', fields: { start, end, nodeStartEdge, startEndEdge, originalEdge, startInLayerDummy,
//        startInLayerEdge, endInLayerDummy, endInLayerEdge, prev, next } }
//    walking the declared fields in order, element fields as `{ ref: <path> }`, `prev` / `next` as nested objects (the chain
//    is cyclic, so the recorder stops at depth 8: an element becomes `{ class: <Java class name> }`, a `BPInfo` becomes
//    `{ class: '...BreakingPointInserter$BPInfo' }`). The landed `Ctx.encode` has no generic object arm: it answers
//    `{ class: 'BPInfo' }` and names a too-deep element by its TS class name.
// 2. `IndividualSpacings` (CuttingUtils sets it on every long edge dummy). The recorder reflects it as
//      { t: 'obj', c: 'IndividualSpacings', fields: { propertyMap: null | { class: 'java.util.HashMap' } } }
//    (`MapPropertyHolder.propertyMap`, created lazily); `Ctx.encode` answers `{ class: 'IndividualSpacings' }`.
//    `installWrappingEncoding` wraps `Ctx.prototype.encode` so both are encoded as the recorder does; every other value goes
//    through the landed encoder unchanged.
// 3. List options. A row's `options` entry that is a JSON array of C4 scalars (`wrapping.cutting.cuts`,
//    `wrapping.validify.forbiddenIndices`: `[{ t: 'int', v: 3 }]`) is neither a C4 object nor a string, so the landed
//    `applyOptions` hands `String(array)` to `parseValue`, which throws for an OBJECT option. `withListOptions` rewrites such
//    an entry on a row copy into a marker string, and `installWrappingEncoding` wraps `LayoutOptionData.prototype.parseValue`
//    so a marker string is decoded with the landed `Ctx.decode` (the recorded `List<Integer>` becomes a `number[]` whose
//    `toString` is the Java list's: the layout result exports an option value by it).
import { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import { LGraphElement } from '../../src/alg/layered/graph/LGraphElement.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { BPInfo } from '../../src/alg/layered/intermediate/wrapping/BreakingPointInserterBPInfo.js';
import { LayoutOptionData } from '../../src/core/data/LayoutOptionData.js';
import { IndividualSpacings } from '../../src/core/util/IndividualSpacings.js';
import { Ctx } from './layered-site-replay-context.js';
import type { LoopsRow } from './layered-loops-replay-rows.js';

type Json = unknown;
type Encode = (this: Ctx, v: unknown, depth: number) => Json;

/** The recorder's `MAX_DEPTH`: a value deeper than this is encoded by its class name. */
const MAX_DEPTH = 8;
const BP_INFO_CLASS = 'org.eclipse.elk.alg.layered.intermediate.wrapping.BreakingPointInserter$BPInfo';
const ELEMENT_CLASSES: readonly (readonly [abstract new (...args: never[]) => LGraphElement, string])[] = [
  [LNode, 'org.eclipse.elk.alg.layered.graph.LNode'],
  [LEdge, 'org.eclipse.elk.alg.layered.graph.LEdge'],
];

/** The Java class name of a too-deep element (`Encoder.unencodable`, non-strict). */
function deepElementClass(v: LGraphElement): string {
  const known = ELEMENT_CLASSES.find(([type]) => v instanceof type);
  if (known === undefined) {
    throw new Error(`BPInfo field of unexpected class ${v.constructor.name}`);
  }
  return known[1];
}

/** The fields of a `BPInfo` in declaration order (the order of the Java class). */
const bpFields = (v: BPInfo): readonly (readonly [string, unknown])[] => [
  ['start', v.start],
  ['end', v.end],
  ['nodeStartEdge', v.nodeStartEdge],
  ['startEndEdge', v.startEndEdge],
  ['originalEdge', v.originalEdge],
  ['startInLayerDummy', v.startInLayerDummy],
  ['startInLayerEdge', v.startInLayerEdge],
  ['endInLayerDummy', v.endInLayerDummy],
  ['endInLayerEdge', v.endInLayerEdge],
  ['prev', v.prev],
  ['next', v.next],
];

/** `Encoder.encode` of the recorder for a value reachable from a `BPInfo`. */
function encodeValue(ctx: Ctx, original: Encode, v: unknown, depth: number): Json {
  if (v === null || v === undefined) {
    return null;
  }
  if (depth > MAX_DEPTH) {
    return { class: v instanceof BPInfo ? BP_INFO_CLASS : deepElementClass(v as LGraphElement) };
  }
  return v instanceof BPInfo ? encodeBpInfo(ctx, original, v, depth) : original.call(ctx, v, depth);
}

function encodeBpInfo(ctx: Ctx, original: Encode, v: BPInfo, depth: number): Json {
  const fields: Record<string, Json> = {};
  for (const [name, value] of bpFields(v)) {
    fields[name] = encodeValue(ctx, original, value, depth + 1);
  }
  return { t: 'obj', c: 'BPInfo', fields };
}

/** `Encoder.object` of the recorder for an `IndividualSpacings` (its only field is the lazily created `propertyMap`). */
function encodeIndividualSpacings(v: IndividualSpacings): Json {
  const { propertyMap } = v as unknown as { propertyMap: unknown };
  return {
    t: 'obj',
    c: 'IndividualSpacings',
    fields: { propertyMap: propertyMap === null ? null : { class: 'java.util.HashMap' } },
  };
}

type Marked<F> = F & { wrappingAware?: true };
type ParseValue = (this: LayoutOptionData, valueString: string | null) => unknown;

/** A `number[]` whose `toString` is that of a Java `List<Integer>` (`[2, 4, 6]`): the layout result exports option values by it. */
class JavaIntList extends Array<number> {
  override toString(): string {
    return `[${this.join(', ')}]`;
  }
}

const LIST_MARKER = '\u0000c4list:';

/** `row` with every array-valued option replaced by a marker string that the wrapped `parseValue` decodes. */
export function withListOptions(row: LoopsRow): LoopsRow {
  const options = Object.fromEntries(
    Object.entries(row.options).map(([id, value]) => [
      id,
      Array.isArray(value) ? `${LIST_MARKER}${JSON.stringify(value)}` : value,
    ]),
  );
  return { ...row, options };
}

/** Wraps `Ctx.prototype.encode` and `LayoutOptionData.prototype.parseValue` (idempotent); runs when this module is evaluated. */
export function installWrappingEncoding(): void {
  const prototype = Ctx.prototype as unknown as { encode: Marked<Encode> };
  if (prototype.encode.wrappingAware !== true) {
    const original = prototype.encode;
    const wrapped: Marked<Encode> = function (this: Ctx, v, depth) {
      if (v instanceof BPInfo) {
        return encodeValue(this, original, v, depth);
      }
      return v instanceof IndividualSpacings && depth <= MAX_DEPTH
        ? encodeIndividualSpacings(v)
        : original.call(this, v, depth);
    };
    wrapped.wrappingAware = true;
    prototype.encode = wrapped;
  }
  const data = LayoutOptionData.prototype as unknown as { parseValue: Marked<ParseValue> };
  if (data.parseValue.wrappingAware !== true) {
    const original = data.parseValue;
    const wrapped: Marked<ParseValue> = function (this: LayoutOptionData, valueString) {
      return typeof valueString === 'string' && valueString.startsWith(LIST_MARKER)
        ? JavaIntList.from(new Ctx({}).decode(JSON.parse(valueString.slice(LIST_MARKER.length))) as number[])
        : original.call(this, valueString);
    };
    wrapped.wrappingAware = true;
    data.parseValue = wrapped;
  }
}

installWrappingEncoding();
