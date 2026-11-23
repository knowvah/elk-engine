---
title: Oversikt
sourceHash: a7927ee742347e04a529a2939dfbcb685d8b1e32ba94b375d45da70747fd90f2
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Oversikt

`@knowvah/elk-engine` er en tro TypeScript-portering av [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), Java-biblioteket for grafolayout. Det finnes ingen Java og
ingen WASM: layoutalgoritmene er implementert på nytt i vanlig TypeScript og verifisert mot
Java-implementeringen.

::: tip Versjon 1.0
`@knowvah/elk-engine@1.0.0` ligger på npm. Alle ELK-layoutalgoritmer innenfor prosjektets omfang er portert og
sjekket mot ELK bygd fra kildekode; [paritetsrapporten](/parity) har resultatene, og forskjeller som fortsatt er
åpne, følges opp som issues. Det offentlige API-et, 72 eksporter, er fryst i 1.0.0, og versjonene følger semver.
Begynn med [Kom i gang](/guide/getting-started). Se [veikartet](/guide/roadmap) for hva som kommer videre.
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
fremgangsmåten står på siden [Samsvar](/conformance).

## Offentlig kontrakt

Det offentlige API-et er eksportflaten som ble godkjent i
[#90](https://github.com/knowvah/elk-engine/issues/90), 72 eksporter: ElkGraph-objektmodellen og
`ElkGraphUtil`-fabrikkene, layoutmotoren, hver algoritmes metadataleverandør og alternativklasse,
verditypene til kjernealternativene, ELK JSON-adapteren og den asynkrone `layout`-funksjonen. ELK JSON
er en I/O-adapter, ikke kjernemodellen. [Kom i gang](/guide/getting-started) viser flaten i bruk.
Flaten er fryst i 1.0.0, og versjonene følger semver: å fjerne en eksport er en hovedversjon.

## Begrensninger i kjøretiden

- `src/` er nettlesertrygt: ingen Node-innebygde moduler, ingen `process.env`, kun ES-moduler.
- Det finnes ingen kjøretidsavhengigheter.

## Veien videre

- [Arkitektur](/no/guide/architecture): hvordan oraklet, bundlene og layoutmotoren henger
  sammen.
- [Porteringskart](/guide/port-map) og [inventar](/guide/inventory): hvilke Java-pakker som avbildes til hvilke
  moduler.
- [Bidra](/no/guide/contributing): gates og arbeidsflyt.
