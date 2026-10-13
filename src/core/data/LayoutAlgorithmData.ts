// SPDX-License-Identifier: EPL-2.0
import { GraphFeature } from '../../graph/properties/GraphFeature.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import { newHashMap } from '../../guava/Maps.js';
import type { ClassObject } from '../../java/lang/JavaClass.js';
import * as JavaString from '../../java/lang/JavaString.js';
import { STRING } from '../../java/util/HashStrategy.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import type { JavaHashMap } from '../../java/util/JavaHashMap.js';
import type { AbstractLayoutProvider } from '../AbstractLayoutProvider.js';
import type { IFactory } from '../util/IFactory.js';
import { InstancePool } from '../util/InstancePool.js';
import type { ILayoutMetaData } from './ILayoutMetaData.js';

/** The values a {@link LayoutAlgorithmDataBuilder} collects (Java: private fields named like the builder methods). */
export interface LayoutAlgorithmDataBuilderFields {
  id: string | null;
  name: string | null;
  providerFactory: IFactory<AbstractLayoutProvider> | null;
  category: string | null;
  melkBundleName: string | null;
  definingBundleId: string | null;
  description: string | null;
  imagePath: string | null;
  supportedFeatures: EnumSet<GraphFeature> | null;
  validatorClass: ClassObject | null;
}

/**
 * Builder for {@link LayoutAlgorithmData} instances. The collected values live in {@link fields},
 * which the `LayoutAlgorithmData` constructor reads.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutAlgorithmData.java
 */
export class LayoutAlgorithmDataBuilder {
  readonly fields: LayoutAlgorithmDataBuilderFields = {
    id: null,
    name: null,
    providerFactory: null,
    category: null,
    melkBundleName: null,
    definingBundleId: null,
    description: null,
    imagePath: null,
    supportedFeatures: null,
    validatorClass: null,
  };

  /** Create an instance with the configured values. */
  create(): LayoutAlgorithmData {
    return new LayoutAlgorithmData(this);
  }

  /** Configure the {@link LayoutAlgorithmData.getId id}. */
  id(aid: string): this {
    this.fields.id = aid;
    return this;
  }

  /** Configure the {@link LayoutAlgorithmData.getName name}. */
  name(aname: string): this {
    this.fields.name = aname;
    return this;
  }

  /** Configure the {@link LayoutAlgorithmData.getInstancePool providerFactory}. */
  providerFactory(aproviderFactory: IFactory<AbstractLayoutProvider>): this {
    this.fields.providerFactory = aproviderFactory;
    return this;
  }

  /** Configure the {@link LayoutAlgorithmData.getCategoryId category}. */
  category(acategory: string): this {
    this.fields.category = acategory;
    return this;
  }

  /** Configure the {@link LayoutAlgorithmData.getBundleName melkBundleName}. */
  melkBundleName(amelkBundleName: string): this {
    this.fields.melkBundleName = amelkBundleName;
    return this;
  }

  /** Configure the {@link LayoutAlgorithmData.getDefiningBundleId definingBundleId}. */
  definingBundleId(adefiningBundleId: string): this {
    this.fields.definingBundleId = adefiningBundleId;
    return this;
  }

  /** Configure the {@link LayoutAlgorithmData.getDescription description}. */
  description(adescription: string): this {
    this.fields.description = adescription;
    return this;
  }

  /** Configure the {@link LayoutAlgorithmData.getPreviewImagePath imagePath}. */
  imagePath(aimagePath: string): this {
    this.fields.imagePath = aimagePath;
    return this;
  }

  /** Configure the {@link LayoutAlgorithmData.getSupportedFeatures supportedFeatures}. */
  supportedFeatures(asupportedFeatures: EnumSet<GraphFeature>): this {
    this.fields.supportedFeatures = asupportedFeatures;
    return this;
  }

  /** Configure the {@link LayoutAlgorithmData.getValidatorClass validatorClass}. */
  validatorClass(avalidator: ClassObject): this {
    this.fields.validatorClass = avalidator;
    return this;
  }
}

/**
 * Data type used to store information for a layout algorithm.
 *
 * The Java constructor is private and called by the nested `Builder`; TypeScript has no nested-class
 * access, so the constructor is public. `knownOptions` is a `HashMap` with `String` keys, so
 * {@link getKnownOptionIds} iterates in JVM order. `Builder` is defined in this file, so no import
 * cycle arises.
 *
 * @author msp
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutAlgorithmData.java
 */
export class LayoutAlgorithmData implements ILayoutMetaData {
  /** Builder for {@link LayoutAlgorithmData} instances. */
  static readonly Builder: typeof LayoutAlgorithmDataBuilder = LayoutAlgorithmDataBuilder;

  /** identifier of the layout provider. */
  private readonly id: string;
  /** user friendly name of the layout algorithm. */
  private readonly name: string | null;
  /** runtime instance of the layout algorithm. */
  private readonly providerPool: InstancePool<AbstractLayoutProvider>;
  /** layout category identifier. */
  private readonly category: string | null;
  /** name of the bundle of which this algorithm is part of. */
  private readonly melkBundleName: string | null;
  /** id of the (eclipse) bundle in which the melk file resides. */
  private readonly definingBundleId: string | null;
  /** detail description. */
  private readonly description: string | null;
  /** a path to a preview image for displaying in user interfaces. */
  private readonly imagePath: string | null;
  /** Set of supported graph features. */
  private readonly supportedFeatures: EnumSet<GraphFeature>;
  /** Validator that can be applied to input graphs before the algorithm is executed. */
  private readonly validatorClass: ClassObject | null;
  /** Map of known layout options. Keys are option IDs, values are the default values. */
  private readonly knownOptions: JavaHashMap<string, unknown> = newHashMap<string, unknown>(STRING);

  /** Create a layout algorithm data entry. An unset id (a Java `NullPointerException` in `equals`) becomes `''`. */
  constructor(builder: LayoutAlgorithmDataBuilder) {
    const f = builder.fields;
    this.id = f.id ?? '';
    this.name = f.name;
    this.description = f.description;
    this.providerPool = new InstancePool<AbstractLayoutProvider>(
      // Java passes the unset (null) factory through; the first fetch() then fails with a JVM NPE, which
      // D10 maps to a JS TypeError (`factory.create` on null). The cast reproduces that.
      f.providerFactory as IFactory<AbstractLayoutProvider>,
    );
    this.category = f.category;
    this.melkBundleName = f.melkBundleName;
    this.definingBundleId = f.definingBundleId;
    this.imagePath = f.imagePath;
    this.supportedFeatures = f.supportedFeatures ?? EnumSet.noneOf(GraphFeature);
    this.validatorClass = f.validatorClass;
  }

  equals(obj: unknown): boolean {
    if (obj instanceof LayoutAlgorithmData) {
      return this.id === obj.id;
    }
    return false;
  }

  hashCode(): number {
    return JavaString.hashCode(this.id);
  }

  toString(): string {
    return `Layout Algorithm: ${this.id}`;
  }

  /**
   * Sets the knowledge status of the given layout option. This method should be called only from
   * `ILayoutMetaDataProvider` implementations.
   *
   * @param property layout option
   * @param defaultValue the default value, or `null` if none is specified
   */
  addKnownOption(property: IProperty<unknown>, defaultValue: unknown): void {
    this.knownOptions.put(property.getId(), defaultValue);
  }

  /**
   * Returns the set of IDs of layout options declared to be known by this algorithm, in `HashMap`
   * key order. Java returns a live `keySet()` view; this is a snapshot.
   */
  getKnownOptionIds(): Set<string> {
    return new Set(this.knownOptions.keys());
  }

  /**
   * Determines whether the layout algorithm knows the given layout option.
   *
   * @param property layout option, or its id (Java overloads `knowsOption(IProperty)` / `knowsOption(String)`)
   */
  knowsOption(property: IProperty<unknown> | string): boolean {
    return this.knownOptions.containsKey(idOf(property));
  }

  /**
   * Returns the layout algorithm's default value for the given option.
   *
   * @param property layout option, or its id (Java overloads `getDefaultValue(IProperty)` / `getDefaultValue(String)`)
   * @returns the associated default value, or `null` if there is none
   */
  getDefaultValue(property: IProperty<unknown> | string): unknown {
    return this.knownOptions.get(idOf(property)) ?? null;
  }

  /** Check whether the given graph feature is supported. */
  supportsFeature(graphFeature: GraphFeature): boolean {
    return this.supportedFeatures.contains(graphFeature);
  }

  /** The set of supported features. */
  getSupportedFeatures(): EnumSet<GraphFeature> {
    return this.supportedFeatures;
  }

  getId(): string {
    return this.id;
  }

  getName(): string | null {
    return this.name;
  }

  getDescription(): string | null {
    return this.description;
  }

  /**
   * Return an instance pool for layout providers. If multiple threads execute the layout algorithm
   * in parallel, each thread should use its own instance of the algorithm.
   */
  getInstancePool(): InstancePool<AbstractLayoutProvider> {
    return this.providerPool;
  }

  /** Return a validator class that can be applied to input graphs before the algorithm is executed, or `null`. */
  getValidatorClass(): ClassObject | null {
    return this.validatorClass;
  }

  /** Returns the layout category identifier. Layout categories are represented by `LayoutCategoryData`. */
  getCategoryId(): string | null {
    return this.category;
  }

  /** Returns the bundle name. Bundles group layout algorithms according to the library they are in. */
  getBundleName(): string | null {
    return this.melkBundleName;
  }

  /** The id of the (eclipse) bundle in which the melk file resides. */
  getDefiningBundleId(): string | null {
    return this.definingBundleId;
  }

  /** Returns the preview image path. */
  getPreviewImagePath(): string | null {
    return this.imagePath;
  }
}

function idOf(property: IProperty<unknown> | string): string {
  return typeof property === 'string' ? property : property.getId();
}
