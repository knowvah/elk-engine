// SPDX-License-Identifier: EPL-2.0
// Ported from org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/IdTest.java
// @see org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/IdTest.java
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { ElkGraphJson } from './ElkGraphJson.js';
import { JsonImportException } from './JsonImportException.js';

describe('IdTest', () => {
  beforeEach(() => {
    LayoutMetaDataService.unload();
    LayoutMetaDataService.getInstance();
  });

  it('testNoId', () => {
    expect(() => ElkGraphJson.forGraph('{}').toElk()).toThrow(JsonImportException);
  });

  it('testWrongIdTypeNumber', () => {
    expect(() => ElkGraphJson.forGraph('{ id: 1.2 }').toElk()).toThrow(JsonImportException);
  });

  it('testWrongIdTypeObject', () => {
    expect(() => ElkGraphJson.forGraph('{ id: {} }').toElk()).toThrow(JsonImportException);
  });

  it('testWrongIdTypeArray', () => {
    expect(() => ElkGraphJson.forGraph('{ id: [] }').toElk()).toThrow(JsonImportException);
  });

  it('testWrongIdTypeBoolean', () => {
    expect(() => ElkGraphJson.forGraph('{ id: true }').toElk()).toThrow(JsonImportException);
  });

  it('testGoodIdString', () => {
    ElkGraphJson.forGraph("{ id: 'foo' }").toElk();
  });

  it('testGoodIdInt', () => {
    ElkGraphJson.forGraph('{ id: 3 }').toElk();
  });
});
