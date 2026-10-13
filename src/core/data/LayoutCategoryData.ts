// SPDX-License-Identifier: EPL-2.0
import * as JavaString from '../../java/lang/JavaString.js';
import type { ILayoutMetaData } from './ILayoutMetaData.js';
import type { LayoutAlgorithmData } from './LayoutAlgorithmData.js';

/** The values a {@link LayoutCategoryDataBuilder} collects (Java: private fields named like the builder methods). */
export interface LayoutCategoryDataBuilderFields {
  id: string | null;
  name: string | null;
  description: string | null;
}

/**
 * Builder for {@link LayoutCategoryData} instances. The collected values live in {@link fields},
 * which the `LayoutCategoryData` constructor reads (a TypeScript property cannot share a name with
 * a builder method).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutCategoryData.java
 */
export class LayoutCategoryDataBuilder {
  readonly fields: LayoutCategoryDataBuilderFields = { id: null, name: null, description: null };

  /** Create an instance with the configured values. */
  create(): LayoutCategoryData {
    return new LayoutCategoryData(this);
  }

  /** Configure the {@link LayoutCategoryData.getId id}. */
  id(aid: string): this {
    this.fields.id = aid;
    return this;
  }

  /** Configure the {@link LayoutCategoryData.getName name}. */
  name(aname: string): this {
    this.fields.name = aname;
    return this;
  }

  /** Configure the {@link LayoutCategoryData.getDescription description}. */
  description(adescription: string): this {
    this.fields.description = adescription;
    return this;
  }
}

/**
 * Data type used to store information for a layout category. A layout category defines the basic
 * graph drawing approach employed by a layout algorithm, for instance the layer-based approach or
 * the force-based approach. The category of an algorithm can be left empty, in which case it is
 * displayed as "Other" in the user interface.
 *
 * The Java constructor is private and called by the nested `Builder`; TypeScript has no nested-class
 * access, so the constructor is public. An unset id (a Java `NullPointerException` in `equals`)
 * becomes `''`. `Builder` is defined in this file, so no import cycle arises.
 *
 * @author msp
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutCategoryData.java
 */
export class LayoutCategoryData implements ILayoutMetaData {
  /** Builder for {@link LayoutCategoryData} instances. */
  static readonly Builder: typeof LayoutCategoryDataBuilder = LayoutCategoryDataBuilder;

  /** identifier of the layout type. */
  private readonly id: string;
  /** user friendly name of the layout type. */
  private readonly name: string | null;
  /** detail description. */
  private readonly description: string | null;
  /** the list of layout algorithms that are registered for this category. */
  private readonly layouters: LayoutAlgorithmData[] = [];

  /** Create a layout category data entry. */
  constructor(builder: LayoutCategoryDataBuilder) {
    this.id = builder.fields.id ?? '';
    this.name = builder.fields.name;
    this.description = builder.fields.description;
  }

  equals(obj: unknown): boolean {
    if (obj instanceof LayoutCategoryData) {
      return this.id === obj.id;
    }
    return false;
  }

  hashCode(): number {
    return JavaString.hashCode(this.id);
  }

  toString(): string {
    return `Layout Type: ${this.id}`;
  }

  /** Returns the list of layout algorithms that are registered for this type. */
  getLayouters(): LayoutAlgorithmData[] {
    return this.layouters;
  }

  /** Returns the layout type identifier. */
  getId(): string {
    return this.id;
  }

  /** Returns the name of the layout type. */
  getName(): string | null {
    return this.name;
  }

  /** Returns the description. */
  getDescription(): string | null {
    return this.description;
  }
}
