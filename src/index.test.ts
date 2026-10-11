// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';

import * as mod from './index.js';

describe('src/index.ts (AD-14)', () => {
  it('exports nothing public yet', () => {
    expect(Object.keys(mod)).toEqual([]);
  });
});
