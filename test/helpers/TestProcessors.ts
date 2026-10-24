// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import type { ILayoutProcessorFactory } from '../../src/core/alg/ILayoutProcessorFactory.js';
import type { StringBuilder } from '../../src/java/lang/StringBuilder.js';

/**
 * Processors for testing.
 *
 * @see org.eclipse.elk.core.test/src/org/eclipse/elk/core/alg/TestProcessors.java
 */
export class TestProcessors implements ILayoutProcessorFactory<StringBuilder> {
  static readonly PROCESSOR_1: TestProcessors = new TestProcessors('PROCESSOR_1', 0);
  static readonly PROCESSOR_2: TestProcessors = new TestProcessors('PROCESSOR_2', 1);
  static readonly PROCESSOR_3: TestProcessors = new TestProcessors('PROCESSOR_3', 2);

  static readonly #VALUES: readonly TestProcessors[] = [
    TestProcessors.PROCESSOR_1,
    TestProcessors.PROCESSOR_2,
    TestProcessors.PROCESSOR_3,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  static values(): readonly TestProcessors[] {
    return TestProcessors.#VALUES;
  }

  ordinal(): number {
    return this.#ordinal;
  }

  name(): string {
    return this.#name;
  }

  toString(): string {
    return this.#name;
  }

  compareTo(other: TestProcessors): number {
    return this.#ordinal - other.#ordinal;
  }

  create(): ILayoutProcessor<StringBuilder> {
    return {
      process: (graph: StringBuilder): void => {
        graph.append(this.toString());
      },
    };
  }
}
