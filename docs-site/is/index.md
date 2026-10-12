---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK, í hreinu TypeScript
  tagline: Trú yfirfærsla Eclipse Layout Kernel yfir í TypeScript. Ekkert Java, ekkert WASM — uppröðunaralgrímin eru
    endurútfærð í venjulegu TypeScript og sannprófuð gegn Java-útfærslunni.
  actions:
    - theme: brand
      text: Yfirlit
      link: /is/guide/overview
    - theme: alt
      text: Sýningarsalur
      link: /is/showcase/
    - theme: alt
      text: Skoða á GitHub
      link: https://github.com/knowvah/elk-engine
features:
  - title: Trúr ELK Java
    details: Java-kóðinn á föstum ELK-commit er skilgreiningin. Hver grein er yfirfærð og JUnit-prófin eru yfirfærð með
      kóðanum sem þau prófa.
  - title: Sannprófað gegn véfrétt
    details: Úttak er borið saman við ELK byggt úr frumkóða. Uppbygging stenst nákvæmlega; hnit standast innan 1e-6.
  - title: Innfætt í vafra, engin keyrsluháðindi
    details: Ekkert Java, ekkert WASM, engin innbyggð Node-söfn í safnkóðanum. Pakkaðu og gefðu út.
  - title: Pre-alpha
    details: Verkfærakeðjan, arkitektúrinn, Java-keyrslutímashim og sannprófunargrindin eru til staðar. Ekkert
      uppröðunaralgrím hefur verið yfirfært enn.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-alpha
Ekkert uppröðunaralgrím hefur verið yfirfært enn og `src/index.ts` flytur ekkert opinbert út. Fyrsta npm-útgáfan
festir opinbera API. Sjá [vegvísinn](/guide/roadmap) fyrir það sem kemur næst.
:::

## Veldu leiðina þína

| Ég vil…                                        | Byrjaðu hér                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| Skilja hvað verkefnið er og er ekki            | [Yfirlit](/is/guide/overview)                                        |
| Sjá hvernig hlutarnir passa saman              | [Arkitektúr](/is/guide/architecture)                                 |
| Vita hvað „samsvarar Java“ þýðir               | [Samræmi](/is/conformance)                                           |
| Finna hvar Java-pakki lendir í yfirfærslunni   | [Yfirfærslukort](/guide/port-map) · [Yfirlitsskrá](/guide/inventory) |
| Læra reglurnar frá Java yfir í TypeScript      | [Þýðingarreglur](/guide/translation-rules)                           |
| Sjá hvaða Java-keyrslutímahegðun er til staðar | [Java-grunnur](/is/guide/java-foundations)                           |
| Sjá hvað er á áætlun                           | [Vegvísir](/guide/roadmap)                                           |
| Leggja til                                     | [Að leggja til](/is/guide/contributing)                              |
