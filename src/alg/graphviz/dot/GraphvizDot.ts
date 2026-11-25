// SPDX-License-Identifier: EPL-2.0
import type { GraphvizModel } from './dot/GraphvizModel.js';
import { parse, type DotParseDiagnostic } from './parser/GraphvizDotParser.js';
import { createValueConverterService } from './parser/GraphvizDotValueConverters.js';
import { GraphvizDotSerializer, type DotSaveOptions } from './serializer/GraphvizDotSerializer.js';

/** A diagnostic of a loaded resource: the port of `Resource.Diagnostic` in `resource.getErrors()`. */
export type DotDiagnostic = Pick<DotParseDiagnostic, 'kind' | 'message' | 'line'>;

/** The result of {@link GraphvizDot.load}: the model, if there is one, and the diagnostics. */
export interface DotLoadResult {
  readonly model: GraphvizModel | null;
  readonly errors: readonly DotDiagnostic[];
}

/**
 * The entry point of the DOT language, internal (D5): the port of what the layouter does with an `XtextResource`
 * from `DotResourceSetProvider` (load text, read `getErrors()` and the root AST element) and with the `ISerializer`
 * bound by `GraphvizDotRuntimeModule`. The Guice bindings become plain construction: the value converter service
 * and the serializer are built per call, so there is no module-level state.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotResourceSetProvider.java
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/GraphvizDotRuntimeModule.java
 */
export const GraphvizDot = {
  /**
   * Parses `text` and collects the diagnostics, never throwing on bad input. Syntax errors are presence-only (D4);
   * with one, `model` is the partial model of the parse, `null` if it produced none.
   *
   * @param text the DOT source
   * @returns the model and the diagnostics in node order
   */
  load(text: string): DotLoadResult {
    const result = parse(text, createValueConverterService());
    return { model: result.root, errors: result.diagnostics };
  },

  /**
   * `ISerializer.serialize(model, options)`; the default is the unformatted form, which is what `resource.save`
   * writes for the layouter.
   *
   * @param model the model to write
   * @param options `format` selects the formatted form
   * @returns the DOT text
   * @throws RuntimeException when the model cannot be written (see {@link GraphvizDotSerializer})
   * @throws IllegalStateException for a bare `Statement`
   */
  serialize(model: GraphvizModel, options?: DotSaveOptions): string {
    return new GraphvizDotSerializer(createValueConverterService()).serialize(model, options);
  },
};
