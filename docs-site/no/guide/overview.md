---
title: Oversikt
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Oversikt

`@knowvah/elk-engine` er en tro TypeScript-portering av [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), Java-biblioteket for grafolayout. Det finnes ingen Java og
ingen WASM: layoutalgoritmene er implementert på nytt i vanlig TypeScript og verifisert mot
Java-implementeringen.

::: warning Pre-alpha
Ingen layoutalgoritme er portert ennå. Repoet inneholder verktøykjeden, arkitekturdokumentene,
verifiseringsoppsettet og Java-runtime-shimene. `src/index.ts` eksporterer ingenting offentlig ennå.
Se [veikartet](/guide/roadmap) for rekkefølgen algoritmene kommer i.
:::

## Java-koden er spesifikasjonen

Java-kildekoden ved den festede ELK-committen `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` er den
kanoniske spesifikasjonen. Porteringen følger den tett:

- Algoritmer blir ikke optimalisert eller forenklet. Ser Java-koden overflødig ut, beholdes overflødigheten.
- Hver gren er portert, og metodegrenser beholdes med mindre TypeScript tvinger frem en endring.
- JUnit-testene er portert sammen med koden de tester.
- Java-runtime-atferd som ELK stoler på (32-biters heltallsaritmetikk, iterasjonsrekkefølgen i `HashMap`,
  `Random`-sekvenser) gjenskapes av shims. Se [Java-grunnlag](/no/guide/java-foundations).

[Oversettelsesreglene](/guide/translation-rules) lister hvordan hvert Java-konsept avbildes til TypeScript.

## Verifisering mot et orakel

Oraklet er ELK fra upstream bygd fra kildekode, i en frakoblet git-worktree ved den festede committen.
Utdataene fra porteringen sammenlignes med utdataene fra oraklet:

- Id-er, elementantall, kantseksjonstopologi, antall knekkpunkter og ikke-numeriske verdier må samsvare
  nøyaktig.
- Numeriske koordinater og størrelser må samsvare innenfor en absolutt toleranse på `1e-6`.

Utvalgte orakelutdata er sjekket inn som golden-referanser, så det trengs ingen JVM for å kjøre testene. Hele
fremgangsmåten står på siden [Samsvar](/no/conformance).

## Offentlig kontrakt

Det offentlige API-et blir ElkGraph-objektmodellen pluss `ElkGraphUtil`-fabrikkene. ELK JSON er en
I/O-adapter, ikke kjernemodellen. Den første npm-publiseringen fryser denne flaten.

## Begrensninger i kjøretiden

- `src/` er nettlesertrygt: ingen Node-innebygde moduler, ingen `process.env`, kun ES-moduler.
- Det finnes ingen kjøretidsavhengigheter.

## Veien videre

- [Arkitektur](/no/guide/architecture): hvordan oraklet, bundlene og layoutmotoren henger
  sammen.
- [Porteringskart](/guide/port-map) og [inventar](/guide/inventory): hvilke Java-pakker som avbildes til hvilke
  moduler.
- [Bidra](/no/guide/contributing): gates og arbeidsflyt.
