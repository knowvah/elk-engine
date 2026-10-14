// SPDX-License-Identifier: EPL-2.0
import type { Maybe } from '../../core/util/Maybe.js';
import { GsonBuilder } from '../../gson/GsonBuilder.js';
import { Gson } from '../../gson/Gson.js';
import { JsonElement } from '../../gson/JsonElement.js';
import { JsonIOException } from '../../gson/JsonIOException.js';
import { JsonObject } from '../../gson/JsonObject.js';
import { IOException } from '../../gson/stream/MalformedJsonException.js';
import { JsonReader } from '../../gson/stream/JsonReader.js';
import type { TypeAdapter } from '../../gson/TypeAdapter.js';
import type { ElkNode } from '../ElkNode.js';
import { JsonExporter } from './JsonExporter.js';
import { JsonImportException } from './JsonImportException.js';
import { JsonImporter } from './JsonImporter.js';

const TOP_LEVEL_MESSAGE = 'Top-level element of the graph must be a json object.';

/**
 * Part of a GSON workaround as GSON is by default always 'lenient'. See https://github.com/google/gson/issues/1208.
 * (Java: a `private static final` of `ImportBuilder`.)
 */
const GSON_ELEMENT_ADAPTER: TypeAdapter<JsonElement> = new Gson().getAdapter(JsonElement);

/**
 * Builder for importing.
 *
 * Java nested class `ElkGraphJson.ImportBuilder` (C3: file-level class, aliased on {@link ElkGraphJson}). The Java
 * `forGraph` sets the package-private fields `graph`/`jsonGraph` directly; the constructor takes them here.
 *
 * @see org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/ElkGraphJson.java
 */
export class ImportBuilder {
  private jsonGraph: JsonObject | null;
  private readonly graph: string | null;
  private importerMaybe: Maybe<JsonImporter> | null = null;
  /** See `JsonReader#setLenient(boolean)` for details. */
  private isLenient = true;

  constructor(graph: string | JsonObject) {
    if (typeof graph === 'string') {
      this.graph = graph;
      this.jsonGraph = null;
    } else {
      this.graph = null;
      this.jsonGraph = graph;
    }
  }

  /**
   * In case a later application of layout information is desired, pass a {@link Maybe} instance to this method. The
   * instance is populated with the used {@link JsonImporter}, which can be used to transfer the layout later on.
   */
  rememberImporter(maybe: Maybe<JsonImporter>): this {
    this.importerMaybe = maybe;
    return this;
  }

  /**
   * If `true`, be more relaxed when parsing the JSON, e.g. allow property keys without quotes. By default `true`.
   * Named `lenient` as in Java; the field is `isLenient` because a TS class cannot hold both.
   */
  lenient(beLenient: boolean): this {
    this.isLenient = beLenient;
    return this;
  }

  /** Perform the actual import and return the resulting ELK Graph. */
  toElk(): ElkNode {
    if (this.jsonGraph === null) {
      this.jsonGraph = this.readGraph();
    }

    const importer = new JsonImporter();
    const elkGraph = importer.transform(this.jsonGraph);

    if (this.importerMaybe !== null) {
      this.importerMaybe.set(importer);
    }

    return elkGraph;
  }

  /** The `try` block of the Java `toElk`: a GSON workaround, see {@link GSON_ELEMENT_ADAPTER}. */
  private readGraph(): JsonObject {
    // `new StringReader(null)` throws a NullPointerException in Java; `graph` is a string here by construction.
    const reader = new JsonReader(this.graph as string);
    reader.setLenient(this.isLenient);
    try {
      const json = GSON_ELEMENT_ADAPTER.read(reader);
      if (!(json instanceof JsonObject)) {
        throw new JsonImportException(TOP_LEVEL_MESSAGE);
      }
      return json;
    } catch (e) {
      if (e instanceof IOException) {
        throw new JsonIOException(e);
      }
      throw e;
    }
  }
}

/**
 * Builder for exporting.
 *
 * Java nested class `ElkGraphJson.ExportBuilder` (C3). Like {@link ImportBuilder}, the graph is a constructor
 * argument instead of a package-private field.
 *
 * @see org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/ElkGraphJson.java
 */
export class ExportBuilder {
  private doPrettyPrint = false;
  private omitZeroPosition = true;
  private omitZeroDim = true;
  private omitLayoutInformation = false;
  private shortKeys = true;
  private omitUnknownOptions = true;

  constructor(private readonly graph: ElkNode) {}

  /** Pretty print the resulting json string, e.g. by inserting line breaks. */
  prettyPrint(pretty: boolean): this {
    this.doPrettyPrint = pretty;
    return this;
  }

  /** Omit any superfluous parts of the layout option keys, e.g. 'org.eclipse'. */
  shortLayoutOptionKeys(shortKeys: boolean): this {
    this.shortKeys = shortKeys;
    return this;
  }

  /** Omit the position of an element if both are zero. */
  omitZeroPositions(omitZeroPos: boolean): this {
    this.omitZeroPosition = omitZeroPos;
    return this;
  }

  /** Omit the width and height of elements if they are zero. */
  omitZeroDimension(omitZeroDim: boolean): this {
    this.omitZeroDim = omitZeroDim;
    return this;
  }

  /** Omit any layout information, e.g. node positions. */
  omitLayout(omitLayout: boolean): this {
    this.omitLayoutInformation = omitLayout;
    return this;
  }

  /** Omit any unknown layout options. */
  omitUnknownLayoutOptions(omitUnknownOptions: boolean): this {
    this.omitUnknownOptions = omitUnknownOptions;
    return this;
  }

  /** Perform the export using the specified configuration. */
  toJson(): string {
    // export the graph
    const exporter = new JsonExporter();
    exporter.setOptions(
      this.omitZeroPosition,
      this.omitZeroDim,
      this.omitLayoutInformation,
      this.shortKeys,
      this.omitUnknownOptions,
    );
    const jsonGraph = exporter.export(this.graph);

    // configure the gson builder
    const builder = new GsonBuilder();
    // no need to perform html escaping in our case, hence deactivate it:
    builder.disableHtmlEscaping();
    if (this.doPrettyPrint) {
      builder.setPrettyPrinting();
    }
    const gson = builder.create();

    // return the json string
    return gson.toJson(jsonGraph);
  }
}

/**
 * Utility methods to import and export the ELK Graph JSON Format.
 *
 * @see org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/ElkGraphJson.java
 */
export class ElkGraphJson {
  /** Java nested `ImportBuilder` (C3 alias; the builders do not import this class, so a static field is safe). */
  static readonly ImportBuilder: typeof ImportBuilder = ImportBuilder;
  /** Java nested `ExportBuilder` (C3 alias). */
  static readonly ExportBuilder: typeof ExportBuilder = ExportBuilder;

  private constructor() {}

  /**
   * Initializes an importer for the passed json string or json object (used as is, not copied), or an exporter for
   * the passed graph. The import is finished using {@link ImportBuilder.toElk}, the export using
   * {@link ExportBuilder.toJson}.
   */
  static forGraph(graph: string | JsonObject): ImportBuilder;
  static forGraph(graph: ElkNode): ExportBuilder;
  static forGraph(graph: string | JsonObject | ElkNode): ImportBuilder | ExportBuilder {
    if (typeof graph === 'string' || graph instanceof JsonObject) {
      return new ImportBuilder(graph);
    }
    return new ExportBuilder(graph);
  }
}
