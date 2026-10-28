// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { CrossHierarchyEdge } from './CrossHierarchyEdge.js';

describe('CrossHierarchyEdge (staged for mission 7h)', () => {
  it('cannot be constructed yet', () => {
    expect(() => new CrossHierarchyEdge()).toThrow(UnsupportedOperationException);
    expect(() => new CrossHierarchyEdge()).toThrow('CrossHierarchyEdge is ported in mission 7h');
  });
});
