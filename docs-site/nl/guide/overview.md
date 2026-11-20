---
title: Overzicht
sourceHash: ae706ea0c693889bbac9d0298ac9906f2282efda6d617acd987e7c3a37e406eb
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Overzicht

`@knowvah/elk-engine` is een getrouwe TypeScript-portering van de [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), de Java-bibliotheek voor graaflayout. Er is geen Java en
geen WASM: de layoutalgoritmen zijn opnieuw geïmplementeerd in gewoon TypeScript en geverifieerd
tegen de Java-implementatie.

::: warning Pre-1.0
Alle beoogde ELK-layoutalgoritmen zijn geporteerd en gecontroleerd tegen ELK gebouwd vanuit de broncode; de
[pariteitsrapportage](/parity) bevat de resultaten. Het publieke exportoppervlak is goedgekeurd maar staat nog
niet in `src/index.ts`, dus de pakketingang exporteert nog niets publieks. Tot 1.0 kan de API nog wijzigen.
In de [routekaart](/guide/roadmap) staat wat er daarna komt.
:::

## De Java is de specificatie

De Java-broncode op de vastgepinde ELK-commit `8bca22f4afa3371562d2f702d59929818f7f7b71` is de
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

De publieke API is het exportoppervlak dat is goedgekeurd in
[#90](https://github.com/knowvah/elk-engine/issues/90): het ElkGraph-objectmodel en de
`ElkGraphUtil`-factories, de layout-engine, de metadataprovider en opties van elk algoritme met
hun waardetypen, en de ELK JSON- en tekstuele graafformaten. ELK JSON is een I/O-adapter, niet het
kernmodel. [Aan de slag](/guide/getting-started) laat het oppervlak in gebruik zien. De versies blijven 0.x
tot 1.0; 1.0 bevriest het oppervlak.

## Runtimebeperkingen

- `src/` is browserveilig: geen Node-built-ins, geen `process.env`, uitsluitend ES-modules.
- Er zijn geen runtime-afhankelijkheden.

## Hoe nu verder

- [Architectuur](/nl/guide/architecture): hoe het orakel, de bundels en de layout-engine samenwerken.
- [Porteerkaart](/guide/port-map) en [inventaris](/guide/inventory): welke Java-packages op welke modules
  worden afgebeeld.
- [Bijdragen](/nl/guide/contributing): gates en werkwijze.
