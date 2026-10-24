// SPDX-License-Identifier: EPL-2.0
import type { ElkGraphElement } from '../graph/ElkGraphElement.js';
import { isElkEdge } from '../graph/ElkEdge.js';
import { isElkConnectableShape } from '../graph/ElkConnectableShape.js';
import { isElkGraphElement } from '../graph/ElkGraphElement.js';
import { isElkLabel } from '../graph/ElkLabel.js';
import { isElkNode } from '../graph/ElkNode.js';
import { isElkPort } from '../graph/ElkPort.js';
import { isElkShape } from '../graph/ElkShape.js';
import { ElkConnectableShapeImpl } from '../graph/impl/ElkConnectableShapeImpl.js';
import { ElkEdgeImpl } from '../graph/impl/ElkEdgeImpl.js';
import { ElkGraphElementImpl } from '../graph/impl/ElkGraphElementImpl.js';
import { ElkLabelImpl } from '../graph/impl/ElkLabelImpl.js';
import { ElkNodeImpl } from '../graph/impl/ElkNodeImpl.js';
import { ElkPortImpl } from '../graph/impl/ElkPortImpl.js';
import { ElkShapeImpl } from '../graph/impl/ElkShapeImpl.js';
import type { IProperty } from '../graph/properties/IProperty.js';
import type { IPropertyHolder } from '../graph/properties/IPropertyHolder.js';
import { MapPropertyHolder } from '../graph/properties/MapPropertyHolder.js';
import { Property } from '../graph/properties/Property.js';
import { ElkReflect } from '../graph/util/ElkReflect.js';
import { LayoutMetaDataService } from './data/LayoutMetaDataService.js';
import { LayoutOptionData } from './data/LayoutOptionData.js';
import type { IGraphElementVisitor } from './util/IGraphElementVisitor.js';

/**
 * Port of the Java `Class<? extends ElkGraphElement>` key type. The ElkGraph element types are
 * interfaces here and have no run-time identity, so the keys are the abstract/concrete impl
 * classes that stand in for `ElkGraphElement.class`, `ElkShape.class`, ... (`ElkGraphElementImpl`,
 * `ElkShapeImpl`, `ElkLabelImpl`, `ElkConnectableShapeImpl`, `ElkNodeImpl`, `ElkPortImpl`,
 * `ElkEdgeImpl`).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/LayoutConfigurator.java
 */
export type ElkGraphElementClass = abstract new (...args: never[]) => ElkGraphElement;

/**
 * Functional interface that allows to specify whether a certain property should be set for a certain graph element.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/LayoutConfigurator.java
 */
export interface IOptionFilter {
  /** @return `true` if and only if the passed graph element may be configured with the passed property. */
  accept(e: ElkGraphElement, p: IProperty<unknown>): boolean;
}

/**
 * Functional interface that allows to specify whether a certain property should be set for a certain property
 * holder.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/LayoutConfigurator.java
 */
export interface IPropertyHolderOptionFilter {
  /** @return `true` if and only if the passed property holder may be configured with the passed property. */
  accept(holder: IPropertyHolder, property: IProperty<unknown>): boolean;
}

/**
 * `OPTION_TARGET_FILTER`'s body (LayoutConfigurator.java:104-127), kept as a function so the static
 * initializer stays small.
 */
function acceptByTargets(e: ElkGraphElement, property: IProperty<unknown>): boolean {
  const optionData = LayoutMetaDataService.getInstance().getOptionData(property.getId());
  if (optionData !== null) {
    const targets = optionData.getTargets();
    if (isElkNode(e)) {
      if (!e.isHierarchical()) {
        return targets.contains(LayoutOptionData.Target.NODES);
      } else {
        return targets.contains(LayoutOptionData.Target.NODES) || targets.contains(LayoutOptionData.Target.PARENTS);
      }
    } else if (isElkEdge(e)) {
      return targets.contains(LayoutOptionData.Target.EDGES);
    } else if (isElkPort(e)) {
      return targets.contains(LayoutOptionData.Target.PORTS);
    } else if (isElkLabel(e)) {
      return targets.contains(LayoutOptionData.Target.LABELS);
    }
  }
  return true;
}

/**
 * A layout configurator is a graph element visitor that applies layout option values. It can be
 * used to modify the layout configuration of a graph after it has been created, e.g. in order to
 * apply multiple layouts with different configurations. Create an instance and then use one of the
 * `configure(..)` methods to obtain a property holder that can be filled with values for
 * layout options.
 *
 * `elementOptionMap` and `classOptionMap` are identity-keyed JS `Map`s (AD-10, inventory rows I28
 * and I29): they are only looked up and iterated in insertion order by `overrideWith`.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/LayoutConfigurator.java
 */
export class LayoutConfigurator implements IGraphElementVisitor {
  /**
   * Property attached to the shape layout of the top-level {@link ElkNode} holding a reference
   * to an additional layout configurator that shall be applied for the remaining iterations.
   * This is applicable only when multiple layout iterations are performed, e.g. for applying
   * different layout algorithms one after another. If only a single iteration is performed or
   * the current iteration is the last one, the value of this property is ignored. Otherwise
   * the referenced configurator will be added to all iterations that follow the current one.
   */
  static readonly ADD_LAYOUT_CONFIG: IProperty<LayoutConfigurator> = new Property<LayoutConfigurator>(
    'org.eclipse.elk.addLayoutConfig',
  );

  /**
   * Generic filter that prevents the {@link LayoutConfigurator} from overwriting layout options that are
   * already set for a graph element.
   */
  static readonly NO_OVERWRITE_HOLDER: IPropertyHolderOptionFilter = {
    accept: (e, p) => !e.hasProperty(p),
  };

  /**
   * Generic filter that prevents the {@link LayoutConfigurator} from overwriting layout options that are
   * already set for a graph element.
   */
  static readonly NO_OVERWRITE: IOptionFilter = {
    accept: (e, p) => !e.hasProperty(p),
  };

  /**
   * A filter for that checks for each option whether its configured targets match the input element. Uses the
   * {@link LayoutOptionData} obtained from the {@link LayoutMetaDataService} to do so.
   */
  static readonly OPTION_TARGET_FILTER: IOptionFilter = {
    accept: acceptByTargets,
  };

  private readonly elementOptionMap: Map<ElkGraphElement, MapPropertyHolder> = new Map();
  private readonly classOptionMap: Map<ElkGraphElementClass, MapPropertyHolder> = new Map();
  private clearLayout = false;
  private readonly optionFilters: IOptionFilter[] = [];

  /** Whether to clear the layout of each graph element before the new configuration is applied. */
  isClearLayout(): boolean {
    return this.clearLayout;
  }

  /**
   * Set whether to clear the layout of each graph element before the new configuration is applied
   * (the default is `false`).
   *
   * @return `this`
   */
  setClearLayout(doClearLayout: boolean): this {
    this.clearLayout = doClearLayout;
    return this;
  }

  /**
   * Adds a filter that is queried for each combination of graph elements and options. An option
   * value is applied only if the filter matches. If no filter is set, all values are applied.
   *
   * @return `this`
   */
  addFilter(filter: IOptionFilter): this {
    this.optionFilters.push(filter);
    return this;
  }

  /**
   * Returns the list of filters that have been added via {@link addFilter} or have been inherited
   * from another {@link LayoutConfigurator} via {@link overrideWith}.
   */
  protected getFilters(): IOptionFilter[] {
    return this.optionFilters;
  }

  /**
   * Add and return a property holder for the given element or element class (the two Java
   * overloads, told apart at run time: a function is a class). If such a property holder is
   * already present, the previous instance is returned.
   *
   * It is possible to configure options for every graph element by using `ElkGraphElementImpl`
   * (Java: `ElkGraphElement.class`) as argument. Such options are overridden if a more specific
   * type is configured as well, for instance `ElkNodeImpl`.
   */
  configure(element: ElkGraphElement): IPropertyHolder;
  configure(elementClass: ElkGraphElementClass): IPropertyHolder;
  configure(elementOrClass: ElkGraphElement | ElkGraphElementClass): IPropertyHolder {
    // the two maps have different key types; a function is a class
    const map: Map<ElkGraphElement | ElkGraphElementClass, MapPropertyHolder> =
      typeof elementOrClass === 'function' ? this.classOptionMap : this.elementOptionMap;
    let result = map.get(elementOrClass);
    if (result === undefined) {
      result = new MapPropertyHolder();
      map.set(elementOrClass, result);
    }
    return result;
  }

  /**
   * Return the stored property holder for the given element or element class, or `null` if none
   * is present.
   */
  getProperties(element: ElkGraphElement): IPropertyHolder | null;
  getProperties(elementClass: ElkGraphElementClass): IPropertyHolder | null;
  getProperties(elementOrClass: ElkGraphElement | ElkGraphElementClass): IPropertyHolder | null {
    const map: Map<ElkGraphElement | ElkGraphElementClass, MapPropertyHolder> =
      typeof elementOrClass === 'function' ? this.classOptionMap : this.elementOptionMap;
    return map.get(elementOrClass) ?? null;
  }

  /** Apply this layout configurator to the given graph element. */
  visit(element: ElkGraphElement): void {
    if (this.clearLayout) {
      element.getProperties().clear();
    }
    const combined = this.findClassOptions(element);
    // implicitly overwrite options specified for a class with options specified for the specific element
    combined.copyProperties(this.getProperties(element));
    this.applyProperties(element, combined);
  }

  /** Apply all properties held in `properties` to `element`. */
  protected applyProperties(element: ElkGraphElement, properties: IPropertyHolder | null): void {
    if (properties !== null) {
      const filters = this.getFilters();
      for (const [property, entryValue] of properties.getAllProperties()) {
        const accept = filters.every((filter) => filter.accept(element, property));
        if (accept) {
          let value = entryValue;
          if (ElkReflect.isCloneable(value)) {
            const clone = ElkReflect.clone(value);
            if (clone !== null) {
              value = clone;
            }
          }
          element.setProperty(property as IProperty<unknown>, value);
        }
      }
    }
  }

  /**
   * To allow the configuration of layout options using interfaces and super-interfaces, we have to manually check the
   * type hierarchy when visiting a graph element. Since KGraph's type hierarchy is quite small, we do this case by
   * case. The order of the cases is important, since configurations for more specific types should override the
   * general case.
   *
   * @return the most specific {@link MapPropertyHolder} fitting the passed `element`'s type.
   */
  private findClassOptions(element: ElkGraphElement): MapPropertyHolder {
    const combined = new MapPropertyHolder();

    // order is important as it reflects inheritance

    if (isElkGraphElement(element)) {
      combined.copyProperties(this.classOptions(ElkGraphElementImpl));
    }

    if (isElkShape(element)) {
      combined.copyProperties(this.classOptions(ElkShapeImpl));
    }

    if (isElkLabel(element)) {
      combined.copyProperties(this.classOptions(ElkLabelImpl));
      // cannot be anything of the following, we can return
      return combined;
    }

    if (isElkConnectableShape(element)) {
      combined.copyProperties(this.classOptions(ElkConnectableShapeImpl));
    }

    if (isElkNode(element)) {
      combined.copyProperties(this.classOptions(ElkNodeImpl));
      // cannot be anything of the following, we can return
      return combined;
    }

    if (isElkPort(element)) {
      combined.copyProperties(this.classOptions(ElkPortImpl));
      // cannot be anything of the following, we can return
      return combined;
    }

    if (isElkEdge(element)) {
      combined.copyProperties(this.classOptions(ElkEdgeImpl));
    }

    return combined;
  }

  /** `classOptionMap.get(clazz)` with Java's `null` for a missing entry. */
  private classOptions(clazz: ElkGraphElementClass): MapPropertyHolder | null {
    return this.classOptionMap.get(clazz) ?? null;
  }

  /**
   * Copy all options from the given configurator to this one, possibly overriding the own options. The
   * {@link IOptionFilter}s of this configurator are cleared and filled with the filters of `other`.
   *
   * @return `this`
   */
  overrideWith(other: LayoutConfigurator): this {
    LayoutConfigurator.mergeHolders(this.elementOptionMap, other.elementOptionMap);
    LayoutConfigurator.mergeHolders(this.classOptionMap, other.classOptionMap);
    this.clearLayout = other.clearLayout;
    this.optionFilters.length = 0;
    this.optionFilters.push(...other.optionFilters);
    return this;
  }

  /**
   * The two identical `for (Map.Entry ...)` loops of `overrideWith`, shared (the key types differ
   * only in Java generics).
   */
  private static mergeHolders<K>(target: Map<K, MapPropertyHolder>, source: Map<K, MapPropertyHolder>): void {
    for (const [key, value] of source) {
      let thisHolder = target.get(key);
      if (thisHolder === undefined) {
        thisHolder = new MapPropertyHolder();
        target.set(key, thisHolder);
      }
      thisHolder.copyProperties(value);
    }
  }
}
