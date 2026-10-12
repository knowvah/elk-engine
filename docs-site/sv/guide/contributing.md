---
title: Bidra
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Bidra

Läs först [Översikt](/sv/guide/overview) och [Översättningsregler](/guide/translation-rules). Java-koden
vid den fastlåsta committen är specifikationen; när du är osäker, läs Java.

## Grindar

Kör dessa före varje commit. Var och en måste passera.

| Kommando               | Kontrollerar                                             |
| ---------------------- | -------------------------------------------------------- |
| `npm run format:check` | Prettier-formatering                                     |
| `npm run typecheck`    | TypeScript-typkontroll (inbyggd `tsc --noEmit`)          |
| `npm test`             | vitest-sviten, inklusive golden-sviten                   |
| `npm run coverage`     | Sviten med 90 % rad-, gren-, funktions- och satstäckning |

Kräver Node 22 eller nyare. Installera beroenden med `npm ci`.

## Tester är oföränderliga

Förväntade värden kommer från oraklet, JVM-vektorerna eller Java-källkoden innan implementationen skrivs
(AD-13). När en assertion väl är skriven är den fryst: ett test som misslyckas betyder att implementationen
är fel.

Om ett test bara kan passera genom att ändra sin assertion, en vektor eller ett golden, stanna och
anteckna fallet i uppdragets beslutsjournal. Lätta inte på en tolerans, ta inte bort ett fall och
generera inte om en referens för att få grönt. Golden-referenser genereras om med skript, aldrig för hand.

## Arbetsflöde

1. Skapa en feature-gren, till exempel `feature/<short-description>`.
2. Skriv commitmeddelanden som [Conventional Commits](https://www.conventionalcommits.org), till exempel
   `feat(java): add JavaHashMap`. Ämnesrader är i gemener och högst 72 tecken.
3. Öppna en pull request mot `main`. CI kontrollerar pull requestens titel som en Conventional Commit.
4. Commits måste vara signerade; repositoryts regeluppsättning kräver det.
5. Pull requests sammanfogas med en merge commit.

Varje kodfil har en SPDX-header, `// SPDX-License-Identifier: EPL-2.0`. Ett fitness-test
upprätthåller den. Beroenden måste vara kompatibla med EPL-2.0.

## Dokumentationskommandon

| Kommando               | Syfte                                                     |
| ---------------------- | --------------------------------------------------------- |
| `npm run docs:dev`     | Starta dokumentationssajten med live reload               |
| `npm run docs:build`   | Bygg sajten; en död intern länk får bygget att misslyckas |
| `npm run docs:preview` | Servera den byggda sajten lokalt                          |

De flesta referenssidor inkluderar filer från `docs/`. Redigera filen i `docs/`, inte sidan under
`docs-site/`. PlantUML-diagram i de inkluderade filerna renderas till SVG och checkas in under
`docs-site/public/diagrams/`.

## Externa kataloger

Skript och tester hittar angränsande utcheckningar via miljövariabler. Standardvärdena är relativa till
repositoryts rot. Bara `tools/` och `test/` läser dessa variabler; kod i `src/` gör det aldrig.

| Variabel         | Standard                       | Innehåll                                               |
| ---------------- | ------------------------------ | ------------------------------------------------------ |
| `ELK_SOURCE_DIR` | `../elk`                       | Eclipse ELK:s Java-källkod vid den fastlåsta committen |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Fristående worktree och byggt orakel                   |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | Korpusen elk-models, fastlåst i korpusmanifestet       |

Orakelbygget kräver Maven 3.9 eller nyare och JDK 21 (JDK 17 som reserv). Se
[Överensstämmelse](/sv/conformance) för orakelproceduren.
