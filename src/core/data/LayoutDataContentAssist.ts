// SPDX-License-Identifier: EPL-2.0
import { isElkEdge } from '../../graph/ElkEdge.js';
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import { isElkLabel } from '../../graph/ElkLabel.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { isElkNode } from '../../graph/ElkNode.js';
import { type ElkPort, isElkPort } from '../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { ElkReflect } from '../../graph/util/ElkReflect.js';
import { Joiner } from '../../guava/Joiner.js';
import { isNullOrEmpty } from '../../guava/Strings.js';
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';
import { split } from '../../java/lang/JavaString.js';
import { CoreOptions } from '../options/CoreOptions.js';
import type { ILayoutMetaData } from './ILayoutMetaData.js';
import type { LayoutAlgorithmData } from './LayoutAlgorithmData.js';
import { LayoutMetaDataService } from './LayoutMetaDataService.js';
import { LayoutOptionData } from './LayoutOptionData.js';
import { LayoutOptionDataTarget } from './LayoutOptionDataTarget.js';
import { LayoutOptionDataType } from './LayoutOptionDataType.js';
import { LayoutOptionDataVisibility } from './LayoutOptionDataVisibility.js';

const ID_SEPARATOR = '.';
const ID_SEPARATOR_PATTERN = /\./;
const EXPERIMENTAL_SUFFIX = ' - Experimental';
const ADVANCED_SUFFIX = ' - Advanced';

/**
 * Container with proposal information. Java has three `of` overloads; `of(String, String)` and
 * `of(String, T)` cannot be told apart at run time when `T` is a string, so the two-argument forms
 * are `ofLabel` and `ofData` (translation-rules 6.5).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutDataContentAssist.java
 */
export class Proposal<T> {
  /** The proposed string representation to be used. */
  readonly proposal: string;
  /**
   * A speaking label describing the proposals content. May be `null` in which case {@link proposal} shall be used.
   */
  readonly label: string | null;
  /** The underlying object, e.g. an instance of the corresponding {@link LayoutOptionData}. */
  readonly data: T | null;

  private constructor(proposal: string, label: string | null, data: T | null) {
    this.proposal = proposal;
    this.label = label;
    this.data = data;
  }

  static of<T>(proposal: string, label: string | null, data: T | null): Proposal<T> {
    return new Proposal<T>(proposal, label, data);
  }

  /** Java `of(String proposal, String label)`. */
  static ofLabel<T>(proposal: string, label: string | null): Proposal<T> {
    return new Proposal<T>(proposal, label, null);
  }

  /** Java `of(String proposal, T data)`. */
  static ofData<T>(proposal: string, data: T | null): Proposal<T> {
    return new Proposal<T>(proposal, null, data);
  }
}

/** Looks up the registered data a candidate suffix of an id denotes; `null` if there is none. */
type SuffixChecker<T> = (suffix: string) => T | null;

/** The Java `ImmutableSet.of(Target.NODES)` / `of(NODES, PARENTS)` / `Sets.newHashSet(target)` of target types. */
type TargetTypes = readonly LayoutOptionDataTarget[];

/**
 * Checks if `strings` (if it were joined in some way) at some starts with `prefix`. To give an example:
 * `[elk, spacing, nodeNode]` starts both with `[spacing, nodeN]` and `[nodeN]`.
 */
function startsWith(strings: readonly string[], prefix: readonly string[]): boolean {
  if (prefix.length === 0) {
    return true;
  }
  for (let i = 0; i < strings.length - prefix.length + 1; i++) {
    let j = 0;
    let matches = true;
    while (j < prefix.length && matches) {
      matches = (strings[i + j] as string).startsWith(prefix[j] as string);
      j++;
    }
    if (matches) {
      return true;
    }
  }
  return false;
}

/** Java `layoutOption.getGroup().chars().filter(c -> c == '.').count()`; a `null` group is a `NullPointerException`. */
function numberOfGroups(layoutOption: LayoutOptionData): number {
  const group = layoutOption.getGroup();
  if (group === null) {
    throw new TypeError(`Layout option ${layoutOption.getId()} has no group`);
  }
  return [...group].filter((c) => c === ID_SEPARATOR).length;
}

/** For layout options, guarantee that the proposed option always starts with the group. */
function groupAwareStart(data: ILayoutMetaData, idSize: number): number {
  let start = idSize - 1;
  if (data instanceof LayoutOptionData) {
    if (!isNullOrEmpty(data.getGroup())) {
      --start;
    }
    start -= numberOfGroups(data);
  }
  return start;
}

/**
 * See `LayoutDataContentAssist.test.ts` for what this method is expected to accept.
 *
 * What do we want to accept?
 *
 * ```
 * 1) Empty prefix
 * 2) Any substring of the complete id that starts after a dot, e.g. 'org.eclipse.elk.algorithm', 'elk.algorithm'
 * 3) Any substring of the layout option name, e.g. "lgo" for "Layout Algorithm"
 * ```
 */
function matchesPrefix<T extends ILayoutMetaData>(
  data: T,
  checker: SuffixChecker<T>,
  prefix: string,
): Proposal<T> | null {
  // Case 3)
  const matchesName = !isNullOrEmpty(prefix) && (data.getName() as string).toLowerCase().includes(prefix.toLowerCase());

  const idSplit = split(data.getId(), ID_SEPARATOR_PATTERN);
  const prefixSplit = matchesName ? null : split(prefix, ID_SEPARATOR_PATTERN);

  const start = groupAwareStart(data, idSplit.length);

  for (let i = start; i >= 0; i--) {
    const suffixElements = idSplit.slice(i);
    const suffix = new Joiner(ID_SEPARATOR).join(suffixElements);
    // Case 2) (note that Case 1 is included here)
    if (checker(suffix) !== null && (matchesName || startsWith(suffixElements, prefixSplit as string[]))) {
      return Proposal.ofData(suffix, data);
    }
  }

  return null;
}

function getLayoutOptionProposalsForTargets(
  element: ElkGraphElement | null,
  algorithmData: LayoutAlgorithmData | null,
  targetTypes: TargetTypes,
  prefix: string,
): Array<Proposal<LayoutOptionData>> {
  const service = LayoutMetaDataService.getInstance();
  return (
    service
      .getOptionData()
      // Gather all layout options that come into question
      .filter((o) => o.getTargets().isEmpty() || targetTypes.some((t) => o.getTargets().contains(t)))
      .filter((o) => algorithmData === null || algorithmData.knowsOption(o) || o.equals(CoreOptions.ALGORITHM))
      .filter((o) => element === null || !element.getProperties().containsKey(o))
      .filter((o) => o.getVisibility() !== LayoutOptionDataVisibility.HIDDEN)
      // Match them against the passed prefix
      .map((o) => matchesPrefix(o, (suffix) => service.getOptionDataBySuffix(suffix), prefix))
      // Finally collect
      .filter((p): p is Proposal<LayoutOptionData> => p !== null)
  );
}

function getRelevantNodeOfPort(port: ElkPort): ElkNode | null {
  if (port.getParent() !== null && (port.getParent() as ElkNode).getParent() !== null) {
    return (port.getParent() as ElkNode).getParent();
  } else if (port.getParent() !== null) {
    return port.getParent();
  }
  return null;
}

function getRelevantNode(element: ElkGraphElement | null): ElkNode | null {
  if (isElkNode(element)) {
    return element.getParent() !== null ? element.getParent() : element;
  } else if (isElkEdge(element)) {
    return element.getContainingNode();
  } else if (isElkPort(element)) {
    return getRelevantNodeOfPort(element);
  } else if (isElkLabel(element)) {
    let parent = element.getParent();
    while (isElkLabel(parent)) {
      parent = parent.getParent();
    }
    return getRelevantNode(parent);
  }

  return null;
}

/** The `BOOLEAN`/`ENUM`/`ENUMSET` arm of {@link LayoutDataContentAssist.getLayoutOptionValueProposal}. */
function choiceProposals(option: LayoutOptionData): Array<Proposal<unknown>> {
  const proposals: Array<Proposal<unknown>> = [];
  const choices = option.getChoices();
  for (let i = 0; i < choices.length; ++i) {
    const proposal = choices[i] as string;
    let label = proposal;
    const enumVal = option.getEnumValue(i);
    if (ElkGraphUtil.isExperimentalPropertyValue(enumVal)) {
      label += EXPERIMENTAL_SUFFIX;
    } else if (ElkGraphUtil.isAdvancedPropertyValue(enumVal)) {
      label += ADVANCED_SUFFIX;
    }
    proposals.push(Proposal.ofLabel(proposal, label));
  }
  return proposals;
}

/** The `DOUBLE`/`INT` arm: Java `toString()` of a `Double` has a fraction, that of an `Integer` has none. */
function numberProposals(option: LayoutOptionData, type: LayoutOptionDataType): Array<Proposal<unknown>> {
  const defaultDefault = option.getDefaultDefault() as number;
  const text = type === LayoutOptionDataType.DOUBLE ? doubleToString(defaultDefault) : String(defaultDefault);
  return [Proposal.ofLabel(text, type.toString())];
}

/** The `OBJECT` arm; an instantiation failure is silent (Java: `InstantiationException`, `IllegalAccessException`). */
function objectProposals(option: LayoutOptionData, type: LayoutOptionDataType): Array<Proposal<unknown>> {
  const optionClass = option.getOptionClass();
  if (optionClass === null) {
    throw new TypeError(`Layout option ${option.getId()} has no option class`);
  }
  let proposal = '';
  // fail silent: only a function class registered with ElkReflect can be instantiated
  const instance = typeof optionClass === 'function' ? ElkReflect.newInstance(optionClass as new () => unknown) : null;
  if (instance !== null) {
    proposal = `"${String(instance)}"`;
  }
  return [Proposal.ofLabel(proposal, type.toString())];
}

/**
 * Utility class providing basic mechanisms for layout option content assist.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutDataContentAssist.java
 */
export class LayoutDataContentAssist {
  /** Container with proposal information. */
  static readonly Proposal: typeof Proposal = Proposal;

  private constructor() {}

  /**
   * @returns a list of layout option proposals where the layout options' ids match `prefix` and are applicable to
   *          `element`.
   */
  static getLayoutOptionProposals(element: ElkGraphElement | null, prefix: string): Array<Proposal<LayoutOptionData>> {
    const responsibleAlgorithm = LayoutDataContentAssist.getAlgorithm(element);
    if (isElkNode(element)) {
      const targets: TargetTypes = element.getChildren().isEmpty()
        ? [LayoutOptionDataTarget.NODES]
        : [LayoutOptionDataTarget.NODES, LayoutOptionDataTarget.PARENTS];
      return getLayoutOptionProposalsForTargets(element, responsibleAlgorithm, targets, prefix);
    } else if (isElkEdge(element)) {
      return getLayoutOptionProposalsForTargets(element, responsibleAlgorithm, [LayoutOptionDataTarget.EDGES], prefix);
    } else if (isElkPort(element)) {
      return getLayoutOptionProposalsForTargets(element, responsibleAlgorithm, [LayoutOptionDataTarget.PORTS], prefix);
    } else if (isElkLabel(element)) {
      return getLayoutOptionProposalsForTargets(element, responsibleAlgorithm, [LayoutOptionDataTarget.LABELS], prefix);
    }

    return [];
  }

  /** @returns a list of layout algorithm proposals where the layout algorithms' ids match `prefix`. */
  static getLayoutAlgorithmProposals(prefix: string): Array<Proposal<LayoutAlgorithmData>> {
    const service = LayoutMetaDataService.getInstance();
    return service
      .getAlgorithmData()
      .map((o) => matchesPrefix(o, (suffix) => service.getAlgorithmDataBySuffix(suffix), prefix))
      .filter((p): p is Proposal<LayoutAlgorithmData> => p !== null);
  }

  /**
   * Java name `getLayoutOptionValueProposal` (singular), kept verbatim.
   *
   * @returns a list of layout option value proposals, where the layout `option`'s value matches `prefix`.
   */
  static getLayoutOptionValueProposal(option: LayoutOptionData, _prefix: string): Array<Proposal<unknown>> {
    const type = option.getType() as LayoutOptionDataType;
    switch (type) {
      case LayoutOptionDataType.BOOLEAN:
      case LayoutOptionDataType.ENUM:
      case LayoutOptionDataType.ENUMSET:
        return choiceProposals(option);
      case LayoutOptionDataType.DOUBLE:
      case LayoutOptionDataType.INT:
        return numberProposals(option, type);
      case LayoutOptionDataType.OBJECT:
        return objectProposals(option, type);
      default:
        // nothing to add
        return [];
    }
  }

  /**
   * @returns the algorithm that is responsible for the layout of the given element. Note that this might be
   *          ambiguous: e.g. a port of a composite node can be handled both by the algorithm that arranges that node
   *          and the algorithm that arranges its container node.
   */
  static getAlgorithm(element: ElkGraphElement | null): LayoutAlgorithmData | null {
    const relevantNode = getRelevantNode(element);
    if (relevantNode !== null) {
      const algorithmId = relevantNode.getProperty(CoreOptions.ALGORITHM);
      if (!isNullOrEmpty(algorithmId)) {
        return LayoutMetaDataService.getInstance().getAlgorithmDataBySuffix(algorithmId);
      }
    }
    return null;
  }
}
