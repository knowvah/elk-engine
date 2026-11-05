// SPDX-License-Identifier: EPL-2.0
// CompoundGraphPreprocessor is a staged class (L1, F1): process throws until mission 7h.
import { describe, expect, it } from 'vitest';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { LGraph } from '../graph/LGraph.js';
import { CompoundGraphPreprocessor } from './CompoundGraphPreprocessor.js';

const STAGED_MESSAGE = 'CompoundGraphPreprocessor is ported in mission 7h';

describe('CompoundGraphPreprocessor (staged, mission 7h)', () => {
  it('process names 7h', () => {
    const processor = new CompoundGraphPreprocessor();
    const run = (): never => processor.process(new LGraph(), new NullElkProgressMonitor());
    expect(run).toThrow(new UnsupportedOperationException(STAGED_MESSAGE));
    expect(run).toThrow(UnsupportedOperationException);
  });
});
