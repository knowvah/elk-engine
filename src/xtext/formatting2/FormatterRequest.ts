// SPDX-License-Identifier: EPL-2.0
import { ExceptionAcceptor, type ExceptionHandler } from './ExceptionAcceptor.js';
import { MapBasedPreferenceValues } from './preferences/MapBasedPreferenceValues.js';
import type { ITypedPreferenceValues } from './preferences/ITypedPreferenceValues.js';
import type { ITextRegion } from './regionaccess/ITextRegion.js';
import type { ITextRegionAccess } from './regionaccess/ITextRegionAccess.js';

/**
 * One formatting request. The requested `regions` are always empty for the writer (`Serializer.java:150-155`
 * never adds one), so there is no `addRegion`/`setRegions`; the consumers (`AbstractFormatter2.isInRequestedRange`,
 * `TextReplacerContext.isInRequestedRange`) port only the empty-regions arm.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/FormatterRequest.java
 */
export class FormatterRequest {
  private readonly regions: readonly ITextRegion[] = [];
  private textRegionAccess: ITextRegionAccess | null = null;
  private allowIdentityEditsFlag = false;
  private preferences: ITypedPreferenceValues | null = null;
  private formatUndefinedHiddenRegionsOnly = false;
  private exceptionHandler: ExceptionHandler | null = null;
  private enableDebugTracing = false;

  getRegions(): readonly ITextRegion[] {
    return this.regions;
  }

  getTextRegionAccess(): ITextRegionAccess {
    return this.textRegionAccess!;
  }

  setTextRegionAccess(tokens: ITextRegionAccess): this {
    if (tokens.hasSyntaxError() && this.exceptionHandler === null) {
      this.exceptionHandler = ExceptionAcceptor.IGNORING;
    }
    this.textRegionAccess = tokens;
    return this;
  }

  setAllowIdentityEdits(allowIdentityEdits: boolean): this {
    this.allowIdentityEditsFlag = allowIdentityEdits;
    return this;
  }

  allowIdentityEdits(): boolean {
    return this.allowIdentityEditsFlag;
  }

  setPreferences(preferenceValues: ITypedPreferenceValues): this {
    this.preferences = preferenceValues;
    return this;
  }

  getPreferences(): ITypedPreferenceValues {
    if (this.preferences === null) {
      this.preferences = new MapBasedPreferenceValues();
    }
    return this.preferences;
  }

  isFormatUndefinedHiddenRegionsOnly(): boolean {
    return this.formatUndefinedHiddenRegionsOnly;
  }

  setFormatUndefinedHiddenRegionsOnly(formatUndefinedHiddenRegionsOnly: boolean): this {
    this.formatUndefinedHiddenRegionsOnly = formatUndefinedHiddenRegionsOnly;
    return this;
  }

  getExceptionHandler(): ExceptionHandler {
    return this.exceptionHandler ?? ExceptionAcceptor.LOGGING;
  }

  getExplicitExceptionHandler(): ExceptionHandler | null {
    return this.exceptionHandler;
  }

  setExceptionHandler(problemHandler: ExceptionHandler | null): this {
    this.exceptionHandler = problemHandler;
    return this;
  }

  isEnableDebugTracing(): boolean {
    return this.enableDebugTracing;
  }

  setEnableDebugTracing(enableDebugTracing: boolean): void {
    this.enableDebugTracing = enableDebugTracing;
  }
}
