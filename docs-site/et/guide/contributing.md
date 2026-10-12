---
title: Kaasalöömine
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Kaasalöömine

Lugege esmalt [Ülevaadet](/et/guide/overview) ja [Tõlkereegleid](/guide/translation-rules). Java fikseeritud
commit'il on spetsifikatsioon; kahtluse korral lugege Javat.

## Väravad

Käitage need enne iga commit'i. Iga peab läbima.

| Käsk                   | Kontrollib                                              |
| ---------------------- | ------------------------------------------------------- |
| `npm run format:check` | Prettieri vormistust                                    |
| `npm run typecheck`    | TypeScripti tüübikontrolli (natiivne `tsc --noEmit`)    |
| `npm test`             | vitest-komplekti, sh golden-komplekti                   |
| `npm run coverage`     | Komplekti 90% rea-, haru-, funktsiooni- ja lausekattega |

Nõuab Node 22 või uuemat. Paigaldage sõltuvused käsuga `npm ci`.

## Testid on muutumatud

Oodatavad väärtused pärinevad oraaklist, JVM-i vektoritest või Java lähtekoodist enne realisatsiooni
kirjutamist (AD-13). Kord kirjutatud kinnitus on külmutatud: ebaõnnestuv test tähendab, et realisatsioon on vale.

Kui test saab läbida ainult oma kinnituse, vektori või goldeni muutmisega, peatuge ja talletage juhtum missiooni
otsusepäevikusse. Ärge lõdvendage tolerantsi, ärge kustutage juhtumit ega genereerige viidet uuesti, et saada
roheline. Golden-viited genereeritakse uuesti skriptiga, mitte kunagi käsitsi.

## Töövoog

1. Looge funktsiooniharu, näiteks `feature/<short-description>`.
2. Kirjutage commit'i sõnumid [Conventional Commits](https://www.conventionalcommits.org) vormis, näiteks
   `feat(java): add JavaHashMap`. Teemarida on väiketähtedes ja kuni 72 märki pikk.
3. Avage pull request `main`i vastu. CI kontrollib pull requesti pealkirja Conventional Commit'ina.
4. Commit'id peavad olema allkirjastatud; hoidla reeglistik nõuab seda.
5. Pull requestid ühendatakse merge commit'iga.

Iga koodifail kannab SPDX-päist `// SPDX-License-Identifier: EPL-2.0`. Fitness-test jõustab selle.
Sõltuvused peavad olema EPL-2.0-ga ühilduvad.

## Dokumentatsiooni käsud

| Käsk                   | Eesmärk                                               |
| ---------------------- | ----------------------------------------------------- |
| `npm run docs:dev`     | Käivitab dokumentatsioonisaidi reaalajas uuendamisega |
| `npm run docs:build`   | Ehitab saidi; katkine sisemine link kukutab ehituse   |
| `npm run docs:preview` | Serveerib ehitatud saiti kohalikult                   |

Enamik teatmelehti kaasab faile kataloogist `docs/`. Muutke faili kataloogis `docs/`, mitte lehte kataloogi
`docs-site/` all. Kaasatud failide PlantUML-diagrammid renderdatakse SVG-ks ja commit'itakse kataloogi
`docs-site/public/diagrams/`.

## Välised kataloogid

Skriptid ja testid leiavad kõrvalolevad checkout'id keskkonnamuutujate kaudu. Vaikeväärtused on suhtelised hoidla
juurkataloogi suhtes. Neid muutujaid loevad ainult `tools/` ja `test/`; `src/` kood ei tee seda kunagi.

| Muutuja          | Vaikeväärtus                   | Sisu                                              |
| ---------------- | ------------------------------ | ------------------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | Eclipse ELK Java lähtekood fikseeritud commit'il  |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Eraldatud worktree ja ehitatud oraakel            |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | elk-models korpus, fikseeritud korpuse manifestis |

Oraakli ehitus vajab Maven 3.9 või uuemat ja JDK 21 (varuvariandina JDK 17). Oraakli protseduuri leiate lehelt
[Vastavus](/et/conformance).
