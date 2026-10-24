// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../src/core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../src/core/alg/ILayoutPhaseFactory.js';
import { LayoutProcessorConfiguration } from '../../src/core/alg/LayoutProcessorConfiguration.js';
import type { StringBuilder } from '../../src/java/lang/StringBuilder.js';
import { TestProcessors } from './TestProcessors.js';

/**
 * Phases for testing.
 *
 * @see org.eclipse.elk.core.test/src/org/eclipse/elk/core/alg/TestPhases.java
 */
export class TestPhases implements ILayoutPhaseFactory<TestPhases, StringBuilder> {
  static readonly PHASE_1: TestPhases = new TestPhases('PHASE_1', 0);
  static readonly PHASE_2: TestPhases = new TestPhases('PHASE_2', 1);

  static readonly #VALUES: readonly TestPhases[] = [TestPhases.PHASE_1, TestPhases.PHASE_2];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  static values(): readonly TestPhases[] {
    return TestPhases.#VALUES;
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

  compareTo(other: TestPhases): number {
    return this.#ordinal - other.#ordinal;
  }

  create(): ILayoutPhase<TestPhases, StringBuilder> {
    return {
      process: (graph: StringBuilder): void => {
        graph.append(this.toString());
      },
      getLayoutProcessorConfiguration: (): LayoutProcessorConfiguration<TestPhases, StringBuilder> => {
        const config = LayoutProcessorConfiguration.create<TestPhases, StringBuilder>();

        // PHASE_1 -> PROCESSOR_1, PHASE_2 -> PROCESSOR_2
        config.addBefore(this, TestProcessors.values()[this.ordinal()] as TestProcessors);
        return config;
      },
    };
  }
}
