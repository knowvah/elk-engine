// SPDX-License-Identifier: EPL-2.0
import { CoreOptions } from '../../core/options/CoreOptions.js';
import type { EdgeCoords } from '../../core/options/EdgeCoords.js';
import type { ShapeCoords } from '../../core/options/ShapeCoords.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { IndividualSpacings } from '../../core/util/IndividualSpacings.js';
import type { JsonArray } from '../../gson/JsonArray.js';
import type { JsonObject } from '../../gson/JsonObject.js';
import { type BiMap, HashBiMap } from '../../guava/HashBiMap.js';
import { newHashMap } from '../../guava/Maps.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { identityHashCode } from '../../java/lang/IdentityHashCode.js';
import { type HashStrategy, INTEGER, STRING, hashable } from '../../java/util/HashStrategy.js';
import type { JavaHashMap } from '../../java/util/JavaHashMap.js';
import type { ElkEdge } from '../ElkEdge.js';
import type { ElkEdgeSection } from '../ElkEdgeSection.js';
import type { ElkGraphElement } from '../ElkGraphElement.js';
import type { ElkLabel } from '../ElkLabel.js';
import { type ElkNode, isElkNode } from '../ElkNode.js';
import { type ElkPort, isElkPort } from '../ElkPort.js';
import type { ElkShape } from '../ElkShape.js';
import { isElkEdgeSection } from '../ElkEdgeSection.js';
import type { IPropertyHolder } from '../properties/IPropertyHolder.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { JsonAdapter } from './JsonAdapter.js';
import { transformEdges } from './JsonImporterEdges.js';

const CHILDREN_KEY = 'children';
const PORTS_KEY = 'ports';
const LABELS_KEY = 'labels';
const TEXT_KEY = 'text';
const ID_KEY = 'id';
const LAYOUT_OPTIONS_KEY = 'layoutOptions';
const LEGACY_PROPERTIES_KEY = 'properties';
const INDIVIDUAL_SPACINGS_KEY = 'individualSpacings';
const X_KEY = 'x';
const Y_KEY = 'y';
const WIDTH_KEY = 'width';
const HEIGHT_KEY = 'height';

/** A json id as the Xtend `Object` key: a string, an `Integer` (from `asId`), or null (a `HashMap` lookup of a missing optional id). */
export type JsonId = string | number | null;

/** `String.hashCode` / `Integer.hashCode`; `equals` is false across the two types, as in Java. */
const ID_STRATEGY: HashStrategy<JsonId> = {
  hash: (k) => (k === null ? 0 : typeof k === 'string' ? STRING.hash(k) : INTEGER.hash(k)),
  equals: (a, b) => a === b,
};

/** The ElkGraph classes do not override `hashCode`/`equals`: identity (AD-10). */
function identity<K extends object>(): HashStrategy<K> {
  return { hash: (k) => identityHashCode(k), equals: (a, b) => a === b };
}

/**
 * The members of {@link JsonImporter} that the Xtend sections split off into `JsonImporterEdges.ts` and
 * `JsonImporterLayoutTransfer.ts` (J3) use: the Xtend fields in declaration order, then the helpers those
 * sections call. Module-private to `src/graph/json`: not re-exported from the index.
 */
export interface JsonImporterState {
  readonly adapter: JsonAdapter;

  /* Id -> ElkGraph element maps. Id can be string or integer. */
  readonly nodeIdMap: BiMap<JsonId, ElkNode>;
  readonly portIdMap: BiMap<JsonId, ElkPort>;
  readonly edgeIdMap: JavaHashMap<JsonId, ElkEdge>;
  readonly edgeSectionIdMap: BiMap<JsonId, ElkEdgeSection>;

  /* ElkGraph element -> Json element maps */
  readonly nodeJsonMap: BiMap<ElkNode, JsonObject>;
  readonly portJsonMap: Map<ElkPort, JsonObject>;
  readonly edgeJsonMap: Map<ElkEdge, JsonObject>;
  readonly edgeSectionJsonMap: Map<ElkEdgeSection, JsonObject>;
  readonly labelJsonMap: Map<ElkLabel, JsonObject>;

  /* Maps to help in adjusting coordinates */
  readonly edgeOriginalParentMap: Map<ElkEdge, ElkNode | null>;
  readonly globalXMap: Map<ElkShape, number>;
  readonly globalYMap: Map<ElkShape, number>;
  readonly shapeCoordsMap: Map<ElkGraphElement, ShapeCoords>;
  readonly edgeCoordsMap: Map<ElkGraphElement, EdgeCoords>;

  inputModel: unknown;

  /** The node or, failing that, the port registered under `id`; throws a format error if there is none. */
  shapeById(id: unknown): ElkNode | ElkPort;
  /** Java `idByElement`: dispatch on node, port, edge section; anything else (null) is unhandled. */
  idByElement(element: unknown): JsonId | undefined;
  /** Java `register(ElkEdge, Object)`. */
  registerEdge(edge: ElkEdge, obj: unknown): ElkEdge;
  /** Java `register(ElkEdgeSection, Object)`. */
  registerEdgeSection(edgeSection: ElkEdgeSection, obj: unknown): ElkEdgeSection;
  transformProperties(jsonObjA: unknown, layoutData: IPropertyHolder): void;
  transformLabels(jsonObjA: unknown, element: ElkGraphElement): void;
  transformShapeLayout(jsonObjA: unknown, shape: ElkShape): void;
}

/**
 * Importer from json to elk graph. Internally it maintains a mapping that can be used to transfer any computed
 * layout information to the original json.
 *
 * The edge section (Xtend 148-425; T14) and layout transfer (Xtend 549-741 and 797-864; T16) parts live in
 * sibling files over {@link JsonImporterState} (J3); `transform` calls `transformEdges` from
 * `JsonImporterEdges.ts`.
 *
 * @see org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonImporter.xtend
 */
export class JsonImporter implements JsonImporterState {
  readonly adapter: JsonAdapter = new JsonAdapter();

  /* Id -> ElkGraph element maps. Id can be string or integer. */
  readonly nodeIdMap: BiMap<JsonId, ElkNode> = HashBiMap.create(ID_STRATEGY, identity<ElkNode>());
  readonly portIdMap: BiMap<JsonId, ElkPort> = HashBiMap.create(ID_STRATEGY, identity<ElkPort>());
  readonly edgeIdMap: JavaHashMap<JsonId, ElkEdge> = newHashMap(ID_STRATEGY);
  readonly edgeSectionIdMap: BiMap<JsonId, ElkEdgeSection> = HashBiMap.create(ID_STRATEGY, identity<ElkEdgeSection>());

  /* ElkGraph element -> Json element maps (json objects are keyed by structural equality) */
  readonly nodeJsonMap: BiMap<ElkNode, JsonObject> = HashBiMap.create(identity<ElkNode>(), hashable<JsonObject>());
  readonly portJsonMap = new Map<ElkPort, JsonObject>();
  readonly edgeJsonMap = new Map<ElkEdge, JsonObject>();
  readonly edgeSectionJsonMap = new Map<ElkEdgeSection, JsonObject>();
  readonly labelJsonMap = new Map<ElkLabel, JsonObject>();

  /* Maps to help in adjusting coordinates */
  readonly edgeOriginalParentMap = new Map<ElkEdge, ElkNode | null>();
  readonly globalXMap = new Map<ElkShape, number>();
  readonly globalYMap = new Map<ElkShape, number>();
  readonly shapeCoordsMap = new Map<ElkGraphElement, ShapeCoords>();
  readonly edgeCoordsMap = new Map<ElkGraphElement, EdgeCoords>();

  inputModel: unknown = null;

  /* ---------------------------------------------------------------------------
   *   JSON --> ElkGraph
   */
  /**
   * Main entry point for the json to ELK graph transformation. Runs through all elements of the graph (nodes,
   * ports, edges, edge sections) and creates correlating ELK graph elements.
   */
  transform(graph: unknown): ElkNode {
    this.inputModel = graph;
    this.clearMaps();

    // transform the root node along with its children
    const root = this.transformNode(graph, null);

    // transform all edges
    transformEdges(this, graph);

    // return the transformed ELK graph
    return root;
  }

  getInputModel(): unknown {
    return this.inputModel;
  }

  private clearMaps(): void {
    this.nodeIdMap.clear();
    this.portIdMap.clear();
    this.edgeIdMap.clear();
    this.edgeSectionIdMap.clear();

    this.nodeJsonMap.clear();
    this.portJsonMap.clear();
    this.edgeJsonMap.clear();
    this.edgeSectionJsonMap.clear();
    this.labelJsonMap.clear();

    this.edgeOriginalParentMap.clear();
    this.globalXMap.clear();
    this.globalYMap.clear();
    this.shapeCoordsMap.clear();
    this.edgeCoordsMap.clear();
  }

  private transformChildNodes(jsonNodeA: unknown, parent: ElkNode): void {
    const jsonNode = this.adapter.toJsonObject(jsonNodeA) as JsonObject;
    const children = this.adapter.optJSONArray(jsonNode, CHILDREN_KEY);
    if (children !== null) {
      for (let i = 0; i < this.adapter.sizeJsonArr(children); i++) {
        const child = this.adapter.optJSONObject(children, i);
        if (child !== null) this.transformNode(child, parent);
      }
    }
  }

  private transformNode(jsonNode: unknown, parent: ElkNode | null): ElkNode {
    // create an ElkNode and add it to the parent
    const node = this.registerNode(ElkGraphUtil.createNode(parent), jsonNode);
    node.setIdentifier(this.adapter.getIdSave(this.adapter.toJsonObject(jsonNode) as JsonObject));

    this.transformProperties(jsonNode, node);
    this.transformIndividualSpacings(jsonNode, node);
    this.transformShapeLayout(jsonNode, node);
    this.transformPorts(jsonNode, node);
    this.transformLabels(jsonNode, node);
    this.transformChildNodes(jsonNode, node);

    return node;
  }

  transformProperties(jsonObjA: unknown, layoutData: IPropertyHolder): void {
    const jsonObj = this.adapter.toJsonObject(jsonObjA) as JsonObject;

    let layoutOptions = this.adapter.optJSONObject(jsonObj, LAYOUT_OPTIONS_KEY);
    if (layoutOptions === null) {
      // legacy support
      layoutOptions = this.adapter.optJSONObject(jsonObj, LEGACY_PROPERTIES_KEY);
    }

    if (layoutOptions !== null) {
      this.setOptions(layoutOptions, layoutData);
    }
  }

  private transformIndividualSpacings(jsonObjA: unknown, layoutData: IPropertyHolder): void {
    const jsonObj = this.adapter.toJsonObject(jsonObjA) as JsonObject;

    const jsonIndividualSpacings = this.adapter.optJSONObject(jsonObj, INDIVIDUAL_SPACINGS_KEY);
    if (jsonIndividualSpacings !== null) {
      if (!layoutData.hasProperty(CoreOptions.SPACING_INDIVIDUAL)) {
        layoutData.setProperty(CoreOptions.SPACING_INDIVIDUAL, new IndividualSpacings());
      }
      const individualSpacings = layoutData.getProperty(CoreOptions.SPACING_INDIVIDUAL);
      this.setOptions(jsonIndividualSpacings, individualSpacings);
    }
  }

  /** The `opts.keysJsonObj.forEach[ k | e.setOption(k, opts.getJsonObj(k)?.stringVal) ]` loop of both option sections. */
  private setOptions(opts: JsonObject, e: IPropertyHolder): void {
    for (const k of this.adapter.keysJsonObj(opts)) {
      const element = this.adapter.getJsonObj(opts, k);
      const value = element === null ? null : this.adapter.stringVal(element);
      this.setOption(e, k, value);
    }
  }

  private setOption(e: IPropertyHolder, id: string, value: string | null): void {
    const optionData = LayoutMetaDataService.getInstance().getOptionDataBySuffix(id);
    if (optionData !== null) {
      const parsed = optionData.parseValue(value);
      if (parsed !== null) {
        e.setProperty(optionData, parsed);
      }
    }
  }

  transformLabels(jsonObjA: unknown, element: ElkGraphElement): void {
    const jsonObj = this.adapter.toJsonObject(jsonObjA) as JsonObject;
    const labels = this.adapter.optJSONArray(jsonObj, LABELS_KEY);
    if (labels !== null) {
      for (let i = 0; i < this.adapter.sizeJsonArr(labels); i++) {
        const jsonLabel = this.adapter.optJSONObject(labels, i);
        if (jsonLabel !== null) {
          this.transformLabel(jsonLabel, element);
        }
      }
    }
  }

  /** The body of the `jsonLabel !== null` branch of `transformLabels`. */
  private transformLabel(jsonLabel: JsonObject, element: ElkGraphElement): void {
    const label = ElkGraphUtil.createLabelWithText(this.adapter.optString(jsonLabel, TEXT_KEY), element);
    this.labelJsonMap.set(label, jsonLabel);
    if (this.adapter.hasJsonObj(jsonLabel, ID_KEY)) {
      label.setIdentifier(this.adapter.getIdSave(jsonLabel));
    }

    this.transformProperties(jsonLabel, label);
    this.transformShapeLayout(jsonLabel, label);
  }

  private transformPorts(jsonObjA: unknown, parent: ElkNode): void {
    const jsonObj = this.adapter.toJsonObject(jsonObjA) as JsonObject;
    const ports: JsonArray | null = this.adapter.optJSONArray(jsonObj, PORTS_KEY);
    if (ports !== null) {
      for (let i = 0; i < this.adapter.sizeJsonArr(ports); i++) {
        const port = this.adapter.optJSONObject(ports, i);
        if (port !== null) this.transformPort(port, parent);
      }
    }
  }

  private transformPort(jsonPort: unknown, parent: ElkNode): void {
    // create ElkPort
    const port = this.registerPort(ElkGraphUtil.createPort(parent), jsonPort);
    port.setIdentifier(this.adapter.getIdSave(this.adapter.toJsonObject(jsonPort) as JsonObject));

    // transform things
    this.transformProperties(jsonPort, port);
    this.transformShapeLayout(jsonPort, port);
    this.transformLabels(jsonPort, port);
  }

  transformShapeLayout(jsonObjA: unknown, shape: ElkShape): void {
    const jsonObj = this.adapter.toJsonObject(jsonObjA) as JsonObject;
    shape.setX(this.doubleValueValid(this.adapter.optDouble(jsonObj, X_KEY)));
    shape.setY(this.doubleValueValid(this.adapter.optDouble(jsonObj, Y_KEY)));
    shape.setWidth(this.doubleValueValid(this.adapter.optDouble(jsonObj, WIDTH_KEY)));
    shape.setHeight(this.doubleValueValid(this.adapter.optDouble(jsonObj, HEIGHT_KEY)));
  }

  private doubleValueValid(d: number | null): number {
    if (d === null || d === Infinity || d === -Infinity || Number.isNaN(d)) {
      return 0.0;
    } else {
      return d;
    }
  }

  shapeById(id: unknown): ElkNode | ElkPort {
    const node = this.nodeIdMap.get(id as JsonId);
    if (node !== undefined) {
      return node;
    }
    const port = this.portIdMap.get(id as JsonId);
    if (port !== undefined) {
      return port;
    }
    throw this.adapter.formatError(`Referenced shape does not exist: ${String(id)}`);
  }

  /* ---------------------------------------------------------------------------
   *   ElkGraph positions -> Json: layout transfer (JsonImporterLayoutTransfer.ts, T16)
   */

  /** The Xtend `dispatch idByElement` over node, port and edge section (`ElkGraphUtil` shapes). */
  idByElement(element: unknown): JsonId | undefined {
    if (isElkNode(element)) {
      return this.nodeIdMap.inverse().get(element);
    } else if (isElkPort(element)) {
      return this.portIdMap.inverse().get(element);
    } else if (isElkEdgeSection(element)) {
      return this.edgeSectionIdMap.inverse().get(element);
    }
    throw new IllegalArgumentException(`Unhandled parameter types: [${String(element)}]`);
  }

  /* ---------------------------------------------------------------------------
   *                            Convenience methods
   * ---------------------------------------------------------------------------
   */

  /** Java `register(ElkNode, Object)`. */
  private registerNode(node: ElkNode, obj: unknown): ElkNode {
    const json = this.adapter.toJsonObject(obj) as JsonObject;
    const id = this.adapter.getId(json);

    this.nodeIdMap.put(id, node);
    this.nodeJsonMap.put(node, json);

    return node;
  }

  /** Java `register(ElkPort, Object)`. */
  private registerPort(port: ElkPort, obj: unknown): ElkPort {
    const json = this.adapter.toJsonObject(obj) as JsonObject;
    const id = this.adapter.getId(json);

    this.portIdMap.put(id, port);
    this.portJsonMap.set(port, json);

    return port;
  }

  registerEdge(edge: ElkEdge, obj: unknown): ElkEdge {
    const json = this.adapter.toJsonObject(obj) as JsonObject;
    const id = this.adapter.getId(json);

    this.edgeIdMap.put(id, edge);
    this.edgeJsonMap.set(edge, json);
    this.edgeOriginalParentMap.set(edge, edge.getContainingNode());

    return edge;
  }

  registerEdgeSection(edgeSection: ElkEdgeSection, obj: unknown): ElkEdgeSection {
    const json = this.adapter.toJsonObject(obj) as JsonObject;
    const id = this.adapter.getId(json);

    this.edgeSectionIdMap.put(id, edgeSection);
    this.edgeSectionJsonMap.set(edgeSection, json);

    return edgeSection;
  }
}
