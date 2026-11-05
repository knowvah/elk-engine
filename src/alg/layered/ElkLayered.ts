// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../core/alg/ILayoutProcessor.js';
import type { TestController } from '../../core/testing/TestController.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import { Pair } from '../../core/util/Pair.js';
import * as Float32 from '../../java/lang/Float32.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import type { ClassObject } from '../../java/lang/JavaClass.js';
import { ComponentsProcessor } from './components/ComponentsProcessor.js';
import { CompoundGraphPostprocessor } from './compound/CompoundGraphPostprocessor.js';
import { CompoundGraphPreprocessor } from './compound/CompoundGraphPreprocessor.js';
import { DebugUtil } from './DebugUtil.js';
import { ElkLayeredTestExecutionState } from './ElkLayeredTestExecutionState.js';
import {
  ProcessorIterator,
  collectAllGraphsBottomUp,
  reviewAndCorrectHierarchicalProcessors,
} from './ElkLayeredHierarchy.js';
import { resizeGraph } from './ElkLayeredResize.js';
import { GraphConfigurator } from './GraphConfigurator.js';
import type { LGraph } from './graph/LGraph.js';
import { isHierarchyAwareLayoutProcessor } from './IHierarchyAwareLayoutProcessor.js';
import { InternalProperties } from './options/InternalProperties.js';

type GraphAndAlgorithm = Pair<LGraph, ProcessorIterator>;

/** The Java `ListIterator.next()` result is the plan entry; a plan entry's class is its constructor. */
const classNameOf = (processor: object): string => processor.constructor.name;

/** The `layoutTest` arguments `(phase, state)` or `(phase, inclusive, state)`. */
type RunUntilRest = [state: ElkLayeredTestExecutionState] | [inclusive: boolean, state: ElkLayeredTestExecutionState];

/**
 * The main entry point into ELK Layered. ELK Layered is a layout algorithm after the layered layout method proposed by
 * Sugiyama et al. It is structured into five main phases: cycle breaking, layering, crossing minimization, node
 * placement, and edge routing. Before these phases and after the last phase so called intermediate layout processors
 * can be inserted that do some kind of pre or post processing.
 *
 * To use ELK Layered to layout a given graph, `doLayout` computes a layout for the given graph without any subgraphs,
 * `doCompoundLayout` for the graph and its subgraphs. In addition, the class provides methods for automatic unit
 * testing based around the concept of test runs: `prepareLayoutTest`, then `runLayoutTestStep` or `runLayoutTestUntil`.
 *
 * @author msp
 * @author cds
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/ElkLayered.java
 */
export class ElkLayered {
  /** the algorithm's current configuration. */
  private readonly graphConfigurator = new GraphConfigurator();
  /** connected components processor. */
  private readonly componentsProcessor = new ComponentsProcessor();
  /** compound graph preprocessor. */
  private readonly compoundGraphPreprocessor = new CompoundGraphPreprocessor();
  /** compound graph postprocessor. */
  private readonly compoundGraphPostprocessor = new CompoundGraphPostprocessor();
  /** Test controller for a white box test. */
  private testController: TestController | null = null;

  ///////////////////////////////////////////////////////////////////////////////
  // Regular Layout

  /**
   * Does a layout on the given graph. If the graph contains compound nodes, the nested graphs are ignored.
   *
   * @param lgraph the graph to layout
   * @param monitor a progress monitor to show progress information in, or `null`
   * @see ElkLayered.java:135
   */
  doLayout(lgraph: LGraph, monitor: IElkProgressMonitor | null): void {
    let theMonitor = monitor;
    if (theMonitor === null) {
      theMonitor = new BasicProgressMonitor().withMaxHierarchyLevels(0);
    }
    theMonitor.begin('Layered layout', 1);

    // Update the modules depending on user options
    this.graphConfigurator.prepareGraphForLayout(lgraph);

    // Split the input graph into components and perform layout on them
    const components = this.componentsProcessor.split(lgraph);
    if (components.length === 1) {
      // Execute layout on the sole component using the top-level progress monitor
      this.layout(components[0]!, theMonitor);
    } else {
      // Execute layout on each component using a progress monitor subtask
      const compWork = Float32.div(1.0, components.length);
      for (const comp of components) {
        // Java dereferences the parameter `monitor` here, not `theMonitor`: a null monitor raises its NPE here
        if (monitor!.isCanceled()) {
          return;
        }
        this.layout(comp, theMonitor.subTask(compWork)!);
      }
    }
    this.componentsProcessor.combine(components, lgraph);

    // Resize the resulting graph, according to minimal size constraints and such
    resizeGraph(lgraph);

    theMonitor.done();
  }

  ///////////////////////////////////////////////////////////////////////////////
  // Compound Graph Layout

  /**
   * Does a layout on the given compound graph. Connected components processing is currently not supported.
   *
   * @param lgraph the graph to layout
   * @param monitor a progress monitor to show progress information in, or `null`
   * @see ElkLayered.java:179
   */
  doCompoundLayout(lgraph: LGraph, monitor: IElkProgressMonitor | null): void {
    let theMonitor = monitor;
    if (theMonitor === null) {
      theMonitor = new BasicProgressMonitor().withMaxHierarchyLevels(0);
    }
    theMonitor.begin('Layered layout', 2);

    // Preprocess the compound graph by splitting cross-hierarchy edges
    this.notifyProcessorReady(lgraph, this.compoundGraphPreprocessor);
    this.compoundGraphPreprocessor.process(lgraph, theMonitor.subTask(1)!);
    this.notifyProcessorFinished(lgraph, this.compoundGraphPreprocessor);

    this.hierarchicalLayout(lgraph, theMonitor.subTask(1)!);

    // Postprocess the compound graph by combining split cross-hierarchy edges
    this.notifyProcessorReady(lgraph, this.compoundGraphPostprocessor);
    this.compoundGraphPostprocessor.process(lgraph, theMonitor.subTask(1)!);
    this.notifyProcessorFinished(lgraph, this.compoundGraphPostprocessor);

    theMonitor.done();
  }

  /**
   * Processors can be marked as operating on the full hierarchy by using the `IHierarchyAwareLayoutProcessor` brand.
   * All graphs are collected using a breadth-first search and this list is reversed, so that for each graph, all
   * following graphs are on the same hierarchy level or higher. Each graph then has a unique configuration of ELK
   * Layered. If a processor is not hierarchical it is simply executed. If it is hierarchical and this graph is not the
   * root graph, this processor is skipped and the algorithm is paused until the processor has been executed on the
   * root graph. Then the algorithm is continued, starting with the level lowest in the hierarchy.
   *
   * @see ElkLayered.java:214
   */
  private hierarchicalLayout(lgraph: LGraph, monitor: IElkProgressMonitor): void {
    // Perform a reversed breadth first search: The graphs in the lowest hierarchy come first.
    const graphs = collectAllGraphsBottomUp(lgraph);

    // We have to make sure that hierarchical processors don't break the control flow
    //  of the following layout execution (see e.g. #228). To be precise, if the root node of
    //  the hierarchical graph doesn't include a hierarchical processor, nor may any of the children.
    reviewAndCorrectHierarchicalProcessors(lgraph, graphs);

    // Get list of processors for each graph, since they can be different.
    // Iterators are used, so that processing of a graph can be paused and continued easily.
    let work = 0;
    const graphsAndAlgorithms: GraphAndAlgorithm[] = [];
    for (const g of graphs) {
      this.graphConfigurator.prepareGraphForLayout(g);
      const processors = g.getProperty(InternalProperties.PROCESSORS);
      work += processors.length;
      graphsAndAlgorithms.push(Pair.of(g, new ProcessorIterator(processors)));
    }

    monitor.begin('Recursive hierarchical layout', work);

    // When the root graph has finished layout, the layout is complete.
    let slotIndex = 0;
    const rootProcessors = this.getProcessorsForRootGraph(graphsAndAlgorithms);
    while (rootProcessors.hasNext()) {
      // Layout from bottom up
      for (const graphAndAlgorithm of graphsAndAlgorithms) {
        slotIndex = this.runHierarchyLevel(graphAndAlgorithm, monitor, slotIndex);
      }
    }

    this.logDebugGraph(monitor, lgraph, slotIndex, 'Finished');

    monitor.done();
  }

  /**
   * One pass of the `for (graphAndAlgorithm : graphsAndAlgorithms)` loop of `hierarchicalLayout` (`:242-287`, split
   * out for the complexity limits): runs the graph's processors until a hierarchy-aware one pauses it. Returns the
   * advanced slot index.
   */
  private runHierarchyLevel(
    graphAndAlgorithm: GraphAndAlgorithm,
    monitor: IElkProgressMonitor,
    slotIndex: number,
  ): number {
    const processors = graphAndAlgorithm.getSecond()!;
    const graph = graphAndAlgorithm.getFirst()!;
    let slot = slotIndex;

    while (processors.hasNext()) {
      const processor = processors.next();
      const hierarchyAware = isHierarchyAwareLayoutProcessor(processor);
      if (!hierarchyAware || this.isRoot(graph)) {
        this.logDebugGraph(monitor, graph, slot, `Before ${classNameOf(processor)}`);

        // A processor that operates on the full hierarchy must be executed on the root
        this.notifyProcessorReady(graph, processor);
        processor.process(graph, monitor.subTask(1)!);
        this.notifyProcessorFinished(graph, processor);

        slot++;

        if (hierarchyAware) {
          // Continue operation with the graph at the bottom of the hierarchy
          break;
        }
      } else {
        // operates on full hierarchy and is not root graph: skip this processor and pause execution until the
        // root graph has processed.
        break;
      }
    }
    return slot;
  }

  /** @see ElkLayered.java:356 */
  private getProcessorsForRootGraph(graphsAndAlgorithms: readonly GraphAndAlgorithm[]): ProcessorIterator {
    return graphsAndAlgorithms[graphsAndAlgorithms.length - 1]!.getSecond()!;
  }

  /** @see ElkLayered.java:361 */
  private isRoot(graph: LGraph): boolean {
    return graph.getParentNode() === null;
  }

  ///////////////////////////////////////////////////////////////////////////////
  // Layout Testing

  /**
   * Prepares a test run of the layout algorithm. After this method has run, call `runLayoutTestStep` as often as there
   * are layout processors.
   *
   * @param lgraph the input graph to initialize the test run with.
   * @return the test execution state
   * @see ElkLayered.java:407
   */
  prepareLayoutTest(lgraph: LGraph): ElkLayeredTestExecutionState {
    const state = new ElkLayeredTestExecutionState();

    // update the modules depending on user options
    this.graphConfigurator.prepareGraphForLayout(lgraph);

    // split the input graph into components
    state.graphs = this.componentsProcessor.split(lgraph);

    return state;
  }

  /**
   * Checks if the current test run still has processors to be executed for the algorithm to finish.
   *
   * @param state the current test execution state
   * @return `true` if the current test run has not finished yet. If there is no current test run, the result is
   *         undefined.
   * @see ElkLayered.java:426
   */
  isLayoutTestFinished(state: ElkLayeredTestExecutionState): boolean {
    const graph = state.graphs![0]!;
    // `algorithm != null` of the Java: a graph that was never prepared has no PROCESSORS value
    const algorithm = graph.getProperty(InternalProperties.PROCESSORS) as ILayoutProcessor<LGraph>[] | null;
    return algorithm !== null && state.step >= algorithm.length;
  }

  /**
   * Runs the algorithm on the current test graphs up to the point where the given phase or processor has finished
   * executing (`inclusive`, the default) or just before it starts. If parts of the algorithm were already executed,
   * execution is resumed from there. A phase that is not among the remaining processors is reported on the error
   * stream. Java's two overloads `(phase, inclusive, state)` and `(phase, state)` are this one method.
   *
   * @param phase the phase or processor class to stop after
   * @see ElkLayered.java:446
   */
  runLayoutTestUntil(phase: ClassObject, ...rest: RunUntilRest): void {
    const inclusive = rest.length === 2 ? rest[0] : true;
    const state = rest.length === 2 ? rest[1] : rest[0];

    const algorithm = state.graphs![0]!.getProperty(InternalProperties.PROCESSORS);

    // check if the given phase exists in our current algorithm configuration
    let phaseExists = false;
    let cursor = state.step;
    let phaseIndex = state.step;

    while (cursor < algorithm.length && !phaseExists) {
      if (algorithm[cursor++]!.constructor === phase) {
        phaseExists = true;

        if (inclusive) {
          phaseIndex++;
        }
      } else {
        phaseIndex++;
      }
    }

    if (!phaseExists) {
      // FIXME (Java): actually, we want to know when a processor is not part of the algorithm's configuration
      // because this might be wrong behavior. However, in the current test framework there is no way to
      // differentiate between 'it's ok' and 'it's not'.
      console.error(`Given processor ${phase.name} not part of the remaining algorithm.`);
    }

    // perform the layout up to and including that phase
    cursor = state.step;
    for (; state.step < phaseIndex; state.step++) {
      this.layoutTest(state.graphs!, algorithm[cursor++]!);
    }
  }

  /**
   * Runs the next step of the current layout test run. Throws exceptions if no layout test run is currently active or
   * if the current run has finished.
   *
   * @param state the current test execution state
   * @throws IllegalStateException if the given state has finished executing
   * @see ElkLayered.java:507
   */
  runLayoutTestStep(state: ElkLayeredTestExecutionState): void {
    if (this.isLayoutTestFinished(state)) {
      throw new IllegalStateException('Current layout test run has finished.');
    }

    // perform the next layout step
    const algorithm = state.graphs![0]!.getProperty(InternalProperties.PROCESSORS);
    this.layoutTest(state.graphs!, algorithm[state.step]!);
    state.step++;
  }

  /**
   * Returns the current list of layout processors that make up the algorithm. This list is only valid and meaningful
   * while a layout test is being run.
   *
   * @see ElkLayered.java:525
   */
  getLayoutTestConfiguration(state: ElkLayeredTestExecutionState): ILayoutProcessor<LGraph>[] {
    return state.graphs![0]!.getProperty(InternalProperties.PROCESSORS);
  }

  /**
   * Installs the given test controller to be notified of layout events.
   *
   * @param testController the test controller to be installed. May be `null`.
   */
  setTestController(testController: TestController | null): void {
    this.testController = testController;
  }

  /**
   * Notifies the test controller (if installed) that the given processor is ready to start processing the given
   * graph. If the graph is the root graph, the corresponding notification is triggered as well.
   */
  private notifyProcessorReady(lgraph: LGraph, processor: ILayoutProcessor<LGraph>): void {
    if (this.testController !== null) {
      if (this.isRoot(lgraph)) {
        this.testController.notifyRootProcessorReady(lgraph, processor as ILayoutProcessor<unknown>);
      } else {
        this.testController.notifyProcessorReady(lgraph, processor as ILayoutProcessor<unknown>);
      }
    }
  }

  /**
   * Notifies the test controller (if installed) that the given processor has finished processing the given graph.
   * If the graph is the root graph, the corresponding notification is triggered as well.
   */
  private notifyProcessorFinished(lgraph: LGraph, processor: ILayoutProcessor<LGraph>): void {
    if (this.testController !== null) {
      if (this.isRoot(lgraph)) {
        this.testController.notifyRootProcessorFinished(lgraph, processor as ILayoutProcessor<unknown>);
      } else {
        this.testController.notifyProcessorFinished(lgraph, processor as ILayoutProcessor<unknown>);
      }
    }
  }

  ///////////////////////////////////////////////////////////////////////////////
  // Actual Layout

  /**
   * Perform the five phases of the layered layouter.
   *
   * @param lgraph the graph that is to be laid out
   * @param monitor a progress monitor
   * @see ElkLayered.java:576
   */
  private layout(lgraph: LGraph, monitor: IElkProgressMonitor): void {
    const monitorWasAlreadyRunning = monitor.isRunning();
    if (!monitorWasAlreadyRunning) {
      monitor.begin('Component Layout', 1);
    }

    const algorithm = lgraph.getProperty(InternalProperties.PROCESSORS);
    const monitorProgress = Float32.div(1.0, algorithm.length);

    if (monitor.isLoggingEnabled()) {
      this.logAlgorithmConfiguration(algorithm, monitor);
    }

    // Invoke each layout processor
    let slotIndex = 0;
    for (const processor of algorithm) {
      if (monitor.isCanceled()) {
        return;
      }

      this.logDebugGraph(monitor, lgraph, slotIndex, `Before ${classNameOf(processor)}`);

      this.notifyProcessorReady(lgraph, processor);
      processor.process(lgraph, monitor.subTask(monitorProgress)!);
      this.notifyProcessorFinished(lgraph, processor);

      slotIndex++;
    }

    this.logDebugGraph(monitor, lgraph, slotIndex, 'Finished');

    this.moveNodesAwayFromLayers(lgraph);

    if (!monitorWasAlreadyRunning) {
      monitor.done();
    }
  }

  /**
   * The `if (monitor.isLoggingEnabled()) { DebugUtil.logDebugGraph(...) }` block that `ElkLayered.java` repeats at
   * `:251`, `:266`, `:292`, `:605` and `:619` (between `elkjs-exclude` markers there).
   */
  private logDebugGraph(monitor: IElkProgressMonitor, lgraph: LGraph, slotIndex: number, name: string): void {
    if (monitor.isLoggingEnabled()) {
      DebugUtil.logDebugGraphSlot(monitor, lgraph, slotIndex, name);
    }
  }

  /** `:624-635` of `layout` (split out for the complexity limits). */
  private moveNodesAwayFromLayers(lgraph: LGraph): void {
    // Move all nodes away from the layers (we need to remove nodes from their current layer in a
    // second loop to avoid ConcurrentModificationExceptions)
    for (const layer of lgraph) {
      lgraph.getLayerlessNodes().push(...layer.getNodes());
      layer.getNodes().length = 0;
    }

    for (const node of lgraph.getLayerlessNodes()) {
      node.setLayer(null);
    }

    lgraph.getLayers().length = 0;
  }

  /** `:585-594`: prints the algorithm configuration (the Java `getClass().getName()` is the class's name here). */
  private logAlgorithmConfiguration(
    algorithm: readonly ILayoutProcessor<LGraph>[],
    monitor: IElkProgressMonitor,
  ): void {
    monitor.log(`ELK Layered uses the following ${algorithm.length} modules:`);
    let slot = 0;
    for (const processor of algorithm) {
      const gwtDoesntSupportPrintf = (slot < 10 ? '0' : '') + String(slot++);
      monitor.log(`   Slot ${gwtDoesntSupportPrintf}: ${classNameOf(processor)}`);
    }
  }

  /**
   * Executes the given layout processor on the given list of graphs.
   *
   * @see ElkLayered.java:649
   */
  private layoutTest(lgraphs: readonly LGraph[], processor: ILayoutProcessor<LGraph>): void {
    // invoke the layout processor on each of the given graphs
    for (const lgraph of lgraphs) {
      this.notifyProcessorReady(lgraph, processor);
      processor.process(lgraph, new BasicProgressMonitor());
      this.notifyProcessorFinished(lgraph, processor);
    }
  }
}
