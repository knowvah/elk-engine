// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { URI } from '../../../../emf/common/util/URI.js';
import { ResourceImpl } from '../../../../emf/ecore/resource/impl/ResourceImpl.js';
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';
import { RuntimeException } from '../../../../java/lang/RuntimeException.js';
import { ValueConverterException } from '../../../../xtext/conversion/ValueConverterException.js';
import { FormatterPreferenceKeys } from '../../../../xtext/formatting2/FormatterPreferenceKeys.js';
import { FormatterRequest } from '../../../../xtext/formatting2/FormatterRequest.js';
import { MapBasedPreferenceValues } from '../../../../xtext/formatting2/preferences/MapBasedPreferenceValues.js';
import { modelFromDump, type DumpObject } from '../../../../../test/helpers/dot-model-from-dump.js';
import { dotWriteModels } from '../../../../../test/helpers/dot-write-models.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import { GraphvizDotFormatter } from '../formatting2/GraphvizDotFormatter.js';
import { createValueConverterService } from '../parser/GraphvizDotValueConverters.js';
import { GraphvizDotSerializer } from './GraphvizDotSerializer.js';

// Replays every row of graphviz-dot-write.json (tools/vectors/DotWriteVectors.java, Xtext 2.36). The contract is
// the `detached` form: the model as the only content of a fresh resource "output.graphviz_dot", serialized formatted
// (F), unformatted (U) and by `resource.save` (S, the default SaveOptions). The `attached` form (a parsed model still
// bound to its node model) is evidence only: the port has no node-model region access (G2).

const REFS = '../../../../../test/golden/refs/java/';
const read = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(REFS + name, import.meta.url)), 'utf8'));

interface RecordedError {
  readonly cls: string;
  readonly msg: string | null;
}
type Form = string | { readonly error: RecordedError };
interface LogEvent {
  readonly level: string;
  readonly msg: string;
  readonly thrown: readonly RecordedError[];
}
interface WriteRow {
  readonly id: string;
  readonly source: 'scenario' | 'fixture' | 'built';
  readonly detached: {
    readonly formatted: Form;
    readonly unformatted: Form;
    readonly save: Form;
    readonly log?: Readonly<Record<'formatted' | 'unformatted' | 'save', readonly LogEvent[]>>;
  };
}
interface WriteRef {
  readonly maxLineWidth: number;
  readonly rowCounts: Readonly<Record<'scenario' | 'fixture' | 'built', number>>;
  readonly skipped: readonly string[];
  readonly rows: readonly WriteRow[];
}

const REF = read('graphviz-dot-write.json') as WriteRef;
const PARSE_MODELS: ReadonlyMap<string, DumpObject | null> = new Map(
  (read('graphviz-dot-parse.json') as { cases: { id: string; model: DumpObject | null }[] }).cases.map((c) => [
    c.id,
    c.model,
  ]),
);
const BUILT = dotWriteModels();
const OUTPUT_URI = 'output.graphviz_dot';

/** The input model of a row: the parse case's dump (scenarios and fixtures) or the built-model table. */
function inputModel(row: WriteRow): GraphvizModel {
  if (row.source === 'built') {
    const build = BUILT.get(row.id);
    if (build === undefined) throw new Error(`no built model ${row.id}`);
    return build();
  }
  const dump = PARSE_MODELS.get(row.source === 'scenario' ? row.id.substring('parsed/'.length) : row.id);
  if (dump === undefined || dump === null) throw new Error(`no parse dump for ${row.id}`);
  return modelFromDump(dump);
}

/** `DotWriteVectors.copy`: the model as the only content of a fresh resource "output.graphviz_dot". */
function detached(row: WriteRow): GraphvizModel {
  const model = inputModel(row);
  new ResourceImpl(URI.createURI(OUTPUT_URI)).getContents().add(model);
  return model;
}

/** The Java class name the recorder reports for a thrown TS error (`getClass().getName()`). */
const JAVA_CLASSES: ReadonlyArray<readonly [abstract new (...args: never[]) => Error, string]> = [
  [IllegalStateException, 'java.lang.IllegalStateException'],
  [RuntimeException, 'java.lang.RuntimeException'],
];

function recorded(e: unknown): { readonly error: RecordedError } {
  if (!(e instanceof Error)) throw e;
  const cls = JAVA_CLASSES.find(([type]) => e.constructor === type)?.[1];
  if (cls === undefined) throw e;
  // Java getMessage() is null for `new IllegalStateException()`; the TS Error message is then ''
  return { error: { cls, msg: e.message === '' ? null : e.message } };
}

function run(serialize: () => string): Form {
  try {
    return serialize();
  } catch (e) {
    return recorded(e);
  }
}

/** The three detached forms of a row, each on its own fresh copy (as the recorder does). */
function forms(row: WriteRow): Record<'formatted' | 'unformatted' | 'save', Form> {
  const serializer = new GraphvizDotSerializer(createValueConverterService());
  return {
    formatted: run(() => serializer.serialize(detached(row), { format: true })),
    unformatted: run(() => serializer.serialize(detached(row), { format: false })),
    save: run(() => serializer.serialize(detached(row))),
  };
}

/**
 * `GraphvizDotSerializer.serialize` with the request's exception handler made observable: the default handler
 * (`ExceptionAcceptor.LOGGING`) logs and drops, and the port has no logging, so this replays the composition with a
 * collecting handler to compare what the JVM logged.
 */
function loggedConflicts(row: WriteRow, formatting: boolean): Error[] {
  const access = new GraphvizDotSerializer(createValueConverterService()).serializeToRegions(detached(row));
  const request = new FormatterRequest();
  const preferences = new MapBasedPreferenceValues(null, new Map());
  preferences.putTyped(FormatterPreferenceKeys.maxLineWidth, REF.maxLineWidth);
  request.setPreferences(preferences);
  request.setFormatUndefinedHiddenRegionsOnly(!formatting);
  request.setTextRegionAccess(access);
  const logged: Error[] = [];
  request.setExceptionHandler((e) => logged.push(e));
  new GraphvizDotFormatter().formatRequest(request);
  return logged;
}

/** One logged throwable, comparable across the JVM and the port (see {@link fromJava} and {@link fromPort}). */
interface LoggedThrowable {
  readonly cls: string;
  readonly msg: string | null;
  /** The `[offset, length]` of each conflicting region a `ConflictingRegionsException` names. */
  readonly regions?: readonly (readonly [number, number])[];
}

const CONFLICTING_REGIONS = 'ConflictingRegionsException';
const CONFLICTING_REGIONS_TITLE = 'Conflicting Regions.\n';

const regionsOf = (msg: string, pattern: RegExp): [number, number][] =>
  [...msg.matchAll(pattern)].map((m) => [Number(m[1]), Number(m[2])]);

/**
 * A recorded throwable with the Java class reduced to its simple name (the TS `Error.name`). The message of a
 * `ConflictingRegionsException` ends in Xtext's `TextRegionsWithTitleToString` rendering (a document snippet),
 * which src/xtext does not port (it prints one `<title> [offset,length]` line per trace instead): its title and
 * the offsets and lengths of the conflicting regions are compared, not the snippet.
 */
function fromJava({ cls, msg }: RecordedError): LoggedThrowable {
  const simple = cls.substring(cls.lastIndexOf('.') + 1);
  if (simple !== CONFLICTING_REGIONS || msg === null) return { cls: simple, msg };
  return { cls: simple, msg: CONFLICTING_REGIONS_TITLE, regions: regionsOf(msg, /at offset=(\d+) length=(\d+)/gu) };
}

function fromPort(e: Error): LoggedThrowable[] {
  const out: LoggedThrowable[] = [];
  for (let t: unknown = e; t instanceof Error; t = t.cause) {
    out.push(
      t.name === CONFLICTING_REGIONS
        ? {
            cls: t.name,
            msg: t.message.startsWith(CONFLICTING_REGIONS_TITLE) ? CONFLICTING_REGIONS_TITLE : t.message,
            regions: regionsOf(t.message, /\[(\d+),(\d+)\]/gu),
          }
        : { cls: t.name, msg: t.message },
    );
  }
  return out;
}

const LOGGED_ROWS = REF.rows.filter((row) => row.detached.log !== undefined);

describe('graphviz-dot-write.json row counts', () => {
  it('replays every recorded row: the counts per source and the built ids of DotWriteModels.java', () => {
    const counted = (source: WriteRow['source']): number => REF.rows.filter((row) => row.source === source).length;
    expect({ scenario: counted('scenario'), fixture: counted('fixture'), built: counted('built') }).toEqual(
      REF.rowCounts,
    );
    expect(REF.rowCounts).toEqual({ scenario: 27, fixture: 14, built: 402 });
    expect([...BUILT.keys()]).toEqual(REF.rows.filter((row) => row.source === 'built').map((row) => row.id));
    expect(REF.maxLineWidth).toBe(255); // GraphvizDotSerializer.MAX_LINE_LENGTH
    expect(REF.skipped).toHaveLength(34);
    expect(LOGGED_ROWS.map((row) => row.id)).toEqual([
      'built/value/attribute-name/empty',
      'built/value/attribute-value/empty',
      'built/value/statement-value/empty',
    ]);
  });
});

describe('graphviz-dot-write.json detached forms', () => {
  it.each(REF.rows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
    const { formatted, unformatted, save } = row.detached;
    expect(forms(row)).toEqual({ formatted, unformatted, save });
  });
});

describe('graphviz-dot-write.json value conversion causes', () => {
  const rows = REF.rows.filter((row) => JSON.stringify(row.detached.formatted).includes('Caused By:'));
  it.each(rows.map((row) => [row.id, row] as const))('%s throws with the converter exception as cause', (_id, row) => {
    const serializer = new GraphvizDotSerializer(createValueConverterService());
    expect(() => serializer.serialize(detached(row))).toThrow(
      expect.objectContaining({ cause: expect.any(ValueConverterException) }),
    );
  });
});

describe('graphviz-dot-write.json logged formatting conflicts', () => {
  it.each(LOGGED_ROWS.map((row) => [row.id, row] as const))('%s', (_id, row) => {
    const log = row.detached.log!;
    for (const [form, formatting] of [
      ['formatted', true],
      ['unformatted', false],
      ['save', false],
    ] as const) {
      const events = log[form];
      expect(events.map((event) => event.level)).toEqual(['ERROR']);
      expect(loggedConflicts(row, formatting).map(fromPort)).toEqual(events.map((event) => event.thrown.map(fromJava)));
    }
  });
});
