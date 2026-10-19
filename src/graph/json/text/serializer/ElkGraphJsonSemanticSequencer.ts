// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../../../emf/common/util/EList.js';
import { BasicEList } from '../../../../emf/common/util/BasicEList.js';
import type { EObject } from '../../../../emf/ecore/EObject.js';
import type { InternalEObject } from '../../../../emf/ecore/InternalEObject.js';
import { LinkedList } from '../../../../java/util/LinkedList.js';
import type { ElkConnectableShape } from '../../../ElkConnectableShape.js';
import type { ElkEdge } from '../../../ElkEdge.js';
import type { ElkLabel } from '../../../ElkLabel.js';
import type { ElkNode } from '../../../ElkNode.js';
import type { ElkPort } from '../../../ElkPort.js';
import type { ElkShape } from '../../../ElkShape.js';
import type { ElkPropertyToValueMapEntryImpl } from '../../../impl/ElkPropertyToValueMapEntryImpl.js';
import { ElkGraphJsonRuleName } from '../conversion/ElkGraphJsonValueConverterService.js';
import { ELK_EDGE__SOURCES, ELK_EDGE__TARGETS } from '../linking/ElkGraphJsonReferences.js';
import { ElkGraphJsonSerializationError } from './ElkGraphJsonSerializationError.js';
import {
  BLOCK_IDS,
  IDENTIFIER_IDS,
  OBJECT_IDS,
  PROPERTY_IDS,
  SHAPE_IDS,
  TEXT_IDS,
  type BlockIds,
  type MemberIds,
  type ObjectIds,
} from './ElkGraphJsonRuleIds.js';
import { KeyToken, Kw } from './ElkGraphJsonSyntacticSequencer.js';
import type { ElkGraphJsonTokenWriter } from './ElkGraphJsonTokenWriter.js';
import {
  ElkFeature,
  ElkGraphJsonTransientValueService,
  ListTransient,
  ValueTransient,
} from './ElkGraphJsonTransientValueService.js';

/** The TS counterpart of the elements one `(',' Element)*` loop writes: each writes its tokens when called. */
type Element = () => void;

const TERMINAL_STRING = 'STRING';

/** The shape coordinates in the order of `ShapeElement`'s alternatives. */
const SHAPE_FEATURES = [
  [ElkFeature.X, SHAPE_IDS.x],
  [ElkFeature.Y, SHAPE_IDS.y],
  [ElkFeature.WIDTH, SHAPE_IDS.width],
  [ElkFeature.HEIGHT, SHAPE_IDS.height],
] as const;

const SHAPE_GETTERS: Readonly<Record<string, (shape: ElkShape) => number>> = {
  [ElkFeature.X]: (s) => s.getX(),
  [ElkFeature.Y]: (s) => s.getY(),
  [ElkFeature.WIDTH]: (s) => s.getWidth(),
  [ElkFeature.HEIGHT]: (s) => s.getHeight(),
};

/** A reference list of an edge, in the shape the sequencer reads it: by position, resolved or not. */
type ReferenceList = EList<ElkConnectableShape>;

/**
 * The semantic sequencer of the ELK graph JSON language, one method per grammar rule that has assignments
 * (`ElkNode`, `ElkPort`, `ElkLabel`, `ElkEdge`, `Property`). ELK's `ElkGraphJsonSemanticSequencer` is an empty
 * extension of the generated `AbstractElkGraphJsonSemanticSequencer`, whose constraint methods all delegate to
 * Xtext's `BacktrackingSemanticSequencer` (D3: its NFA search is not ported). The order its search yields is
 * reproduced instead:
 *
 * - the search takes, among the states it may enter, the one with the lowest grammar declaration order whose
 *   feature still has values, and stops as soon as everything mandatory is written; the repeated `(...)+` of the
 *   constraint re-enters the first slot of each list fragment (declared before its `(',' item)*` slot), so every
 *   list entry is written under its own key;
 * - the declaration order of the assigned elements is the order of the rules in `ElkGraphJson.xtext`: for a node
 *   `identifier`, `children`, `ports`, `containedEdges`, `labels`, `properties`, then `x`, `y`, `width`, `height`;
 *   for a port `identifier`, `labels`, `properties`, shape; for a label `text`, `identifier`, `labels`,
 *   `properties`, shape; for an edge `sources`, `targets`, `identifier`, `labels`, `properties`;
 * - unset values (a `null` identifier, a coordinate equal to `0.0`, an empty label text, an empty list) are skipped;
 * - the objects whose rule demands an element (`ElkPort`, `ElkLabel`, `ElkEdge`) and have none get the
 *   `JsonMember` rule call, which the syntactic sequencer fills with `"" :`.
 *
 * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/serializer/ElkGraphJsonSemanticSequencer.xtend
 * @see org.eclipse.elk.graph.json.text/src-gen/org/eclipse/elk/graph/json/text/serializer/AbstractElkGraphJsonSemanticSequencer.java
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/sequencer/BacktrackingSemanticSequencer.java
 */
export class ElkGraphJsonSemanticSequencer {
  constructor(
    private readonly transientValues: ElkGraphJsonTransientValueService,
    private readonly tokens: ElkGraphJsonTokenWriter,
  ) {}

  /** `ISemanticSequencer.createSequence(context, root)`: the root is serialised by the `ElkNode` rule. */
  createSequence(root: ElkNode): void {
    this.sequence_ElkNode(root);
  }

  /** Constraint: `(identifier | children | ports | labels | containedEdges | properties | x | y | width | height)*`. */
  sequence_ElkNode(node: ElkNode): void {
    const elements = [
      ...this.identifier(node),
      ...this.contained(node, ElkFeature.CHILDREN, node.getChildren(), BLOCK_IDS.children, (c) =>
        this.sequence_ElkNode(c),
      ),
      ...this.contained(node, ElkFeature.PORTS, node.getPorts(), BLOCK_IDS.ports, (p) => this.sequence_ElkPort(p)),
      ...this.contained(node, ElkFeature.CONTAINED_EDGES, node.getContainedEdges(), BLOCK_IDS.containedEdges, (e) =>
        this.sequence_ElkEdge(e),
      ),
      ...this.labels(node, node.getLabels(), BLOCK_IDS.nodeLabels),
      ...this.properties(node, BLOCK_IDS.nodeProperties),
      ...this.shape(node),
    ];
    this.object(node, OBJECT_IDS.node, elements);
  }

  /** Constraint: `(identifier | labels | properties | x | y | width | height)+`. */
  sequence_ElkPort(port: ElkPort): void {
    const elements = [
      ...this.identifier(port),
      ...this.labels(port, port.getLabels(), BLOCK_IDS.portLabels),
      ...this.properties(port, BLOCK_IDS.portProperties),
      ...this.shape(port),
    ];
    this.object(port, OBJECT_IDS.port, elements);
  }

  /** Constraint: `(text | identifier | labels | properties | x | y | width | height)+`. */
  sequence_ElkLabel(label: ElkLabel): void {
    const elements = [
      ...this.text(label),
      ...this.identifier(label),
      ...this.labels(label, label.getLabels(), BLOCK_IDS.labelLabels),
      ...this.properties(label, BLOCK_IDS.labelProperties),
      ...this.shape(label),
    ];
    this.object(label, OBJECT_IDS.label, elements);
  }

  /**
   * Constraint: `(sources | targets | identifier | labels | properties)+`. `sections` has no assignment: the
   * constraint bounds it to zero values, so an edge with sections cannot be written.
   */
  sequence_ElkEdge(edge: ElkEdge): void {
    this.rejectSections(edge);
    const elements = [
      ...this.references(edge, ElkFeature.SOURCES, edge.getSources(), BLOCK_IDS.sources),
      ...this.references(edge, ElkFeature.TARGETS, edge.getTargets(), BLOCK_IDS.targets),
      ...this.identifier(edge),
      ...this.labels(edge, edge.getLabels(), BLOCK_IDS.edgeLabels),
      ...this.properties(edge, BLOCK_IDS.edgeProperties),
    ];
    this.object(edge, OBJECT_IDS.edge, elements);
  }

  /**
   * Constraint: `key=PropertyKey (value=StringValue | value=NumberValue | value=BooleanValue)`. The three value
   * rules share one converter, and `ValueSerializer.isValid` only asks the converter, so the first alternative
   * takes every value. A `List` value is read by the search as several values of the one-valued feature: with other
   * than one element the search cannot consume them all, which is the recorded "is not allowed to have a value".
   */
  sequence_Property(entry: ElkPropertyToValueMapEntryImpl): void {
    this.tokens.value(PROPERTY_IDS.key, ElkGraphJsonRuleName.PROPERTY_KEY, entry.getTypedKey(), entry);
    this.tokens.keyword(PROPERTY_IDS.colon, Kw.COLON, entry);
    this.tokens.value(PROPERTY_IDS.value, ElkGraphJsonRuleName.STRING_VALUE, this.singleValue(entry), entry);
  }

  /** `'{' (Element (',' Element)*)? ','? '}'`; the optional trailing comma is an ambiguity that writes nothing. */
  private object(owner: EObject, ids: ObjectIds, elements: readonly Element[]): void {
    this.tokens.keyword(ids.open, Kw.LEFT_CURLY, owner);
    if (elements.length === 0 && ids.member !== null) {
      this.tokens.ruleCall(ids.member, KeyToken.JSON_MEMBER, owner);
    }
    elements.forEach((write, i) => {
      if (i > 0) this.tokens.keyword(ids.comma, Kw.COMMA, owner);
      write();
    });
    this.tokens.keyword(ids.close, Kw.RIGHT_CURLY, owner);
  }

  private identifier(owner: ElkNode | ElkPort | ElkLabel | ElkEdge): Element[] {
    if (this.isUnset(owner, ElkFeature.IDENTIFIER)) return [];
    return [() => this.member(owner, IDENTIFIER_IDS, TERMINAL_STRING, owner.getIdentifier())];
  }

  private text(label: ElkLabel): Element[] {
    if (this.isUnset(label, ElkFeature.TEXT)) return [];
    return [() => this.member(label, TEXT_IDS, TERMINAL_STRING, label.getText())];
  }

  private shape(shape: ElkShape): Element[] {
    return SHAPE_FEATURES.filter(([feature]) => !this.isUnset(shape, feature)).map(
      ([feature, ids]) =>
        () =>
          this.member(
            shape,
            ids,
            ElkGraphJsonRuleName.NUMBER,
            (SHAPE_GETTERS[feature] as (s: ElkShape) => number)(shape),
          ),
    );
  }

  /** `Key ':' value=Rule`. */
  private member(owner: EObject, ids: MemberIds, ruleName: string, value: unknown): void {
    this.tokens.ruleCall(ids.key, ids.keyText, owner);
    this.tokens.keyword(ids.colon, Kw.COLON, owner);
    this.tokens.value(ids.value, ruleName, value, owner);
  }

  private labels(owner: ElkNode | ElkPort | ElkLabel | ElkEdge, labels: EList<ElkLabel>, ids: BlockIds): Element[] {
    return this.contained(owner, ElkFeature.LABELS, labels, ids, (l) => this.sequence_ElkLabel(l));
  }

  private properties(owner: ElkNode | ElkPort | ElkLabel | ElkEdge, ids: BlockIds): Element[] {
    if (this.isEmptyList(owner, ElkFeature.PROPERTIES)) return [];
    const entries = [...owner.getProperties().entryList()] as ElkPropertyToValueMapEntryImpl[];
    // cast: the property map creates its entries with ElkPropertyToValueMapEntryImpl (EMapPropertyHolderImpl.newEntry)
    return entries.map(
      (entry) => () =>
        this.block(owner, ids, () => this.tokens.contained(entry, ids.item, (e) => this.sequence_Property(e))),
    );
  }

  /** One block per entry of the contained list `items`: `Key ':' '[' item ']'`. */
  private contained<T extends EObject>(
    owner: EObject,
    feature: ElkFeature,
    items: Iterable<T>,
    ids: BlockIds,
    sequence: (item: T) => void,
  ): Element[] {
    if (this.isEmptyList(owner, feature)) return [];
    return [...items].map(
      (item) => () => this.block(owner, ids, () => this.tokens.contained(item, ids.item, sequence)),
    );
  }

  /** One block per entry of the reference list `list`: `Key ':' '[' <name of the target> ']'`. */
  private references(edge: ElkEdge, feature: ElkFeature, list: ReferenceList, ids: BlockIds): Element[] {
    if (this.isEmptyList(edge, feature)) return [];
    const reference = feature === ElkFeature.SOURCES ? ELK_EDGE__SOURCES : ELK_EDGE__TARGETS;
    return Array.from({ length: list.size() }, (_unused, index) => () => {
      const target = resolveTarget(list, index);
      this.block(edge, ids, () =>
        this.tokens.crossReference(
          { crossReference: ids.item, assignment: ids.assignment },
          reference,
          TERMINAL_STRING,
          edge,
          target,
        ),
      );
    });
  }

  private block(owner: EObject, ids: BlockIds, writeItem: () => void): void {
    this.tokens.ruleCall(ids.key, ids.keyText, owner);
    this.tokens.keyword(ids.colon, Kw.COLON, owner);
    this.tokens.keyword(ids.open, ids.openText, owner);
    writeItem();
    this.tokens.keyword(ids.close, ids.closeText, owner);
  }

  private singleValue(entry: ElkPropertyToValueMapEntryImpl): unknown {
    const value = entry.getValue();
    if (!(value instanceof LinkedList) && !Array.isArray(value)) return value;
    const values: unknown[] = Array.isArray(value) ? value : [...value];
    if (values.length !== 1) {
      throw new ElkGraphJsonSerializationError(
        'Could not serialize ElkPropertyToValueMapEntry:\nElkPropertyToValueMapEntry.value is not allowed to have a value, but it does.',
      );
    }
    return values[0];
  }

  private rejectSections(edge: ElkEdge): void {
    if (this.transientValues.isListTransient(edge, ElkFeature.SECTIONS) === ListTransient.YES) return;
    throw new ElkGraphJsonSerializationError(
      `Could not serialize ElkEdge:\nElkEdge.sections violates the upper bound: It holds ${edge.getSections().size()} values, but only 0 are allowed.`,
    );
  }

  /** A single-valued feature the search skips: transient (`YES`) or preferably so (`PREFERABLY`). */
  private isUnset(owner: EObject, feature: ElkFeature): boolean {
    return this.transientValues.isValueTransient(owner, feature) !== ValueTransient.NO;
  }

  private isEmptyList(owner: EObject, feature: ElkFeature): boolean {
    return this.transientValues.isListTransient(owner, feature) !== ListTransient.NO;
  }
}

/**
 * `CrossReferenceSerializer.handleProxy`: the entry of a reference list that is still a proxy is read through the
 * resolving list, which replaces it by the object it resolves to; one that cannot be resolved stays a proxy and then
 * has no description in any scope. (The sequencer reads `basicList()`, so it sees the proxies a lazily linked
 * document holds until the first read.)
 */
function resolveTarget(list: ReferenceList, index: number): ElkConnectableShape {
  // cast: the edge's reference lists are EObjectWithInverseResolvingEList, a BasicEList (ElkEdgeImpl)
  const raw = (list as unknown as BasicEList<ElkConnectableShape>).basicGet(index);
  return (raw as unknown as InternalEObject).eIsProxy() ? list.get(index) : raw;
}
