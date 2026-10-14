// SPDX-License-Identifier: EPL-2.0
import { LayoutAlgorithmData } from '../../core/data/LayoutAlgorithmData.js';
import { LayoutCategoryData } from '../../core/data/LayoutCategoryData.js';
import { LayoutOptionData } from '../../core/data/LayoutOptionData.js';
import type { ILayoutMetaData } from '../../core/data/ILayoutMetaData.js';
import type { JsonObject } from '../../gson/JsonObject.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { JsonAdapter } from './JsonAdapter.js';

const ADAPTER = new JsonAdapter(); // Xtend `static extension JsonAdapter = new JsonAdapter`

/**
 * Utility class, allows to convert ILayoutMetaData instances retrieved from the ILayoutMetaDataService to a json
 * representation.
 *
 * @see org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonMetaDataConverter.xtend
 */
export class JsonMetaDataConverter {
  private static createCommon(data: ILayoutMetaData): JsonObject {
    const jsonObj = ADAPTER.newJsonObject();
    if (data.getId() !== null) {
      ADAPTER.addJsonObj(jsonObj, 'id', data.getId());
    }
    if (data.getName() !== null) {
      ADAPTER.addJsonObj(jsonObj, 'name', data.getName());
    }
    if (data.getDescription() !== null) {
      ADAPTER.addJsonObj(jsonObj, 'description', data.getDescription());
    }
    return jsonObj;
  }

  /**
   * The Xtend dispatcher over the three `toJson` overloads (translation-rules 6.5): `instanceof` in declaration
   * order, none matching is the dispatcher's IllegalArgumentException (the argument's `toString`, `null` for null).
   *
   * @see JsonMetaDataConverter.xtend `dispatch toJson`
   */
  static toJson(data: ILayoutMetaData): JsonObject {
    if (data instanceof LayoutAlgorithmData) return JsonMetaDataConverter.toJsonAlgorithm(data);
    if (data instanceof LayoutCategoryData) return JsonMetaDataConverter.toJsonCategory(data);
    if (data instanceof LayoutOptionData) return JsonMetaDataConverter.toJsonOption(data);
    throw new IllegalArgumentException(`Unhandled parameter types: [${String(data)}]`);
  }

  private static toJsonAlgorithm(lad: LayoutAlgorithmData): JsonObject {
    const jsonObj = JsonMetaDataConverter.createCommon(lad);
    if (lad.getCategoryId() !== null) {
      ADAPTER.addJsonObj(jsonObj, 'category', lad.getCategoryId());
    }
    const knownOptionIds = lad.getKnownOptionIds();
    if (knownOptionIds !== null && knownOptionIds.size > 0) {
      const jsonArr = ADAPTER.newJsonArray();
      ADAPTER.addJsonObj(jsonObj, 'knownOptions', jsonArr);
      for (const o of knownOptionIds) ADAPTER.addJsonArr(jsonArr, ADAPTER.toJson(o));
    }
    const supportedFeatures = lad.getSupportedFeatures();
    if (supportedFeatures !== null && !supportedFeatures.isEmpty()) {
      const jsonArr = ADAPTER.newJsonArray();
      ADAPTER.addJsonObj(jsonObj, 'supportedFeatures', jsonArr);
      for (const f of supportedFeatures) ADAPTER.addJsonArr(jsonArr, ADAPTER.toJson(f.toString()));
    }
    return jsonObj;
  }

  private static toJsonCategory(lcd: LayoutCategoryData): JsonObject {
    const jsonObj = JsonMetaDataConverter.createCommon(lcd);
    const layouters = lcd.getLayouters();
    if (layouters !== null && layouters.length > 0) {
      const jsonArr = ADAPTER.newJsonArray();
      ADAPTER.addJsonObj(jsonObj, 'knownLayouters', jsonArr);
      for (const l of layouters) {
        if (l.getId() !== null) {
          ADAPTER.addJsonArr(jsonArr, ADAPTER.toJson(l.getId()));
        }
      }
    }
    return jsonObj;
  }

  private static toJsonOption(lod: LayoutOptionData): JsonObject {
    const jsonObj = JsonMetaDataConverter.createCommon(lod);
    if (lod.getGroup() !== null) {
      ADAPTER.addJsonObj(jsonObj, 'group', lod.getGroup());
    }
    if (lod.getType() !== null) {
      ADAPTER.addJsonObj(jsonObj, 'type', String(lod.getType()));
    }
    const targets = lod.getTargets();
    if (targets !== null && !targets.isEmpty()) {
      const jsonArr = ADAPTER.newJsonArray();
      ADAPTER.addJsonObj(jsonObj, 'targets', jsonArr);
      for (const t of targets) ADAPTER.addJsonArr(jsonArr, ADAPTER.toJson(t.toString()));
    }
    return jsonObj;
  }
}
