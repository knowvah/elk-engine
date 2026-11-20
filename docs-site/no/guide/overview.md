---
title: Oversikt
sourceHash: ae706ea0c693889bbac9d0298ac9906f2282efda6d617acd987e7c3a37e406eb
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Oversikt

`@knowvah/elk-engine` er en tro TypeScript-portering av [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), Java-biblioteket for grafolayout. Det finnes ingen Java og
ingen WASM: layoutalgoritmene er implementert på nytt i vanlig TypeScript og verifisert mot
Java-implementeringen.

::: warning Pre-1.0
Alle ELK-layoutalgoritmer innenfor prosjektets omfang er portert og sjekket mot ELK bygd fra kildekode;
[paritetsrapporten](/parity) har resultatene. Den offentlige eksportflaten er godkjent, men ligger ennå ikke
i `src/index.ts`, så pakkens inngang eksporterer ingenting offentlig ennå. Fram til 1.0 kan API-et fortsatt
endre seg.
Se [veikartet](/guide/roadmap) for hva som kommer videre.
:::

## Java-koden er spesifikasjonen

Java-kildekoden ved den festede ELK-committen `8bca22f4afa3371562d2f702d59929818f7f7b71` er den
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

Det offentlige API-et er eksportflaten som ble godkjent i
[#90](https://github.com/knowvah/elk-engine/issues/90): ElkGraph-objektmodellen og
`ElkGraphUtil`-fabrikkene, layoutmotoren, hver algoritmes metadataleverandør og alternativer med
verditypene deres, samt ELK JSON og de tekstbaserte grafformatene. ELK JSON er en I/O-adapter, ikke
kjernemodellen. [Kom i gang](/guide/getting-started) viser flaten i bruk. Versjonene forblir 0.x
fram til 1.0; 1.0 fryser flaten.

## Begrensninger i kjøretiden

- `src/` er nettlesertrygt: ingen Node-innebygde moduler, ingen `process.env`, kun ES-moduler.
- Det finnes ingen kjøretidsavhengigheter.

## Veien videre

- [Arkitektur](/no/guide/architecture): hvordan oraklet, bundlene og layoutmotoren henger
  sammen.
- [Porteringskart](/guide/port-map) og [inventar](/guide/inventory): hvilke Java-pakker som avbildes til hvilke
  moduler.
- [Bidra](/no/guide/contributing): gates og arbeidsflyt.
