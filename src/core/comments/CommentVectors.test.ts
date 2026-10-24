// SPDX-License-Identifier: EPL-2.0
// Replays the frozen JVM scenarios of test/golden/refs/java/comments.json (recorded by tools/vectors/CommentVectors.java).
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { ElkGraphJson } from '../../graph/json/ElkGraphJson.js';
import { buildCommentAttacher, readAttachments } from '../../../test/helpers/comment-scenario-config.js';
import type { ScenarioConfig } from '../../../test/helpers/comment-scenario-config.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';

interface Scenario {
  readonly name: string;
  readonly input: string;
  readonly config: ScenarioConfig;
  readonly attachments: [string, string][];
}

const VECTORS_URL = new URL('../../../test/golden/refs/java/comments.json', import.meta.url);
const SCENARIO_ROOT = new URL('../../../tools/vectors/', import.meta.url);
const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as { scenarios: Scenario[] };

beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

describe('comments.json replay', () => {
  it('contains the recorded scenarios', () => {
    expect(vectors.scenarios.length).toBe(18);
  });

  it.each(vectors.scenarios.map((s) => [s.name, s] as const))('%s', (_name, scenario) => {
    const text = readFileSync(new URL(scenario.input, SCENARIO_ROOT), 'utf8');
    const root = ElkGraphJson.forGraph(text).lenient(false).toElk();
    const { attacher, createDataProvider } = buildCommentAttacher(scenario.config);

    attacher.attachComments(createDataProvider(root));

    expect(readAttachments(root)).toEqual(scenario.attachments);
  });
});
