// SPDX-License-Identifier: EPL-2.0
// The TypeScript side of two graph-text-validate.json fields (tools/vectors/ElktValidateVectors.java):
// `registeredAfterLoad` (the option the recorder registers between load and validation) and `mutations`
// (property entries whose value validation replaced, ElkGraphValidator.xtend:101).
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../../src/core/data/LayoutOptionData.js';
import { LayoutOptionDataTarget } from '../../src/core/data/LayoutOptionDataTarget.js';
import { LayoutOptionDataType } from '../../src/core/data/LayoutOptionDataType.js';
import { LayoutOptionProxy } from '../../src/core/util/internal/LayoutOptionProxy.js';
import type { EMapPropertyHolder } from '../../src/graph/EMapPropertyHolder.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { JavaClass } from '../../src/java/lang/JavaClass.js';
import { EnumSet } from '../../src/java/util/EnumSet.js';

/** The recorded option of a `@register-after-load` scenario (values as their Java `toString`). */
export interface RegisteredAfterLoad {
  readonly id: string;
  readonly group: string;
  readonly name: string;
  readonly type: string;
  readonly defaultValue: string;
  readonly lowerBound: string;
  readonly targets: readonly string[];
}

/** A recorded mutation: where the entry lives, its key and the Java value classes before and after. */
export interface MutationRow {
  readonly path: string;
  readonly key: string;
  readonly valueClassBefore: string;
  readonly valueClassAfter: string;
}

/** One property entry seen in a snapshot. */
export interface EntrySnapshot {
  readonly path: string;
  readonly key: string;
  readonly value: unknown;
}

const LAYOUT_OPTION_PROXY_CLASS = 'org.eclipse.elk.core.util.internal.LayoutOptionProxy';
const DOUBLE_TYPE = 'DOUBLE';

/** Registers the recorded option, as the recorder does after loading. Only `DOUBLE` options are recorded. */
export function registerAfterLoad(option: RegisteredAfterLoad): void {
  if (option.type !== DOUBLE_TYPE) {
    throw new Error(`registeredAfterLoad: unsupported type ${option.type}`);
  }
  const [first, ...rest] = option.targets.map((t) => LayoutOptionDataTarget.valueOf(t));
  const data = new LayoutOptionData.Builder()
    .id(option.id)
    .group(option.group)
    .name(option.name)
    .type(LayoutOptionDataType.valueOf(option.type))
    .optionClass(JavaClass.Double)
    .defaultValue(Number(option.defaultValue))
    .lowerBound(Number(option.lowerBound))
    .targets(EnumSet.of(first as LayoutOptionDataTarget, ...rest))
    .create();
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders({
    apply: (registry) => {
      registry.register(data);
    },
  });
}

/**
 * The property entries of every holder under `root`, depth first (holder, labels, ports, children, edges and
 * their sections), with the recorder's EcoreUtil fragment paths (`""` for the root, `@children.0/@ports.1`).
 */
export function snapshotEntries(root: ElkNode): EntrySnapshot[] {
  const entries: EntrySnapshot[] = [];
  const visit = (holder: EMapPropertyHolder, path: string): void => {
    for (const entry of holder.getProperties().entryList()) {
      entries.push({ path, key: entry.getKey()?.getId() ?? 'null', value: entry.getValue() });
    }
  };
  const child = (path: string, feature: string, index: number): string =>
    `${path === '' ? '' : `${path}/`}@${feature}.${index}`;
  const element = (e: ElkGraphElement, path: string): void => {
    visit(e, path);
    [...e.getLabels()].forEach((label, i) => element(label, child(path, 'labels', i)));
  };
  const edge = (e: ElkEdge, path: string): void => {
    element(e, path);
    [...e.getSections()].forEach((section, i) => visit(section, child(path, 'sections', i)));
  };
  const node = (n: ElkNode, path: string): void => {
    element(n, path);
    [...n.getPorts()].forEach((port, i) => element(port, child(path, 'ports', i)));
    [...n.getChildren()].forEach((c, i) => node(c, child(path, 'children', i)));
    [...n.getContainedEdges()].forEach((e, i) => edge(e, child(path, 'containedEdges', i)));
  };
  node(root, '');
  return entries;
}

/** The Java class the recorder prints for a value this replay can produce. */
function javaClassName(key: string, value: unknown): string {
  if (value instanceof LayoutOptionProxy) {
    return LAYOUT_OPTION_PROXY_CLASS;
  }
  if (
    typeof value === 'number' &&
    LayoutMetaDataService.getInstance().getOptionData(key)?.getType()?.name() === DOUBLE_TYPE
  ) {
    return JavaClass.Double.javaName;
  }
  throw new Error(`no Java class known for the value of ${key}: ${String(value)}`);
}

/** The entries whose value changed between the two snapshots of the same model, in snapshot order. */
export function mutations(before: readonly EntrySnapshot[], after: readonly EntrySnapshot[]): MutationRow[] {
  return before.flatMap((b, i) => {
    const a = after[i] as EntrySnapshot;
    if (Object.is(a.value, b.value)) {
      return [];
    }
    return [
      {
        path: b.path,
        key: b.key,
        valueClassBefore: javaClassName(b.key, b.value),
        valueClassAfter: javaClassName(a.key, a.value),
      },
    ];
  });
}
