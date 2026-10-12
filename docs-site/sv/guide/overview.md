---
title: Översikt
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Översikt

`@knowvah/elk-engine` är en trogen TypeScript-portering av [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), Java-biblioteket för grafayout. Det finns ingen Java och ingen
WASM: layoutalgoritmerna är omimplementerade i vanlig TypeScript och verifierade mot Java-implementationen.

::: warning Pre-alfa
Ännu är ingen layoutalgoritm portad. Repositoryt innehåller verktygskedjan, arkitekturdokumenten,
verifieringsställningen och Java-runtime-shimmarna. `src/index.ts` exporterar ännu inget publikt.
Se [färdplanen](/guide/roadmap) för i vilken ordning algoritmerna kommer.
:::

## Java är specifikationen

Java-källkoden vid den fastlåsta ELK-committen `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` är den
auktoritativa specifikationen. Porteringen följer den noga:

- Algoritmer optimeras eller förenklas inte. Om Java ser redundant ut behålls redundansen.
- Varje gren porteras, och metodgränser behålls om inte TypeScript tvingar fram en ändring.
- JUnit-testerna porteras tillsammans med koden de testar.
- Java-runtime-beteende som ELK förlitar sig på (32-bitars heltalsaritmetik, iterationsordningen i `HashMap`,
  `Random`-sekvenser) återskapas med shims. Se [Java-grunder](/sv/guide/java-foundations).

[Översättningsreglerna](/guide/translation-rules) listar hur varje Java-koncept avbildas på TypeScript.

## Verifiering mot ett orakel

Oraklet är ELK uppströms byggt från källkod, i en fristående git-worktree vid den fastlåsta committen.
Porteringens utdata jämförs med oraklets utdata:

- Id:n, elementantal, kantsektionstopologi, antal brytpunkter och icke-numeriska värden måste stämma
  exakt.
- Numeriska koordinater och storlekar måste stämma inom en absolut tolerans på `1e-6`.

Utvalda orakelutdata är incheckade som golden-referenser, så att testerna kan köras utan JVM. Hela
proceduren finns på sidan [överensstämmelse](/sv/conformance).

## Publikt kontrakt

Det publika API:et blir ElkGraph-objektmodellen plus fabrikerna i `ElkGraphUtil`. ELK JSON är en
I/O-adapter, inte kärnmodellen. Den första npm-publiceringen fryser denna yta.

## Körtidsbegränsningar

- `src/` är webbläsarsäkert: inga inbyggda Node-moduler, ingen `process.env`, enbart ES-moduler.
- Det finns inga körtidsberoenden.

## Vart du går härnäst

- [Arkitektur](/sv/guide/architecture): hur oraklet, bundlarna och layoutmotorn passar ihop.
- [Porteringskarta](/guide/port-map) och [inventarium](/guide/inventory): vilka Java-paket som
  avbildas på vilka moduler.
- [Bidra](/sv/guide/contributing): grindar och arbetsflöde.
