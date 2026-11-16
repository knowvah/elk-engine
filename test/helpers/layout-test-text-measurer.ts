// SPDX-License-Identifier: EPL-2.0
// The TS twin of oracle patch 0003 (mission text-sizing-seam, TX3-TX5): the label-text measurement of `TestConfiguration`
// is pluggable. The default is the FX8 snapshot, so nothing changes unless `ELK_TEST_TEXT_MEASURER` selects `fixed`.
import { readFileSync } from 'node:fs';
import { KVector } from '../../src/core/math/KVector.js';
import { repoRoot } from '../corpus/corpus.js';

const METRICS_REF = `${repoRoot()}/test/golden/refs/java/layered-label-metrics.json`;
const WIDTH = 0;
const HEIGHT = 1;
const FIXED_ADVANCE = 6;
const FIXED_HEIGHT = 12;
const MEASURER_AWT = 'awt';
const MEASURER_FIXED = 'fixed';

/**
 * `TextMeasurer` of patch 0003: x = width, y = height.
 *
 * @see org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/framework/config/TextMeasurer.java (patch 0003)
 */
export interface TextMeasurer {
  measure(text: string): KVector;
}

export const TEXT_MEASURER_ENV = 'ELK_TEST_TEXT_MEASURER';

/** The recorded size of each label text, `[width, height]` (the FX8 snapshot). */
export const LABEL_SIZES: Readonly<Record<string, readonly [number, number]>> = (
  JSON.parse(readFileSync(METRICS_REF, 'utf8')) as {
    readonly sizes: Readonly<Record<string, readonly [number, number]>>;
  }
).sizes;

/**
 * `AwtTextMeasurer` of patch 0003, answered from the recorded table; a text missing from it throws.
 *
 * @see org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/framework/config/AwtTextMeasurer.java (patch 0003)
 */
export const AWT_SNAPSHOT_TEXT_MEASURER: TextMeasurer = {
  measure(text: string): KVector {
    if (!Object.hasOwn(LABEL_SIZES, text)) {
      throw new Error(`label text ${JSON.stringify(text)} is not in layered-label-metrics.json; add it and re-record`);
    }
    const size = LABEL_SIZES[text]!;
    return new KVector(size[WIDTH], size[HEIGHT]);
  },
};

/**
 * `FixedAdvanceTextMeasurer` of patch 0003: `[length x 6, 12]`, `length` in UTF-16 units.
 *
 * @see org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/framework/config/FixedAdvanceTextMeasurer.java (patch 0003)
 */
export const FIXED_ADVANCE_TEXT_MEASURER: TextMeasurer = {
  measure(text: string): KVector {
    return new KVector(text.length * FIXED_ADVANCE, FIXED_HEIGHT);
  },
};

/**
 * `TextMeasurer.fromSystemProperty` with the environment as the source: unset or `awt` is the snapshot, `fixed` the fixed
 * advance, anything else throws.
 *
 * @see org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/framework/config/TextMeasurer.java (patch 0003)
 */
export function textMeasurerFrom(env: Readonly<Record<string, string | undefined>>): TextMeasurer {
  const value = env[TEXT_MEASURER_ENV];
  if (value === undefined || value === MEASURER_AWT) {
    return AWT_SNAPSHOT_TEXT_MEASURER;
  }
  if (value === MEASURER_FIXED) {
    return FIXED_ADVANCE_TEXT_MEASURER;
  }
  throw new Error(`Unknown text measurer: ${value}`);
}
