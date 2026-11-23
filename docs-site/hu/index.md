---
layout: home
sourceHash: 06b24b3367eb169498f37ff49ece535367d39841a44c96a6599e894ec6caaadf
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
  - title: 1.0-s verzió
    details: Az ELK összes hatókörbe tartozó elrendezési algoritmusa portolva van, és a forrásból fordított ELK-val
      szemben ellenőrzött. A nyilvános API az 1.0.0-s verziótól fagyasztott.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: tip 1.0-s verzió
A `@knowvah/elk-engine@1.0.0` elérhető az npm-en. Az ELK összes hatókörbe tartozó elrendezési algoritmusa portolva
van, és a forrásból fordított ELK-val szemben ellenőrzött; az eredményeket a [paritásjelentés](/parity) tartalmazza, a
még nyitott eltéréseket pedig issue-k követik. A nyilvános API, 72 export, az 1.0.0-s verziótól fagyasztott, és a
verziók a semvert követik. Kezdje az [Első lépések](/guide/getting-started) oldallal. Hogy mi következik, azt az
[ütemtervben](/guide/roadmap) találja.
:::

## Válassza ki az útját

| Szeretném…                                                  | Itt kezdje                                                       |
| ----------------------------------------------------------- | ---------------------------------------------------------------- |
| Megérteni, mi a projekt, és mi nem                          | [Áttekintés](/hu/guide/overview)                                 |
| Látni, hogyan illeszkednek össze az elemek                  | [Architektúra](/hu/guide/architecture)                           |
| Tudni, mit jelent az, hogy „megegyezik a Javával”           | [Megfelelőség](/conformance)                                     |
| Megtalálni, hova kerül egy Java-csomag a portolásban        | [Portolási térkép](/guide/port-map) · [Leltár](/guide/inventory) |
| Megismerni a Java–TypeScript szabályokat                    | [Fordítási szabályok](/guide/translation-rules)                  |
| Látni, a Java futtatókörnyezet mely viselkedése van lefedve | [Java-alapok](/hu/guide/java-foundations)                        |
| Látni, mi van tervezve                                      | [Ütemterv](/guide/roadmap)                                       |
| Közreműködni                                                | [Közreműködés](/hu/guide/contributing)                           |
