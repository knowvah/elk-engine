---
title: Współtworzenie
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Współtworzenie

Przeczytaj najpierw [Przegląd](/pl/guide/overview) i [Reguły tłumaczenia](/guide/translation-rules). Java
z przypiętego commita jest specyfikacją; w razie wątpliwości czytaj Javę.

## Bramki

Uruchamiaj je przed każdym commitem. Każda musi przejść.

| Polecenie              | Sprawdza                                                   |
| ---------------------- | ---------------------------------------------------------- |
| `npm run format:check` | Formatowanie Prettierem                                    |
| `npm run typecheck`    | Sprawdzanie typów TypeScriptu (natywny `tsc --noEmit`)     |
| `npm test`             | Zestaw vitest, w tym zestaw golden                         |
| `npm run coverage`     | Zestaw z pokryciem 90% linii, gałęzi, funkcji i instrukcji |

Wymaga Node 22 lub nowszego. Zależności instaluj poleceniem `npm ci`.

## Testy są niezmienne

Oczekiwane wartości pochodzą z wyroczni, wektorów JVM lub kodu źródłowego Javy, zanim powstanie implementacja
(AD-13). Po napisaniu asercja jest zamrożona: niepowodzenie testu oznacza, że implementacja jest błędna.

Jeśli test może przejść tylko po zmianie swojej asercji, wektora lub golden, zatrzymaj się i zapisz przypadek
w dzienniku decyzji misji. Nie rozluźniaj tolerancji, nie usuwaj przypadku i nie generuj ponownie referencji, żeby
uzyskać zielony wynik. Referencje golden są generowane ponownie skryptem, nigdy ręcznie.

## Przepływ pracy

1. Utwórz gałąź funkcjonalności, na przykład `feature/<short-description>`.
2. Pisz komunikaty commitów jako [Conventional Commits](https://www.conventionalcommits.org), na przykład
   `feat(java): add JavaHashMap`. Tematy są pisane małymi literami i mają co najwyżej 72 znaki.
3. Otwórz pull request do `main`. CI sprawdza tytuł pull requesta jako Conventional Commit.
4. Commity muszą być podpisane; wymaga tego ruleset repozytorium.
5. Pull requesty są scalane merge commitem.

Każdy plik z kodem ma nagłówek SPDX, `// SPDX-License-Identifier: EPL-2.0`. Wymusza go test architektury. Zależności
muszą być zgodne z EPL-2.0.

## Polecenia dokumentacji

| Polecenie              | Cel                                                                     |
| ---------------------- | ----------------------------------------------------------------------- |
| `npm run docs:dev`     | Uruchamia witrynę dokumentacji z przeładowaniem na żywo                 |
| `npm run docs:build`   | Buduje witrynę; martwy link wewnętrzny powoduje niepowodzenie budowania |
| `npm run docs:preview` | Serwuje zbudowaną witrynę lokalnie                                      |

Większość stron referencyjnych dołącza pliki z `docs/`. Edytuj plik w `docs/`, a nie stronę w `docs-site/`. Diagramy
PlantUML w dołączanych plikach są renderowane do SVG i zatwierdzane w `docs-site/public/diagrams/`.

## Katalogi zewnętrzne

Skrypty i testy znajdują sąsiednie checkouty przez zmienne środowiskowe. Wartości domyślne są względne wobec korzenia
repozytorium. Tylko `tools/` i `test/` czytają te zmienne; kod w `src/` nigdy tego nie robi.

| Zmienna          | Domyślnie                      | Zawartość                                               |
| ---------------- | ------------------------------ | ------------------------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | Kod źródłowy Eclipse ELK w Javie na przypiętym commicie |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Odłączony worktree i zbudowana wyrocznia                |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | Korpus elk-models, przypięty w manifeście korpusu       |

Budowa wyroczni wymaga Mavena 3.9 lub nowszego i JDK 21 (awaryjnie JDK 17). Procedurę wyroczni opisuje
[Zgodność](/pl/conformance).
