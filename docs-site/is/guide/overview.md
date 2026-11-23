---
title: Yfirlit
sourceHash: a7927ee742347e04a529a2939dfbcb685d8b1e32ba94b375d45da70747fd90f2
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Yfirlit

`@knowvah/elk-engine` er trú yfirfærsla [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), Java-safnsins fyrir uppröðun grafa, yfir í TypeScript. Þar er hvorki Java
né WASM: uppröðunaralgrímin eru endurútfærð í venjulegu TypeScript og sannprófuð gegn
Java-útfærslunni.

::: tip Útgáfa 1.0
`@knowvah/elk-engine@1.0.0` er á npm. Öll uppröðunaralgrím ELK innan umfangs hafa verið yfirfærð og sannprófuð gegn
ELK byggðu úr frumkóða; [jafngildisskýrslan](/parity) geymir niðurstöðurnar, og munur sem enn er óleystur er rakinn
sem issues. Opinbera API-ið, 72 útflutningar, er fryst við 1.0.0 og útgáfur fylgja semver. Byrjaðu á
[Fyrstu skrefum](/guide/getting-started) og sjá [vegvísinn](/guide/roadmap) fyrir það sem kemur næst.
:::

## Java er skilgreiningin

Java-frumkóðinn á fasta ELK-commitinu `8bca22f4afa3371562d2f702d59929818f7f7b71` er
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
verklag er á síðunni um [samræmi](/conformance).

## Opinber samningur

Opinbera API er útflutningsyfirborðið sem var samþykkt í
[#90](https://github.com/knowvah/elk-engine/issues/90), 72 útflutningar: ElkGraph-hlutalíkanið og
`ElkGraphUtil`-smiðjurnar, uppröðunarvélin, lýsigagnaveita og valkostaflokkur hvers algríms,
gildistegundir kjarnavalkostanna, ELK JSON-millistykkið og ósamstillta `layout`-fallið. ELK JSON er
I/O-millistykki, ekki kjarnalíkanið. [Fyrstu skref](/guide/getting-started) sýna yfirborðið í notkun.
Yfirborðið er fryst við 1.0.0 og útgáfur fylgja semver: að fjarlægja útflutning er stór útgáfa (major).

## Takmarkanir á keyrslutíma

- `src/` er öruggt í vafra: engin innbyggð Node-söfn, ekkert `process.env`, eingöngu ES-einingar.
- Engin keyrsluháðindi eru til staðar.

## Hvert á að fara næst

- [Arkitektúr](/is/guide/architecture): hvernig véfréttin, búntarnir og uppröðunarvélin passa
  saman.
- [Yfirfærslukort](/guide/port-map) og [yfirlitsskrá](/guide/inventory): hvaða Java-pakkar varpast á hvaða
  einingar.
- [Að leggja til](/is/guide/contributing): hlið og vinnuferli.
