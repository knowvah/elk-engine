---
title: Yfirlit
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Yfirlit

`@knowvah/elk-engine` er trú yfirfærsla [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), Java-safnsins fyrir uppröðun grafa, yfir í TypeScript. Þar er hvorki Java
né WASM: uppröðunaralgrímin eru endurútfærð í venjulegu TypeScript og sannprófuð gegn
Java-útfærslunni.

::: warning Pre-alpha
Ekkert uppröðunaralgrím hefur verið yfirfært enn. Hugbúnaðarsafnið geymir verkfærakeðjuna, arkitektúrskjölin,
sannprófunargrindina og Java-keyrslutímashimin. `src/index.ts` flytur ekkert opinbert út enn.
Sjá [vegvísinn](/guide/roadmap) fyrir þá röð sem algrímin koma í.
:::

## Java er skilgreiningin

Java-frumkóðinn á fasta ELK-commitinu `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` er
bindandi skilgreining. Yfirfærslan fylgir honum náið:

- Algrím eru hvorki fínstillt né einfölduð. Ef Java virðist óþarflega endurtekið er endurtekningin látin standa.
- Hver grein er yfirfærð og skil á milli aðferða haldast nema TypeScript neyði fram breytingu.
- JUnit-prófin eru yfirfærð með kóðanum sem þau prófa.
- Java-keyrslutímahegðun sem ELK reiðir sig á (32 bita heiltölureikningur, `HashMap`-yfirferðarröð,
  `Random`-runur) er endurgerð með shimum. Sjá [Java-grunn](/is/guide/java-foundations).

[Þýðingarreglurnar](/guide/translation-rules) sýna hvernig hvert Java-hugtak varpast yfir í TypeScript.

## Sannprófun gegn véfrétt

Véfréttin er ELK úr upprunasafninu, byggt úr frumkóða, í aðskildu git-worktree á fasta commitinu.
Úttak yfirfærslunnar er borið saman við úttak véfréttarinnar:

- Auðkenni, fjöldi þátta, uppbygging leggjahluta, fjöldi beygjupunkta og gildi sem eru ekki tölur verða að standast
  nákvæmlega.
- Tölulegt hnit og stærðir verða að standast innan algildra vikmarka upp á `1e-6`.

Valið úttak véfréttarinnar er vistað sem golden-viðmið, svo ekki þarf JVM til að keyra prófin. Fullt
verklag er á síðunni um [samræmi](/is/conformance).

## Opinber samningur

Opinbera API verður ElkGraph-hlutalíkanið ásamt `ElkGraphUtil`-smiðjunum. ELK JSON er
I/O-millistykki, ekki kjarnalíkanið. Fyrsta npm-útgáfan festir þetta yfirborð.

## Takmarkanir á keyrslutíma

- `src/` er öruggt í vafra: engin innbyggð Node-söfn, ekkert `process.env`, eingöngu ES-einingar.
- Engin keyrsluháðindi eru til staðar.

## Hvert á að fara næst

- [Arkitektúr](/is/guide/architecture): hvernig véfréttin, búntarnir og uppröðunarvélin passa
  saman.
- [Yfirfærslukort](/guide/port-map) og [yfirlitsskrá](/guide/inventory): hvaða Java-pakkar varpast á hvaða
  einingar.
- [Að leggja til](/is/guide/contributing): hlið og vinnuferli.
