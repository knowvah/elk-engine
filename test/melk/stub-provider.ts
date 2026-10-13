// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { AbstractLayoutProvider } from '../../src/core/AbstractLayoutProvider.js';

/** Test-only layout provider: records `initialize` and `dispose` calls, and refuses to lay anything out. */
abstract class StubLayoutProvider extends AbstractLayoutProvider {
  /** The arguments of every `initialize` call, in order. */
  readonly initializeCalls: string[] = [];
  /** How often `dispose` was called. */
  disposeCount = 0;

  override initialize(parameter: string): void {
    this.initializeCalls.push(parameter);
  }

  override dispose(): void {
    this.disposeCount++;
  }

  layout(_layoutGraph: ElkNode): void {
    throw new Error(`${this.constructor.name} is a test stub and cannot lay out a graph`);
  }
}

// The class names are the Java provider names: the emitted algorithm classes import them by that name
// (mission 5 replaces these stubs by the real providers).

/** Stands in for `org.eclipse.elk.core.util.FixedLayoutProvider`. */
export class FixedLayoutProvider extends StubLayoutProvider {}

/** Stands in for `org.eclipse.elk.core.util.BoxLayoutProvider`. */
export class BoxLayoutProvider extends StubLayoutProvider {}

/** Stands in for `org.eclipse.elk.core.util.RandomLayoutProvider`. */
export class RandomLayoutProvider extends StubLayoutProvider {}
