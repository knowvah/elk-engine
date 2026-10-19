// SPDX-License-Identifier: EPL-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import type { InternalEObject } from '../../../emf/ecore/InternalEObject.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { exportLikeOracle } from '../../../../test/helpers/graph-json-oracle.js';
import {
  edgeItems,
  inverseSnapshot,
  modelItems,
  readInverseCases,
  reachableProxies,
  type RecordedInverseCase,
  type RecordedInverseState,
} from '../../../../test/helpers/graph-json-text-linking.js';
import type { ElkNode } from '../../ElkNode.js';
import { ElkGraphJsonText } from './ElkGraphJsonText.js';

const NULL_POINTER = 'java.lang.NullPointerException';
const STATES = ['afterLoad', 'afterAccess', 'afterResolve', 'afterExport'] as const;
type State = (typeof STATES)[number];

const cases = readInverseCases();

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

/** What the export of a state threw: `null` if it succeeded (the recorder's `throws`). */
type Export = Error | null;

function exportOutcome(root: ElkNode): Export {
  try {
    exportLikeOracle(root);
    return null;
  } catch (e) {
    return e as Error;
  }
}

/** A fresh load, the state's action (the recorder's `switch`), then the raw snapshot. */
function replay(input: string, state: State): { snapshot: Omit<RecordedInverseState, 'throws'>; thrown: Export } {
  const loaded = ElkGraphJsonText.load(input);
  const root = loaded.root as ElkNode;
  const items = modelItems(root);
  const proxiesAtLoad: InternalEObject[] = reachableProxies(items);
  let thrown: Export = null;
  if (state === 'afterAccess') {
    for (const { edge } of edgeItems(items)) {
      for (let i = 0; i < edge.getSources().size(); i++) edge.getSources().get(i);
      for (let i = 0; i < edge.getTargets().size(); i++) edge.getTargets().get(i);
    }
  } else if (state === 'afterResolve') {
    loaded.resource.resolveLazyCrossReferences(null);
  } else if (state === 'afterExport') {
    thrown = exportOutcome(root);
  }
  return { snapshot: inverseSnapshot(root, proxiesAtLoad, loaded.resource.getErrors()), thrown };
}

function expectedState(c: RecordedInverseCase, state: State): Omit<RecordedInverseState, 'throws'> {
  const { shapes, edges, errors } = c[state];
  return { shapes, edges, errors };
}

describe('ElkGraphJsonText.load: replay of the recorded JVM inverse states', () => {
  it('replays 69 recorded cases, 29 of whose exports fail', () => {
    expect(cases).toHaveLength(69);
    expect(cases.filter((c) => c.afterExport.throws !== null)).toHaveLength(29);
  });

  describe.each(cases.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    it.each(STATES)('%s matches the recorded inverse state', (state) => {
      const { snapshot, thrown } = replay(c.input, state);
      expect(snapshot).toEqual(expectedState(c, state));
      const recorded = c[state].throws;
      if (recorded === null) {
        expect(thrown).toBeNull();
      } else {
        // known divergence (2026-10-14, extended by D13): the message-less NullPointerException of Gson 2.11
        expect(recorded).toEqual({ cls: NULL_POINTER, msg: null });
        expect(thrown?.constructor).toBe(IllegalArgumentException);
        expect(thrown?.message).toBe('');
      }
    });
  });
});
