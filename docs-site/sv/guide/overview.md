---
title: Översikt
sourceHash: a7927ee742347e04a529a2939dfbcb685d8b1e32ba94b375d45da70747fd90f2
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Översikt

`@knowvah/elk-engine` är en trogen TypeScript-portering av [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), Java-biblioteket för grafayout. Det finns ingen Java och ingen
WASM: layoutalgoritmerna är omimplementerade i vanlig TypeScript och verifierade mot Java-implementationen.

::: tip Version 1.0
`@knowvah/elk-engine@1.0.0` finns på npm. Alla ELK-layoutalgoritmer som ingår är portade och kontrollerade mot ELK
byggt från källkod; [paritetsrapporten](/parity) har resultaten, och skillnader som fortfarande är öppna spåras som
issues. Det publika API:et, 72 exporter, är fruset vid 1.0.0 och versionerna följer semver. Börja med
[Kom igång](/guide/getting-started) och se [färdplanen](/guide/roadmap) för vad som kommer härnäst.
:::

## Java är specifikationen

Java-källkoden vid den fastlåsta ELK-committen `8bca22f4afa3371562d2f702d59929818f7f7b71` är den
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
proceduren finns på sidan [överensstämmelse](/conformance).

## Publikt kontrakt

Det publika API:et är den exportyta som godkänts i
[#90](https://github.com/knowvah/elk-engine/issues/90), 72 exporter: ElkGraph-objektmodellen och
fabrikerna i `ElkGraphUtil`, layoutmotorn, varje algoritms metadataleverantör och alternativklass,
värdetyperna för kärnalternativen, ELK JSON-adaptern och den asynkrona funktionen `layout`. ELK JSON är en
I/O-adapter, inte kärnmodellen. [Kom igång](/guide/getting-started) visar ytan i bruk. Ytan är fryst vid 1.0.0
och versionerna följer semver: att ta bort en export är en major-version.

## Körtidsbegränsningar

- `src/` är webbläsarsäkert: inga inbyggda Node-moduler, ingen `process.env`, enbart ES-moduler.
- Det finns inga körtidsberoenden.

## Vart du går härnäst

- [Arkitektur](/sv/guide/architecture): hur oraklet, bundlarna och layoutmotorn passar ihop.
- [Porteringskarta](/guide/port-map) och [inventarium](/guide/inventory): vilka Java-paket som
  avbildas på vilka moduler.
- [Bidra](/sv/guide/contributing): grindar och arbetsflöde.
