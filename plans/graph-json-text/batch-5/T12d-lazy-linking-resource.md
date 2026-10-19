<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12d — `LazyLinkingResource`

**Agent:** typescript-pro · **Commit:** `feat(T12d): port xtext's lazy linking resource`

## Context
D13, `batch-5/d13-plan.md` §1(b)(c): `LazyLinkingResource.getEObject(String)` (`:230-248`) decodes `|n` fragments and
calls `getEObject(fragment, triple)` (from `:250`): unresolvable set → null; `getLinkingService().getLinkedObjects`;
empty → `createAndAddDiagnostic` (`:369`) + null; > 1 → `IllegalStateException`; assignability check;
`removeDiagnostic` (`:397`). `resolveLazyCrossReferences` (`:135-150`) walks `getAllContents` pre-order, reads
`basicGet`, resolves cross-link proxies of this resource, `setUnique` on success. Cyclic-linking detection and the
`ExceptionDiagnostic` branch are ported (omission rule: all but `OPTION_RESOLVE_ALL` and the eager flag).
`OnChangeEvictingCache` → a plain field (no change notifications in the port; document). Java `LazyLinkingResource`
extends `XtextResource` extends `ResourceImpl`; port only the `XtextResource` members this chain uses, on T12a's
`ResourceImpl` (document the subset).

## Task
1. `src/xtext/linking/lazy/LazyLinkingResource.ts` (split into `LazyLinkingResource*.ts` files only at Java method
   boundaries if the complexity gate needs it): `resolveLazyCrossReferences`, `doResolveLazyCrossReference`,
   `getEObject(String)`, `getEObject(fragment, triple)` (split for CCN), `createAndAddDiagnostic` (both overloads),
   `removeDiagnostic`, unresolvable set, `markUnresolvable`, `addLazyProxyInformation`/proxy-information list,
   `getLinkingService`, `getEncoder`, the `XtextResource` subset (parse result, errors/warnings lists).
2. Diagnostics: `XtextLinkingDiagnostic` (existing, `src/xtext/linking/impl/`) with the
   `ILinkingDiagnosticMessageProvider` text; duplicate suppression via `XtextLinkingDiagnostic.equals` and the
   unresolvable set.
3. Tests from the Xtext source with stub linking services: resolution success/failure, one diagnostic per unresolvable
   fragment however often accessed, > 1 match → `IllegalStateException`, assignability failure, cyclic detection,
   exception → `ExceptionDiagnostic`, `resolveLazyCrossReferences` order (pre-order, sources before targets).

## Write-set
`src/xtext/linking/lazy/LazyLinkingResource*.ts` (+ colocated tests).

## Interface contracts (outputs)
`LazyLinkingResource` (implements T12c's resource-side interface; `getErrors()` live), `resolveLazyCrossReferences`.
Consumed by T12f, T13, T14 (`ResourceValidatorImpl.resolveProxies`).

## Acceptance criteria
- Given an unresolvable proxy accessed three times, when errors are read, then exactly one linking diagnostic.
- Given a resource with proxies, when `resolveLazyCrossReferences` runs, then diagnostics follow pre-order (nested
  children's edges first; sources before targets) — the order T3's `diagnosticsAfterResolveOnly` records.
- Given the fitness tests, when run, then `src/xtext/linking/lazy` imports no `src/graph`.
