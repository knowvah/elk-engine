// SPDX-License-Identifier: EPL-2.0
// Port of LayerSizeAndGraphHeigthCalculatorTest (mission 7e, T10, R10; the class name keeps the Java spelling, an
// identifier): `testAllNodesContained`, run by the Java after `LayerSizeAndGraphHeightCalculator`
// (`@TestAfterProcessor`, `:46`) with the default configuration.
// Row selection: the `models/*` rows of test/golden/refs/java/layered-routing.json that stop at
// `LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR/default` (the Java reads only `realworld/ptolemy/**`; the rows of the other
// model families are replayed as well, as 7d's BasicNodePlacementTest does).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/LayerSizeAndGraphHeigthCalculatorTest.java
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runRoutingPrefix } from '../../../../test/helpers/layered-routing-replay-ops.js';
import {
  isGeometryRow,
  loadRoutingRows,
  type RoutingRow,
} from '../../../../test/helpers/layered-routing-replay-rows.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import type { LGraph } from '../graph/LGraph.js';
import { ROUTING_PHASE_FACTORIES } from '../../../../test/helpers/layered-replay-factories.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing.json`;
const STOP_SUFFIX = '/LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR/default';
const NO_ROWS = 0;

/** `LayerSizeAndGraphHeigthCalculatorTest.TOLERANCE` (`:42`). */
const TOLERANCE = 0.1;

const rows: RoutingRow[] = loadRoutingRows(ROWS_FILE)
  .filter(isGeometryRow)
  .filter((row) => row.group === 'models' && row.id.endsWith(STOP_SUFFIX));

/** `testAllNodesContained` (`:44-60`). */
function testAllNodesContained(lGraph: LGraph): void {
  const top = 0.0 - lGraph.getOffset().y;
  const bottom = lGraph.getSize().y - lGraph.getOffset().y;

  for (const layer of lGraph) {
    for (const node of layer) {
      const nodeTop = node.getPosition().y - node.getMargin().top;
      expect(nodeTop > top || Math.abs(nodeTop - top) < TOLERANCE).toBe(true);

      const nodeBottom = node.getPosition().y + node.getSize().y + node.getMargin().bottom;
      expect(nodeBottom < bottom || Math.abs(nodeBottom - bottom) < TOLERANCE).toBe(true);
    }
  }
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('LayerSizeAndGraphHeigthCalculatorTest on the replayed rows', () => {
  it('selects the recorded LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR model rows', () => {
    expect(rows.length).toBeGreaterThan(NO_ROWS);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: testAllNodesContained', (_id, row) => {
    testAllNodesContained(runRoutingPrefix(row, ROUTING_PHASE_FACTORIES));
  });
});
