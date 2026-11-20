---
layout: home
sourceHash: 13520b5cd8cfe1522d01c0b3ec7b47afad3fce1879618a87194b477c8ef962ec
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
  - title: Pre-1.0
    details: Kõik projekti ulatusse kuuluvad ELK-i paigutusalgoritmid on portitud ja lähtekoodist ehitatud ELK-iga
      kontrollitud. Kuni 1.0-ni võib API veel muutuda.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-1.0
Kõik ELK-i paigutusalgoritmid, mis projekti ulatusse kuuluvad, on portitud ja lähtekoodist ehitatud ELK-iga
kontrollitud; tulemused leiate [pariteediaruandest](/parity). Avalik ekspordipind on heaks kiidetud, kuid veel mitte
failis `src/index.ts`, nii et paketi sisendmoodul ei ekspordi veel midagi avalikku. Versioonid jäävad 0.x-iks kuni
1.0-ni ja selleni võib API veel muutuda. Mis tuleb järgmisena, selle leiate [teekaardilt](/guide/roadmap).
:::

## Valige oma tee

| Ma tahan…                                        | Alustage siit                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Mõista, mis projekt on ja mis ta ei ole          | [Ülevaade](/et/guide/overview)                                   |
| Näha, kuidas osad kokku sobivad                  | [Arhitektuur](/et/guide/architecture)                            |
| Teada, mida tähendab „ühtib Javaga“              | [Vastavus](/et/conformance)                                      |
| Leida, kuhu Java pakett portimisel jõuab         | [Portimiskaart](/guide/port-map) · [Inventuur](/guide/inventory) |
| Õppida Java ja TypeScripti vahelisi reegleid     | [Tõlkereeglid](/guide/translation-rules)                         |
| Näha, milline Java käitusaja käitumine on kaetud | [Java alused](/et/guide/java-foundations)                        |
| Näha, mis on planeeritud                         | [Teekaart](/guide/roadmap)                                       |
| Kaasa lüüa                                       | [Kaasalöömine](/et/guide/contributing)                           |
