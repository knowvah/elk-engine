// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { add } from '../../../java/lang/Int32.js';
import { d2i } from '../../../java/lang/JavaMath.js';
import { StringIndexOutOfBoundsException } from '../../../java/lang/StringIndexOutOfBoundsException.js';
import { STRING } from '../../../java/util/HashStrategy.js';
import { JavaHashMap } from '../../../java/util/JavaHashMap.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { InternalProperties } from '../options/InternalProperties.js';

/** The identity of the shared default object of `InternalProperties.ID` (`""`), which an unset `ID` reads. */
const UNSET_ID_IDENTITY: object = {};

/**
 * A processor that computes the maximal fan out for each node in the given graph. The maximal fan out of a node is
 * the maximal number of descendants it has got in one level.
 *
 * TR3 (V4): all three maps have String keys and `locFanMap` is iterated (`FanProcessor.java:135`), so they are
 * `JavaHashMap`s with the String strategy and iterate in the JVM's order.
 *
 * @author sor
 * @author sgu
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/intermediate/FanProcessor.java
 */
export class FanProcessor implements ILayoutProcessor<TGraph> {
  /** this map temporarily contains the maximal fan of each node in the given graph. */
  private gloFanMap: JavaHashMap<string, number> = new JavaHashMap<string, number>(STRING);

  /** this map temporarily contains the number of descendants of each node in the given graph. */
  private gloDescMap: JavaHashMap<string, number> = new JavaHashMap<string, number>(STRING);

  /** The identity of the String object each node's `ID` property holds (see {@link assignIds}); empty outside a run. */
  private identities: Map<TNode, object> = new Map<TNode, object>();

  process(tGraph: TGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Processor compute fanout', 1);

    /** clear map if processor is reused */
    this.gloFanMap.clear();
    this.gloDescMap.clear();
    this.identities.clear();

    let root: TNode | null = null;
    /** find the root of the component */
    const it = tGraph.getNodes().iterator();
    let next = it.next();
    while (root === null && next.done !== true) {
      const tNode = next.value;
      if (tNode.getProperty(InternalProperties.ROOT)) {
        root = tNode;
      }
      next = it.next();
    }

    const rootLevel = new LinkedList<TNode>();
    // Java adds the possibly null root (a LinkedList accepts null); the loop of calculateFan then fails on it
    rootLevel.add(root as TNode);

    this.calculateFan(rootLevel);

    /** set the fan and descendants for all nodes */
    for (const tNode of tGraph.getNodes()) {
      const key = tNode.getProperty(InternalProperties.ID);
      const fan = this.gloFanMap.get(key) !== undefined ? this.gloFanMap.get(key)! : 0;
      tNode.setProperty(InternalProperties.FAN, fan);
      const desc = add(1, this.gloDescMap.get(key) !== undefined ? this.gloDescMap.get(key)! : 0);
      tNode.setProperty(InternalProperties.DESCENDANTS, desc);
    }

    progressMonitor.done();
  }

  /**
   * Calculates a fan for the nodes in the list currentLevel including their descendants.
   *
   * @param currentLevel the list of TNode for which the fan should be calculated.
   */
  private calculateFan(currentLevel: LinkedList<TNode>): void {
    if (!currentLevel.isEmpty()) {
      /** the children of the current level are the next level */
      const nextLevel = new LinkedList<TNode>();

      /** the size of the which the stringId will be extended for this level */
      const digits = d2i(Math.floor(Math.log10(currentLevel.size())) + 1);

      /**
       * set final stringId for all nodes in this level and set the provisional stringId for their children
       * (currentLevel is not empty so the id is set)
       */
      const id = this.assignIds(currentLevel, nextLevel, digits);

      /** holds the occurences of descendants in this level */
      const locFanMap = this.countDescendants(currentLevel, id, digits);

      /** update the gloFanMap with the values from locFanMap will only increase the values */
      this.mergeLocal(locFanMap);

      /** calculate the occurrences in the deeper levels and add them to the global gloFanMap */
      this.calculateFan(nextLevel);
    }
  }

  /**
   * The first loop of {@link calculateFan} (`FanProcessor.java:102-120`): returns the id of the last node of the level.
   *
   * `pId != tNode.getProperty(ID)` (`:105`) compares String REFERENCES. JS strings have no identity, so the identity of every
   * value stored in `InternalProperties.ID` is carried beside it in `identities` (property values stay plain strings). Proof
   * that the model is complete, from the Java at the pin:
   * - `ID` is written only at `:114` and `:118` (grep of `InternalProperties.ID` under alg.mrtree: `:69, :105, :106, :114, :118,
   *   :128`; the others read). Both store the `id` object of the current iteration, once on the node and once on each child,
   *   so one token per iteration, stored in the same order, models every writer.
   * - `id` is always a new String object: `pId + formatRight(..)` is a concatenation, which JLS 15.18.1 says yields a newly
   *   created String even for an empty operand, and `formatRight` returns its own `value + ""` or `"0" + s` results (never a
   *   constant); the `pId == null` else (`:111-112`) is dead (pId holds a non-null property value from the first iteration on)
   *   and would create a new object as well.
   * - an unset `ID` reads the one shared default object `""` of the property declaration: {@link UNSET_ID_IDENTITY}. Every
   *   node read at `:105` has been written by this run's parent iteration, except the root, whose compare with `pId == null` is
   *   true whatever its identity.
   * Equal-content ids from different iterations do occur (a node with two parents under BFS restarts `index` at `:107` and
   * so repeats the id a sibling group already got), which a content comparison would merge: oracle row
   * `stops/bfs/cyc79n7/searchOrder=BFS` (mrtree-extra.json).
   */
  private assignIds(currentLevel: LinkedList<TNode>, nextLevel: LinkedList<TNode>, digits: number): string {
    let id: string | null = null;
    let pId: string | null = null;
    let pIdIdentity: object | null = null;
    let index = 0;
    for (const tNode of currentLevel) {
      /** the final stringId is the stringId of the parent and the extension */
      const identity = this.identities.get(tNode) ?? UNSET_ID_IDENTITY;
      if (pIdIdentity !== identity) {
        pId = tNode.getProperty(InternalProperties.ID);
        pIdIdentity = identity;
        index = 0;
      }
      if (pId !== null) {
        id = pId + FanProcessor.formatRight(index++, digits);
      } else {
        id = FanProcessor.formatRight(index++, digits);
      }
      /** the String object this iteration created */
      const created = {};
      tNode.setProperty(InternalProperties.ID, id);
      this.identities.set(tNode, created);
      for (const tChild of tNode.getChildren()) {
        nextLevel.add(tChild);
        /** the provisional stringId is the Id of the parent */
        tChild.setProperty(InternalProperties.ID, id);
        this.identities.set(tChild, created);
      }
    }
    return id as string;
  }

  /** The `locFanMap` loop of {@link calculateFan} (`FanProcessor.java:123-132`). */
  private countDescendants(currentLevel: LinkedList<TNode>, id: string, digits: number): JavaHashMap<string, number> {
    const locFanMap = new JavaHashMap<string, number>(STRING);

    /** calculated occurences of descendants in this level */
    for (let i = 0; i < id.length - digits; i++) {
      for (const tNode of currentLevel) {
        const key = FanProcessor.substring(tNode.getProperty(InternalProperties.ID), 0, i + 1);
        const blockSize = locFanMap.get(key) !== undefined ? add(locFanMap.get(key)!, 1) : 1;
        locFanMap.put(key, blockSize);
      }
    }
    return locFanMap;
  }

  /** The `locEntry` loop of {@link calculateFan} (`FanProcessor.java:135-143`), in the `locFanMap` iteration order. */
  private mergeLocal(locFanMap: JavaHashMap<string, number>): void {
    for (const [locKey, locValue] of locFanMap) {
      let gloValue: number | undefined = this.gloDescMap.get(locKey) !== undefined ? this.gloDescMap.get(locKey)! : 0;
      this.gloDescMap.put(locKey, add(locValue, gloValue));
      gloValue = this.gloFanMap.get(locKey);
      if (gloValue === undefined || gloValue < locValue) {
        this.gloFanMap.put(locKey, locValue);
      }
    }
  }

  /**
   * `String.substring(begin, end)`: unlike JS `substring`, which clamps, it throws for an end beyond the length. This is
   * the throw of `FanProcessor.java:128` on a node whose id is shorter than the last id of its level.
   */
  private static substring(s: string, begin: number, end: number): string {
    if (end > s.length) {
      throw new StringIndexOutOfBoundsException(
        `Range [${String(begin)}, ${String(end)}) out of bounds for length ${String(s.length)}`,
      );
    }
    return s.substring(begin, end);
  }

  /**
   * Create a string representation of the given value, padded with 0s.
   *
   * @param value a value
   * @param len the min. number of characters
   * @return a string representation
   */
  static formatRight(value: number, len: number): string {
    let s = `${String(value)}`;
    while (s.length < len) {
      s = `0${s}`;
    }
    return s;
  }
}
