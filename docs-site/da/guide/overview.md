---
title: Overblik
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Overblik

`@knowvah/elk-engine` er en tro TypeScript-portering af [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), Java-biblioteket til graflayout. Der er intet Java og
ingen WASM: Layoutalgoritmerne er genimplementeret i almindelig TypeScript og verificeret mod
Java-implementeringen.

::: warning Pre-alfa
Endnu er ingen layoutalgoritme porteret. Repositoryet rummer værktøjskæden, arkitekturdokumenterne,
verifikationsstilladset og Java-runtime-shims. `src/index.ts` eksporterer endnu intet offentligt.
Se [køreplanen](/guide/roadmap) for den rækkefølge, algoritmerne kommer i.
:::

## Java er specifikationen

Java-kildekoden ved den fastlåste ELK-commit `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` er den
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

Den offentlige API bliver ElkGraph-objektmodellen plus `ElkGraphUtil`-factories. ELK JSON er en
I/O-adapter, ikke kernemodellen. Den første npm-udgivelse fryser denne overflade.

## Runtime-begrænsninger

- `src/` er browsersikker: ingen Node-indbyggede moduler, ingen `process.env`, kun ES-moduler.
- Der er ingen runtime-afhængigheder.

## Hvor du kan gå videre

- [Arkitektur](/da/guide/architecture): hvordan oraklet, bundlerne og layoutmotoren hænger sammen.
- [Porteringskort](/guide/port-map) og [inventar](/guide/inventory): hvilke Java-pakker der afbildes på
  hvilke moduler.
- [Bidrag](/da/guide/contributing): gates og arbejdsgang.
