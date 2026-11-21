---
title: Overblik
sourceHash: ae706ea0c693889bbac9d0298ac9906f2282efda6d617acd987e7c3a37e406eb
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Overblik

`@knowvah/elk-engine` er en tro TypeScript-portering af [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), Java-biblioteket til graflayout. Der er intet Java og
ingen WASM: Layoutalgoritmerne er genimplementeret i almindelig TypeScript og verificeret mod
Java-implementeringen.

::: warning Pre-1.0
Alle de ELK-layoutalgoritmer, der er omfattet, er porteret og kontrolleret mod ELK bygget fra kildekode;
[paritetsrapporten](/parity) har resultaterne. Den offentlige eksportoverflade er godkendt, men endnu ikke i
`src/index.ts`, så pakkens indgang eksporterer endnu intet offentligt. Indtil 1.0 kan API'en stadig ændre sig.
Se [køreplanen](/guide/roadmap) for, hvad der kommer næste gang.
:::

## Java er specifikationen

Java-kildekoden ved den fastlåste ELK-commit `8bca22f4afa3371562d2f702d59929818f7f7b71` er den
kanoniske specifikation. Porteringen følger den tæt:

- Algoritmer bliver hverken optimeret eller forenklet. Ser Java-koden redundant ud, bevares redundansen.
- Hver gren bliver porteret, og metodegrænser bevares, medmindre TypeScript tvinger en ændring.
- JUnit-testene bliver porteret sammen med den kode, de tester.
- Java-runtime-adfærd, som ELK bygger på (32-bit heltalsaritmetik, `HashMap`-iterationsrækkefølge,
  `Random`-sekvenser), gengives af shims. Se [Java-grundlag](/da/guide/java-foundations).

[Oversættelsesreglerne](/guide/translation-rules) opregner, hvordan hvert Java-begreb afbildes på TypeScript.

## Verifikation mod et orakel

Oraklet er upstream-ELK bygget fra kildekode i et frakoblet git-worktree ved den fastlåste commit.
Porteringens uddata sammenlignes med oraklets uddata:

- Id'er, elementantal, kantsektionstopologi, antal knækpunkter og ikke-numeriske værdier skal stemme
  præcist overens.
- Numeriske koordinater og størrelser skal stemme overens inden for en absolut tolerance på `1e-6`.

Udvalgte orakel-uddata er indchecket som golden-referencer, så det ikke kræver en JVM at køre testene.
Den fulde fremgangsmåde står på siden om [overensstemmelse](/da/conformance).

## Offentlig kontrakt

Den offentlige API er den eksportoverflade, der er godkendt i
[#90](https://github.com/knowvah/elk-engine/issues/90): ElkGraph-objektmodellen og
`ElkGraphUtil`-factories, layoutmotoren, hver algoritmes metadataudbyder og indstillinger med
deres værdityper samt ELK JSON- og de tekstuelle grafformater. ELK JSON er en I/O-adapter, ikke
kernemodellen. [Kom i gang](/guide/getting-started) viser overfladen i brug. Versionerne forbliver 0.x
indtil 1.0; 1.0 fryser overfladen.

## Runtime-begrænsninger

- `src/` er browsersikker: ingen Node-indbyggede moduler, ingen `process.env`, kun ES-moduler.
- Der er ingen runtime-afhængigheder.

## Hvor du kan gå videre

- [Arkitektur](/da/guide/architecture): hvordan oraklet, bundlerne og layoutmotoren hænger sammen.
- [Porteringskort](/guide/port-map) og [inventar](/guide/inventory): hvilke Java-pakker der afbildes på
  hvilke moduler.
- [Bidrag](/da/guide/contributing): gates og arbejdsgang.
