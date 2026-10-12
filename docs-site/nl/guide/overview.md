---
title: Overzicht
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Overzicht

`@knowvah/elk-engine` is een getrouwe TypeScript-portering van de [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), de Java-bibliotheek voor graaflayout. Er is geen Java en
geen WASM: de layoutalgoritmen zijn opnieuw geïmplementeerd in gewoon TypeScript en geverifieerd
tegen de Java-implementatie.

::: warning Pre-alpha
Er is nog geen layoutalgoritme geporteerd. De repository bevat de toolchain, de architectuurdocumenten,
de verificatie-infrastructuur en de Java-runtime-shims. `src/index.ts` exporteert nog niets publieks.
In de [routekaart](/guide/roadmap) staat in welke volgorde de algoritmen volgen.
:::

## De Java is de specificatie

De Java-broncode op de vastgepinde ELK-commit `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` is de
leidende specificatie. De portering volgt die nauwgezet:

- Algoritmen worden niet geoptimaliseerd of vereenvoudigd. Als de Java redundant lijkt, blijft de redundantie behouden.
- Elke vertakking wordt geporteerd, en methodegrenzen blijven behouden tenzij TypeScript een wijziging afdwingt.
- De JUnit-tests worden geporteerd samen met de code die ze testen.
- Java-runtimegedrag waarop ELK steunt (32-bits integerrekenkunde, `HashMap`-iteratievolgorde,
  `Random`-reeksen) wordt nagebootst door shims. Zie [Java-fundamenten](/nl/guide/java-foundations).

De [vertaalregels](/guide/translation-rules) beschrijven hoe elk Java-concept op TypeScript wordt afgebeeld.

## Verificatie tegen een orakel

Het orakel is upstream-ELK gebouwd vanuit de broncode, in een losgekoppelde git-worktree op de vastgepinde commit.
De uitvoer van de portering wordt vergeleken met de uitvoer van het orakel:

- Id's, aantallen elementen, kantsectietopologie, aantallen buigpunten en niet-numerieke waarden moeten
  exact overeenkomen.
- Numerieke coördinaten en afmetingen moeten overeenkomen binnen een absolute tolerantie van `1e-6`.

Geselecteerde orakeluitvoer is als golden-referenties ingecheckt, zodat voor het draaien van de tests geen JVM nodig is.
De volledige procedure staat op de pagina [conformiteit](/nl/conformance).

## Publiek contract

De publieke API wordt het ElkGraph-objectmodel plus de `ElkGraphUtil`-factories. ELK JSON is een
I/O-adapter, niet het kernmodel. De eerste npm-publicatie bevriest dit oppervlak.

## Runtimebeperkingen

- `src/` is browserveilig: geen Node-built-ins, geen `process.env`, uitsluitend ES-modules.
- Er zijn geen runtime-afhankelijkheden.

## Hoe nu verder

- [Architectuur](/nl/guide/architecture): hoe het orakel, de bundels en de layout-engine samenwerken.
- [Porteerkaart](/guide/port-map) en [inventaris](/guide/inventory): welke Java-packages op welke modules
  worden afgebeeld.
- [Bijdragen](/nl/guide/contributing): gates en werkwijze.
