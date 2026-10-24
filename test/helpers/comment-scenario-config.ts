// SPDX-License-Identifier: EPL-2.0
// Builds a CommentAttacher from a scenario configuration (vocabulary: header of tools/vectors/CommentVectors.java)
// and reads attachments back from a graph, mirroring the recorder.
import { AbstractNormalizedMatcherNormalizationFunction } from '../../src/core/comments/AbstractNormalizedMatcherNormalizationFunction.js';
import { AggregatedMatchDecider } from '../../src/core/comments/AggregatedMatchDecider.js';
import type { Aggregator } from '../../src/core/comments/AggregatedMatchDecider.js';
import { AlignmentMatcher } from '../../src/core/comments/AlignmentMatcher.js';
import { CommentAttacher } from '../../src/core/comments/CommentAttacher.js';
import { DistanceMatcher } from '../../src/core/comments/DistanceMatcher.js';
import { ElkGraphBoundsProvider } from '../../src/core/comments/ElkGraphBoundsProvider.js';
import { ElkGraphDataProvider } from '../../src/core/comments/ElkGraphDataProvider.js';
import type { IBoundsProvider } from '../../src/core/comments/IBoundsProvider.js';
import type { IDataProvider } from '../../src/core/comments/IDataProvider.js';
import { IExplicitAttachmentProvider } from '../../src/core/comments/IExplicitAttachmentProvider.js';
import type { IFilter } from '../../src/core/comments/IFilter.js';
import type { IMatcher } from '../../src/core/comments/IMatcher.js';
import { NodeReferenceMatcher } from '../../src/core/comments/NodeReferenceMatcher.js';
import { SizeFilter } from '../../src/core/comments/SizeFilter.js';
import { TextPrefixFilter } from '../../src/core/comments/TextPrefixFilter.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { trim } from '../../src/java/lang/JavaString.js';

const EXPLICIT_NONE = 'none';
const EXPLICIT_PREFIX = 'byLabelPrefix:';

export type NormalizationName = 'LINEAR' | 'BINARY';

export type FilterSpec =
  | { readonly type: 'SizeFilter'; readonly maxArea: number }
  | {
      readonly type: 'TextPrefixFilter';
      readonly prefixes: readonly string[];
      readonly caseSensitive: boolean;
      readonly requiredForEligibility: boolean;
    };

export type MatcherSpec =
  | { readonly type: 'DistanceMatcher'; readonly maxDistance: number; readonly normalization: NormalizationName }
  | { readonly type: 'AlignmentMatcher'; readonly maxOffset: number; readonly normalization: NormalizationName }
  | { readonly type: 'NodeReferenceMatcher'; readonly fuzzy: boolean; readonly maxDistance: number };

export interface ScenarioConfig {
  readonly includeHierarchy: boolean;
  readonly keepHeuristicsEnabledWithExplicitAttachments: boolean;
  readonly explicit: string;
  readonly boundsProvider: { readonly type: 'ElkGraphBoundsProvider'; readonly cached: boolean };
  readonly filters: readonly FilterSpec[];
  readonly matchers: readonly MatcherSpec[];
  readonly decider: {
    readonly aggregator: 'max' | 'min' | 'avg' | 'sum';
    readonly lowerBoundary: number;
    readonly included: boolean;
  };
}

export interface BuiltAttacher {
  readonly attacher: CommentAttacher<ElkNode, ElkNode>;
  /** The only data provider the recorder uses: `new ElkGraphDataProvider(root).cached()`. */
  readonly createDataProvider: (root: ElkNode) => IDataProvider<ElkNode, ElkNode>;
}

const AGGREGATORS: Readonly<Record<ScenarioConfig['decider']['aggregator'], Aggregator>> = {
  max: (values) => AggregatedMatchDecider.max(values),
  min: (values) => AggregatedMatchDecider.min(values),
  avg: (values) => AggregatedMatchDecider.avg(values),
  sum: (values) => AggregatedMatchDecider.sum(values),
};

/** Text of the node's first label, null when it has none. */
export function firstLabel(node: ElkNode): string | null {
  const labels = node.getLabels();
  return labels.isEmpty() ? null : labels.get(0).getText();
}

class LabelPrefixExplicitProvider extends IExplicitAttachmentProvider<ElkNode, ElkNode> {
  constructor(private readonly prefix: string) {
    super();
  }

  override findExplicitAttachment(comment: ElkNode): ElkNode | null {
    const text = firstLabel(comment);
    if (text === null || !text.startsWith(this.prefix)) {
      return null;
    }
    const id = trim(text.substring(this.prefix.length));
    for (const sibling of (comment.getParent() as ElkNode).getChildren()) {
      if (sibling !== comment && id === sibling.getIdentifier()) {
        return sibling;
      }
    }
    return null;
  }
}

function buildFilter(spec: FilterSpec, bounds: IBoundsProvider<ElkNode, ElkNode>): IFilter<ElkNode> {
  if (spec.type === 'SizeFilter') {
    return new SizeFilter<ElkNode>().withBoundsProvider(bounds).withMaximumArea(spec.maxArea);
  }
  const filter = new TextPrefixFilter<ElkNode>().withCommentTextProvider((node) => firstLabel(node) as string);
  for (const prefix of spec.prefixes) {
    filter.addPrefix(prefix);
  }
  if (spec.caseSensitive) {
    filter.withCaseSensitiveMatching();
  }
  if (spec.requiredForEligibility) {
    filter.withPrefixMatchRequiredForEligibility();
  }
  return filter;
}

function normalization(name: NormalizationName): AbstractNormalizedMatcherNormalizationFunction {
  return AbstractNormalizedMatcherNormalizationFunction.valueOf(name);
}

function buildMatcher(spec: MatcherSpec, bounds: IBoundsProvider<ElkNode, ElkNode>): IMatcher<ElkNode, ElkNode> {
  switch (spec.type) {
    case 'DistanceMatcher':
      return new DistanceMatcher<ElkNode, ElkNode>()
        .withBoundsProvider(bounds)
        .withMaximumAttachmentDistance(spec.maxDistance)
        .withNormalizationFunction(normalization(spec.normalization));
    case 'AlignmentMatcher':
      return new AlignmentMatcher<ElkNode, ElkNode>()
        .withBoundsProvider(bounds)
        .withMaximumAlignmentOffset(spec.maxOffset)
        .withNormalizationFunction(normalization(spec.normalization));
    case 'NodeReferenceMatcher': {
      const matcher = new NodeReferenceMatcher<ElkNode, ElkNode>()
        .withBoundsProvider(bounds)
        .withCommentTextProvider(firstLabel)
        .withTargetNameProvider(firstLabel)
        .withMaximumAttachmentDistance(spec.maxDistance);
      return spec.fuzzy ? matcher.withFuzzyMatching() : matcher;
    }
  }
}

/** Builds the attacher the recorder builds for `config`. */
export function buildCommentAttacher(config: ScenarioConfig): BuiltAttacher {
  const attacher = new CommentAttacher<ElkNode, ElkNode>();
  attacher.limitToCurrentHierarchyLevel(!config.includeHierarchy);
  attacher.keepHeuristicsEnabledWithExplicitAttachments(config.keepHeuristicsEnabledWithExplicitAttachments);
  if (config.explicit !== EXPLICIT_NONE && config.explicit.startsWith(EXPLICIT_PREFIX)) {
    attacher.withExplicitAttachmentProvider(
      new LabelPrefixExplicitProvider(config.explicit.substring(EXPLICIT_PREFIX.length)),
    );
  }
  const base = new ElkGraphBoundsProvider();
  const bounds: IBoundsProvider<ElkNode, ElkNode> = config.boundsProvider.cached ? base.cached() : base;
  attacher.withBoundsProvider(bounds);
  for (const filter of config.filters) {
    attacher.addFilter(buildFilter(filter, bounds));
  }
  for (const matcher of config.matchers) {
    attacher.addMatcher(buildMatcher(matcher, bounds));
  }
  attacher.withAttachmentDecider(
    new AggregatedMatchDecider<ElkNode>()
      .withAggregator(AGGREGATORS[config.decider.aggregator])
      .withLowerAttachmentBoundary(config.decider.lowerBoundary)
      .withLowerBoundaryIncluded(config.decider.included),
  );
  return { attacher, createDataProvider: (root) => new ElkGraphDataProvider(root).cached() };
}

/** Reads the created edges back as `[commentId, targetId]` pairs sorted in String (UTF-16) order. */
export function readAttachments(root: ElkNode): [string, string][] {
  const pairs: [string, string][] = [];
  const todo: ElkNode[] = [root];
  for (let node = todo.shift(); node !== undefined; node = todo.shift()) {
    for (const edge of node.getOutgoingEdges()) {
      pairs.push([
        (edge.getSources().get(0) as ElkNode).getIdentifier() as string,
        (edge.getTargets().get(0) as ElkNode).getIdentifier() as string,
      ]);
    }
    todo.push(...node.getChildren());
  }
  const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  return pairs.sort((p, q) => compare(p[0], q[0]) || compare(p[1], q[1]));
}
