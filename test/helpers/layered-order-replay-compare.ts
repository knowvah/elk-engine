// SPDX-License-Identifier: EPL-2.0
// Comparison of a replayed order dump with a recorded one (mission 7c, C3): the 7b comparison of the phase members,
// plus the port order of every node. Unlike `edges` and `changed`, order is the contract for `ports`.
import { compareExpected, compareFullDump, type Diff } from './layered-phase-replay-compare.js';
import type { OrderExpected } from './layered-order-replay-rows.js';
import type { ChangedEntry } from './layered-phase-replay-dump.js';

/**
 * Java collection classes the oracle records as a property value's `class` and the TS class that stands for them
 * (AD-10: identity-hashed `HashMap`s are ported as insertion-ordered `Map`s). The 7a encoder names an unknown value
 * by its constructor, so the replayed `{class: "Map"}` is compared as its Java twin. First recorded by the 7c rows
 * (`SortByInputModelProcessor.java:110` stores a `HashMap` as `TARGET_NODE_MODEL_ORDER`).
 */
const JAVA_CLASS_TWINS: ReadonlyMap<string, string> = new Map([['Map', 'java.util.HashMap']]);

function withJavaClassNames(changed: readonly ChangedEntry[]): ChangedEntry[] {
  return changed.map((entry) => ({
    path: entry.path,
    props: Object.fromEntries(
      Object.entries(entry.props).map(([id, value]) => {
        const twin =
          value !== null && typeof value === 'object' && 'class' in value
            ? JAVA_CLASS_TWINS.get((value as { class: string }).class)
            : undefined;
        return [id, twin === undefined ? value : { class: twin }];
      }),
    ),
  }));
}

const portsWhere = (node: string): string => `ports ${node}`;

function comparePorts(actual: OrderExpected['ports'], expected: OrderExpected['ports']): Diff[] {
  const diffs: Diff[] = [];
  for (const [node, want] of Object.entries(expected)) {
    const got = actual[node];
    if (got === undefined) {
      diffs.push({ where: portsWhere(node), message: 'missing' });
    } else if (got.length !== want.length || got.some((port, i) => port !== want[i])) {
      diffs.push({ where: portsWhere(node), message: `expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}` });
    }
  }
  for (const node of Object.keys(actual)) {
    if (!(node in expected)) {
      diffs.push({ where: portsWhere(node), message: 'unexpected' });
    }
  }
  return diffs;
}

/** The differences between a replayed and a recorded order dump (`[]`: equal); the full `dump` is not compared here. */
export function compareOrder(actual: OrderExpected, expected: OrderExpected): Diff[] {
  const javaNamed = { ...actual, changed: withJavaClassNames(actual.changed) };
  return [...compareExpected(javaNamed, expected), ...comparePorts(actual.ports, expected.ports)];
}

/** The 7a whole-graph comparison of a row that stores a full `dump`, as in 7b; `[]` otherwise. */
export function compareOrderFullDump(actual: OrderExpected, expected: OrderExpected): Diff[] {
  return compareFullDump(actual, expected);
}
