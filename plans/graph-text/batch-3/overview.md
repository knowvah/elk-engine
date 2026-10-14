<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — ELK value converters and Xtext scoping

Two independent tasks with disjoint write-sets that consume the foundations of batches 2a and 2b: T13 writes
the four ELK converter classes and the ELK qualified-name converter on T7 (converters, `Strings`), T8
(`QualifiedName`), T9 (lexer, keyword set) and T10 (`LayoutOptionProxy`); T14 ports the Xtext scoping subset
on T8. Depends on batches 2a and 2b.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T13 | ELK value converters (`Number`, `PropertyKey`, `PropertyValue`, service) and `ElkGraphQualifiedNameConverter` | typescript-pro | src/graph/text/conversion/{ElkGraphValueConverterService,NumberValueConverter,PropertyKeyValueConverter,PropertyValueValueConverter}.ts, src/graph/text/naming/ElkGraphQualifiedNameConverter.ts (+ .test.ts) | T2, T3, T7, T8, T9, T10 | [ ] |
| T14 | Xtext scoping: scopes, descriptions, `Scopes`, `ImportedNamespaceAwareLocalScopeProvider` | typescript-pro | src/xtext/scoping/**, src/xtext/resource/** (+ .test.ts) | T8 | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
