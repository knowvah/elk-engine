// SPDX-License-Identifier: EPL-2.0
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { SOURCES_DIRECTORY } from '../../tools/melk/config.js';
import { generate } from '../../tools/melk/generate.js';
import { CompactionStrategy } from '../../src/alg/disco/options/CompactionStrategy.js';
import { DisCoMetaDataProvider } from '../../src/alg/disco/options/DisCoMetaDataProvider.js';
import { ForceMetaDataProvider } from '../../src/alg/force/options/ForceMetaDataProvider.js';
import { ForceModelStrategy } from '../../src/alg/force/options/ForceModelStrategy.js';
import { StressMetaDataProvider } from '../../src/alg/force/options/StressMetaDataProvider.js';
import { Dimension } from '../../src/alg/force/stress/Dimension.js';
import type { ILayoutMetaData } from '../../src/core/data/ILayoutMetaData.js';
import type { ILayoutMetaDataProvider } from '../../src/core/data/ILayoutMetaDataProvider.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../../src/core/data/LayoutOptionData.js';

const REPOSITORY_ROOT = join(import.meta.dirname, '../..');
const ORACLE_DIR = process.env['ELK_ORACLE_DIR'] ?? join(REPOSITORY_ROOT, '../elk-oracle');
const INTEGER_MAX_VALUE = 2147483647;
const NO_DEFAULT = 'none';

interface Bundle {
  readonly name: string;
  readonly idPrefix: string;
  readonly outputs: readonly string[];
  readonly oracleProvider: string;
  readonly provider: ILayoutMetaDataProvider;
}

const BUNDLES: readonly Bundle[] = [
  {
    name: 'Force',
    idPrefix: 'org.eclipse.elk.force.',
    outputs: ['ForceMetaDataProvider', 'ForceOptions'].map((n) => `src/alg/force/options/${n}.ts`),
    oracleProvider: 'org.eclipse.elk.alg.force/src-gen/org/eclipse/elk/alg/force/options/ForceMetaDataProvider.java',
    provider: new ForceMetaDataProvider(),
  },
  {
    name: 'Stress',
    idPrefix: 'org.eclipse.elk.stress.',
    outputs: ['StressMetaDataProvider', 'StressOptions'].map((n) => `src/alg/force/options/${n}.ts`),
    oracleProvider: 'org.eclipse.elk.alg.force/src-gen/org/eclipse/elk/alg/force/options/StressMetaDataProvider.java',
    provider: new StressMetaDataProvider(),
  },
  {
    name: 'Disco',
    idPrefix: 'org.eclipse.elk.disco.',
    outputs: ['DisCoMetaDataProvider', 'DisCoOptions'].map((n) => `src/alg/disco/options/${n}.ts`),
    oracleProvider: 'org.eclipse.elk.alg.disco/src-gen/org/eclipse/elk/alg/disco/options/DisCoMetaDataProvider.java',
    provider: new DisCoMetaDataProvider(),
  },
];

const ENUMS: Readonly<Record<string, { valueOf(name: string): unknown }>> = {
  ForceModelStrategy,
  Dimension,
  CompactionStrategy,
};

/** Option id (prefix + group + name), declared type and `.melk` default expression, read from the `.melk` text. */
interface MelkOption {
  readonly id: string;
  readonly type: string;
  readonly defaultExpression: string;
}

function readMelkOptions(bundle: Bundle): MelkOption[] {
  const text = readFileSync(join(SOURCES_DIRECTORY, `${bundle.name}.melk`), 'utf8');
  const groups = [...text.matchAll(/^group (\w+) \{/gm)].map((m) => ({ name: m[1] ?? '', start: m.index }));
  return [...text.matchAll(/option (\w+)\s*: (\w+) \{([\s\S]*?)\n\s*\}/g)].map((m) => {
    const group = groups.filter((g) => g.start < m.index && !/\n\}/.test(text.slice(g.start, m.index))).at(-1);
    const defaultMatch = /default = ([\w.\-]+)/.exec(m[3] ?? '');
    return {
      id: `${bundle.idPrefix}${group === undefined ? '' : `${group.name}.`}${m[1] ?? ''}`,
      type: m[2] ?? '',
      defaultExpression: defaultMatch?.[1] ?? NO_DEFAULT,
    };
  });
}

/** The value a `.melk` default expression denotes (literals, `Integer.MAX_VALUE`, `Enum.CONSTANT`). */
function evaluateDefault(expression: string): unknown {
  if (expression === NO_DEFAULT) return null;
  if (expression === 'true') return true;
  if (expression === 'false') return false;
  if (expression === 'Integer.MAX_VALUE') return INTEGER_MAX_VALUE;
  if (/^[\d.\-]+(e-?\d+)?$/i.test(expression)) return Number(expression);
  const [enumName, constant] = expression.split('.');
  return ENUMS[enumName ?? '']?.valueOf(constant ?? '');
}

function registeredOptions(provider: ILayoutMetaDataProvider): LayoutOptionData[] {
  const options: LayoutOptionData[] = [];
  const registry = {
    register(data: ILayoutMetaData): void {
      if (data instanceof LayoutOptionData) {
        options.push(data);
      }
    },
    addDependency(): void {},
    addOptionSupport(): void {},
  } as ILayoutMetaDataProvider.Registry;
  provider.apply(registry);
  return options;
}

describe.each(BUNDLES)('$name options', (bundle) => {
  // the service registers the ElkReflect clone functions that cloneable option defaults need
  beforeAll(() => {
    LayoutMetaDataService.getInstance();
  });

  it('matches what the generator emits (freshness)', async () => {
    const output = await generate({ bundles: [bundle.name], write: false });
    expect([...output.keys()].sort()).toEqual([...bundle.outputs].sort());
    for (const path of bundle.outputs) {
      expect(output.get(path)).toBe(readFileSync(join(REPOSITORY_ROOT, path), 'utf8'));
    }
  });

  it('registers every .melk option with its id and default', () => {
    const melk = readMelkOptions(bundle);
    expect(melk.length).toBeGreaterThan(0);
    const registered = registeredOptions(bundle.provider);
    expect(registered.map((o) => o.getId()).sort()).toEqual(melk.map((o) => o.id).sort());
    for (const option of melk) {
      const data = registered.find((o) => o.getId() === option.id);
      expect(data?.getDefault(), option.id).toBe(evaluateDefault(option.defaultExpression));
    }
  });

  it.skipIf(!existsSync(join(ORACLE_DIR, 'plugins', bundle.oracleProvider)))(
    'registers the option ids of the oracle src-gen',
    () => {
      const java = readFileSync(join(ORACLE_DIR, 'plugins', bundle.oracleProvider), 'utf8');
      const oracleIds = [...java.matchAll(/\.id\("([^"]+)"\)/g)].map((m) => m[1]);
      expect(oracleIds.length).toBeGreaterThan(0);
      expect(registeredOptions(bundle.provider).map((o) => o.getId())).toEqual(oracleIds);
    },
  );
});

describe('leaf enums', () => {
  it('keep the Java constants, order and names', () => {
    expect(ForceModelStrategy.values().map((c) => c.name())).toEqual(['EADES', 'FRUCHTERMAN_REINGOLD']);
    expect(Dimension.values().map((c) => c.name())).toEqual(['XY', 'X', 'Y']);
    expect(CompactionStrategy.values().map((c) => c.name())).toEqual(['POLYOMINO']);
    expect(Dimension.valueOf('Y').ordinal()).toBe(2);
    expect(() => Dimension.valueOf('Z')).toThrow(
      'No enum constant org.eclipse.elk.alg.force.stress.StressMajorization.Dimension.Z',
    );
  });
});
