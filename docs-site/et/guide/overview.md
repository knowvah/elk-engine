---
title: Ülevaade
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Ülevaade

`@knowvah/elk-engine` on [Eclipse Layout Kernel'i](https://www.eclipse.org/elk) (ELK), Java graafipaigutuse teegi,
truu TypeScripti portimine. Javat ega WASM-i pole: paigutusalgoritmid on lihtsas TypeScriptis uuesti realiseeritud
ja Java realisatsiooni vastu kontrollitud.

::: warning Pre-alpha
Ühtegi paigutusalgoritmi pole veel portitud. Hoidla sisaldab tööriistaahelat, arhitektuuridokumente, kontrolli
tugikonstruktsiooni ja Java käitusaja shime. `src/index.ts` ei ekspordi veel midagi avalikku.
Algoritmide lisandumise järjekorra leiate [teekaardilt](/guide/roadmap).
:::

## Java on spetsifikatsioon

Java lähtekood fikseeritud ELK-i commit'il `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` on kanooniline
spetsifikatsioon. Portimine järgib seda täpselt:

- Algoritme ei optimeerita ega lihtsustata. Kui Java tundub koondunud liigsena, jääb liiasus alles.
- Iga haru porditakse ja meetodipiirid säilivad, kui TypeScript ei sunni muutma.
- JUnit-testid porditakse koos koodiga, mida need testivad.
- Java käitusaja käitumine, millele ELK toetub (32-bitine täisarvuaritmeetika, `HashMap`i läbimisjärjekord,
  `Random`i jadad), taastatakse shimidega. Vt [Java alused](/et/guide/java-foundations).

[Tõlkereeglid](/guide/translation-rules) loetlevad, kuidas iga Java kontseptsioon TypeScriptile vastab.

## Kontroll oraakli vastu

Oraakel on lähtekoodist ehitatud algne ELK, eraldatud git worktree's fikseeritud commit'il.
Portimise väljundeid võrreldakse oraakli väljunditega:

- Id-d, elementide arvud, servasektsioonide topoloogia, murdepunktide arvud ja mittenumbrilised väärtused peavad
  ühtima täpselt.
- Numbrilised koordinaadid ja suurused peavad ühtima absoluutse tolerantsi `1e-6` piires.

Valitud oraakli väljundid on sisse commit'itud golden-viidetena, nii et testide käitamiseks pole JVM-i vaja.
Täielik protseduur on lehel [Vastavus](/et/conformance).

## Avalik leping

Avalik API on ElkGraphi objektimudel pluss `ElkGraphUtil`i fabrikud. ELK JSON on I/O adapter, mitte
põhimudel. Esimene npm-i avaldamine külmutab selle pinna.

## Käitusaja piirangud

- `src/` on brauseriohutu: ei mingeid Node'i sisseehitatud mooduleid, ei `process.env`-i, ainult ES-moodulid.
- Käitusaja sõltuvusi pole.

## Kuhu edasi

- [Arhitektuur](/et/guide/architecture): kuidas oraakel, bundle'id ja paigutusmootor kokku sobivad.
- [Portimiskaart](/guide/port-map) ja [inventuur](/guide/inventory): millised Java paketid millistele moodulitele
  vastavad.
- [Kaasalöömine](/et/guide/contributing): väravad ja töövoog.
