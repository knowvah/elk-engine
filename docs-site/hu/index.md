---
layout: home
sourceHash: 13520b5cd8cfe1522d01c0b3ec7b47afad3fce1879618a87194b477c8ef962ec
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
  - title: Pre-1.0
    details: Az ELK összes hatókörbe tartozó elrendezési algoritmusa portolva van, és a forrásból fordított ELK-val
      szemben ellenőrzött. Az 1.0-s verzióig az API még változhat.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-1.0
Az ELK összes hatókörbe tartozó elrendezési algoritmusa portolva van, és a forrásból fordított ELK-val szemben
ellenőrzött; az eredményeket a [paritásjelentés](/parity) tartalmazza. A nyilvános exportfelület elfogadott, de még
nincs a `src/index.ts`-ben, ezért a csomag belépési pontja még nem exportál semmi nyilvánosat. A verziók 1.0-ig
0.x-ek maradnak, és addig az API még változhat. Hogy mi következik, azt az [ütemtervben](/guide/roadmap) találja.
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
