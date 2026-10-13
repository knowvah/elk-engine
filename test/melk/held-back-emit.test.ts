// SPDX-License-Identifier: EPL-2.0
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { emitBundle } from '../../tools/melk/emit.js';
import { resolveAll } from '../../tools/melk/model.js';
import type { ResolvedAlgorithm } from '../../tools/melk/model.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import type { AbstractLayoutProvider } from '../../src/core/AbstractLayoutProvider.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import type { ILayoutMetaDataProvider } from '../../src/core/data/ILayoutMetaDataProvider.js';
import type { IFactory } from '../../src/core/util/IFactory.js';
import { diffCalls, dumpCalls, MELK_NAMES, parseVendored } from './helpers.js';
import { RecordingRegistry } from './recorder.js';

const REPOSITORY_ROOT = join(import.meta.dirname, '../..');
const OUTPUT_DIR = 'test/melk/.held-back';
const STUB_MODULE = 'test/melk/stub-provider.ts';
const PROVIDER_PACKAGE = 'org.eclipse.elk.core.util';
const CORE_BUNDLE_FILE = 'CoreOptions.ts';
const ALGORITHM_CALLS = ['registerAlgorithm', 'addOptionSupport'] as const;

/** The three held-back algorithms: id, emitted class, factory, provider stub and the `initialize` argument. */
const HELD_BACK = [
  {
    id: 'org.eclipse.elk.fixed',
    className: 'FixedLayouterOptions',
    factory: 'FixedFactory',
    provider: 'FixedLayoutProvider',
  },
  { id: 'org.eclipse.elk.box', className: 'BoxLayouterOptions', factory: 'BoxFactory', provider: 'BoxLayoutProvider' },
  {
    id: 'org.eclipse.elk.random',
    className: 'RandomLayouterOptions',
    factory: 'RandomFactory',
    provider: 'RandomLayoutProvider',
  },
] as const;

interface EmittedAlgorithm {
  readonly ALGORITHM_ID: string;
  new (): ILayoutMetaDataProvider;
}

interface EmittedModule {
  readonly [name: string]: unknown;
}

let modules: ReadonlyMap<string, EmittedModule>;
let algorithms: readonly ResolvedAlgorithm[];

beforeAll(async () => {
  // C1 is lifted: with no pending type the Core model keeps the three algorithms.
  const core = resolveAll(MELK_NAMES.map(parseVendored), { pendingTypes: [] }).find((b) => b.file === 'Core.melk');
  if (core === undefined) {
    throw new Error('Core.melk did not resolve');
  }
  algorithms = core.algorithms;
  const importOverrides = new Map(HELD_BACK.map(({ provider }) => [`${PROVIDER_PACKAGE}.${provider}`, STUB_MODULE]));
  const files = await emitBundle(core, { outputDir: OUTPUT_DIR, importOverrides });
  const loaded = new Map<string, EmittedModule>();
  mkdirSync(join(REPOSITORY_ROOT, OUTPUT_DIR), { recursive: true });
  for (const [path, text] of files) {
    // CoreOptions.ts is already in src/ (without the algorithms); only the algorithm classes are emitted here.
    if (!path.endsWith(`/${CORE_BUNDLE_FILE}`)) {
      writeFileSync(join(REPOSITORY_ROOT, path), text, 'utf8');
      loaded.set(path, (await import(/* @vite-ignore */ join(REPOSITORY_ROOT, path))) as EmittedModule);
    }
  }
  modules = loaded;
  LayoutMetaDataService.initElkReflect();
});

afterAll(() => {
  rmSync(join(REPOSITORY_ROOT, OUTPUT_DIR), { recursive: true, force: true });
});

function emitted(className: string): EmittedModule {
  const module = modules.get(`${OUTPUT_DIR}/${className}.ts`);
  if (module === undefined) {
    throw new Error(`${className} was not emitted`);
  }
  return module;
}

describe('held-back Core algorithm classes, emitted against stub providers', () => {
  it('emits exactly the three algorithm classes, in the directory the test cleans up', () => {
    expect([...modules.keys()].sort()).toEqual(
      HELD_BACK.map(({ className }) => `${OUTPUT_DIR}/${className}.ts`).sort(),
    );
    expect(algorithms.map((a) => a.id)).toEqual(HELD_BACK.map(({ id }) => id));
  });

  it.each(HELD_BACK)('$className records the calls of the dump (i)', ({ className, id }) => {
    const Algorithm = emitted(className)[className] as EmittedAlgorithm;
    // The recorder encodes a number by the type of its option, which it learns from register(): apply the
    // options (CoreOptions) first, as the service does, and compare only what the algorithm class adds.
    const recorder = new RecordingRegistry();
    new CoreOptions().apply(recorder);
    const optionCalls = recorder.calls.length;
    new Algorithm().apply(recorder);
    const added = recorder.calls.slice(optionCalls);
    const expected = dumpCalls(`org.eclipse.elk.core.options.${className}`, ALGORITHM_CALLS);
    expect(diffCalls(added, expected)).toBeNull();
    expect(added.length).toBeGreaterThan(1);
    expect(Algorithm.ALGORITHM_ID).toBe(id);
  });

  it.each(HELD_BACK)('$factory creates the stub with the Java initialize argument and destroys it', (held) => {
    const module = emitted(held.className);
    const Factory = module[held.factory] as new () => IFactory<AbstractLayoutProvider>;
    const algorithm = module[held.className] as { [name: string]: unknown };
    expect(algorithm[held.factory]).toBe(Factory);

    const factory = new Factory();
    const provider = factory.create() as AbstractLayoutProvider & { initializeCalls: string[]; disposeCount: number };
    expect(provider.constructor.name).toBe(held.provider);
    expect(provider.initializeCalls).toEqual(['']);
    expect(provider.disposeCount).toBe(0);
    factory.destroy(provider);
    expect(provider.disposeCount).toBe(1);
    expect(() => provider.layout({} as never, {} as never)).toThrow(/test stub/);
  });
});
