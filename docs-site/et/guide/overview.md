---
title: Ülevaade
sourceHash: ae706ea0c693889bbac9d0298ac9906f2282efda6d617acd987e7c3a37e406eb
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Ülevaade

`@knowvah/elk-engine` on [Eclipse Layout Kernel'i](https://www.eclipse.org/elk) (ELK), Java graafipaigutuse teegi,
truu TypeScripti portimine. Javat ega WASM-i pole: paigutusalgoritmid on lihtsas TypeScriptis uuesti realiseeritud
ja Java realisatsiooni vastu kontrollitud.

::: warning Pre-1.0
Kõik ELK-i paigutusalgoritmid, mis projekti ulatusse kuuluvad, on portitud ja lähtekoodist ehitatud ELK-iga
kontrollitud; tulemused leiate [pariteediaruandest](/parity). Avalik ekspordipind on heaks kiidetud, kuid veel mitte
failis `src/index.ts`, nii et paketi sisendmoodul ei ekspordi veel midagi avalikku. Kuni 1.0-ni võib API veel
muutuda.
Mis tuleb järgmisena, leiate [teekaardilt](/guide/roadmap).
:::

## Java on spetsifikatsioon

Java lähtekood fikseeritud ELK-i commit'il `8bca22f4afa3371562d2f702d59929818f7f7b71` on kanooniline
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

Avalik API on ekspordipind, mis kiideti heaks ülesandes
[#90](https://github.com/knowvah/elk-engine/issues/90): ElkGraphi objektimudel ja `ElkGraphUtil`i
fabrikud, paigutusmootor, iga algoritmi metaandmete pakkuja ja valikud väärtusetüüpidega ning ELK JSON
ja tekstilised graafivormingud. ELK JSON on I/O adapter, mitte põhimudel.
[Alustamine](/guide/getting-started) näitab pinda kasutuses. Versioonid jäävad 0.x-iks kuni 1.0-ni;
1.0 külmutab pinna.

## Käitusaja piirangud

- `src/` on brauseriohutu: ei mingeid Node'i sisseehitatud mooduleid, ei `process.env`-i, ainult ES-moodulid.
- Käitusaja sõltuvusi pole.

## Kuhu edasi

- [Arhitektuur](/et/guide/architecture): kuidas oraakel, bundle'id ja paigutusmootor kokku sobivad.
- [Portimiskaart](/guide/port-map) ja [inventuur](/guide/inventory): millised Java paketid millistele moodulitele
  vastavad.
- [Kaasalöömine](/et/guide/contributing): väravad ja töövoog.
