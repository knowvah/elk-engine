---
layout: home
sourceHash: 06b24b3367eb169498f37ff49ece535367d39841a44c96a6599e894ec6caaadf
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK puhtas TypeScriptis
  tagline:
    Eclipse Layout Kernel'i truudu TypeScripti portimine. Ei mingit Javat, ei mingit WASM-i — paigutusalgoritmid on
    lihtsas TypeScriptis uuesti realiseeritud ja Java realisatsiooni vastu kontrollitud.
  actions:
    - theme: brand
      text: Ülevaade
      link: /et/guide/overview
    - theme: alt
      text: Galerii
      link: /et/showcase/
    - theme: alt
      text: Vaata GitHubis
      link: https://github.com/knowvah/elk-engine
features:
  - title: Truu ELK Java'le
    details: Fikseeritud ELK-i commit'i Java on spetsifikatsioon. Iga haru on portitud ning JUnit-testid porditakse koos
      koodiga, mida need testivad.
  - title: Kontrollitud oraakli vastu
    details: Väljundeid võrreldakse lähtekoodist ehitatud ELK-iga. Struktuur ühtib täpselt; koordinaadid ühtivad
      1e-6 piires.
  - title: Brauseri-natiivne, ilma käitusaja sõltuvusteta
    details: Teegi koodis pole Javat, WASM-i ega Node'i sisseehitatud mooduleid. Komplekteerige ja avaldage.
  - title: Versioon 1.0
    details: Kõik projekti ulatusse kuuluvad ELK-i paigutusalgoritmid on portitud ja lähtekoodist ehitatud ELK-iga
      kontrollitud. Avalik API on versioonis 1.0.0 külmutatud.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: tip Versioon 1.0
`@knowvah/elk-engine@1.0.0` on npm-is. Kõik ELK-i paigutusalgoritmid, mis projekti ulatusse kuuluvad, on portitud ja
lähtekoodist ehitatud ELK-iga kontrollitud; tulemused leiate [pariteediaruandest](/parity) ja veel avatud erinevusi
jälgitakse issue'dena. Avalik API, 72 eksporti, on versioonis 1.0.0 külmutatud ja versioonid järgivad semver'it.
Alustage jaotisest [Alustamine](/guide/getting-started); mis tuleb järgmisena, selle leiate
[teekaardilt](/guide/roadmap).
:::

## Valige oma tee

| Ma tahan…                                        | Alustage siit                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Mõista, mis projekt on ja mis ta ei ole          | [Ülevaade](/et/guide/overview)                                   |
| Näha, kuidas osad kokku sobivad                  | [Arhitektuur](/et/guide/architecture)                            |
| Teada, mida tähendab „ühtib Javaga“              | [Vastavus](/conformance)                                         |
| Leida, kuhu Java pakett portimisel jõuab         | [Portimiskaart](/guide/port-map) · [Inventuur](/guide/inventory) |
| Õppida Java ja TypeScripti vahelisi reegleid     | [Tõlkereeglid](/guide/translation-rules)                         |
| Näha, milline Java käitusaja käitumine on kaetud | [Java alused](/et/guide/java-foundations)                        |
| Näha, mis on planeeritud                         | [Teekaart](/guide/roadmap)                                       |
| Kaasa lüüa                                       | [Kaasalöömine](/et/guide/contributing)                           |
