// SPDX-License-Identifier: EPL-2.0
import { ElkReflect } from '../../graph/util/ElkReflect.js';
import { LinkedList } from '../../java/util/LinkedList.js';
import { ElkMargin } from '../math/ElkMargin.js';
import { ElkPadding } from '../math/ElkPadding.js';
import { KVector } from '../math/KVector.js';
import { KVectorChain } from '../math/KVectorChain.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { IndividualSpacings } from '../util/IndividualSpacings.js';
import { Pair } from '../util/Pair.js';
import type { ILayoutMetaData } from './ILayoutMetaData.js';
import type { ILayoutMetaDataProvider } from './ILayoutMetaDataProvider.js';
import { LayoutAlgorithmData } from './LayoutAlgorithmData.js';
import { LayoutCategoryData } from './LayoutCategoryData.js';
import { LayoutOptionData } from './LayoutOptionData.js';
import type { LayoutOptionDataTarget } from './LayoutOptionDataTarget.js';

/** The id of the "Other" category that collects algorithms without a category. */
const BACKUP_CATEGORY_ID = '';
const BACKUP_CATEGORY_NAME = 'Other';
const ID_SEPARATOR = '.';

/** The maps a service and its registries share (Java: private fields of the service, used by the inner class). */
interface ServiceState {
  /** Mapping of layout provider identifiers to their data instances. */
  readonly algorithms: Map<string, LayoutAlgorithmData>;
  /** Mapping of layout option identifiers to their data instances. */
  readonly options: Map<string, LayoutOptionData>;
  /** Mapping of legacy layout option identifiers to their data instances (the data contain the new identifiers). */
  readonly legacyOptions: Map<string, LayoutOptionData>;
  /** Mapping of layout category identifiers to their data instances. */
  readonly categories: Map<string, LayoutCategoryData>;
}

/** Data class for storing dependencies before they are actually registered. */
interface Triple {
  readonly firstId: string;
  readonly secondId: string;
  readonly value: unknown;
}

/** Whether `suffix` is the whole id or follows a dot at the end of the id. */
function hasIdSuffix(id: string, suffix: string): boolean {
  return (
    id.endsWith(suffix) && (suffix.length === id.length || id.charAt(id.length - suffix.length - 1) === ID_SEPARATOR)
  );
}

/** The outcome of looking for the one candidate whose ids end in a suffix. */
interface SuffixMatch<T> {
  /** Whether more than one candidate matched, so the suffix is not supported. */
  readonly ambiguous: boolean;
  readonly found: T | null;
}

function matchSuffix<T>(
  candidates: Iterable<T>,
  idsOf: (candidate: T) => readonly string[],
  suffix: string,
): SuffixMatch<T> {
  let found: T | null = null;
  for (const candidate of candidates) {
    for (const id of idsOf(candidate)) {
      if (hasIdSuffix(id, suffix)) {
        if (found !== null) {
          // The suffix is not unique, so we don't support it
          return { ambiguous: true, found: null };
        }
        found = candidate;
      }
    }
  }
  return { ambiguous: false, found };
}

function optionByIdOrLegacy(state: ServiceState, id: string): LayoutOptionData | null {
  return state.options.get(id) ?? state.legacyOptions.get(id) ?? null;
}

/**
 * Class used to register layout services (Java: the private inner class `Registry`).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutMetaDataService.java
 */
class Registry implements ILayoutMetaDataProvider.Registry {
  private readonly optionDependencies: Triple[] = [];
  private readonly optionSupport: Triple[] = [];

  constructor(private readonly state: ServiceState) {}

  /** Registers an algorithm, an option or a category (the three Java overloads, dispatched by `instanceof`). */
  register(data: ILayoutMetaData): void {
    if (data instanceof LayoutAlgorithmData) {
      this.state.algorithms.set(data.getId(), data);
    } else if (data instanceof LayoutOptionData) {
      this.registerOption(data);
    } else if (data instanceof LayoutCategoryData) {
      this.state.categories.set(data.getId(), data);
    }
  }

  private registerOption(optionData: LayoutOptionData): void {
    // #1 register fully qualified id
    this.state.options.set(optionData.getId(), optionData);

    // #2 register legacy options
    for (const legacyId of optionData.getLegacyIds() ?? []) {
      this.state.legacyOptions.set(legacyId, optionData);
    }
  }

  addDependency(sourceOption: string, targetOption: string, requiredValue: unknown): void {
    this.optionDependencies.push({ firstId: sourceOption, secondId: targetOption, value: requiredValue });
  }

  addOptionSupport(algorithm: string, option: string, defaultValue: unknown): void {
    this.optionSupport.push({ firstId: algorithm, secondId: option, value: defaultValue });
  }

  /**
   * Apply all dependencies that have been delivered by layout meta data providers. The three steps of the Java
   * method are private methods here (complexity limit); they run in the Java order.
   */
  applyDependencies(): void {
    this.assignAlgorithmsToCategories();
    this.applyOptionDependencies();
    this.applyOptionSupport();
  }

  /** Go through all registered algorithms and make sure they are in their category (or the backup category). */
  private assignAlgorithmsToCategories(): void {
    for (const algorithm of this.state.algorithms.values()) {
      const categoryId = algorithm.getCategoryId() ?? BACKUP_CATEGORY_ID;
      let category = this.state.categories.get(categoryId) ?? null;
      if (category === null && categoryId === BACKUP_CATEGORY_ID) {
        category = this.retrieveBackupCategory();
      }

      if (category !== null && !category.getLayouters().includes(algorithm)) {
        category.getLayouters().push(algorithm);
      }
    }
  }

  /**
   * Apply layout option dependencies registered with this registry (contrary to the code above, this code requires
   * that layout options we depend on have already been registered).
   */
  private applyOptionDependencies(): void {
    for (const dep of this.optionDependencies) {
      const source = optionByIdOrLegacy(this.state, dep.firstId);
      const target = optionByIdOrLegacy(this.state, dep.secondId);
      if (source !== null && target !== null) {
        source.getDependencies().push(Pair.of(target, dep.value));
      }
    }
    this.optionDependencies.length = 0;
  }

  /**
   * Apply support information for supported layout options (contrary to the code above the code above, this code
   * requires that layout options we want to support have already been registered).
   */
  private applyOptionSupport(): void {
    for (const sup of this.optionSupport) {
      const algorithm = this.state.algorithms.get(sup.firstId);
      const option = optionByIdOrLegacy(this.state, sup.secondId);
      if (algorithm !== undefined && option !== null) {
        algorithm.addKnownOption(option, sup.value);
      }
    }
    this.optionSupport.length = 0;
  }

  /** Returns the "Other" category. If there is none yet, creates one. */
  private retrieveBackupCategory(): LayoutCategoryData {
    let otherCategory = this.state.categories.get(BACKUP_CATEGORY_ID);
    if (otherCategory === undefined) {
      otherCategory = new LayoutCategoryData.Builder().id(BACKUP_CATEGORY_ID).name(BACKUP_CATEGORY_NAME).create();
      this.state.categories.set(BACKUP_CATEGORY_ID, otherCategory);
    }

    return otherCategory;
  }
}

/**
 * Singleton class for access to the ELK layout meta data. This class is used globally to retrieve meta data for
 * automatic layout through ELK.
 *
 * Collections the Java returns as unmodifiable views are snapshot arrays here; the linked maps are insertion-ordered
 * `Map`s (AD-10). The `elkjs-exclude` block of `getInstance` (service loading) is dropped (C8).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutMetaDataService.java
 */
export class LayoutMetaDataService {
  /** the layout data service instance, which is created lazily. */
  private static instance: LayoutMetaDataService | null = null;

  private readonly state: ServiceState = {
    algorithms: new Map(),
    options: new Map(),
    legacyOptions: new Map(),
    categories: new Map(),
  };
  /** Additional map of layout algorithm suffixes to data instances. */
  private readonly algorithmSuffixMap = new Map<string, LayoutAlgorithmData>();
  /** Additional map of layout option suffixes to data instances (for options this includes the option's group). */
  private readonly optionSuffixMap = new Map<string, LayoutOptionData>();

  private constructor() {
    LayoutMetaDataService.initElkReflect();
  }

  /**
   * Returns the singleton instance of the layout data service.
   *
   * @param _loader the class loader object in Java; unused (C8)
   * @returns the singleton instance
   */
  static getInstance(_loader?: unknown): LayoutMetaDataService {
    if (LayoutMetaDataService.instance === null) {
      const service = new LayoutMetaDataService();
      LayoutMetaDataService.instance = service;

      // Be sure to load CoreOptions first
      service.registerLayoutMetaDataProviders(new CoreOptions());
    }

    return LayoutMetaDataService.instance;
  }

  /** Unload any created instance in order to feed the garbage collector. */
  static unload(): void {
    if (LayoutMetaDataService.instance !== null) {
      for (const algoData of LayoutMetaDataService.instance.getAlgorithmData()) {
        algoData.getInstancePool().clear();
      }
      LayoutMetaDataService.instance = null;
    }
  }

  /**
   * Registers all basic data types with `ElkReflect`. This method should only be called from the outside if layout
   * algorithms are supposed to be called directly, which we don't recommend.
   *
   * `Array` stands for `ArrayList` and `Set` for `HashSet`, `LinkedHashSet` and `TreeSet` (AD-10).
   */
  static initElkReflect(): void {
    // every class that implements IDataObject
    // or is used for internal properties must be registered here

    // IDataObject
    ElkReflect.register(
      KVector,
      () => new KVector(),
      (v) => (v as KVector).clone(),
    );
    ElkReflect.register(
      KVectorChain,
      () => new KVectorChain(),
      (vc) => new KVectorChain(vc as KVectorChain),
    );
    ElkReflect.register(
      ElkMargin,
      () => new ElkMargin(),
      (m) => new ElkMargin(m as ElkMargin),
    );
    ElkReflect.register(
      ElkPadding,
      () => new ElkPadding(),
      (p) => new ElkPadding(p as ElkPadding),
    );
    ElkReflect.register(
      IndividualSpacings,
      () => new IndividualSpacings(),
      (is) => new IndividualSpacings(is as IndividualSpacings),
    );

    // Commonly used classes for internal properties
    ElkReflect.register(
      Array,
      () => [],
      (al) => [...(al as unknown[])],
    );
    ElkReflect.register(
      LinkedList,
      () => new LinkedList(),
      (ll) => new LinkedList(ll as LinkedList<unknown>),
    );
    ElkReflect.register(
      Set,
      () => new Set(),
      (hs) => new Set(hs as Set<unknown>),
    );
  }

  /**
   * Registers the data provided by the given meta data providers with the meta data service.
   *
   * @param providers the providers to register.
   */
  registerLayoutMetaDataProviders(...providers: ILayoutMetaDataProvider[]): void {
    for (const provider of providers) {
      const registry = new Registry(this.state);
      provider.apply(registry);
      registry.applyDependencies();
    }
    // As soon as new layout options have been registered, we must clear the suffix cache to ensure unique
    // suffixes from now onwards
    this.optionSuffixMap.clear();
  }

  /**
   * Returns the layout algorithm data associated with the given identifier, or all registered algorithms (the two
   * Java overloads `getAlgorithmData(String)` and `getAlgorithmData()`).
   *
   * @param id layout algorithm identifier
   * @returns the corresponding data, or `null` if there is no algorithm with the given identifier
   */
  getAlgorithmData(id: string): LayoutAlgorithmData | null;
  getAlgorithmData(): readonly LayoutAlgorithmData[];
  getAlgorithmData(id?: string): LayoutAlgorithmData | null | readonly LayoutAlgorithmData[] {
    if (id === undefined) {
      return [...this.state.algorithms.values()];
    }
    return this.state.algorithms.get(id) ?? null;
  }

  /**
   * Returns a layout algorithm data that has the given suffix in its identifier.
   *
   * @param suffix a layout algorithm identifier suffix
   * @returns the first layout algorithm data that has the given suffix, or `null` if no algorithm has that suffix or
   *          the suffix is not unique (multiple algorithms have it)
   */
  getAlgorithmDataBySuffix(suffix: string | null): LayoutAlgorithmData | null {
    if (suffix === null || suffix.length === 0) {
      return null;
    }
    let data = this.algorithmSuffixMap.get(suffix) ?? null;

    if (data === null) {
      // Nothing found? Try to find a suitable suffix
      data = matchSuffix(this.state.algorithms.values(), (d) => [d.getId()], suffix).found;

      if (data !== null) {
        this.algorithmSuffixMap.set(suffix, data);
      }
    }

    return data;
  }

  /**
   * Returns the layout algorithm data associated with the given suffix. If none is found, the algorithm with the
   * given default suffix is returned. If that is not found either, returns `null`.
   *
   * @param algorithmId layout algorithm identifier.
   * @param defaultId fallback layout algorithm identifier. May be `null`.
   * @returns the layout algorithm data or `null` if neither the requested nor the default layout algorithm are present.
   */
  getAlgorithmDataBySuffixOrDefault(algorithmId: string | null, defaultId: string | null): LayoutAlgorithmData | null {
    // First, look for the requested algorithm
    if (algorithmId !== null && algorithmId.trim().length > 0) {
      const algorithmIdData = this.getAlgorithmDataBySuffix(algorithmId);

      if (algorithmIdData !== null) {
        return algorithmIdData;
      }
    }

    // We haven't found the requested algorithm, so look for the requested default algorithm, if any
    if (defaultId !== null && defaultId.trim().length > 0) {
      const defaultIdData = this.getAlgorithmDataBySuffix(defaultId);

      if (defaultIdData !== null) {
        return defaultIdData;
      }
    }

    // Right, at this point we simply give up
    return null;
  }

  /**
   * The three Java overloads of `getOptionData`: by identifier (which may be a legacy identifier, `null` if there is
   * no such option), all registered options, or the options suitable for an algorithm and an option target (the
   * algorithm must know the option, or the option is the algorithm option, and the target must be active for it).
   */
  getOptionData(id: string): LayoutOptionData | null;
  getOptionData(): readonly LayoutOptionData[];
  getOptionData(algorithmData: LayoutAlgorithmData, targetType: LayoutOptionDataTarget): LayoutOptionData[];
  getOptionData(
    first?: string | LayoutAlgorithmData,
    targetType?: LayoutOptionDataTarget,
  ): LayoutOptionData | null | readonly LayoutOptionData[] {
    if (first === undefined) {
      return [...this.state.options.values()];
    }
    if (typeof first === 'string') {
      return optionByIdOrLegacy(this.state, first);
    }
    const optionDataList: LayoutOptionData[] = [];
    for (const optionData of this.state.options.values()) {
      if (first.knowsOption(optionData) || CoreOptions.ALGORITHM.getId() === optionData.getId()) {
        if (targetType !== undefined && optionData.getTargets().contains(targetType)) {
          optionDataList.push(optionData);
        }
      }
    }
    return optionDataList;
  }

  /**
   * Returns a layout option data that has the given suffix in its identifier. The identifier may be a legacy
   * identifier.
   *
   * @param suffix a layout option identifier suffix
   * @returns the first layout option data that has the given suffix, or `null` if no option has that suffix or the
   *          suffix is not unique (multiple options have it)
   */
  getOptionDataBySuffix(suffix: string | null): LayoutOptionData | null {
    if (suffix === null || suffix.length === 0) {
      return null;
    }
    let data = this.optionSuffixMap.get(suffix) ?? null;

    if (data === null) {
      // Nothing found? Try to find a suitable suffix
      const byId = matchSuffix(this.state.options.values(), (d) => [d.getId()], suffix);
      if (byId.ambiguous) {
        return null;
      }
      data = byId.found;

      if (data === null) {
        // Still not lucky? Maybe it's a suffix of a legacy id (we should stop supporting these one day...)
        const byLegacy = matchSuffix(this.state.options.values(), (d) => d.getLegacyIds() ?? [], suffix);
        if (byLegacy.ambiguous) {
          return null;
        }
        data = byLegacy.found;
      }

      if (data !== null) {
        this.optionSuffixMap.set(suffix, data);
      }
    }

    return data;
  }

  /**
   * Returns the data instance of the layout category with the given identifier, or all registered categories (the
   * two Java overloads).
   *
   * @param id identifier of the category
   * @returns the category, or `null` if the layout category is not registered
   */
  getCategoryData(id: string): LayoutCategoryData | null;
  getCategoryData(): readonly LayoutCategoryData[];
  getCategoryData(id?: string): LayoutCategoryData | null | readonly LayoutCategoryData[] {
    if (id === undefined) {
      return [...this.state.categories.values()];
    }
    return this.state.categories.get(id) ?? null;
  }
}
