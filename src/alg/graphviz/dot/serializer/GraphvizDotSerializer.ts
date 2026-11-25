// SPDX-License-Identifier: EPL-2.0
import type { IValueConverterService } from '../../../../xtext/conversion/IValueConverterService.js';
import { FormatterPreferenceKeys } from '../../../../xtext/formatting2/FormatterPreferenceKeys.js';
import { FormatterRequest } from '../../../../xtext/formatting2/FormatterRequest.js';
import { MapBasedPreferenceValues } from '../../../../xtext/formatting2/preferences/MapBasedPreferenceValues.js';
import type { ITextRegionAccess } from '../../../../xtext/formatting2/regionaccess/ITextRegionAccess.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import { GraphvizDotFormatter } from '../formatting2/GraphvizDotFormatter.js';
import { GraphvizDotSemanticSequencer, ROOT_CONTEXT } from './GraphvizDotSemanticSequencer.js';
import { GraphvizDotSyntacticSequencer } from './GraphvizDotSyntacticSequencer.js';
import { GraphvizDotTokenWriter } from './GraphvizDotTokenWriter.js';

/** Java `SaveOptions` as far as the serializer reads it: `isFormatting()`. */
export interface DotSaveOptions {
  readonly format: boolean;
}

/** `SaveOptions.defaultOptions()`: not formatting (what `resource.save` and `serialize(obj)` use). */
const DEFAULT_OPTIONS: DotSaveOptions = { format: false };

/**
 * The serializer of the DOT language: Xtext's `Serializer` with `GraphvizDotSerializer`'s override of
 * `serialize(obj, appendable, options)`, which limits lines to {@link MAX_LINE_LENGTH} characters (the formatter
 * autowraps every hidden region). The Guice bindings become plain construction: the value converter service of
 * the grammar is the one injected dependency (Xtext's `ValueSerializer` gets it injected); the semantic and
 * syntactic sequencers and the formatter are fresh per call, as their providers make them.
 *
 * Every failure to serialize throws Java's `RuntimeException` (`ISerializationDiagnostic.ExceptionThrowingAcceptor`)
 * with the diagnostic text: a violated bound (`Could not serialize Node:\nNode.name is required ...`), a missing
 * value of a statement `Attribute`, an `EdgeTarget` with neither or both targets, or a value the `ID` converter
 * rejects (the converter's exception is the cause). A bare `Statement` throws `IllegalStateException` without
 * message. Formatting conflicts go to the request's default exception handler, which drops them (first wins).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/serializer/GraphvizDotSerializer.java
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/impl/Serializer.java
 */
export class GraphvizDotSerializer {
  private static readonly MAX_LINE_LENGTH = 255;

  constructor(private readonly valueConverters: IValueConverterService) {}

  /**
   * `Serializer.serializeToRegions(obj)`: the context of the root, then the semantic sequencer feeding the syntactic
   * sequencer, which builds the region access.
   *
   * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/impl/Serializer.java:140-147
   */
  serializeToRegions(obj: GraphvizModel): ITextRegionAccess {
    const syntactic = new GraphvizDotSyntacticSequencer(obj);
    const semantic = new GraphvizDotSemanticSequencer(new GraphvizDotTokenWriter(syntactic, this.valueConverters));
    semantic.createSequence(ROOT_CONTEXT, obj);
    return syntactic.finish();
  }

  /**
   * `ISerializer.serialize(obj, options)` through `GraphvizDotSerializer.serialize(obj, appendable, options)`.
   *
   * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/serializer/GraphvizDotSerializer.java:46-58
   */
  serialize(obj: GraphvizModel, options: DotSaveOptions = DEFAULT_OPTIONS): string {
    const regionAccess = this.serializeToRegions(obj);
    const request = new FormatterRequest();
    const preferences = new MapBasedPreferenceValues(null, new Map<string, string>());
    preferences.putTyped(FormatterPreferenceKeys.maxLineWidth, GraphvizDotSerializer.MAX_LINE_LENGTH);
    request.setPreferences(preferences);
    request.setFormatUndefinedHiddenRegionsOnly(!options.format);
    request.setTextRegionAccess(regionAccess);
    const formatter2 = new GraphvizDotFormatter();
    const replacements = formatter2.formatRequest(request);
    let appendable = '';
    regionAccess.getRewriter().renderToAppendable(replacements, {
      append: (text: string) => {
        appendable += text;
      },
    });
    return appendable;
  }
}
