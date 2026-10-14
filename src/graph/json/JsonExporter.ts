// SPDX-License-Identifier: EPL-2.0
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { JsonObject } from '../../gson/JsonObject.js';
import { HashBiMap } from '../../guava/HashBiMap.js';
import type { BiMap } from '../../guava/HashBiMap.js';
import * as Splitter from '../../guava/Splitter.js';
import { isNullOrEmpty } from '../../guava/Strings.js';
import * as DoubleToString from '../../java/lang/DoubleToString.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { identityHashCode } from '../../java/lang/IdentityHashCode.js';
import { STRING } from '../../java/util/HashStrategy.js';
import type { HashStrategy } from '../../java/util/HashStrategy.js';
import { Random } from '../../java/util/Random.js';
import type { ElkConnectableShape } from '../ElkConnectableShape.js';
import type { ElkEdge } from '../ElkEdge.js';
import type { ElkEdgeSection } from '../ElkEdgeSection.js';
import { isElkEdgeSection } from '../ElkEdgeSection.js';
import type { ElkLabel } from '../ElkLabel.js';
import type { ElkNode } from '../ElkNode.js';
import { isElkNode } from '../ElkNode.js';
import type { ElkPort } from '../ElkPort.js';
import { isElkPort } from '../ElkPort.js';
import type { ElkShape } from '../ElkShape.js';
import type { IProperty } from '../properties/IProperty.js';
import type { IPropertyHolder } from '../properties/IPropertyHolder.js';
import { JsonAdapter } from './JsonAdapter.js';
import { transformEdges } from './JsonExporterSections.js';
import type { ExporterState } from './JsonExporterSections.js';

const ID_KEY = 'id';
const LABELS_KEY = 'labels';
const LAYOUT_OPTIONS_KEY = 'layoutOptions';
const INDIVIDUAL_SPACINGS_KEY = 'individualSpacings';
const X_KEY = 'x';
const Y_KEY = 'y';
const GENERATED_ID_INFIX = '_g';
const RANDOM_BOUND = 1000000;
const RANDOM_PADDED_LENGTH = 6;
const OPTION_ID_SEPARATOR = '.';
const DOUBLE_TYPE_NAME = 'DOUBLE';

/** The Java `HashMap`/`HashBiMap` key protocol of an EMF object: `Object.hashCode()`/`equals`, i.e. identity. */
function identity<K extends object>(): HashStrategy<K> {
  return { hash: (k) => identityHashCode(k), equals: (a, b) => a === b };
}

/**
 * The text Java's `toString` gives a stored option value. A TypeScript number does not say whether it was an
 * `Integer` or a `Double`; the registered option's type decides (as in the importer's `parseValue`), any other
 * number prints as a JavaScript number.
 */
function valueText(key: IProperty<unknown>, value: unknown): string {
  if (typeof value === 'number') {
    const type = LayoutMetaDataService.getInstance().getOptionDataBySuffix(key.getId())?.getType();
    if (type?.name() === DOUBLE_TYPE_NAME) {
      return DoubleToString.toString(value);
    }
  }
  return String(value);
}

/** Java `Object.equals` of two properties, which both compare by id (D5). */
function isSpacingIndividual(key: IProperty<unknown>): boolean {
  return key.getId() === CoreOptions.SPACING_INDIVIDUAL.getId();
}

/**
 * Exporter from elk graph to json.
 *
 * J4: the `RANDOM` of the Java is the constructor parameter, so that tests can seed it (the oracle patch 0001 seeds
 * it with 1 through a system property).
 *
 * @see org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonExporter.xtend
 */
export class JsonExporter {
  private readonly adapter = new JsonAdapter();

  private readonly nodeIdMap: BiMap<ElkConnectableShape, string> = HashBiMap.create(identity(), STRING);
  private readonly portIdMap: BiMap<ElkConnectableShape, string> = HashBiMap.create(identity(), STRING);
  private readonly edgeIdMap: BiMap<ElkEdge, string> = HashBiMap.create(identity(), STRING);
  private readonly edgeSectionIdMap: BiMap<ElkEdgeSection, string> = HashBiMap.create(identity(), STRING);

  private readonly nodeJsonMap = new Map<ElkNode, unknown>();
  private readonly portJsonMap = new Map<ElkPort, unknown>();
  private readonly edgeJsonMap = new Map<ElkEdge, unknown>();
  private readonly edgeSectionJsonMap = new Map<ElkEdgeSection, unknown>();

  private nodeIdCounter = 0;
  private portIdCounter = 0;
  private edgeIdCounter = 0;
  private edgeSectionIdCounter = 0;

  // configuration
  private omitZeroPos = true;
  private omitZeroDim = true;
  private omitLayout = false;
  private shortLayoutOptionKeys = true;
  private omitUnknownLayoutOptions = true;

  /** What `JsonExporterSections` sees of this exporter (J3); closures keep the helpers private. */
  private readonly state: ExporterState = {
    adapter: this.adapter,
    nodeIdMap: this.nodeIdMap,
    portIdMap: this.portIdMap,
    nodeJsonMap: this.nodeJsonMap,
    isOmitLayout: () => this.omitLayout,
    createAndRegisterEdge: (edge) => this.createAndRegisterEdge(edge),
    createAndRegisterSection: (section) => this.createAndRegisterSection(section),
    transformLabel: (label, array) => {
      this.transformLabel(label, array);
    },
    transformProperties: (holder, parentA) => {
      this.transformProperties(holder, parentA);
    },
    idByElement: (element) => this.idByElement(element),
  };

  private readonly random: Random;

  /**
   * J4: Xtend's `val RANDOM = new Random()` (`JsonExporter.xtend:489`) as an optional parameter,
   * unseeded by default. A `new` in a default parameter value stops lizard parsing the class, so the
   * default is applied in the body.
   */
  constructor(random?: Random) {
    this.random = random ?? new Random();
  }

  setOptions(
    omitZeroPos: boolean,
    omitZeroDim: boolean,
    omitLayout: boolean,
    shortLayoutOptionKeys: boolean,
    omitUnknownLayoutOptions: boolean,
  ): void {
    this.omitZeroPos = omitZeroPos;
    this.omitZeroDim = omitZeroDim;
    this.omitLayout = omitLayout;
    this.shortLayoutOptionKeys = shortLayoutOptionKeys;
    this.omitUnknownLayoutOptions = omitUnknownLayoutOptions;
  }

  export(root: ElkNode): JsonObject {
    this.init();

    // create a tmp array
    const jsonArray = this.adapter.newJsonArray();
    // transform the root node
    this.transformNode(root, jsonArray);

    // edges (important that all nodes are already transformed!)
    transformEdges(this.state, root);

    // retrieve the result from the tmp array
    const jsonGraph = this.adapter.optJSONObject(jsonArray, 0);
    return jsonGraph!; // the root was just added at index 0
  }

  private init(): void {
    this.nodeIdMap.clear();
    this.portIdMap.clear();
    this.edgeIdMap.clear();
    this.edgeSectionIdMap.clear();
    this.nodeJsonMap.clear();
    this.portJsonMap.clear();
    this.edgeJsonMap.clear();
    this.edgeSectionJsonMap.clear();
    this.nodeIdCounter = 0;
    this.portIdCounter = 0;
    this.edgeIdCounter = 0;
    this.edgeSectionIdCounter = 0;
  }

  private transformNode(node: ElkNode, arrayA: unknown): void {
    // create the node and add it to the parent
    const jsonObj = this.createAndRegisterNode(node);
    const array = this.adapter.toJsonArray(arrayA);
    this.adapter.addJsonArr(array!, jsonObj);

    // labels
    if (!node.getLabels().isEmpty()) {
      const labels = this.adapter.newJsonArray();
      this.adapter.addJsonObj(jsonObj, LABELS_KEY, labels);
      for (const label of node.getLabels()) this.transformLabel(label, labels);
    }

    // ports
    if (!node.getPorts().isEmpty()) {
      const ports = this.adapter.newJsonArray();
      this.adapter.addJsonObj(jsonObj, 'ports', ports);
      for (const port of node.getPorts()) this.transformPort(port, ports);
    }

    // children
    if (!node.getChildren().isEmpty()) {
      const children = this.adapter.newJsonArray();
      this.adapter.addJsonObj(jsonObj, 'children', children);
      for (const child of node.getChildren()) this.transformNode(child, children);
    }

    // properties
    this.transformProperties(node, jsonObj);
    this.transformIndividualSpacings(node, jsonObj);
    this.transferShapeLayout(node, jsonObj);
  }

  private transformPort(port: ElkPort, arrayA: unknown): void {
    const jsonObj = this.createAndRegisterPort(port);
    const array = this.adapter.toJsonArray(arrayA);
    this.adapter.addJsonArr(array!, jsonObj);

    // labels
    if (!port.getLabels().isEmpty()) {
      const labels = this.adapter.newJsonArray();
      this.adapter.addJsonObj(jsonObj, LABELS_KEY, labels);
      for (const label of port.getLabels()) this.transformLabel(label, labels);
    }

    // properties and things
    this.transformProperties(port, jsonObj);
    this.transferShapeLayout(port, jsonObj);
  }

  private transformLabel(label: ElkLabel, array: unknown): void {
    const jsonLabel = this.adapter.newJsonObject();
    jsonLabel.addProperty('text', label.getText());
    if (!isNullOrEmpty(label.getIdentifier())) {
      jsonLabel.addProperty(ID_KEY, label.getIdentifier());
    }
    this.adapter.addJsonArr(this.adapter.toJsonArray(array)!, jsonLabel);

    // properties and things
    this.transformProperties(label, jsonLabel);
    this.transferShapeLayout(label, jsonLabel);
  }

  private transformProperties(holder: IPropertyHolder, parentA: unknown): void {
    // skip if empty (a holder is never null and getAllProperties() is never null here)
    if (holder.getAllProperties().isEmpty()) {
      return;
    }

    const jsonProps = this.adapter.newJsonObject();
    const parent = this.adapter.toJsonObject(parentA);
    this.adapter.addJsonObj(parent!, LAYOUT_OPTIONS_KEY, jsonProps);
    // PropertyMap entries never have a null key (the `key !== null` filter of the Java)
    for (const [key, value] of holder.getAllProperties()) {
      if (!isSpacingIndividual(key)) {
        this.transformOption(jsonProps, key, value);
      }
    }
  }

  private transformIndividualSpacings(holder: IPropertyHolder, parentA: unknown): void {
    // skip if empty
    if (!holder.hasProperty(CoreOptions.SPACING_INDIVIDUAL)) {
      return;
    }
    const individualSpacings = holder.getProperty(CoreOptions.SPACING_INDIVIDUAL);
    if (individualSpacings.getAllProperties().isEmpty()) {
      return;
    }

    const jsonProps = this.adapter.newJsonObject();
    const parent = this.adapter.toJsonObject(parentA);
    this.adapter.addJsonObj(parent!, INDIVIDUAL_SPACINGS_KEY, jsonProps);
    for (const [key, value] of individualSpacings.getAllProperties()) {
      this.transformOption(jsonProps, key, value);
    }
  }

  /** The body shared by the two `forEach` loops of `transformProperties` and `transformIndividualSpacings`. */
  private transformOption(jsonProps: JsonObject, key: IProperty<unknown>, value: unknown): void {
    if (!this.omitUnknownLayoutOptions || this.isKnown(key)) {
      const jsonKey = this.shortLayoutOptionKeys ? this.getShortOptionKey(key.getId()) : key.getId();
      jsonProps.addProperty(jsonKey, valueText(key, value));
    }
  }

  private transferShapeLayout(shape: ElkShape, jsonObjA: unknown): void {
    const jsonObj = this.adapter.toJsonObject(jsonObjA)!;
    // position
    if (!this.omitLayout) {
      if (!this.omitZeroPos) {
        jsonObj.addPropertyDouble(X_KEY, shape.getX());
        jsonObj.addPropertyDouble(Y_KEY, shape.getY());
      } else {
        // non-equality with double is fine here
        if (shape.getX() !== 0.0) jsonObj.addPropertyDouble(X_KEY, shape.getX());
        if (shape.getY() !== 0.0) jsonObj.addPropertyDouble(Y_KEY, shape.getY());
      }
    }
    // dimension
    if (!this.omitZeroDim) {
      jsonObj.addPropertyDouble('width', shape.getWidth());
      jsonObj.addPropertyDouble('height', shape.getHeight());
    } else {
      if (shape.getWidth() !== 0.0) jsonObj.addPropertyDouble('width', shape.getWidth());
      if (shape.getHeight() !== 0.0) jsonObj.addPropertyDouble('height', shape.getHeight());
    }
  }

  /* ---------------------------------------------------------------------------
   *   Convenience methods
   */

  /** Java `createAndRegister(ElkNode)` (renamed: the Java overloads share one name). */
  private createAndRegisterNode(node: ElkNode): JsonObject {
    const obj = this.adapter.newJsonObject();
    let id = node.getIdentifier();
    if (id === null) {
      id = `n${this.nodeIdCounter}`;
      this.nodeIdCounter = this.nodeIdCounter + 1;
    }
    id = this.assertUnique(id, this.nodeIdMap.inverse());

    obj.addProperty(ID_KEY, id);
    this.nodeIdMap.put(node, id);
    this.nodeJsonMap.set(node, obj);

    return obj;
  }

  /** Java `createAndRegister(ElkPort)`. */
  private createAndRegisterPort(port: ElkPort): JsonObject {
    const obj = this.adapter.newJsonObject();
    let id = port.getIdentifier();
    if (id === null) {
      id = `p${this.portIdCounter}`;
      this.portIdCounter = this.portIdCounter + 1;
    }
    id = this.assertUnique(id, this.portIdMap.inverse());

    obj.addProperty(ID_KEY, id);
    this.portIdMap.put(port, id);
    this.portJsonMap.set(port, obj);

    return obj;
  }

  /** Java `createAndRegister(ElkEdge)`. */
  private createAndRegisterEdge(edge: ElkEdge): JsonObject {
    const obj = this.adapter.newJsonObject();
    let id = edge.getIdentifier();
    if (id === null) {
      id = `e${this.edgeIdCounter}`;
      this.edgeIdCounter = this.edgeIdCounter + 1;
    }
    id = this.assertUnique(id, this.edgeIdMap.inverse());

    obj.addProperty(ID_KEY, id);
    this.edgeIdMap.put(edge, id);
    this.edgeJsonMap.set(edge, obj);

    return obj;
  }

  /** Java `createAndRegister(ElkEdgeSection)`. */
  private createAndRegisterSection(section: ElkEdgeSection): JsonObject {
    const obj = this.adapter.newJsonObject();
    let id = section.getIdentifier();
    if (id === null) {
      id = `s${this.edgeSectionIdCounter}`;
      this.edgeSectionIdCounter = this.edgeSectionIdCounter + 1;
    }
    id = this.assertUnique(id, this.edgeSectionIdMap.inverse());

    obj.addProperty(ID_KEY, id);
    this.edgeSectionIdMap.put(section, id);
    this.edgeSectionJsonMap.set(section, obj);

    return obj;
  }

  /**
   * The Xtend `dispatch` `idByElement` (ElkNode, ElkPort, ElkEdgeSection), told apart by the run-time type;
   * `undefined` is the Java `null` of an unregistered element.
   */
  private idByElement(element: ElkConnectableShape | ElkEdgeSection): string | undefined {
    if (isElkNode(element)) {
      return this.nodeIdMap.get(element);
    }
    if (isElkPort(element)) {
      return this.portIdMap.get(element);
    }
    if (isElkEdgeSection(element)) {
      return this.edgeSectionIdMap.get(element);
    }
    throw new IllegalArgumentException('Unhandled parameter types');
  }

  private getShortOptionKey(fullId: string): string {
    const option = LayoutMetaDataService.getInstance().getOptionDataBySuffix(fullId);
    if (option === null) {
      // if the option is unknown, return the full id
      return fullId;
    }
    const idSplit = Splitter.on(OPTION_ID_SEPARATOR).split(option.getId());
    let foundMatch = false;
    let i = idSplit.length - 1;
    if (i >= 1 && option.getGroup() === idSplit[i - 1]) {
      i--;
    }
    while (i >= 0 && !foundMatch) {
      const suffix = idSplit.slice(i);
      if (LayoutMetaDataService.getInstance().getOptionDataBySuffix(suffix.join(OPTION_ID_SEPARATOR)) !== null) {
        foundMatch = true;
      } else {
        i--;
      }
    }
    if (foundMatch) {
      return idSplit.slice(i).join(OPTION_ID_SEPARATOR);
    } else {
      return option.getId();
    }
  }

  emptyIfNull<T>(iterator: Iterator<T> | null): Iterator<T> {
    if (iterator === null) {
      return ([] as T[])[Symbol.iterator]();
    } else {
      return iterator;
    }
  }

  private isKnown(property: IProperty<unknown>): boolean {
    return LayoutMetaDataService.getInstance().getOptionDataBySuffix(property.getId()) !== null;
  }

  private sixDigitRandomNumber(): string {
    return `${this.random.nextInt(RANDOM_BOUND)}`;
  }

  private padZeroes(s: string, length: number): string {
    let tmp = s;
    while (tmp.length < length) {
      tmp = `0${tmp}`;
    }
    return tmp;
  }

  private assertUnique(id: string, map: BiMap<string, unknown>): string {
    let tmp = id;
    while (map.containsKey(tmp)) {
      tmp = id + GENERATED_ID_INFIX + this.padZeroes(this.sixDigitRandomNumber(), RANDOM_PADDED_LENGTH);
    }
    return tmp;
  }
}
