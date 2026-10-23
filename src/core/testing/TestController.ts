// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import type { AbstractLayoutProvider } from '../AbstractLayoutProvider.js';
import type { ILayoutProcessor } from '../alg/ILayoutProcessor.js';
import type { LayoutAlgorithmData } from '../data/LayoutAlgorithmData.js';
import type { IWhiteBoxTestable } from './IWhiteBoxTestable.js';

/**
 * Java passes `null` to `setTestController` on uninstall; the shared interface (`IWhiteBoxTestable`) types the
 * parameter non-null, so the faithful `null` is cast at this site only.
 */
const NO_CONTROLLER = null as never;

/**
 * Interface implemented by listeners interested in the execution of a layout algorithm.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/testing/TestController.java
 */
export interface ILayoutExecutionListener {
  /**
   * Fired when a layout processor is about to be executed.
   *
   * @param processor the layout processor about to be executed.
   * @param graph the graph the processor will be run on.
   * @param isRoot `true` if the graph is the root of the graph hierarchy laid out by the layout algorithm. This does
   *   not have to be the root of the entire graph!
   */
  layoutProcessorReady(processor: ILayoutProcessor<unknown>, graph: unknown, isRoot: boolean): void;

  /**
   * Fired when a layout processor finished executing.
   *
   * @param processor the layout processor about to be executed.
   * @param graph the graph the processor will be run on.
   * @param isRoot `true` if the graph is the root of the graph hierarchy laid out by the layout algorithm. This does
   *   not have to be the root of the entire graph!
   */
  layoutProcessorFinished(processor: ILayoutProcessor<unknown>, graph: unknown, isRoot: boolean): void;
}

/** Java `instanceof IWhiteBoxTestable`: TypeScript interfaces are structural, so test for the method. */
function isWhiteBoxTestable(provider: AbstractLayoutProvider): provider is AbstractLayoutProvider & IWhiteBoxTestable {
  return typeof (provider as Partial<IWhiteBoxTestable>).setTestController === 'function';
}

/**
 * A test controller is used to provide listeners with a way to track the execution of a layout algorithm structured
 * into {@link ILayoutProcessor}s. The main reason for the existence of this class is that our test framework supports
 * white box tests, that is, tests that examine the internal state of a layout algorithm before or after certain
 * processors are run. Thus, the test framework uses test controllers to be notified whenever a layout processor is
 * about to be executed or has just finished executing.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/testing/TestController.java
 */
export class TestController {
  /** Identifier of the layout algorithm that should be tested with this controller. */
  private readonly layoutAlgorithmId: string;
  /** The layout provider the controller is currently installed on, if any. */
  private currentLayoutProvider: IWhiteBoxTestable | null = null;
  /** Listeners that want to be notified during the execution of a layout algorithm. */
  private readonly listeners: Set<ILayoutExecutionListener> = new Set();

  /**
   * Creates a new instance for testing the layout algorithm with the given ID. Each controller is created for a
   * specific layout algorithm.
   */
  constructor(layoutAlgorithmId: string) {
    this.layoutAlgorithmId = layoutAlgorithmId;
  }

  // Setup

  /** Returns the identifier of the layout algorithm that should be tested with this test controller. */
  getTargetAlgorithmId(): string {
    return this.layoutAlgorithmId;
  }

  /**
   * Checks whether this test controller targets layout algorithms described by the given data object. If so, this
   * test controller can be installed on the algorithm by calling {@link install}.
   */
  targets(algorithmData: LayoutAlgorithmData): boolean {
    return algorithmData.getId() === this.layoutAlgorithmId;
  }

  /**
   * Installs this test controller on the given layout provider. Before calling this method, clients should have made
   * sure that the two fit by calling {@link targets}.
   *
   * @throws IllegalArgumentException if the layout provider does not implement {@link IWhiteBoxTestable}.
   * @throws IllegalStateException if the test controller is currently installed on another layout provider.
   */
  install(layoutProvider: AbstractLayoutProvider): void {
    if (this.currentLayoutProvider !== null) {
      throw new IllegalStateException('Test controller may be installed on only one layout provider at a time');
    } else if (isWhiteBoxTestable(layoutProvider)) {
      this.currentLayoutProvider = layoutProvider;
      this.currentLayoutProvider.setTestController(this);
    } else {
      throw new IllegalArgumentException(
        'Test controllers can only be installed on white-box testable layout algorithms',
      );
    }
  }

  /**
   * Uninstalls this test controller from its current layout provider, if any. If it is not currently installed on
   * one, this method does nothing.
   */
  uninstall(): void {
    if (this.currentLayoutProvider !== null) {
      this.currentLayoutProvider.setTestController(NO_CONTROLLER);
      this.currentLayoutProvider = null;
    }
  }

  // Notification Methods

  /** Notifies all listeners that a processor is about to be executed on a non-root graph. */
  notifyProcessorReady(graph: unknown, processor: ILayoutProcessor<unknown>): void {
    for (const listener of this.listeners) {
      listener.layoutProcessorReady(processor, graph, false);
    }
  }

  /** Notifies all listeners that a processor just finished executing on a non-root graph. */
  notifyProcessorFinished(graph: unknown, processor: ILayoutProcessor<unknown>): void {
    for (const listener of this.listeners) {
      listener.layoutProcessorFinished(processor, graph, false);
    }
  }

  /** Notifies all listeners that a processor is about to be executed on a root graph. */
  notifyRootProcessorReady(graph: unknown, processor: ILayoutProcessor<unknown>): void {
    for (const listener of this.listeners) {
      listener.layoutProcessorReady(processor, graph, true);
    }
  }

  /** Notifies all listeners that a processor just finished executing on a root graph. */
  notifyRootProcessorFinished(graph: unknown, processor: ILayoutProcessor<unknown>): void {
    for (const listener of this.listeners) {
      listener.layoutProcessorFinished(processor, graph, true);
    }
  }

  // Listener Management

  /** Adds a listener to the test controller. */
  addLayoutExecutionListener(listener: ILayoutExecutionListener): void {
    this.listeners.add(listener);
  }

  /**
   * Removes a listener from the test controller.
   *
   * Upstream bug kept verbatim: the Java body calls `listeners.add(listener)`, so this adds the listener instead of
   * removing it.
   */
  removeLayoutExecutionListener(listener: ILayoutExecutionListener): void {
    this.listeners.add(listener);
  }
}
