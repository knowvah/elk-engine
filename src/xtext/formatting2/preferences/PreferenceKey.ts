// SPDX-License-Identifier: EPL-2.0

/**
 * A preference key: an id plus a default value (`null` = no default).
 *
 * Placed under `formatting2/preferences` because the T12 write-set is `src/xtext/formatting2/**`; the Xtext
 * class is `org.eclipse.xtext.preferences.PreferenceKey` (the file-mapping rule would put it in
 * `src/xtext/preferences/`).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/preferences/PreferenceKey.java
 */
export class PreferenceKey {
  private readonly id: string;
  private readonly defaultValue: string | null;

  constructor(id: string, defaultValue: string | null) {
    this.id = id;
    this.defaultValue = defaultValue;
  }

  getDefaultValue(): string | null {
    return this.defaultValue;
  }

  getId(): string {
    return this.id;
  }

  toString(): string {
    return `Preference key '${this.id}' with default value '${this.getDefaultValue()}'.`;
  }
}
