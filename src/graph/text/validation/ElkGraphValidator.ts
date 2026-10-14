// SPDX-License-Identifier: EPL-2.0
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../../../core/data/LayoutOptionData.js';
import type { LayoutOptionDataTarget as TargetType } from '../../../core/data/LayoutOptionDataTarget.js';
import { LayoutOptionDataTarget } from '../../../core/data/LayoutOptionDataTarget.js';
import { LayoutOptionDataType } from '../../../core/data/LayoutOptionDataType.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { Severity } from '../../../core/validation/GraphIssue.js';
import type { LayoutOptionValidator } from '../../../core/validation/LayoutOptionValidator.js';
import type { EObject } from '../../../emf/ecore/EObject.js';
import { JavaClass, type JavaClassRef, simpleNameOf } from '../../../java/lang/JavaClass.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { AbstractDeclarativeValidator } from '../../../xtext/validation/AbstractDeclarativeValidator.js';
import type { MapEntryFeature, MapEntryFeatureProvider } from '../../../xtext/validation/EObjectValidator.js';
import type { EStructuralFeature } from '../../../xtext/validation/EStructuralFeature.js';
import { isEMapPropertyHolder, type EMapPropertyHolder } from '../../EMapPropertyHolder.js';
import { isElkEdge, type ElkEdge } from '../../ElkEdge.js';
import { isElkEdgeSection, type ElkEdgeSection } from '../../ElkEdgeSection.js';
import { isElkGraphElement, type ElkGraphElement } from '../../ElkGraphElement.js';
import { isElkLabel } from '../../ElkLabel.js';
import { isElkNode, type ElkNode } from '../../ElkNode.js';
import { isElkPort } from '../../ElkPort.js';
import { ElkPropertyToValueMapEntryImpl } from '../../impl/ElkPropertyToValueMapEntryImpl.js';
import type { IProperty } from '../../properties/IProperty.js';
import { isPropertyValueProxy } from '../../properties/IPropertyValueProxy.js';
import type { ElkConnectableShape } from '../../ElkConnectableShape.js';
import { ElkGraphUtil } from '../../util/ElkGraphUtil.js';
import { ElkGraphTextUtil } from '../ElkGraphTextUtil.js';
import { OPTION_NOT_APPLICABLE } from './IssueCodes.js';

function feature(name: string): EStructuralFeature {
  return { getName: () => name };
}

/**
 * The structural features the validator reports on (`ElkGraphPackage.Literals`; the port has no feature
 * literals, D3). One instance per feature, as Java compares features by reference.
 */
export const ELK_PROPERTY_TO_VALUE_MAP_ENTRY__KEY: EStructuralFeature = feature('key');
export const ELK_PROPERTY_TO_VALUE_MAP_ENTRY__VALUE: EStructuralFeature = feature('value');
export const ELK_GRAPH_ELEMENT__IDENTIFIER: EStructuralFeature = feature('identifier');
export const ELK_EDGE_SECTION__IDENTIFIER: EStructuralFeature = feature('identifier');
export const ELK_EDGE_SECTION__INCOMING_SHAPE: EStructuralFeature = feature('incomingShape');
export const ELK_EDGE_SECTION__OUTGOING_SHAPE: EStructuralFeature = feature('outgoingShape');
const EMAP_PROPERTY_HOLDER__PROPERTIES: EStructuralFeature = feature('properties');

/**
 * The map-typed features of an ElkGraph object for EMF's map-entry uniqueness constraint: the
 * `properties` of every property holder (EMF finds them through the metamodel, which the port does not
 * have). Keys are equal when their ids are (`IProperty` equality).
 */
export const elkGraphMapEntryFeatures: MapEntryFeatureProvider = (eObject: EObject): readonly MapEntryFeature[] => {
  if (!isEMapPropertyHolder(eObject)) {
    return [];
  }
  const entries = eObject.getProperties().entryList();
  const idAt = (index: number): string | undefined => entries.get(index).getKey()?.getId();
  return [
    {
      feature: EMAP_PROPERTY_HOLDER__PROPERTIES,
      size: () => entries.size(),
      entryAt: (index) => entries.get(index),
      keyAt: (index) => entries.get(index).getKey(),
      indexOfKey: (key) => {
        const id = (key as IProperty<unknown>).getId();
        for (let i = 0, size = entries.size(); i < size; ++i) {
          if (idAt(i) === id) {
            return i;
          }
        }
        return -1;
      },
    },
  ];
};

/** `EcoreUtil2.getContainerOfType`: the object itself if it is of the type, else its nearest container that is. */
function containerOfType<T extends EObject>(start: EObject | null, guard: (o: unknown) => o is T): T | null {
  for (let current = start; current !== null; current = current.eContainer()) {
    if (guard(current)) {
      return current;
    }
  }
  return null;
}

/** `eIsProxy()`: the port resolves every reference eagerly and keeps failed ones unset, so nothing is a proxy. */
function eIsProxy(_object: EObject): boolean {
  return false;
}

/** The name `String.valueOf(Object)` gives a possibly-null text. */
function javaText(text: string | null): string {
  return text === null ? 'null' : text;
}

/** Xtend `CoreOptions.ALGORITHM == option`: `Property.equals`, which compares ids. */
function isAlgorithmOption(option: LayoutOptionData): boolean {
  return option.getId() === CoreOptions.ALGORITHM.getId();
}

/** `LayoutMetaDataService.instance.getOptionData(property.id)` for a non-option property. */
function toLayoutOption(property: IProperty<unknown> | null): LayoutOptionData | null {
  if (property instanceof LayoutOptionData) {
    return property;
  } else if (property !== null) {
    return LayoutMetaDataService.getInstance().getOptionData(property.getId());
  }
  return null;
}

/** The ids of the `Class.getSimpleName()` of the types an option value is expected to have. */
const EXPECTED_SIMPLE_NAMES = new Map<LayoutOptionDataType, string>([
  [LayoutOptionDataType.STRING, simpleNameOf(JavaClass.String)],
  [LayoutOptionDataType.BOOLEAN, simpleNameOf(JavaClass.Boolean)],
  [LayoutOptionDataType.INT, simpleNameOf(JavaClass.Integer)],
  [LayoutOptionDataType.DOUBLE, simpleNameOf(JavaClass.Double)],
  [LayoutOptionDataType.ENUMSET, simpleNameOf(EnumSet)],
]);

/** The graph element kinds an option is checked against, in the order of the Java `switch`. */
function targetsOfContainer(container: ElkGraphElement): readonly TargetType[] | null {
  if (isElkNode(container)) {
    return [LayoutOptionDataTarget.NODES, LayoutOptionDataTarget.PARENTS];
  } else if (isElkEdge(container)) {
    return [LayoutOptionDataTarget.EDGES];
  } else if (isElkPort(container)) {
    return [LayoutOptionDataTarget.PORTS];
  } else if (isElkLabel(container)) {
    return [LayoutOptionDataTarget.LABELS];
  }
  return null;
}

/**
 * Custom validation rules for the ElkGraph language. The `@Check` methods are registered in declaration
 * order (Java reflection order is unspecified; recorded issues are sorted).
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/validation/ElkGraphValidator.xtend
 */
export class ElkGraphValidator extends AbstractDeclarativeValidator {
  readonly #layoutOptionValidator: LayoutOptionValidator;

  /** @param layoutOptionValidator the injected `LayoutOptionValidator` */
  constructor(layoutOptionValidator: LayoutOptionValidator) {
    super();
    this.#layoutOptionValidator = layoutOptionValidator;
    const isEntry = (o: EObject): o is ElkPropertyToValueMapEntryImpl => o instanceof ElkPropertyToValueMapEntryImpl;
    this.addCheck(isEntry, (entry) => this.checkPropertyKey(entry));
    this.addCheck(isEntry, (entry) => this.checkPropertyValue(entry));
    this.addCheck(isEMapPropertyHolder, (holder) => this.checkUniqueProperties(holder));
    this.addCheck(isElkGraphElement, (element) => this.checkUniqueNames(element));
    this.addCheck(isElkEdge, (edge) => this.checkEdgeContainer(edge));
    this.addCheck(isElkEdgeSection, (section) => this.checkEdgeSection(section));
  }

  /** @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/validation/ElkGraphValidator.xtend */
  checkPropertyKey(entry: ElkPropertyToValueMapEntryImpl): void {
    const id = entry.getKey().getId();
    if (LayoutMetaDataService.getInstance().getOptionData(id) === null) {
      this.warning(`'${id}' is not a layout option.`, ELK_PROPERTY_TO_VALUE_MAP_ENTRY__KEY);
    }
  }

  /** @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/validation/ElkGraphValidator.xtend */
  checkPropertyValue(entry: ElkPropertyToValueMapEntryImpl): void {
    const option = toLayoutOption(entry.getKey());
    if (option === null) {
      return;
    }
    const container = entry.eContainer();
    if (isElkGraphElement(container)) {
      this.checkContainerOption(option, container);
    }
    const value = this.resolvedValue(entry, option);
    if (value !== null) {
      this.checkValue(entry, option, value);
    }
  }

  /** The target and algorithm checks for an option set on a graph element. */
  private checkContainerOption(option: LayoutOptionData, container: ElkGraphElement): void {
    const targets = targetsOfContainer(container);
    if (targets !== null) {
      this.checkOptionTarget(option, targets);
    }
    if (isElkNode(container) && option.getTargets().contains(LayoutOptionDataTarget.NODES)) {
      this.checkAlgorithmSupport(option, container.getParent());
    } else {
      this.checkAlgorithmSupport(option, container);
    }
  }

  /**
   * Resolves a value proxy with the option: a failed resolution reports the expected type and ends the
   * value checks (`null`); a resolved value replaces the entry's value, as Java does.
   */
  private resolvedValue(entry: ElkPropertyToValueMapEntryImpl, option: LayoutOptionData): unknown {
    const value = entry.getValue();
    if (!isPropertyValueProxy(value)) {
      return value;
    }
    const resolved = value.resolveValue(option);
    if (resolved === null) {
      this.reportExpectedType(option);
    } else {
      entry.setValue(resolved);
    }
    return resolved;
  }

  private reportExpectedType(option: LayoutOptionData): void {
    const type = option.getType();
    const known = type === null ? undefined : EXPECTED_SIMPLE_NAMES.get(type);
    if (known !== undefined) {
      this.expectPropertyType(known);
    } else if (option.getOptionClass() !== null) {
      this.expectPropertyType(simpleNameOf(option.getOptionClass() as JavaClassRef));
    }
  }

  private checkValue(entry: ElkPropertyToValueMapEntryImpl, option: LayoutOptionData, value: unknown): void {
    const issues = this.#layoutOptionValidator.checkProperty(option, value, containerOfType(entry, isElkGraphElement));
    for (const issue of issues) {
      if (issue.getSeverity() === Severity.ERROR) {
        this.error(issue.getMessage(), ELK_PROPERTY_TO_VALUE_MAP_ENTRY__VALUE);
      } else if (issue.getSeverity() === Severity.WARNING) {
        this.warning(issue.getMessage(), ELK_PROPERTY_TO_VALUE_MAP_ENTRY__VALUE);
      }
    }
    // `value as String` fails for a non-string algorithm value: Java ClassCastException, rethrown by Xtext
    if (isAlgorithmOption(option)) {
      if (LayoutMetaDataService.getInstance().getAlgorithmDataBySuffix(value as string) === null) {
        this.error(
          `No layout algorithm with identifier '${String(value)}' can be found.`,
          ELK_PROPERTY_TO_VALUE_MAP_ENTRY__VALUE,
        );
      }
    }
  }

  private checkOptionTarget(option: LayoutOptionData, targetTypes: readonly TargetType[]): void {
    if (!targetTypes.some((target) => option.getTargets().contains(target))) {
      const first = (targetTypes[0] as TargetType).toString().toLowerCase();
      this.warning(
        `The layout option '${option.getId()}' is not applicable to ${first}.`,
        ELK_PROPERTY_TO_VALUE_MAP_ENTRY__KEY,
        OPTION_NOT_APPLICABLE,
      );
    }
  }

  private checkAlgorithmSupport(option: LayoutOptionData, element: ElkGraphElement | null): void {
    if (isAlgorithmOption(option)) {
      return;
    }
    let algorithm = ElkGraphTextUtil.getAlgorithm(element);
    if (algorithm !== null && !algorithm.knowsOption(option)) {
      // Maybe the option is handled by one of the parent nodes
      let foundMatch = false;
      let parent: ElkNode | null = containerOfType(element, isElkNode);
      while (parent !== null && !foundMatch) {
        algorithm = ElkGraphTextUtil.getAlgorithm(parent);
        foundMatch = algorithm !== null && algorithm.knowsOption(option);
        parent = parent.getParent();
      }
      if (!foundMatch) {
        // `algorithm` is the last one assigned and may be null: Java's NullPointerException on `.id` is a
        // TypeError here, swallowed by handleExceptionDuringValidation, which skips the warning.
        const lastId = (algorithm as NonNullable<typeof algorithm>).getId();
        this.warning(
          `The algorithm '${lastId}' does not support the option '${option.getId()}'.`,
          ELK_PROPERTY_TO_VALUE_MAP_ENTRY__KEY,
        );
      }
    }
  }

  private expectPropertyType(simpleName: string): void {
    this.error(`Expected value of type ${simpleName}.`, ELK_PROPERTY_TO_VALUE_MAP_ENTRY__VALUE);
  }

  /** @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/validation/ElkGraphValidator.xtend */
  checkUniqueProperties(propertyHolder: EMapPropertyHolder): void {
    const usedProperties = new Map<string, ElkPropertyToValueMapEntryImpl | null>();
    for (const entry of propertyHolder.getProperties().entryList()) {
      const property = entry.getKey().getId();
      if (usedProperties.has(property)) {
        this.propertyAlreadyAssigned(entry);
        const other = usedProperties.get(property) ?? null;
        if (other !== null) {
          this.propertyAlreadyAssigned(other);
          usedProperties.set(property, null);
        }
      } else {
        usedProperties.set(property, entry as ElkPropertyToValueMapEntryImpl);
      }
    }
  }

  private propertyAlreadyAssigned(entry: unknown): void {
    if (entry instanceof ElkPropertyToValueMapEntryImpl) {
      this.error('Property is already assigned.', entry, ELK_PROPERTY_TO_VALUE_MAP_ENTRY__KEY);
    }
  }

  /** @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/validation/ElkGraphValidator.xtend */
  checkUniqueNames(element: ElkGraphElement): void {
    const usedNames = new Map<string, EObject | null>();
    for (const object of element.eContents()) {
      const name = this.identifierOf(object);
      if (name === null) {
        continue;
      }
      if (usedNames.has(name)) {
        this.nameAlreadyUsed(object);
        const other = usedNames.get(name) ?? null;
        if (other !== null) {
          this.nameAlreadyUsed(other);
          usedNames.set(name, null);
        }
      } else {
        usedNames.set(name, object);
      }
    }
  }

  /** The `switch object` of the check: the identifier of graph elements and edge sections, else `null`. */
  private identifierOf(object: EObject): string | null {
    if (isElkGraphElement(object) || isElkEdgeSection(object)) {
      return object.getIdentifier();
    }
    return null;
  }

  private nameAlreadyUsed(object: EObject): void {
    const identifier = isElkGraphElement(object) ? ELK_GRAPH_ELEMENT__IDENTIFIER : ELK_EDGE_SECTION__IDENTIFIER;
    this.error('Identifier is already used.', object, identifier);
  }

  /** @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/validation/ElkGraphValidator.xtend */
  checkEdgeContainer(edge: ElkEdge): void {
    if (!(edge.getSources().isEmpty() && edge.getTargets().isEmpty())) {
      const bestContainer = ElkGraphUtil.findBestEdgeContainment(edge);
      if (bestContainer !== null && bestContainer !== edge.getContainingNode()) {
        if (bestContainer.getParent() === null) {
          this.warning('This edge should be declared in the root node of this graph.', null);
        } else {
          this.warning(`This edge should be declared in node ${javaText(bestContainer.getIdentifier())}.`, null);
        }
      }
    }
  }

  /** @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/validation/ElkGraphValidator.xtend */
  checkEdgeSection(edgeSection: ElkEdgeSection): void {
    const edge = edgeSection.getParent() as ElkEdge;
    this.checkSectionShape({
      shape: edgeSection.getIncomingShape(),
      shapes: () => edge.getSources(),
      role: 'source',
      sections: edgeSection.getIncomingSections(),
      feature: ELK_EDGE_SECTION__INCOMING_SHAPE,
    });
    this.checkSectionShape({
      shape: edgeSection.getOutgoingShape(),
      shapes: () => edge.getTargets(),
      role: 'target',
      sections: edgeSection.getOutgoingSections(),
      feature: ELK_EDGE_SECTION__OUTGOING_SHAPE,
    });
  }

  private checkSectionShape(side: SectionSide): void {
    const { shape } = side;
    if (shape !== null && !eIsProxy(shape)) {
      const className = shape.eClass().getName();
      if (!side.shapes().contains(shape)) {
        this.error(
          `The ${className} ${javaText(shape.getIdentifier())} is not a ${side.role} of this edge.`,
          side.feature,
        );
      }
      if (!side.sections.isEmpty()) {
        this.error(
          `An edge section cannot be connected to an ${className} and other sections at the same time.`,
          side.feature,
        );
      }
    }
  }
}

/** One end of an edge section: its shape, the edge's shapes it must belong to, and its neighbour sections. */
interface SectionSide {
  readonly shape: ElkConnectableShape | null;
  readonly shapes: () => { contains(o: unknown): boolean };
  readonly role: 'source' | 'target';
  readonly sections: { isEmpty(): boolean };
  readonly feature: EStructuralFeature;
}
