// SPDX-License-Identifier: EPL-2.0
// The TS twin of the RectRow object-graph dump of tools/vectors/RectPackingVectors.java (`rowsJson`, `blockJson`; mission 8c, T6; the
// header of that file is the contract): `dumpRectRows` numbers rows, blocks and stacks by first sight exactly as the recorder does and
// emits the recorder's field names, doubles as 16-hex raw bits; `rebuildRectRows` is its inverse: it builds the `RectRow`, `Block`,
// `BlockStack` and `BlockRow` objects of a recorded `state.rows` with the recorded private state, around the `ElkNode`s the caller
// supplies by identifier. `compareJson` is that of the disco helper (one comparison at the AD-4 bar: ids, counts, list and key order,
// strings, integers and booleans exact, every hex double within 1e-6; the raw-bit identical and the merely close ones counted).
// What the rebuild cannot restore: nothing of `state.rows`; node geometry is not part of it (`restoreElk` sets it), and a block's
// `rows[].rects` / `children` need the nodes of the layout node.
// The private fields of the util classes are reached by reflection (`field`, `setFields`), as the recorder reaches them with
// `Field.setAccessible`.
import { Block } from '../../src/alg/rectpacking/util/Block.js';
import { BlockRow } from '../../src/alg/rectpacking/util/BlockRow.js';
import { BlockStack } from '../../src/alg/rectpacking/util/BlockStack.js';
import { RectRow } from '../../src/alg/rectpacking/util/RectRow.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import {
  decodeHex,
  encodeHex,
  type BlockEntry,
  type BlockRowEntry,
  type BlockStackEntry,
  type Hex,
  type RectRowEntry,
  type RowsState,
} from './rectpacking-replay-rows.js';

export { closeEnough, compareJson, formatDifferences, TOLERANCE } from './disco-replay-dump.js';
export type { Comparison } from './disco-replay-dump.js';

/** Reads a private field of a util object (the recorder's `field(target, name)`). */
export function field<T>(target: object, name: string): T {
  if (!(name in target)) {
    throw new Error(`reflection ${target.constructor.name}.${name}`);
  }
  return (target as Record<string, unknown>)[name] as T;
}

/** Assigns private fields of a util object. */
export function setFields(target: object, values: Readonly<Record<string, unknown>>): void {
  for (const [name, value] of Object.entries(values)) {
    if (!(name in target)) {
      throw new Error(`reflection ${target.constructor.name}.${name}`);
    }
    (target as Record<string, unknown>)[name] = value;
  }
}

const hex = (value: number): Hex => encodeHex(value);

/** Identity-numbered registry of the recorder's `register(o, idx, list)`. */
class Registry<T> {
  readonly list: T[] = [];
  readonly #index = new Map<T, number>();

  register(item: T): number {
    let index = this.#index.get(item);
    if (index === undefined) {
      index = this.list.length;
      this.#index.set(item, index);
      this.list.push(item);
    }
    return index;
  }

  indexOf(item: T): number {
    const index = this.#index.get(item);
    if (index === undefined) {
      throw new Error('object not registered');
    }
    return index;
  }
}

class Numbering {
  readonly rows = new Registry<RectRow>();
  readonly blocks = new Registry<Block>();
  readonly stacks = new Registry<BlockStack>();

  /** The recorder's closure: rows in order, each row's blocks then stacks, then block.parentRow, block.stack, stack.blocks. */
  constructor(list: readonly RectRow[]) {
    list.forEach((row) => this.rows.register(row));
    let rp = 0;
    let bp = 0;
    let sp = 0;
    while (rp < this.rows.list.length || bp < this.blocks.list.length || sp < this.stacks.list.length) {
      while (rp < this.rows.list.length) {
        const row = this.rows.list[rp++] as RectRow;
        row.getChildren().forEach((b) => this.blocks.register(b));
        row.getStacks().forEach((s) => this.stacks.register(s));
      }
      while (bp < this.blocks.list.length) {
        const block = this.blocks.list[bp++] as Block;
        this.rows.register(block.getParentRow());
        const stack = block.getStack();
        if (stack !== null) {
          this.stacks.register(stack);
        }
      }
      while (sp < this.stacks.list.length) {
        (this.stacks.list[sp++] as BlockStack).getBlocks().forEach((b) => this.blocks.register(b));
      }
    }
  }
}

const dumpRow = (row: RectRow, n: Numbering): RectRowEntry => ({
  y: hex(row.getY()),
  width: hex(row.getWidth()),
  height: hex(row.getHeight()),
  spacing: hex(field<number>(row, 'nodeNodeSpacing')),
  potentialAdditionalWidth: hex(row.getPotentialAdditionalWidthToGetLastBlock()),
  blocks: row.getChildren().map((b) => n.blocks.indexOf(b)),
  stacks: row.getStacks().map((s) => n.stacks.indexOf(s)),
});

const dumpStack = (stack: BlockStack, n: Numbering): BlockStackEntry => ({
  x: hex(stack.getX()),
  y: hex(stack.getY()),
  width: hex(stack.getWidth()),
  height: hex(stack.getHeight()),
  spacing: hex(field<number>(stack, 'nodeNodeSpacing')),
  blocks: stack.getBlocks().map((b) => n.blocks.indexOf(b)),
});

const dumpBlockRow = (row: BlockRow): BlockRowEntry => ({
  x: hex(row.getX()),
  y: hex(row.getY()),
  width: hex(row.getWidth()),
  height: hex(row.getHeight()),
  spacing: hex(field<number>(row, 'nodeNodeSpacing')),
  rects: row.getNodes().map(idOfNode),
});

function idOfNode(node: ElkNode): string {
  const identifier = node.getIdentifier();
  if (identifier === null || identifier === '') {
    throw new Error(`element without identifier: ${String(node)}`);
  }
  return identifier;
}

function dumpBlock(block: Block, n: Numbering): BlockEntry {
  const stack = block.getStack();
  return {
    x: hex(block.getX()),
    y: hex(block.getY()),
    width: hex(block.getWidth()),
    height: hex(block.getHeight()),
    minWidth: hex(block.getMinWidth()),
    minHeight: hex(block.getMinHeight()),
    smallestRectWidth: hex(block.getSmallestRectWidth()),
    smallestRectHeight: hex(block.getSmallestRectHeight()),
    averageHeight: hex(block.getAverageHeight()),
    maxHeight: hex(block.getMaxHeight()),
    spacing: hex(field<number>(block, 'nodeNodeSpacing')),
    fixed: block.isFixed(),
    positionFixed: block.isPositionFixed(),
    parentRow: n.rows.indexOf(block.getParentRow()),
    stack: stack === null ? null : n.stacks.indexOf(stack),
    children: block.getChildren().map(idOfNode),
    rows: block.getRows().map(dumpBlockRow),
  };
}

/** The recorder's `state.rows` of the ROWS list `list`: `{ listSize, rows, blocks, stacks }`. */
export function dumpRectRows(list: readonly RectRow[]): RowsState {
  const n = new Numbering(list);
  return {
    listSize: list.length,
    rows: n.rows.list.map((row) => dumpRow(row, n)),
    blocks: n.blocks.list.map((block) => dumpBlock(block, n)),
    stacks: n.stacks.list.map((stack) => dumpStack(stack, n)),
  };
}

/** The objects of a rebuilt `state.rows`, in the recorded table order. */
export interface RebuiltRows {
  /** The ROWS list: `rows[0..listSize)`. */
  readonly list: RectRow[];
  /** Every row, the detached parent rows included. */
  readonly rows: RectRow[];
  readonly blocks: Block[];
  readonly stacks: BlockStack[];
}

function rebuildBlock(entry: BlockEntry, parentRow: RectRow, nodes: ReadonlyMap<string, ElkNode>): Block {
  const block = new Block(decodeHex(entry.x), decodeHex(entry.y), parentRow, decodeHex(entry.spacing));
  setFields(block, {
    width: decodeHex(entry.width),
    height: decodeHex(entry.height),
    minWidth: decodeHex(entry.minWidth),
    minHeight: decodeHex(entry.minHeight),
    smallestRectWidth: decodeHex(entry.smallestRectWidth),
    smallestRectHeight: decodeHex(entry.smallestRectHeight),
    averageHeight: decodeHex(entry.averageHeight),
    maxHeight: decodeHex(entry.maxHeight),
    fixed: entry.fixed,
    positionFixed: entry.positionFixed,
  });
  const nodeOf = (id: string): ElkNode => {
    const node = nodes.get(id);
    if (node === undefined) {
      throw new Error(`no node ${id} for a block of the recorded rows`);
    }
    return node;
  };
  block.getChildren().push(...entry.children.map(nodeOf));
  for (const rowEntry of entry.rows) {
    const row = new BlockRow(decodeHex(rowEntry.x), decodeHex(rowEntry.y), decodeHex(rowEntry.spacing));
    setFields(row, { width: decodeHex(rowEntry.width), height: decodeHex(rowEntry.height) });
    row.getNodes().push(...rowEntry.rects.map(nodeOf));
    block.getRows().push(row);
  }
  return block;
}

/**
 * Builds the `RectRow` object graph of a recorded `state.rows`. `nodes` maps node identifiers to the imported `ElkNode`s the blocks
 * refer to. Row and stack fields are set directly (the recorded values are the state, not the arguments of an operation); the
 * blocks are linked to their parent rows and stacks as recorded.
 */
export function rebuildRectRows(state: RowsState, nodes: ReadonlyMap<string, ElkNode>): RebuiltRows {
  const rows = state.rows.map((entry) => {
    const row = new RectRow(decodeHex(entry.y), decodeHex(entry.spacing));
    setFields(row, {
      width: decodeHex(entry.width),
      height: decodeHex(entry.height),
      potentialAdditionalWidthToGetLastBlock: decodeHex(entry.potentialAdditionalWidth),
    });
    return row;
  });
  const stacks = state.stacks.map((entry) => {
    const stack = new BlockStack(decodeHex(entry.x), decodeHex(entry.y), decodeHex(entry.spacing));
    setFields(stack, { width: decodeHex(entry.width), height: decodeHex(entry.height) });
    return stack;
  });
  const blocks = state.blocks.map((entry) => rebuildBlock(entry, at(rows, entry.parentRow), nodes));
  state.blocks.forEach((entry, i) => {
    at(blocks, i).setStack(entry.stack === null ? null : at(stacks, entry.stack));
  });
  state.stacks.forEach((entry, i) => {
    at(stacks, i)
      .getBlocks()
      .push(...entry.blocks.map((b) => at(blocks, b)));
  });
  state.rows.forEach((entry, i) => {
    at(rows, i)
      .getChildren()
      .push(...entry.blocks.map((b) => at(blocks, b)));
    at(rows, i)
      .getStacks()
      .push(...entry.stacks.map((s) => at(stacks, s)));
  });
  return { list: rows.slice(0, state.listSize), rows, blocks, stacks };
}

function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`index ${String(index)} outside a table of ${String(items.length)}`);
  }
  return item;
}
