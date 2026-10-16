// SPDX-License-Identifier: EPL-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import type { ElkNode } from '../../../ElkNode.js';
import {
  edgeItems,
  inverseSnapshot,
  modelItems,
  readInverseCases,
  reachableProxies,
  type RecordedInverseCase,
  type RecordedInverseState,
} from '../../../../../test/helpers/graph-json-text-linking.js';
import { ElkGraphJsonValueConverterService } from '../conversion/ElkGraphJsonValueConverterService.js';
import { parse } from '../parser/ElkGraphJsonParser.js';
import { createElkGraphJsonLinking, loadParsedModel } from './ElkGraphJsonLinkingServices.js';
import type { InternalEObject } from '../../../../emf/ecore/InternalEObject.js';

const SERVICES = new ElkGraphJsonValueConverterService();
const LINKING = createElkGraphJsonLinking(SERVICES);

const cases = readInverseCases();

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

type State = 'afterLoad' | 'afterAccess' | 'afterResolve';

/** A fresh load, the state's action (the recorder's `switch`), then the raw snapshot. */
function replay(input: string, state: State): Omit<RecordedInverseState, 'throws'> {
  const resource = loadParsedModel(parse(input, SERVICES), LINKING);
  const root = resource.getContents().get(0) as ElkNode;
  const items = modelItems(root);
  const proxiesAtLoad: InternalEObject[] = reachableProxies(items);
  if (state === 'afterAccess') {
    for (const { edge } of edgeItems(items)) {
      for (let i = 0; i < edge.getSources().size(); i++) edge.getSources().get(i);
      for (let i = 0; i < edge.getTargets().size(); i++) edge.getTargets().get(i);
    }
  } else if (state === 'afterResolve') {
    resource.resolveLazyCrossReferences(null);
  }
  return inverseSnapshot(root, proxiesAtLoad, resource.getErrors());
}

function expectedState(c: RecordedInverseCase, state: State): Omit<RecordedInverseState, 'throws'> {
  const { shapes, edges, errors } = c[state];
  return { shapes, edges, errors };
}

describe('ElkGraphJsonLinking: replay of the recorded JVM inverse states', () => {
  it('replays 69 recorded cases', () => {
    expect(cases).toHaveLength(69);
  });

  describe.each(cases.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    it.each(['afterLoad', 'afterAccess', 'afterResolve'] as const)('%s matches the recorded inverse state', (state) => {
      expect(c[state].throws).toBeNull();
      expect(replay(c.input, state)).toEqual(expectedState(c, state));
    });
  });
});
