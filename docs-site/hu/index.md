---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK, tiszta TypeScriptben
  tagline: Az Eclipse Layout Kernel hű TypeScript-portolása. Nincs Java, nincs WASM — az elrendezési algoritmusok
    egyszerű TypeScriptben vannak újraimplementálva, és a Java implementációval szemben ellenőrzöttek.
  actions:
    - theme: brand
      text: Áttekintés
      link: /hu/guide/overview
    - theme: alt
      text: Galéria
      link: /hu/showcase/
    - theme: alt
      text: Megtekintés a GitHubon
      link: https://github.com/knowvah/elk-engine
features:
  - title: Hű az ELK Javához
    details:
      A rögzített ELK-commit Java kódja a specifikáció. Minden ág portolva van, a JUnit-teszteket pedig az általuk
      tesztelt kóddal együtt portoljuk.
  - title: Orákulummal szemben ellenőrzött
    details: A kimeneteket a forrásból fordított ELK-val vetjük össze. A struktúra pontosan egyezik; a koordináták 1e-6
      tűréshatáron belül egyeznek.
  - title: Böngészőnatív, futásidejű függőségek nélkül
    details: Nincs Java, nincs WASM, és a könyvtárkód nem használ Node beépített modulokat. Csomagolja be, és szállítsa.
  - title: Pre-alfa
    details: A toolchain, az architektúra, a Java futtatókörnyezeti shimek és az ellenőrzési váz megvan. Egyetlen
      elrendezési algoritmus sincs még portolva.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-alfa
Egyetlen elrendezési algoritmus sincs még portolva, és a `src/index.ts` nem exportál semmi nyilvánosat. Az első npm-publikálás
befagyasztja a nyilvános API-t. Hogy mi következik, azt az [ütemtervben](/guide/roadmap) találja.
:::

## Válassza ki az útját

| Szeretném…                                                  | Itt kezdje                                                       |
| ----------------------------------------------------------- | ---------------------------------------------------------------- |
| Megérteni, mi a projekt, és mi nem                          | [Áttekintés](/hu/guide/overview)                                 |
| Látni, hogyan illeszkednek össze az elemek                  | [Architektúra](/hu/guide/architecture)                           |
| Tudni, mit jelent az, hogy „megegyezik a Javával”           | [Megfelelőség](/hu/conformance)                                  |
| Megtalálni, hova kerül egy Java-csomag a portolásban        | [Portolási térkép](/guide/port-map) · [Leltár](/guide/inventory) |
| Megismerni a Java–TypeScript szabályokat                    | [Fordítási szabályok](/guide/translation-rules)                  |
| Látni, a Java futtatókörnyezet mely viselkedése van lefedve | [Java-alapok](/hu/guide/java-foundations)                        |
| Látni, mi van tervezve                                      | [Ütemterv](/guide/roadmap)                                       |
| Közreműködni                                                | [Közreműködés](/hu/guide/contributing)                           |
