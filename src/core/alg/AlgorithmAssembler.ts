// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { AbstractRandomListAccessor } from '../util/AbstractRandomListAccessor.js';
import { EnumBasedFactoryComparator } from './EnumBasedFactoryComparator.js';
import type { ILayoutPhase } from './ILayoutPhase.js';
import type { ILayoutPhaseFactory } from './ILayoutPhaseFactory.js';
import type { ILayoutProcessor } from './ILayoutProcessor.js';
import type { ILayoutProcessorFactory } from './ILayoutProcessorFactory.js';
import { LayoutProcessorConfiguration } from './LayoutProcessorConfiguration.js';

/** The class side of the phase enumeration (Java: `Class<P>`, P7). */
export interface PhaseEnumClass<P extends { ordinal(): number }> {
  values(): readonly P[];
}

/**
 * A builder class for algorithms which are structured into phases and intermediate processing slots. The assembler
 * views layout algorithms as lists of layout phases and layout processors which, executed in order, as a pipeline,
 * implements the algorithm.
 *
 * Usage: instantiate via {@link AlgorithmAssembler.create}, set a factory per phase with {@link setPhase}, optionally
 * add phase-independent processors with {@link addProcessorConfiguration}, then call {@link build}. Phase and
 * processor instances are cached between `build` calls by default. Processors sharing a slot are ordered by the
 * processor comparator (default: {@link EnumBasedFactoryComparator}).
 *
 * @typeParam P enumeration of all available phases (not of the phase implementations)
 * @typeParam G type of the graph the created algorithm will operate on
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/alg/AlgorithmAssembler.java
 */
export class AlgorithmAssembler<
  P extends { ordinal(): number },
  G,
> extends AbstractRandomListAccessor<ILayoutPhaseFactory<P, G> | null> {
  /** Whether layout processors and phases are cached once obtained from their factories. */
  #enableCaching = true;
  /** Whether assembling the algorithm should fail if not all phases have implementations assigned. */
  #failOnMissingPhase = true;
  /** The comparator used to sort processors in each processing slot. */
  #processorComparator: (a: ILayoutProcessorFactory<G>, b: ILayoutProcessorFactory<G>) => number = (a, b) =>
    new EnumBasedFactoryComparator<G>().compare(a, b);

  /** Class of the enumeration of all phases an algorithm is structured into. */
  readonly #phasesEnumClass: PhaseEnumClass<P>;
  /** The number of enumeration constants in the phase enumeration, saved for performance's sake. */
  readonly #numberOfPhases: number;
  /** Set of phases whose implementations already have implementations assigned. */
  readonly #configuredPhases: EnumSet<P>;
  /** A configuration with additional processors which the phases don't necessarily depend upon themselves. */
  readonly #additionalProcessors: LayoutProcessorConfiguration<P, G>;
  /**
   * The cache for phase and processor instances, if caching is enabled. Keyed by factory identity and used for
   * lookups only (Java: `Maps.newHashMap()`), so a JS `Map` is equivalent (P2).
   */
  readonly #cache: Map<ILayoutProcessorFactory<G>, ILayoutProcessor<G>>;

  /**
   * Creates a new algorithm assembler based on the given enumeration of phases the algorithm should be structured
   * into.
   *
   * @param phaseEnum enumeration class.
   * @returns an algorithm assembler that can build algorithms structured into the given phases.
   */
  static create<P extends { ordinal(): number }, G>(phaseEnum: PhaseEnumClass<P>): AlgorithmAssembler<P, G> {
    return new AlgorithmAssembler<P, G>(phaseEnum);
  }

  private constructor(phaseEnum: PhaseEnumClass<P>) {
    super();
    this.#phasesEnumClass = phaseEnum;
    this.#numberOfPhases = phaseEnum.values().length;

    if (this.#numberOfPhases === 0) {
      throw new IllegalArgumentException('There must be at least one phase in the phase enumeration.');
    }

    this.#configuredPhases = EnumSet.noneOf<P>(this.#phasesEnumClass);
    this.#additionalProcessors = LayoutProcessorConfiguration.create<P, G>();
    this.#cache = new Map();
  }

  // Configuration

  /**
   * Determines whether caching of layout phases and processors obtained from the factories should be enabled or not.
   * Caching is enabled by default.
   */
  withCaching(enabled: boolean): this {
    this.#enableCaching = enabled;
    return this;
  }

  /**
   * Determines whether to fail upon calling {@link build} if not all phases have implementations configured by
   * calling {@link setPhase}. The default is to fail.
   */
  withFailOnMissingPhase(fail: boolean): this {
    this.#failOnMissingPhase = fail;
    return this;
  }

  /**
   * Sets a comparator used to determine the order of processors in each processing slot. By default, processors are
   * sorted by the order of their appearance in their processor enumeration.
   */
  withProcessorComparator(comparator: (a: ILayoutProcessorFactory<G>, b: ILayoutProcessorFactory<G>) => number): this {
    this.#processorComparator = comparator;
    return this;
  }

  // Phase Assembly

  /** Clears the cache of layout phase and layout processor instances. */
  clearCache(): this {
    this.#cache.clear();
    return this;
  }

  /** Resets the configured phase implementations and any additional processors. */
  reset(): this {
    this.clearList();
    this.#configuredPhases.clear();
    this.#additionalProcessors.clear();
    return this;
  }

  /** Configures the given factory to be used to obtain an implementation for the given phase. */
  setPhase(phase: P, phaseFactory: ILayoutPhaseFactory<P, G>): this {
    this.setListItem(phase.ordinal(), phaseFactory);
    this.#configuredPhases.add(phase);
    return this;
  }

  /** Adds the processors specified in the configuration to the algorithm, regardless of the phases' requirements. */
  addProcessorConfiguration(config: LayoutProcessorConfiguration<P, G>): this {
    this.#additionalProcessors.addAll(config);
    return this;
  }

  // Algorithm Building

  /**
   * Returns a list of phases and processors that, if executed in order, implement the desired algorithm. Since the
   * dependencies of phases may depend on the graph to be laid out, that graph is passed to this method.
   *
   * @param graph the graph to be laid out.
   * @returns the algorithm as a list of processors.
   * @throws IllegalStateException if failing on missing phases is active and not all phases have implementations.
   */
  build(graph: G): ILayoutProcessor<G>[] {
    // Check if there are enough phases
    if (this.#failOnMissingPhase && this.#configuredPhases.size() < this.#numberOfPhases) {
      throw new IllegalStateException(
        `Expected ${this.#numberOfPhases} phases to be configured; only found ${this.#configuredPhases.size()}`,
      );
    }

    // All the phases that could potentially have a phase implementation
    const phaseEnumConstants = this.#phasesEnumClass.values();

    const phaseImplementations = this.#instantiatePhases(phaseEnumConstants);
    const processorConfiguration = this.#assembleConfiguration(phaseImplementations, graph);

    // The list of processors the algorithm will be made up of
    const algorithm: ILayoutProcessor<G>[] = [];

    // Add processors and phases to the algorithm
    for (const phase of phaseEnumConstants) {
      // Add processors
      algorithm.push(...this.#retrieveProcessors(processorConfiguration.processorsBefore(phase)));

      // Add the phase itself, if it exists
      const phaseImplementation = phaseImplementations[phase.ordinal()];
      if (phaseImplementation !== null && phaseImplementation !== undefined) {
        algorithm.push(phaseImplementation);
      }
    }

    // Add processors after the last phase
    algorithm.push(
      ...this.#retrieveProcessors(
        processorConfiguration.processorsAfter(phaseEnumConstants[phaseEnumConstants.length - 1] as P),
      ),
    );

    return algorithm;
  }

  /** Instantiates all configured phases; unconfigured ones are `null`. */
  #instantiatePhases(phaseEnumConstants: readonly P[]): (ILayoutPhase<P, G> | null)[] {
    const phaseImplementations: (ILayoutPhase<P, G> | null)[] = [];
    for (const phase of phaseEnumConstants) {
      const phaseFactory = this.getListItem(phase.ordinal());
      if (phaseFactory !== null) {
        phaseImplementations.push(this.#retrievePhase(phaseFactory));
      } else {
        phaseImplementations.push(null);
      }
    }
    return phaseImplementations;
  }

  /** Assembles a definitive processor configuration from the phases' needs and the additional processors. */
  #assembleConfiguration(
    phaseImplementations: readonly (ILayoutPhase<P, G> | null)[],
    graph: G,
  ): LayoutProcessorConfiguration<P, G> {
    const processorConfiguration = LayoutProcessorConfiguration.create<P, G>();
    for (const phase of phaseImplementations) {
      if (phase === null) {
        continue;
      }
      const config = phase.getLayoutProcessorConfiguration(graph);
      if (config !== null) {
        processorConfiguration.addAll(config);
      }
    }
    processorConfiguration.addAll(this.#additionalProcessors);
    return processorConfiguration;
  }

  // Utilities

  protected override provideDefault(): ILayoutPhaseFactory<P, G> | null {
    return null;
  }

  /** Returns the processors of the given factories, sorted according to the configured processor comparator. */
  #retrieveProcessors(factories: ReadonlySet<ILayoutProcessorFactory<G>>): ILayoutProcessor<G>[] {
    const processors: ILayoutProcessor<G>[] = [];
    // Array.prototype.sort is stable, like Java's ordered Stream.sorted
    for (const factory of [...factories].sort(this.#processorComparator)) {
      processors.push(this.#retrieveProcessor(factory));
    }
    return processors;
  }

  /** Front for {@link #retrieveProcessor} that encapsulates an unchecked (but safe) cast. */
  #retrievePhase(factory: ILayoutPhaseFactory<P, G>): ILayoutPhase<P, G> {
    // The factory can only be added through the properly parameterized setPhase(...) method
    return this.#retrieveProcessor(factory) as ILayoutPhase<P, G>;
  }

  /** Returns a processor as instantiated by the given factory, either by invoking it or by querying the cache. */
  #retrieveProcessor(factory: ILayoutProcessorFactory<G>): ILayoutProcessor<G> {
    if (this.#enableCaching) {
      const cached = this.#cache.get(factory);
      if (cached !== undefined) {
        return cached;
      }
      const processor = factory.create();
      this.#cache.set(factory, processor);
      return processor;
    }
    return factory.create();
  }
}
