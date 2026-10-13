// SPDX-License-Identifier: EPL-2.0
import type { EnumSet } from '../../java/util/EnumSet.js';
import type { JavaClassRef } from '../../java/lang/JavaClass.js';
import { LayoutOptionData } from './LayoutOptionData.js';
import type { LayoutOptionDataTarget } from './LayoutOptionDataTarget.js';
import type { LayoutOptionDataType } from './LayoutOptionDataType.js';
import type { LayoutOptionDataVisibility } from './LayoutOptionDataVisibility.js';

/** The values a {@link LayoutOptionDataBuilder} collects (Java: private fields named like the builder methods). */
export interface LayoutOptionDataBuilderFields {
  id: string | null;
  group: string | null;
  legacyIds: string[] | null;
  defaultValue: unknown;
  clazz: JavaClassRef | null;
  type: LayoutOptionDataType | null;
  name: string | null;
  description: string | null;
  targets: EnumSet<LayoutOptionDataTarget> | null;
  visibility: LayoutOptionDataVisibility | null;
  lowerBound: unknown;
  upperBound: unknown;
}

/**
 * Builder for {@link LayoutOptionData} instances. A Java field and method may share a name, a
 * TypeScript property may not: the collected values live in {@link fields}, which the
 * `LayoutOptionData` constructor reads.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutOptionData.java
 */
export class LayoutOptionDataBuilder {
  /** The collected values. */
  readonly fields: LayoutOptionDataBuilderFields = {
    id: null,
    group: null,
    legacyIds: null,
    defaultValue: null,
    clazz: null,
    type: null,
    name: null,
    description: null,
    targets: null,
    visibility: null,
    lowerBound: null,
    upperBound: null,
  };

  /** Create an instance with the configured values. */
  create(): LayoutOptionData {
    return new LayoutOptionData(this);
  }

  /** Configure the id. */
  id(aid: string): this {
    this.fields.id = aid;
    return this;
  }

  /** Configure the group. */
  group(agroup: string): this {
    this.fields.group = agroup;
    return this;
  }

  /** Configure the legacy ids. */
  legacyIds(...alegacyIds: string[]): this {
    this.fields.legacyIds = alegacyIds;
    return this;
  }

  /** Configure the default value. */
  defaultValue(adefaultValue: unknown): this {
    this.fields.defaultValue = adefaultValue;
    return this;
  }

  /** Configure the option class. */
  optionClass(aclazz: JavaClassRef | null): this {
    this.fields.clazz = aclazz;
    return this;
  }

  /** Configure the type. */
  type(atype: LayoutOptionDataType): this {
    this.fields.type = atype;
    return this;
  }

  /** Configure the name. */
  name(aname: string): this {
    this.fields.name = aname;
    return this;
  }

  /** Configure the description. */
  description(adescription: string): this {
    this.fields.description = adescription;
    return this;
  }

  /** Configure the targets. */
  targets(atargets: EnumSet<LayoutOptionDataTarget>): this {
    this.fields.targets = atargets;
    return this;
  }

  /** Configure the visibility. */
  visibility(avisibility: LayoutOptionDataVisibility): this {
    this.fields.visibility = avisibility;
    return this;
  }

  /** Configure the lower bound. */
  lowerBound(alowerBound: unknown): this {
    this.fields.lowerBound = alowerBound;
    return this;
  }

  /** Configure the upper bound. */
  upperBound(aupperBound: unknown): this {
    this.fields.upperBound = aupperBound;
    return this;
  }
}
