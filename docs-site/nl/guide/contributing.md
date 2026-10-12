---
title: Bijdragen
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Bijdragen

Lees eerst het [Overzicht](/nl/guide/overview) en de [Vertaalregels](/guide/translation-rules). De Java
op de vastgepinde commit is de specificatie; lees bij twijfel de Java.

## Gates

Voer deze uit vóór elke commit. Elke gate moet slagen.

| Commando               | Controleert                                                               |
| ---------------------- | ------------------------------------------------------------------------- |
| `npm run format:check` | Prettier-opmaak                                                           |
| `npm run typecheck`    | TypeScript-typecontrole (native `tsc --noEmit`)                           |
| `npm test`             | De vitest-suite, inclusief de golden-suite                                |
| `npm run coverage`     | De suite met 90% dekking van regels, vertakkingen, functies en statements |

Vereist Node 22 of nieuwer. Installeer de afhankelijkheden met `npm ci`.

## Tests zijn onveranderlijk

Verwachte waarden komen uit het orakel, de JVM-vectoren of de Java-broncode, vóórdat de implementatie
wordt geschreven (AD-13). Eenmaal geschreven is een assertie bevroren: een falende test betekent dat de
implementatie fout is.

Kan een test alleen slagen door zijn assertie, een vector of een golden te wijzigen, stop dan en leg het geval
vast in het beslissingsjournaal van de missie. Verruim geen tolerantie, verwijder geen geval en genereer
geen referentie opnieuw om groen te krijgen. Golden-referenties worden met een script opnieuw gegenereerd, nooit met de hand.

## Werkwijze

1. Maak een feature-branch aan, bijvoorbeeld `feature/<short-description>`.
2. Schrijf commitberichten als [Conventional Commits](https://www.conventionalcommits.org), bijvoorbeeld
   `feat(java): add JavaHashMap`. Onderwerpregels zijn in kleine letters en maximaal 72 tekens lang.
3. Open een pull request tegen `main`. De CI controleert de titel van de pull request als Conventional Commit.
4. Commits moeten ondertekend zijn; de ruleset van de repository eist dat.
5. Pull requests worden samengevoegd met een merge-commit.

Elk codebestand draagt een SPDX-header, `// SPDX-License-Identifier: EPL-2.0`. Een fitness-test dwingt dit af.
Afhankelijkheden moeten compatibel zijn met EPL-2.0.

## Documentatiecommando's

| Commando               | Doel                                                         |
| ---------------------- | ------------------------------------------------------------ |
| `npm run docs:dev`     | Start de documentatiesite met live reload                    |
| `npm run docs:build`   | Bouwt de site; een dode interne link laat de build mislukken |
| `npm run docs:preview` | Serveert de gebouwde site lokaal                             |

De meeste referentiepagina's nemen bestanden uit `docs/` op. Bewerk het bestand in `docs/`, niet de pagina
onder `docs-site/`. PlantUML-diagrammen in de opgenomen bestanden worden naar SVG gerenderd en ingecheckt onder
`docs-site/public/diagrams/`.

## Externe mappen

Scripts en tests vinden naastgelegen checkouts via omgevingsvariabelen. De standaardwaarden zijn relatief ten
opzichte van de root van de repository. Alleen `tools/` en `test/` lezen deze variabelen; code in `src/` nooit.

| Variabele        | Standaard                      | Inhoud                                                  |
| ---------------- | ------------------------------ | ------------------------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | Eclipse ELK Java-broncode op de vastgepinde commit      |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Losgekoppelde worktree en gebouwd orakel                |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | Het elk-models-corpus, vastgepind in het corpusmanifest |

De orakelbuild vereist Maven 3.9 of nieuwer en JDK 21 (JDK 17 als terugval). De orakelprocedure staat onder
[Conformiteit](/nl/conformance).
