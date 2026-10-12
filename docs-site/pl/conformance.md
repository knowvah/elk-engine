---
title: Zgodność
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Zgodność: co oznacza „zgodny”

@knowvah/elk-engine jest walidowany względem upstreamowego Eclipse ELK (Java) zbudowanego ze
źródeł. Layout w TypeScript jest **zgodny** z wyrocznią, gdy po sparsowaniu obu jako ELK JSON
struktura i każda wartość nienumeryczna są dokładnie równe, a każda liczba skończona zgadza się
w granicach absolutnej tolerancji `1e-6`.
Komparatorem jest [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts);
ten dokument opisuje, co on implementuje. Reguły portowania znajdziesz w
[`docs/translation-rules.md`](/guide/translation-rules).

| #   | Sekcja                                          | Odpowiada na pytanie                                  |
| --- | ----------------------------------------------- | ----------------------------------------------------- |
| 1   | [Wyrocznia](#1-wyrocznia)                       | Co jest „poprawne” i przy którym commicie?            |
| 1a  | [Jednostka zgodności](#1a-jednostka-zgodności)  | Czym jest jeden przypadek i jakie przypadki istnieją? |
| 2   | [Kryterium zgodności](#2-kryterium-zgodności)   | Co uznajemy za równe?                                 |
| 3   | [Goldeny i korpus](#3-goldeny-i-korpus)         | Skąd pochodzą wyniki referencyjne?                    |
| 4   | [Patche seam](#4-patche-seam)                   | Jak zmieniamy wyrocznię?                              |
| 5   | [Obsługa wyroczni](#5-obsługa-wyroczni-runbook) | Co robić, gdy coś przestaje działać?                  |
| 6   | [Bramki](#6-bramki)                             | Co musi przejść, zanim zmiana trafi do repozytorium?  |

## 1. Wyrocznia

Wyrocznia (AD-3) to upstreamowy ELK **zbudowany ze źródeł** w odłączonym worktree gita
z `$ELK_SOURCE_DIR`, tworzonym w `$ELK_ORACLE_DIR` przez `tools/oracle/build.sh`.
Oba leżą poza tym repozytorium; żaden nie jest w nim dołączony.

| Element              | Gdzie                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------- |
| Przypięty commit ELK | `tools/oracle/ELK_COMMIT` (obecnie `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)           |
| Seria patchy         | `tools/oracle/patches/*.patch`, stosowane w kolejności leksykalnej przez `git am --3way` |
| Budowanie            | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho pobiera artefakty p2)               |
| Runner wsadowy       | `tools/oracle/run.sh <outDir> <input>...` lub `run.sh --cases <cases.jsonl> <outDir>`    |
| Harness              | `tools/oracle/harness/ElkOracle.java`                                                    |
| Manifest budowania   | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patche, JDK, jar dla każdego bundla)        |

**Budowanie.** `build.sh` uruchamia `mvn -P elk-meta clean install -DskipTests` (kompilator melk),
a następnie `mvn clean install -DskipTests -Dmaven.test.skip=true` z `build/` w worktree, po czym
zapisuje w `oracle-build.json` jar każdego bundla objętego zakresem (`core`, `graph`, `graph.json`,
`alg.common` oraz algorytmy `layered`, `mrtree`, `radial`, `force`, `disco`, `rectpacking`, `spore`,
`topdownpacking`, `vertiflex`). Istniejący worktree jest ponownie używany tylko wtedy, gdy wywodzi
się z `ELK_COMMIT`, niesie dokładnie te tematy patchy, które są w `tools/oracle/patches/`, i jest
czysty poza wynikami budowania; w przeciwnym razie `build.sh` kończy działanie kodem `2` i nie
rusza worktree.

**Uruchamianie.** `run.sh` kompiluje `ElkOracle.java` względem jarów bundli oraz bundli zewnętrznych
(Gson, Guava, EMF, biblioteki Xtext/Xtend) z cache p2 Tycho (`P2_BUNDLES`, domyślnie
`~/.m2/repository/p2/osgi/bundle`; używana jest najnowsza wersja każdego). Jedna JVM układa każde
wejście przez `RecursiveGraphLayoutEngine` i zapisuje `<outDir>/<input basename>.json` z layoutem,
zerowymi wymiarami i zerowymi pozycjami; nieznane opcje layoutu są pomijane. Wejście zakończone
błędem wypisuje `ERROR <input>: <message>`; JVM kończy działanie kodem `1`, jeśli jakiekolwiek
wejście się nie powiodło. Nazwy bazowe wejść muszą być unikalne w obrębie jednego uruchomienia,
ponieważ nazwą wyjścia jest nazwa bazowa.

**Semantyka serii patchy.** Seria zawiera dziś jeden patch:

| Patch                                                                   | Efekt                                                                                                                                                                                                                                              | Sparowany seam w TS                                                                                                                           |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` rozwiązuje kolizje id przez `"_g" + Random.nextInt(1000000)`; patch inicjalizuje ten `Random` z właściwości systemowej `org.eclipse.elk.graph.json.exportSeed` (nieustawiona = zachowanie ELK). `run.sh` przekazuje `EXPORT_SEED=1` | Wstrzykiwalny `Random` w porcie `graph.json`; oczekuje na ten port (shim `Random` w TS już odtwarza ten strumień: seed 1 daje 548985, 764588) |

Patche istnieją tylko po to, by dodawać wąsko zakresowe seamy, dzięki którym zachowanie JVM i JS
da się porównać; każdy jest sparowany z seamem po stronie TS (sekcja 4).

**Dlaczego nie elkjs?** elkjs to ELK skompilowany przez GWT. Nie może przenosić naszej serii
patchy, a emulacja JRE w GWT różni się od JVM, z której portujemy. Nie jest używany jako wyrocznia.

## 1a. Jednostka zgodności

**Przypadek** to `(algorithm, model, variant)` (D1). Dashboard parytetu ma jeden wiersz na
algorytm layoutu; folder elk-models i cechy census są filtrami, a nie wierszami.

**Id przypadku.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, na przykład
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` to id algorytmu
bez `org.eclipse.elk.`. Dla modeli generowanych `modelId` ma postać `generated/<name>`.

**Id modelu i źródło (D3).** Id modelu to ścieżka w elk-models bez rozszerzenia.
Przypadek czyta `.json`, jeśli istnieje, w przeciwnym razie `.elkt`; `.elkg` (EMF XMI) nigdy nie jest czytany.

**Warianty (D6).** Nazwane nakładki opcji w `test/corpus/variants.json`, stosowane na korzeniu:
`default` (brak), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algorytm                                      | Modele                              | Warianty               |
| ------------ | --------------------------------------------- | ----------------------------------- | ---------------------- |
| native       | własny `rootAlgorithm` modelu                 | każdy model census                  | wszystkie siedem       |
| retarget     | każdy wymieniony algorytm poza własnym modelu | każdy model census                  | tylko `default` (OR-1) |
| generated    | algorytm wskazany prefiksem pliku             | `test/corpus/generated/*.json`      | wszystkie siedem       |
| ported JUnit | zależnie od misji algorytmu                   | przypadki JUnit z upstreamu (AD-13) | tak jak portowane      |

`tools/oracle/run.sh --list-algorithms` wypisuje listę id algorytmów (dziś 14).

**Retarget (D2).** Harness ustawia `org.eclipse.elk.algorithm` na **każdym węźle, który ma
dzieci**, zastępując każdą zadeklarowaną wartość, oraz `org.eclipse.elk.randomSeed = 1` na korzeniu. ELK
rozwiązuje algorytm dla każdego węzła osobno, a węzeł bez ustawienia wraca do layered. Korzeń bez
dzieci dostaje tylko seed. Tier retarget pomija własny `rootAlgorithm` każdego modelu (pokrywa go
tier native).

## 2. Kryterium zgodności

AD-4, dokładnie tak, jak implementuje je `compareLayout(expected, actual, { tol })`:

| Reguła                    | Zachowanie                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tolerancja                | Absolutna, `DEFAULT_TOLERANCE = 1e-6`; liczby skończone przechodzą, gdy `abs(e - a) <= tol`                                                                                                                  |
| Liczby nieskończone       | `NaN` i `±Infinity` muszą być dokładnie równe (`Object.is` lub `===`), nawet przy `tol: Infinity`                                                                                                            |
| Stringi, booleany, `null` | Ścisła równość, w przeciwnym razie `value`                                                                                                                                                                   |
| Niezgodność rodzaju       | Różne rodzaje JSON (`null`, tablica, obiekt, liczba, string, boolean) dają jedną rozbieżność `type`                                                                                                          |
| Klucze obiektu            | Zbiór kluczy musi być identyczny: klucz tylko w expected to `missing`, tylko w actual to `extra`                                                                                                             |
| Tablice                   | Dopasowanie **po `id`**, gdy każdy element po obu stronach jest obiektem ze stringowym `id`, a id są unikalne po każdej stronie (pusta tablica liczy się jako kluczowana); w przeciwnym razie **pozycyjnie** |
| Tablice kluczowane        | Id po jednej stronie to rozbieżność `structure` w `path[id=<id>]`; kolejność jest ignorowana                                                                                                                 |
| Tablice pozycyjne         | Różnica długości to jedna rozbieżność `structure`, a elementy nie są dalej porównywane                                                                                                                       |
| Rodzaje rozbieżności      | `structure`, `value`, `type`, `missing`, `extra`; `path` przypomina ścieżkę JSON (`children[id=n1].x`)                                                                                                       |

Konsekwencje: id elementów, liczby elementów, topologia sekcji krawędzi i liczby punktów załamania
są dokładne, bo id i długości tablic są dokładne; współrzędne i rozmiary dostają `1e-6`. `formatDiffs`
wypisuje co najwyżej 20 rozbieżności.

**Polityka znanych rozbieżności.** Rozbieżności nigdy nie pochłania się podniesieniem `tol`
ani edycją golden (AD-13). Każda jest tu zapisana wraz z przyczyną oraz testem lub fixture, których
dotyczy. Akceptowane klasy:

- **Różnice `Math.*` na poziomie ulp.** V8 i JVM mogą się różnić na ostatnim bicie `sin`,
  `cos`, `exp`, `log`, `pow` i pokrewnych; `StrictMath` w Javie jest specyfikowany co do bitu,
  `Math` nie. Przypadek, który już wystąpił: `nextGaussian` jest specyfikowany tak, by używał
  `StrictMath.log`, więc `src/java/util/Random.ts` zawiera implementację dokładną względem
  `StrictMath.log` zamiast `Math.log`. Wolej port algorytmu `StrictMath` dokładny co do bitu
  niż poszerzanie tolerancji.
- **Iteracja po hashach tożsamości (AD-10).** Iterowanie po `HashMap`/`HashSet` z kluczami
  hashowanymi tożsamością jest niedeterministyczne już w samej Javie. Odnotuj to miejsce w dzienniku
  i portuj z kolejnością wstawiania; goldeny nie mogą od tego zależeć. Klucze hashowane wartością
  (String, Integer) muszą odtwarzać kolejność z Javy.
- **`Random` inicjalizowany czasem.** Przy `randomSeed = 0` ELK inicjalizuje się zegarem
  (`core/Core.melk:608`), więc wynik nie jest powtarzalny. Wejścia golden muszą zostawiać seed
  nieustawiony lub niezerowy (domyślny seed layered to `1`).

Konkretne wpisy (dodawaj je tylko za zgodą użytkownika):

| #   | Rozbieżność                       | Przyczyna                                                                              | Zakres                                                                                                                                                                    | Zatwierdzone               |
| --- | --------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1   | Tekst komunikatu błędu parsowania | Komunikaty ANTLR są artefaktami wygenerowanego parsera, który nigdy nie jest portowany | Niepoprawne wejście gramatyki (`.elkt`, `.elkj`, `.elkr`): musi się zgadzać tylko _obecność_ błędu parsowania, nie komunikat. Poprawne wejście musi zgadzać się dokładnie | D8, użytkownik, 2026-10-11 |

**Werdykty.** Każdy przypadek dostaje jeden werdykt z dwóch oddzielnych uruchomień wyroczni na JVM (D4, D5, OR-2):

| Werdykt            | Znaczenie                                                                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Oba uruchomienia ułożyły model, a pliki wyjściowe są identyczne bajt w bajt                                                                                                               |
| `throws`           | Oba uruchomienia rzuciły ten sam wyjątek: dokładnie ta sama klasa i dokładnie ten sam komunikat po zamianie `@[0-9a-f]+` na `@<hash>` (komunikat może być null, np. `StackOverflowError`) |
| `nondeterministic` | Uruchomienia się różnią (bajty wyjścia, wyjątek albo jedno `ok` i jedno `throws`)                                                                                                         |
| `oracle-error`     | Usterka harnessu (nieczytelne wejście, nieznany wariant/algorytm/opcja, zgubiona linia wyniku); nigdy niedopuszczalne                                                                     |
| `timeout`          | Uruchomienie przekroczyło `ELK_SWEEP_TIMEOUT_MS`                                                                                                                                          |

Pierwszeństwo: `oracle-error`, potem `timeout`, potem `ok`/`throws`, gdy są równe, w przeciwnym razie
`nondeterministic`. Przed porównaniem bajtów każdy token `@[0-9a-f]+` w obu wyjściach jest
zastępowany przez `@<hash>`, tak jak w komunikatach wyjątków (D5a; `sameOutput` w `tools/corpus/sweep.ts`).
Przyczyna: programistyczna opcja `debug.discoGraph` w disco eksportuje `...DCGraph@<identity hash>`,
czego żaden seed nie ustali. Komparator TS stosuje tę samą zamianę. Przypadki niedeterministyczne
są raportowane osobno i wyłączane z liczników zaliczeń, zgodnie z powyższą polityką hashy tożsamości.

Rzeczywiste pozostałe źródła `nondeterministic` (zachowanie ELK, nie usterki harnessu; liczby są w
raporcie parytetu): spore (`ElkGraphImporter.java:169` wprowadza zakłócenia przez `Math.random`) oraz `random`
(domyślny `randomSeed` 0 jest niezasiany w zagnieżdżonych kompozytach; retarget zasiewa tylko korzeń, D2,
zachowane decyzją użytkownika). Przemianowania id `_g<random>` przez eksporter nie są źródłem: patch
seam je naprawia.

## 3. Goldeny i korpus

AD-5. Wyniki referencyjne są zatwierdzone w repozytorium, żeby CI nie potrzebowało JVM.

| Element            | Gdzie                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Przypięty korpus   | `eclipse-elk/elk-models` przy `commit` z `test/corpus/manifest.json` (niedołączony)             |
| Katalog modeli     | `$ELK_MODELS_DIR`, domyślnie `../../eclipse-elk/elk-models` względem tego repozytorium          |
| Zbiór kuratorowany | `golden[]` w `test/corpus/manifest.json`: `{ id, path, note }`                                  |
| Refy               | `test/golden/refs/elk/<id>.json`, jeden na każde `id` z manifestu                               |
| Proweniencja       | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**Odwzorowanie id na ścieżkę.** `golden[].path` jest względna wobec `$ELK_MODELS_DIR`, a
wejściem jest `$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` uruchamia harness na tych wejściach
i zapisuje każde wyjście `<basename>.json` jako `refs/elk/<id>.json`.
Przykład: id `ptolemy-scrambler` to
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Regeneracja** (`tools/oracle/regen-goldens.sh`):

1. Wymaga, by klon models był dokładnie na commicie z manifestu (inaczej kod wyjścia `1`).
2. Wymaga zbudowanej wyroczni (`run.sh` potrzebuje `oracle-build.json`).
3. Umieszcza wszystkie refy i `_meta.json` w `test/golden/refs/.elk-staging.*`, a następnie
   podmienia katalog dwiema zmianami nazwy, więc nieudane uruchomienie zostawia stare refy.
4. `_meta.json` nie ma znaczników czasu (`builtAt` zostaje w `oracle-build.json`), więc
   regeneracja bez zmienionych wejść jest w gicie no-opem co do bajtu.

**Kiedy regenerować:** po zmianie `ELK_COMMIT`, serii patchy, zbioru `golden[]` lub `commit` w
manifeście albo harnessu. W innych przypadkach nigdy.

**Reguła dziennika.** Każda regeneracja, która zmienia ref, jest odnotowana w dzienniku z
przyczyną (id patcha lub podniesienie commita). Refów nigdy nie edytuje się ręcznie. Jeśli asercja
TS lub golden może przejść tylko po zmianie, zatrzymaj się i zapisz to w dzienniku (AD-13).

**Census.** `npx tsx tools/corpus/census.ts` niczego nie układa: uruchamia wyrocznię w trybie parsowania
na każdym modelu i porównuje wynik z zatwierdzonym `test/corpus/census.json` (898
modeli: id, formaty, źródło, algorytm korzenia, liczby cech). Kod wyjścia `0` przy równości, `1` przy dryfie;
`--write` nadpisuje plik. Działa tylko w przypiętym klonie models i przerywa przy usterce
harnessu.

**Korpus generowany (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` zawiera zasiewaną
konfigurację grandom; sąsiadujący `.json` to wejście wygenerowane przez wyrocznię, bez układu. Dziewięć konfiguracji pokrywa
id algorytmów, których nie używa żaden model elk-models: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Każda ma co najwyżej 50 węzłów i
żadnych etykiet krawędzi (`BlindTextGenerator` jest niezasiany). Harness nazywa wygenerowany korzeń `root`,
ponieważ `JsonExporter` w ELK rozwiązuje kolizję id niezasianym losowym sufiksem. Regeneruj
wyłącznie przez `tools/oracle/regen-generated.sh` (katalog tymczasowy i zmiana nazwy; nieudana konfiguracja
zostawia stare pliki); ponowne uruchomienie bez zmian jest w gicie no-opem. Port grandom w TS musi
odtwarzać te pliki `.json` bajt w bajt; goldeny algorytmów nigdy od tego nie zależą.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` planuje każdy przypadek, uruchamia każdy dwukrotnie w oddzielnych JVM (domyślnie
shardów jest `min(cpus, 8)` równoległych procesów `run.sh`) i zapisuje
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` wypisuje liczby przypadków na tier i niczego nie uruchamia; `--filter` zachowuje id przypadków zawierające
podciąg; `--limit` pobiera próbkę ze stałym krokiem. Kod wyjścia `0`, chyba że przypadek ma `oracle-error`
(`1`); awaria narzędzia kończy się kodem `2`. Wyniki poszczególnych przypadków zostają lokalne (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(domyślnie `30000`, czytany tylko przez `tools/`) ogranicza każdy przypadek; `run.sh` restartuje JVM po
przekroczeniu czasu (kod wyjścia JVM 75) dla przypadków bez linii wyniku.

**Raport parytetu (D9).** `docs/parity-report.md` jest generowany z cache sweepa i zatwierdzany:
liczby na algorytm i werdykt, z commitami ELK i models oraz bez znaczników czasu. Regeneruj
przez `npx tsx tools/corpus/parity-report.ts --write`; bez `--write` polecenie kończy się kodem `1`,
gdy zatwierdzony raport jest nieaktualny. Nigdy nie edytuj go ręcznie.

**Testy korpusu.** `resolveModelsDir()` w `test/corpus/corpus.ts` zwraca powód
`skip`, gdy klon nie istnieje lub jest na innym commicie; testy, które go potrzebują,
są pomijane z przypiętym sha w komunikacie. Dziś `test/golden/oracle-refs.test.ts`
sprawdza tylko zatwierdzone refy: jeden na id z manifestu, geometrię na każdym węźle, porcie, etykiecie i krawędzi,
porównanie z samym sobą oraz to, że `_meta.json` zgadza się z `ELK_COMMIT`, manifestem i generatorem. Testu
layoutu TS względem wyroczni jeszcze nie ma; pojawi się wraz z pierwszym portowanym algorytmem.

## 4. Patche seam

Patche seam zmieniają wyrocznię; są rzadkie i zawsze sparowane z seamem w TS.

1. Edytuj i zatwierdź w worktree wyroczni (`$ELK_ORACLE_DIR`) albo napisz patch w roboczym klonie przy
   `ELK_COMMIT`. Aby dodać gotowy patch w miejscu do istniejącego worktree (zachowuje cache
   `census/` i `sweep/`, które usunięcie worktree kasuje), zastosuj go z tożsamością
   `build.sh`:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   `build.sh` następnie weryfikuje serię i przebudowuje w miejscu (około 3 minut), więc kroki 4-5
   można pominąć.
2. Eksport:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (lub tylko nowe commity). Pliki nazywają się `NNNN-<slug>.patch`; numeryczny
   prefiks ustala kolejność stosowania.
3. Dodaj pasujący seam w TS (to samo zachowanie, wstrzykiwalny, w `src/`), z testami,
   których oczekiwane wartości pochodzą z spatchowanej wyroczni (AD-13).
4. W przeciwnym razie usuń worktree: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (dodaj `--force`, jeśli wyniki budowania go brudzą).
5. Przebuduj: `tools/oracle/build.sh` (stosuje serię od zera).
6. Zregeneruj: `tools/oracle/regen-goldens.sh`; przejrzyj `git diff test/golden/refs`.
7. Zapisz w dzienniku wpis wskazujący patch (`NNNN-<slug>.patch`) i wymieniający każdy
   zmieniony ref. `patches` w `_meta.json` rejestruje serię automatycznie.

Nigdy nie zostawiaj niezatwierdzonej edycji w worktree: `build.sh` traktuje ją jako nieaktualną
(kod wyjścia `2`). Nigdy nie edytuj samego `ELK_SOURCE_DIR`.

## 5. Obsługa wyroczni (runbook)

| Awaria                                                                       | Wykrycie                                                                                                                                                                                                                                                                                     | Środek zaradczy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Budowanie Tycho kończy się błędem (p2 nieosiągalne, JDK, wersja Mavena)      | `tools/oracle/build.sh` kończy się kodem niezerowym; pełne wyjście Mavena w `.oracle-build.log` w korzeniu repozytorium. Kod `1` oznacza brakujące narzędzie lub zły Maven; kod `3` oznacza, że jar bundla nie został wyprodukowany                                                          | Maven musi być **3.9.x**: Tycho 4.0.12 nie działa z Mavenem 3.10 (3.10.0 z Homebrew) i zgłasza `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. Lokalny 3.9.11 leży w `.tools/apache-maven-3.9.11/` (gitignored): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Użyj JDK 21 lub JDK 17 przez `JAVA_HOME`. Sprawdź sieć (pierwsze uruchomienie pobiera artefakty p2), po czym uruchom ponownie. `build.sh --record-only` pomija Mavena i tylko przepisuje `oracle-build.json` z już zbudowanych jarów. Kod `2`: usuń worktree (sekcja 4, krok 4) i przebuduj. W pozostałych przypadkach eskaluj z końcówką logu |
| `build.sh` kończy się kodem `2` zaraz po zastosowaniu patcha                 | Worktree zgłoszony jako nieaktualny                                                                                                                                                                                                                                                          | `build.sh` rozwija zawinięte tematy patchy (`git format-patch` zawija je po około 78 znakach) i ignoruje nieśledzone cache `census/` i `sweep/`; inny brud lub patch spoza listy nadal daje kod `2`: napraw worktree (sekcja 4)                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Dryf golden po patchu lub podniesieniu commita                               | `tools/oracle/regen-goldens.sh`, a potem `git diff --exit-code test/golden/refs` nie jest puste; `test/golden/oracle-refs.test.ts` nie przechodzi przy nieaktualnym `_meta.json` (`elkCommit`, `modelsCommit`); test zgodności TS, gdy już istnieje, nie przechodzi z raportem `formatDiffs` | Przebuduj (`build.sh`), uruchom `regen-goldens.sh`, przejrzyj diff, zapisz w dzienniku id patcha. Nigdy nie edytuj refa ręcznie ani nie luzuj `tol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Brak jara Xtext/ANTLR w cache p2 (`.elkt`, `.elkr` lub każdy start `run.sh`) | `run.sh` kończy się kodem niezerowym z `bundle <name> not in p2 cache <dir>` (np. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                                       | Ustaw `P2_BUNDLES` na cache p2 Tycho, które go zawiera, albo uruchom `build.sh` z dostępem do sieci, żeby Tycho go pobrał; uruchom `run.sh` ponownie. Nie podstawiaj jarów z innego miejsca                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Sweep się zawiesza lub OOM                                                   | Przypadek działa do limitu czasu i zgłasza `timeout` (linia stderr go wskazuje); uruchomienie bez linii wyniku daje `oracle-error` i `sweep: shard <n> run <A or B> exited <code>` na stderr; maszyna swapuje przy 8 równoległych JVM                                                        | Zmniejsz współbieżność i rozmiar wsadu: `sweep.sh --shards 2`, zawęż przez `--filter` lub `--limit`. Podnoś `ELK_SWEEP_TIMEOUT_MS` tylko dla modelu, który jest wolny, ale poprawny. Powtarzalny `timeout` jest ustaleniem: zapisz id przypadku w dzienniku, nie poszerzaj limitu, by go ukryć                                                                                                                                                                                                                                                                                                                                                                             |
| Dryf census po podniesieniu pinu (`ELK_COMMIT` lub `commit` models)          | `npx tsx tools/corpus/census.ts` kończy się kodem `1` i wypisuje różniące się modele; `test/corpus/census.test.ts` nie przechodzi                                                                                                                                                            | Potwierdź, że klon i wyrocznia są na nowych pinach, uruchom ponownie `census.ts --write`, przejrzyj `git diff test/corpus/census.json`, zapisz przyczynę w dzienniku, następnie uruchom ponownie `sweep.sh` i zregeneruj raport parytetu. Nigdy nie edytuj census ręcznie                                                                                                                                                                                                                                                                                                                                                                                                  |
| elk-models brak lub zły sha                                                  | Testy korpusu są pomijane z komunikatem wskazującym oczekiwany sha; `regen-goldens.sh` kończy się kodem `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                                   | Uruchom `test/corpus/fetch.sh` (klonuje i wypakowuje przypięty commit). Kończy się kodem `2`, jeśli istniejący klon jest na innym commicie, i go nie rusza: napraw ten klon samodzielnie albo wskaż `ELK_MODELS_DIR` na nową ścieżkę. Nigdy nie przesuwaj HEAD istniejącego klonu ze skryptu                                                                                                                                                                                                                                                                                                                                                                               |

Inne błędy `run.sh`: `oracle-build.json missing` lub `oracle jar missing`
oznacza, że trzeba najpierw uruchomić `build.sh`; `bundle <name> not in p2 cache` oznacza, że trzeba
ustawić `P2_BUNDLES` na cache p2 Tycho albo ponownie uruchomić `build.sh` z dostępem do sieci.

## 6. Bramki

Każda zmiana:

| Bramka           | Polecenie                                                            | Kryterium                                                                               |
| ---------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Typy             | `npm run typecheck`                                                  | kod wyjścia 0                                                                           |
| Testy i pokrycie | `npm run coverage`                                                   | wszystkie testy przechodzą; 90% statements, branches, functions i lines w `src/**`      |
| Architektura     | `test/architecture/*.fitness.test.ts` (uruchamiane przez `npm test`) | granice modułów, globale modułów, brak wbudowanych modułów Node w `src/`, nagłówki SPDX |
| Refy wyroczni    | `test/golden/oracle-refs.test.ts`                                    | zatwierdzone refy spójne z manifestem i `ELK_COMMIT`                                    |

Zmiany w `tools/oracle/`, manifeście lub serii patchy wymagają dodatkowo:

| Bramka                | Polecenie                                                                      | Kryterium                                                                   |
| --------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Budowanie wyroczni    | `tools/oracle/build.sh`                                                        | kod wyjścia 0                                                               |
| Uruchomienie wyroczni | `tools/oracle/run.sh <outDir> <input.json>...`                                 | kod wyjścia 0, brak linii `ERROR`                                           |
| Stabilność golden     | `tools/oracle/regen-goldens.sh`, potem `git diff --exit-code test/golden/refs` | brak diffu, chyba że zmiana ma przesunąć refy i jest odnotowana w dzienniku |
| Shell                 | `shellcheck tools/oracle/*.sh`                                                 | czysto                                                                      |

Zmiany w `tools/oracle/` lub `tools/corpus/` wymagają dodatkowo:

| Bramka                | Polecenie                                                                             | Kryterium                                                                |
| --------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Census                | `npx tsx tools/corpus/census.ts`                                                      | kod wyjścia 0 (brak dryfu)                                               |
| Stabilność generowana | `tools/oracle/regen-generated.sh`, potem `git diff --exit-code test/corpus/generated` | brak diffu                                                               |
| Sweep                 | `tools/oracle/sweep.sh` (lub `--filter`/`--limit` dla próbki)                         | kod wyjścia 0: brak `oracle-error`                                       |
| Raport parytetu       | `npx tsx tools/corpus/parity-report.ts`                                               | kod wyjścia 0 (zatwierdzony raport aktualny); zregeneruj przez `--write` |
