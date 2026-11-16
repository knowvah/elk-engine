// SPDX-License-Identifier: EPL-2.0
// Runs the parts of a disco ref row that exist so far (mission 8b, T7; T9 adds split, import, pack, applyToDCGraph, applyLayout, full and
// throws runners beside these, each taking a row and returning TS dumps in the recorder's shape):
//   runImportRebuild(row)  the DCGraph rebuilt from the `import` stop, dumped again in the same shape;
//   createPolyominoes(r, cellSizes)  `DisCoPolyominoCompactor.createPolyominoes`: `new DCPolyomino(comp, gridCellSizeX, gridCellSizeY)`
//                          for each component of the graph in DCGraph order (nothing else of the compactor);
//   runPolys(row)          the polyominoes of a stops row (rebuilt graph, the `cellSizes` stop's grid cell sizes), dumped as the `polys`
//                          stop records them: after createPolyominoes, before packPolyominoes (no ProfileFill, no id, x and y still 0).
import { DCPolyomino } from '../../src/alg/disco/structures/DCPolyomino.js';
import { dumpDCGraph, dumpDCPolyomino, rebuildDCGraph, type RebuiltDCGraph } from './disco-replay-dump.js';
import {
  decodeHex,
  encodeHex,
  STEP_CELL_SIZES,
  STEP_IMPORT,
  stopOf,
  type CellSizesStop,
  type ImportStop,
  type PolyEntry,
  type StopsRow,
} from './disco-replay-rows.js';

/** The grid cell sizes of a `cellSizes` stop (the compactor's `gridCellSizeX` and `gridCellSizeY` after the aspect-ratio scaling). */
export const gridCellSizes = (stop: CellSizesStop): { readonly x: number; readonly y: number } => ({
  x: decodeHex(stop.cellSizeX),
  y: decodeHex(stop.cellSizeY),
});

/** `DisCoPolyominoCompactor.createPolyominoes` on a rebuilt graph. */
export function createPolyominoes(rebuilt: RebuiltDCGraph, cellSizes: CellSizesStop): DCPolyomino[] {
  const { x, y } = gridCellSizes(cellSizes);
  const polys: DCPolyomino[] = [];
  for (const comp of rebuilt.graph.getComponents()) {
    polys.push(new DCPolyomino(comp, x, y));
  }
  return polys;
}

/** The rebuilt graph of a stops row's `import` stop. */
export const rebuildImport = (row: StopsRow): RebuiltDCGraph => rebuildDCGraph(stopOf(row, STEP_IMPORT));

/** The import stop re-dumped from the rebuilt graph (identities of the rebuild, firsts and spacing of the stop). */
export function runImportRebuild(row: StopsRow): ImportStop {
  const rebuilt = rebuildImport(row);
  return dumpDCGraph(rebuilt.graph, (el) => rebuilt.identities.get(el)!, rebuilt.firsts, rebuilt.componentSpacing);
}

/** The `polys` stop of a stops row as the TS polyominoes dump it. */
export function runPolys(row: StopsRow): PolyEntry[] {
  const rebuilt = rebuildImport(row);
  const polys = createPolyominoes(rebuilt, stopOf(row, STEP_CELL_SIZES));
  return polys.map((poly, index) => dumpDCPolyomino(poly, index));
}

/** An import stop with every extension offset of every element moved by (dx, dy): the geometry of a neighbouring input. */
export function shiftExtensions(stop: ImportStop, dx: number, dy: number): ImportStop {
  return {
    ...stop,
    components: stop.components.map((component) => ({
      ...component,
      elements: component.elements.map((element) => ({
        ...element,
        extensions: element.extensions.map((ext) => ({
          ...ext,
          offset: [encodeHex(decodeHex(ext.offset[0]) + dx), encodeHex(decodeHex(ext.offset[1]) + dy)] as const,
        })),
      })),
    })),
  };
}
