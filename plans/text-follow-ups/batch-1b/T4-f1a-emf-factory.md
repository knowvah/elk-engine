<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: F1a EMF EFactory conversions (typescript-pro)

**Goal:** the EMF path Xtext's `DefaultTerminalConverter` calls,
`dataType.getEPackage().getEFactoryInstance().createFromString(dataType, string)` and `convertToString(dataType, value)`,
exists for the three datatypes the grammars reach (D6).

## Context

Both grammars declare `SIGNED_INT returns ecore::EInt` and `FLOAT returns ecore::EDouble`; comments, `WS` and
`ANY_OTHER` are `EString`. `src/emf/ecore/` has `EClass`, `EObject`, `InternalEObject`, `impl/BasicEObjectImpl` and
no datatype/package/factory types yet. Number shims exist: `src/java/lang/{JavaInteger,JavaDouble,DoubleToString}.ts`.

## Write-set (all new)

- `src/emf/ecore/EDataType.ts`, `src/emf/ecore/EPackage.ts`, `src/emf/ecore/EFactory.ts` (interfaces; only the members
  below), `src/emf/ecore/EcorePackage.ts` (the `EInt`, `EDouble`, `EString` literals and the package)
- `src/emf/ecore/impl/EcoreFactoryImpl.ts`
- Colocated `*.test.ts`

## Read-set

- EMF `EcoreFactoryImpl.java` (`createFromString`/`convertToString` switch and the `createEIntFromString`,
  `createEDoubleFromString`, `convertEDoubleToString`… arms) and `EFactoryImpl.createFromString`/`convertToString`
  (the `EString` and `null` handling), eclipse-emf on GitHub
- `src/java/lang/{JavaInteger,JavaDouble,DoubleToString}.ts` (exports, thrown classes)
- `src/emf/ecore/EClass.ts` (style of a minimal Ecore interface)
- `decisions.md#d6-emf-factory`

## Interface contract (output, consumed by T8)

```ts
interface EDataType { getName(): string; getEPackage(): EPackage; }
interface EPackage { getEFactoryInstance(): EFactory; }
interface EFactory {
  createFromString(eDataType: EDataType, literalValue: string | null): unknown; // throws as the Java does
  convertToString(eDataType: EDataType, instanceValue: unknown): string | null;
}
// EcorePackage exposes the EInt, EDouble and EString EDataType literals.
```

Names and nullability follow the EMF signatures; an EMF member nothing reaches is not added (YAGNI). If EMF's arm
differs from the shims (e.g. the exception class or message for `"abc"`), the EMF source and existing shim vectors
decide; a behaviour only OpenJDK source could settle is stop 5.

## Acceptance criteria

- Given `EInt`, when `createFromString` gets `"+1"`, `"-0"`, `"2147483648"` or `"abc"`, then it returns `1`/`0`, or
  throws what the shim's `Integer.valueOf` vectors record.
- Given `EDouble`, when it converts `"1e3"`, `"1d"`, `".5"` or `"abc"`, then the result or exception matches
  `JavaDouble.parseDouble`; `convertToString(EDouble, 2)` is `"2.0"` (`DoubleToString`).
- Given `EString`, then both directions are the identity, and `null` maps to `null` in both directions as EMF's
  `EFactoryImpl` does.
- Given the new files, then the SPDX, boundary (`src/emf` imports only `src/emf`, `src/java`, `src/guava`) and
  complexity checks pass, and each file carries its `@see`.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: new files only.

## Commit

`feat(T4): port the ecore factory conversions for eint, edouble, estring`
