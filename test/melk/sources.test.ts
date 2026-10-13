// SPDX-License-Identifier: EPL-2.0
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCES_DIR = join(import.meta.dirname, '../../tools/melk/sources');

const EXPECTED_NAMES = [
  'Core.melk',
  'Disco.melk',
  'Force.melk',
  'Labels.melk',
  'Layered.melk',
  'Polyomino.melk',
  'Radial.melk',
  'RectPacking.melk',
  'SPOrE.melk',
  'Stress.melk',
  'Topdownpacking.melk',
  'Tree.melk',
  'VertiFlex.melk',
];

interface ManifestEntry {
  name: string;
  upstreamPath: string;
  blobSha: string;
}

interface Manifest {
  elkCommit: string;
  files: ManifestEntry[];
}

/** Git blob object id: sha1("blob " + byteLength + "\0" + bytes). */
function gitBlobSha(bytes: Buffer): string {
  return createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');
}

const manifest = JSON.parse(readFileSync(join(SOURCES_DIR, 'manifest.json'), 'utf8')) as Manifest;

describe('vendored melk sources', () => {
  it('pins the commit recorded in tools/oracle/ELK_COMMIT', () => {
    const pinned = readFileSync(join(SOURCES_DIR, '../../oracle/ELK_COMMIT'), 'utf8').trim();
    expect(manifest.elkCommit).toBe(pinned);
  });

  it('lists exactly the 13 in-scope melk files', () => {
    expect(manifest.files.map((f) => f.name).sort()).toEqual(EXPECTED_NAMES);
  });

  it.each(manifest.files)('$name matches its upstream blob sha', ({ name, blobSha }) => {
    expect(gitBlobSha(readFileSync(join(SOURCES_DIR, name)))).toBe(blobSha);
  });
});
