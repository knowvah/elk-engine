---
title: Архитектура
sourceHash: b28f7adf145c6e3ab8efc737a9e5e9bb883714a2c79e0811ade88704241f3c21
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Обзор архитектуры elk-engine

| Документ                                                                                                               | Содержание                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [inventory.md](/guide/inventory)                                                                                       | Каждый бандл ELK: назначение, LOC, сгенерированные исходники, объём работ                                                                                          |
| [port-map.md](/guide/port-map)                                                                                         | Отображение пакетов Java на модули в `src/`                                                                                                                        |
| [component-map.md](#карта-компонентов)                                                                                 | Зависимости бандлов в объёме работ; основные части среды выполнения                                                                                                |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Правила перехода от Java к TypeScript                                                                                                                              |
| [../conformance.md](/conformance)                                                                                      | Планка сравнения с оракулом и процедура (появится позже в этой миссии)                                                                                             |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | Портирование ELK Text (`.elkt`), подмножество Xtext, runbook и отложенное                                                                                          |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | Портирование ELK Textual JSON (`.elkj`), ленивое связывание, runbook и отложенное                                                                                  |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | Портирование генератора случайных графов grandom (`.elkr`), свидетельства и runbook                                                                                |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Движок компоновки и провайдеры fixed, box и random (миссия 5a)                                                                                                     |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | Генератор `.melk`, ожидающие типы, ленивые константы, регенерация                                                                                                  |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | Ворота сложности, измеряющие каждую функцию (`npm run complexity`)                                                                                                 |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Каркас layered (миссия 7a): модель LGraph, преобразование, поэтапные классы, runbook                                                                               |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Размещение узлов в layered (миссия 7d): p4nodes, Brandes-Köpf, пять процессоров, строки геометрии, runbook                                                         |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Маршрутизация рёбер в layered (миссия 7e): ортогональная p5edges, ломаная, сплайны, шесть процессоров, строки маршрутизации, runbook                               |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Конвейер layered (миссия 7f): `ElkLayered`, `GraphConfigurator`, компоненты, четыре процессора, строки полной компоновки, подмножество раннера, runbook            |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Метки в layered (миссия 7f2): процессоры меток и комментариев, unzipping, отладочный вывод, visitor, строки меток, sweep, runbook                                  |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Самопетли, wrapping и компактификация в layered (миссия 7g): пакет loops, точки разрыва, одномерная компактификация, `ComponentsCompactor`, строки, sweep, runbook |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Составные графы в layered (миссия 7h): пакет `compound`, иерархический драйвер, остановки по всему дереву, golden-тесты, sweep, близнецы порядка хешей, runbook    |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | Sweep TS против оракула (строка 9): шардированный раннер, контракт сводки, аннотации, отчёт, runbook                                                               |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Подключаемое измерение текста меток (строка 10): патч 0003, двойник на TS, режим fixed, свидетельства, runbook                                                     |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | Перенос закрепления ELK (строка 13): разбор чистой разницы, серия патчей, пересборка, перезапись, sweep, разбор разницы эталонов, режим репетиции                  |

## Что такое elk-engine

`@knowvah/elk-engine` — точное портирование Eclipse Layout Kernel (ELK) на TypeScript. Java на зафиксированном
коммите `8bca22f4afa3371562d2f702d59929818f7f7b71` является спецификацией (AD-1, AD-2). Это библиотека:
безопасная для браузера, без зависимостей времени выполнения, без Java и WASM. Её публичный контракт — объектная
модель ElkGraph плюс фабрики `ElkGraphUtil`; ELK JSON — адаптер ввода-вывода (AD-14). В объём работ входят
тринадцать бандлов общим объёмом около 134 600 строк, написанных вручную (см. инвентаризацию). Текущее состояние:
движок компоновки (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) и три основных провайдера `fixed`, `box` и `random` портированы и совпадают с оракулом на отобранных golden-тестах (миссия 5a, [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). Остальная часть `core` тоже портирована (миссия 5b: конвейер процессоров, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, сплайны, прикрепление комментариев; см. [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)). Общий бандл `alg.common` портирован полностью (миссия 6a: геометрия, сетевой симплекс, одномерная компактификация, перекрытия, spore, polyomino; миссия 6b: `nodespacing` и `NodeMicroLayout`, подтверждённые воспроизведением 326 строк оракула; см. [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
Каркас layered портирован (миссия 7a: пакет опций, модель LGraph, преобразование ElkGraph ↔ LGraph и оболочка провайдера, подтверждённые двумя файлами векторов оракула на 272 и 330 строк; фазы компоновки следуют в 7b–7h; см. [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). Его первые две фазы портированы (миссия 7b: одиннадцать разрывателей циклов, девять layerer-ов и десять процессоров вокруг них, подтверждённые 651 строкой фаз оракула и sweep на 32 652 случая; [alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)). Его третья фаза портирована (миссия 7c: минимизация пересечений со счётчиками, greedy switch, компараторы порядка модели и восемь процессоров между P2 и P3, подтверждённые 808 строками порядка оракула и sweep на 6 728 случаев; [alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)). Его четвёртая фаза портирована (миссия 7d: четыре размещателя узлов с Brandes-Köpf и пять процессоров, нужных остановке на P4, подтверждённые 610 строками размещения оракула с геометрией и sweep на 8 410 случаев; [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)). Его пятая фаза портирована (миссия 7e: ортогональный, ломаный и сплайновый маршрутизаторы с шестью процессорами, нужными результату с маршрутами, подтверждённые 950 строками маршрутизации оракула с геометрией рёбер и sweep на 6 728 случаев; [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)). Конвейер layered работает (миссия 7f: драйвер, пакет компонент связности, преобразователь направления, маршрутизатор иерархических портов и три процессора, подтверждённые 1 311 строками оракула с полными компоновками и остановками, повторным воспроизведением 2 351 строки прежних строк через настоящий драйвер, 28 портированными наборами JUnit и sweep на 6 646 случаев; [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)). Компоновки с метками и комментариями, layer unzipping и монитор журналирования тоже работают (миссия 7f2: семейство меток, процессоры комментариев, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` и отладочные утилиты, подтверждённые 1 305 строками оракула с остановками и полными компоновками, 11 базовыми наборами JUnit и sweep на 1 105 случаев, 935 успешных случаев которого совпадают точно; [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)). Самопетли, graph wrapping и компактификация тоже работают (миссия 7g: пакет loops, четыре процессора самопетель, обёртки по точкам разрыва и по одному ребру, `HorizontalGraphCompactor`, пакет layered `compaction` и `ComponentsCompactor`, подтверждённые 1 627 строками оракула (`full` 731, `models` 307, `scenarios` 525, `sites` 64), 10 базовыми наборами JUnit, sweep на 3 073 случая, 2 997 успешных случаев которого совпадают точно, а 76 выброшенных исключений совпадают с обеих сторон, и подключением девяти ветвей, после которого портированы 58 ветвей; [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)). Составные графы тоже работают (миссия 7h: пакет `compound`, `HierarchicalNodeResizingProcessor` и последняя ветвь, подтверждённые 540 строками оракула (`full` 355, `models` 73 с остановками по всему дереву, `scenarios` 88, `sites` 24), 24 golden-тестами layered, девятью наборами issue и тремя методами graph.json, sweep на 1 169 случаев, 1 164 успешных случая которого совпадают точно, а 5 выброшенных исключений совпадают с обеих сторон; [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)). Алгоритм layered теперь выполняет каждый режим обработки иерархии: портированы 59 ветвей перечисления, ни одна не ожидает, а список поэтапного ввода пуст. Ожидают только три случая `elk.stress` из issue #58 (миссия 8b). Никакой другой алгоритм компоновки пока не работает (mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex). Начиная с миссии 8a, mrtree, radial и vertiflex тоже работают (подтверждено 1 181 строкой оракула в четырёх эталонах с полными компоновками и остановками, эталоном единичных векторов на 2 656 строк, 40 golden-тестами `trees`, `MrTreeGraphSizeTest` и `CenterOnRootTest` при 6/6 и 2/2 и sweep на 906 случаев на каждый алгоритм, в котором каждый случай либо совпадает, либо диагностирован; две строки radial, результат которых зависит от порядка преобразованной в дерево хеш-корзины, классифицированы, а не сопоставлены; [alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). Начиная с миссии 8b, force, stress и disco тоже работают (подтверждено 21 420 строками оракула в трёх эталонах с полными компоновками и остановками, 45 golden-тестами `force-disco`, `ForceImportTest` и `TwoBitGridTest` по 3/3 каждый и sweep на каждый алгоритм, в котором каждый случай либо совпадает, либо диагностирован; `Math.log` в Eades является побитово точным портом fdlibm; [alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)). Начиная с миссии 8c, rectpacking, spore (`sporeOverlap`, `sporeCompaction`) и topdownpacking тоже работают (подтверждено 2 593 строками оракула в трёх эталонах, 44 golden-тестами `packing`, восемью портированными наборами JUnit на 30 запусков и sweep на каждый алгоритм, в котором каждый детерминированный случай либо совпадает, либо диагностирован; [alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Каждый алгоритм в объёме работ прогоняется sweep против оракула, а результат по алгоритмам публикуется в отчёте о паритете ([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Связь с ELK Java и оракулом

![Связь между ELK Java, сборкой оракула, эталонами golden-тестов и elk-engine](/diagrams/overview-1.svg)

Серия патчей в этой миссии пуста (AD-3). Golden-тесты закоммичены, поэтому CI не нуждается в JVM (AD-5).
Сравнение: структура точно, координаты в пределах 1e-6 (AD-4).

## Ключевые потоки

Компоновка в ELK, которую elk-engine сегодня воспроизводит для `fixed`, `box` и `random` (подробности в [component-map.md](#карта-компонентов) и [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Поток вызова компоновки через рекурсивный движок компоновки](/diagrams/overview-2.svg)

Адаптер JSON (`graph.json`, `ElkGraphJson`): ELK JSON на входе превращается в ElkGraph импортёром перед
компоновкой; после компоновки вычисленные координаты и секции рёбер переносятся обратно в выходной JSON. Обвязка
оракула использует Java-адаптер в тех же двух шагах, поэтому обе стороны разделяют контракт JSON.

Адаптер текста (`graph.text`, `ElkGraphText`): текст `.elkt` загружается в ElkGraph через написанные вручную
парсер, линкер и валидатор, построенные на небольшом подмножестве Xtext (`src/xtext`), а ElkGraph сериализуется
обратно в `.elkt`. Точка входа внутренняя; см. [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Адаптер текстового JSON (`graph.json.text`, `ElkGraphJsonText`): текст `.elkj` загружается через то же
подмножество Xtext с написанным вручную парсером и связывается лениво, как `LazyLinker` в Xtext: концы рёбер —
это EMF-прокси (`src/emf`), которые разрешаются при чтении. ElkGraph сериализуется обратно в `.elkj` через
писатель, специфичный для грамматики. Точка входа внутренняя; см. [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Генератор случайных графов (`core.debug.grandom`, `GRandomText`): текст `.elkr` разбирается написанными вручную
лексером и парсером на том же подмножестве Xtext (`src/xtext`), а `RandomGraphGenerator` превращает конфигурацию в
ElkGraph с точной последовательностью `Random` из JVM. Вывод с seed побайтно совпадает с оракулом и воспроизводит
девять файлов `test/corpus/generated/*.json`; пути без seed (текст меток рёбер, перемешивание между иерархиями,
отсутствующий seed) проверяются только инвариантами. Точка входа внутренняя; см. [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

## Технологический стек

| Область          | Выбор                                                         |
| ---------------- | ------------------------------------------------------------- |
| Язык             | TypeScript 7.0.2 (нативный `tsc`), ES2022, NodeNext, `strict` |
| Тесты            | vitest 5.0.x с `@vitest/coverage-v8` (пороги 90%)             |
| Сборка бандлов   | esbuild 0.28.x                                                |
| Запуск скриптов  | tsx                                                           |
| Среда выполнения | Node 22 или новее; сам `src/` безопасен для браузера          |
| Только оракул    | Maven 3.9+ и JDK 21 (запасной JDK 17) для сборки Tycho в ELK  |

## Fitness-ограничения (AD-8)

Направление импорта бандлов следует `test/architecture/bundle-deps.json`; заголовок SPDX в каждом файле с кодом;
никаких встроенных модулей Node и `process.env` в `src/`; никакого изменяемого `let` на уровне модуля вне списка
разрешений.

## Инструментарий документации и выпуска

Добавлено строкой 12 дорожной карты; решения DP1–DP9 в
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md). `1.0.0` опубликована 2026-11-23.

| Часть                      | Что это                                                                                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Экспортируемая поверхность | Принята (2026-11-23), перечислена в [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) и удерживается равной `src/index.ts` тестом `src/index.test.ts`; заморожена на `1.0.0`, первой публикации в npm (AD-14) |
| Справочник API             | `npm run docs:api`: typedoc в приватном пакете `tools/typedoc/` с собственным TypeScript 6 (у typedoc нет релиза с TypeScript 7, AD-6), в генерируемый `/reference/`                                                                                         |
| Примеры                    | `test/docs/examples/*.ts`, показаны на странице начала работы сайта как фрагменты и сравниваются с эталонами оракула (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                                   |
| Проверка ссылок            | `npm run docs:linkcheck`: linkinator по собранному сайту, внутренние ссылки и фрагменты, в CI; внешние ссылки еженедельно (`links.yml`)                                                                                                                      |
| Репетиция упаковки         | `npm run pack:smoke`: упаковать, проверить список файлов, установить офлайн в чистый проект, импортировать, выполнить там компоновку примера и сравнить её с эталоном оракула                                                                                |
| Выпуск                     | конфигурация semantic-release и `release.yml`, запускаемые при каждом push в `main`; runbook в [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                              |

# Карта компонентов

| Диаграмма                | Что показывает                                        |
| ------------------------ | ----------------------------------------------------- |
| 1. Зависимости бандлов   | 13 бандлов в объёме работ и их рёбра `Require-Bundle` |
| 2. Ядро среды выполнения | Как алгоритм компоновки подключается к движку         |

Имена опускают префикс `org.eclipse.elk.`. Объём работ: [инвентаризация](/guide/inventory).

## 1. Зависимости бандлов в объёме работ

Источник истины: `test/architecture/bundle-deps.json`, выведенный из `META-INF/MANIFEST.MF` каждого бандла
скриптом `tools/bundle-deps.ts` и обеспечиваемый fitness-тестом (AD-8).
На диаграмме **32 ребра**, что равно 32 записям `requires` в JSON (graph.json x 2,
core x 1, alg.common x 2, девять алгоритмов x 3). Сторонние требования (Guava, EMF, Gson, библиотеки Xtend) и
бандлы вне объёма работ опущены. Стрелка `A --> B` означает, что A требует B, поэтому каталог B может
импортироваться каталогом A. `src/java` можно импортировать везде, и он не показан.

![Зависимости между 13 бандлами ELK в объёме работ](/diagrams/component-map-1.svg)

Ни один алгоритм не требует другого алгоритма: единственная общая зависимость среди алгоритмов — `alg.common`.
Новый импорт между каталогами алгоритмов проваливает fitness-тест, если в манифесте Java нет такого же ребра.

## 2. Части ядра среды выполнения

Расположение классов — в `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`,
если не указано иное; проверено на зафиксированном коммите.

| Класс                             | Путь                                | Роль                                                                      |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                                    |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Обходит иерархию, запускает провайдера на каждом уровне                   |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Базовый класс каждого алгоритма; реализует `IGraphLayoutEngine`           |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Одиночка-реестр данных об алгоритмах, опциях и категориях                 |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; по одному генерируется на бандл алгоритма (из `.melk`) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Идентификатор алгоритма плюс `getInstancePool()` провайдеров              |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Типизированные ключи опций и держатель карты, стоящий за `getProperty`    |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Модель графа; элементы являются `EMapPropertyHolder`                      |

Портировано миссией 5a ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)): `RecursiveGraphLayoutEngine` (разделён с
`RecursiveGraphLayoutEngineTopdown`, M17), `LayoutAlgorithmResolver` и подклассы `AbstractLayoutProvider`
`FixedLayoutProvider`, `BoxLayoutProvider` и `RandomLayoutProvider`. `LayoutMetaDataService`, `LayoutAlgorithmData`
и типы свойств появились раньше (миссии 2 и 3). Миссия 5b ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)) завершила бандл: `AlgorithmAssembler` и
`LayoutProcessorConfiguration` (конвейер, который использует каждый бандл алгоритма), `LayoutConfigurator`, `ElkSpacings`, разделы
`ElkMath`, `ElkGraphAdapters`, `util/selection/*` и `comments/*`. Её JDK-прослойки — `src/java/awt/geom`
(`Rectangle2D`) и `src/java/util/regex` (`Pattern`, `WordBoundary`), рядом с `JavaCharacter` в `src/java/lang`;
они подтверждены `awt.json`, `regex.json`, `character.json` и `regex-boundary.json`. Миссии 6a и 6b ([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) портировали весь `alg.common`; 6b добавила `nodespacing` и `NodeMicroLayout`, подтверждённые воспроизведением 326 строк оракула для `NodeMicroLayout`.

![Отношения классов ядра среды выполнения ELK](/diagrams/component-map-2.svg)

Как подключается алгоритм:

1. Бандл алгоритма поставляет подкласс `AbstractLayoutProvider` (например, `LayeredLayoutProvider` из
   `alg.layered`) и файл `.melk`, объявляющий его идентификатор, опции и поддерживаемые возможности.
2. Компилятор `.melk` генерирует `ILayoutMetaDataProvider` и класс опций. Его `apply(Registry)` регистрирует
   `LayoutAlgorithmData`, пул экземпляров которого создаёт провайдера.
3. `LayoutMetaDataService` собирает провайдеров. `LayoutAlgorithmResolver` задаёт идентификатор алгоритма
   каждому узлу из опции `algorithm`.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` берёт провайдера из `LayoutAlgorithmData.getInstancePool()`
   узла и вызывает `layout(layoutNode, progressMonitor)`, затем освобождает его (или вызывает `dispose()` после
   сбоя).

В elk-engine шаг `.melk` заменяется генератором (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)), а ElkGraph становится обычными
классами TS (AD-11). Отображение на файлы TS: [карта портирования](/guide/port-map); правила:
[правила перевода](/guide/translation-rules).
