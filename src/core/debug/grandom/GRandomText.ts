// SPDX-License-Identifier: EPL-2.0
import { type GRandomParseResult, parse as parseText } from './parser/GRandomParser.js';
import { GRandomValidator } from './validation/GRandomValidator.js';

/** `Diagnostic.Syntax`: the code of syntax and value-conversion errors alike. */
const CODE_SYNTAX = 'org.eclipse.xtext.diagnostics.Diagnostic.Syntax';

/** An `IResourceValidator` issue of a `.elkr` document. */
export interface GRandomIssue {
  readonly severity: 'error';
  readonly code: string | null;
  readonly message: string;
  readonly line: number;
  readonly offset: number;
  readonly length: number;
  /** The name of the feature a check issue sits on; `null` for syntax and conversion issues. */
  readonly feature: string | null;
}

const VALIDATOR = new GRandomValidator();

function validateText(text: string): GRandomIssue[] {
  const result = parseText(text);
  const resourceIssues = [...result.syntaxErrors, ...result.conversionErrors].map((d): GRandomIssue => ({
    severity: 'error',
    code: CODE_SYNTAX,
    ...d,
    feature: null,
  }));
  const checkIssues = (result.model?.getConfigs() ?? []).flatMap((conf) =>
    VALIDATOR.optionsRestrictions(conf).map(({ message, feature }): GRandomIssue => {
      const name = feature.getName();
      const at = result.positions.featurePosition(conf, name) ?? { line: 1, offset: 0, length: 0 };
      return { severity: 'error', code: null, message, ...at, feature: name };
    }),
  );
  return [...resourceIssues, ...checkIssues];
}

/**
 * The `.elkr` language facade: `parse` returns the model with its diagnostics, `validate` the issues in
 * `ResourceValidatorImpl` order (resource errors first, then the checks per object in containment pre-order).
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/GRandom.xtext
 */
export const GRandomText = {
  parse: (text: string): GRandomParseResult => parseText(text),
  validate: validateText,
};
