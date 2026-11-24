---
title: 架構
sourceHash: bd9497d352debbb8c889e45fc334c90f3e318451e38381e96d0a09fdce150fe5
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-engine 架構概覽

| 文件                                                                                                                   | 內容                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | 每個 ELK bundle：用途、LOC、產生的原始碼、範圍                                                                      |
| [port-map.md](/guide/port-map)                                                                                         | Java 套件到 `src/` 模組的對應                                                                                       |
| [component-map.md](#元件對應圖)                                                                                        | 範圍內的 bundle 相依關係；執行階段核心組成                                                                          |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Java 到 TypeScript 的規則                                                                                           |
| [../conformance.md](/conformance)                                                                                      | 基準實作的比較標準與流程（本任務稍後提供）                                                                          |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | ELK Text（`.elkt`）移植、Xtext 子集、執行手冊與延後項目                                                             |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | ELK Textual JSON（`.elkj`）移植、延遲連結、執行手冊與延後項目                                                       |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | grandom（`.elkr`）隨機圖形產生器移植、佐證與執行手冊                                                                |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | 版面配置引擎以及 fixed、box 和 random 提供者（任務 5a）                                                             |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | `.melk` 產生器、待定型別、惰性常數、重新產生                                                                        |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | 度量每個函式的複雜度關卡（`npm run complexity`）                                                                    |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Layered 框架（任務 7a）：LGraph 模型、轉換、分階段的類別、執行手冊                                                  |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Layered 節點擺放（任務 7d）：p4nodes、Brandes-Köpf、五個處理器、幾何列、執行手冊                                    |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Layered 邊繞線（任務 7e）：p5edges 正交、折線、曲線、六個處理器、繞線列、執行手冊                                   |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Layered 管線（任務 7f）：`ElkLayered`、`GraphConfigurator`、元件、四個處理器、完整版面配置列、runner 子集、執行手冊 |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Layered 標籤（任務 7f2）：標籤與註解處理器、拆層、除錯輸出、訪問者、標籤列、掃描、執行手冊                          |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Layered 自環、換行、壓縮（任務 7g）：loops 套件、斷點、一維壓縮、`ComponentsCompactor`、列、掃描、執行手冊          |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Layered 複合圖（任務 7h）：`compound` 套件、階層驅動器、整樹停點、黃金案例、掃描、雜湊順序孿生、執行手冊            |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | TS 對基準實作的掃描（第 9 列）：分片執行器、摘要契約、註記、報告、執行手冊                                          |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | 可抽換的標籤文字度量（第 10 列）：修補檔 0003、TS 孿生、固定模式、佐證、執行手冊                                    |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | 移動 ELK 固定點（第 13 列）：淨差異分流、修補檔系列、重建、重新錄製、掃描、參考檔差異分流、演練模式                 |

## elk-engine 是什麼

`@knowvah/elk-engine` 是 Eclipse Layout Kernel（ELK）的忠實 TypeScript 移植。固定提交 `8bca22f4afa3371562d2f702d59929818f7f7b71` 上的 Java 即是規格（AD-1、AD-2）。它是一個程式庫：可安全用於瀏覽器、零執行階段相依、沒有 Java 或 WASM。其公開契約是 ElkGraph 物件模型加上 `ElkGraphUtil` 工廠；ELK JSON 是 I/O 轉接器（AD-14）。範圍內共有十三個 bundle，手寫程式碼合計約 134,600 行（請見清單）。目前狀態：版面配置引擎（`RecursiveGraphLayoutEngine`、`LayoutAlgorithmResolver`、`GraphValidator`）與三個核心提供者 `fixed`、`box` 和 `random` 已移植，並在精選黃金案例上與基準實作一致（任務 5a，[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)）。`core` 的其餘部分也已移植（任務 5b：處理器管線、`LayoutConfigurator`、`ElkSpacings`、`ElkMath`、曲線、註解附著；請見 [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)）。共用的 `alg.common` bundle 已全部移植（任務 6a：幾何、network simplex、一維壓縮、重疊、spore、polyomino；任務 6b：`nodespacing` 與 `NodeMicroLayout`，由 326 列基準實作重播證明；請見 [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)）。layered 框架已移植（任務 7a：選項套件、LGraph 模型、ElkGraph ↔ LGraph 轉換與提供者外殼，由 272 列與 330 列的兩個基準實作向量檔證明；版面配置階段在 7b–7h 中跟進；請見 [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)）。它的前兩個階段已移植（任務 7b：十一個斷環器、九個分層器及其周圍的十個處理器，由 651 列基準實作階段列與一次 32,652 個案例的掃描證明；[alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)）。它的第三個階段已移植（任務 7c：帶計數器的交叉最小化、greedy switch、模型順序比較器，以及 P2 與 P3 之間的八個處理器，由 808 列基準實作順序列與一次 6,728 個案例的掃描證明；[alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)）。它的第四個階段已移植（任務 7d：帶 Brandes-Köpf 的四個節點擺放器，以及 P4 停點所需的五個處理器，由 610 列帶幾何的基準實作擺放列與一次 8,410 個案例的掃描證明；[alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)）。它的第五個階段已移植（任務 7e：正交、折線與曲線繞線器，以及已繞線結果所需的六個處理器，由 950 列帶邊幾何的基準實作繞線列與一次 6,728 個案例的掃描證明；[alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)）。layered 管線已運作（任務 7f：驅動器、連通元件套件、方向轉換器、階層連接埠繞線器與三個處理器，由 1,311 列整體版面配置與停點的基準實作列、經真實驅動器對先前各列的 2,351 列重新重播、28 個已移植的 JUnit 套件，以及一次 6,646 個案例的掃描證明；[alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)）。帶標籤與註解的版面配置、拆層以及記錄監看器同樣已運作（任務 7f2：標籤家族、註解處理器、`AlternatingLayerUnzipper`、`InteractiveLayeredGraphVisitor` 與除錯工具，由 1,305 列停點與整體版面配置的基準實作列、11 個基線 JUnit 套件，以及一次 1,105 個案例的掃描證明，其中 935 個 ok 案例完全一致；[alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)）。自環、圖形換行與壓縮也已運作（任務 7g：loops 套件、四個自環處理器、斷點與單邊包裝器、`HorizontalGraphCompactor`、layered 的 `compaction` 套件與 `ComponentsCompactor`，由 1,642 列基準實作列（`full` 731、`models` 307、`scenarios` 525、`sites` 79）、10 個基線 JUnit 套件、一次 3,073 個案例的掃描（其中 2,997 個 ok 案例完全一致，76 個 throw 在兩側皆一致），以及留下 58 個已移植分支的九分支接線證明；[alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)）。複合圖同樣已運作（任務 7h：`compound` 套件、`HierarchicalNodeResizingProcessor` 與最後一個分支，由 540 列基準實作列（`full` 355、帶整樹停點的 `models` 73、`scenarios` 88、`sites` 24）、24 個 layered 黃金案例、九個 issue 套件與三個 graph.json 方法，以及一次 1,169 個案例的掃描（其中 1,164 個 ok 案例完全一致，5 個 throw 在兩側皆一致）證明；[alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)）。layered 演算法現在執行每一種階層處理模式：59 個列舉分支已移植，沒有待定項，分階段清單為空。issue #58 的三個 `elk.stress` 案例曾等待任務 8b，自其裁定落實後已在執行（任務 layered-stress-cases）。其他版面配置演算法尚未執行（mrtree、radial、force、disco、rectpacking、spore、topdownpacking、vertiflex）。自任務 8a 起，mrtree、radial 與 vertiflex 也已執行（由四個參考檔中 1,181 列整體版面配置與停點的基準實作列、一個 2,656 列的單元向量參考檔、40 個 `trees` 黃金案例、分別為 6/6 與 2/2 的 `MrTreeGraphSizeTest` 與 `CenterOnRootTest`，以及每個演算法 906 個案例的掃描證明，掃描中每個案例要嘛一致、要嘛已被診斷；兩個其結果取決於樹化雜湊桶順序的 radial 列被歸類，而非比對一致；[alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)）。自任務 8b 起，force、stress 與 disco 也已執行（由三個參考檔中 21,420 列整體版面配置與停點的基準實作列、45 個 `force-disco` 黃金案例、皆為 3/3 的 `ForceImportTest` 與 `TwoBitGridTest`，以及每個演算法的一次掃描證明，掃描中每個案例要嘛一致、要嘛已被診斷；Eades 的 `Math.log` 是逐位元精確的 fdlibm 移植；[alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)）。自任務 8c 起，rectpacking、spore（`sporeOverlap`、`sporeCompaction`）與 topdownpacking 也已執行（由三個參考檔中 2,593 列基準實作列、44 個 `packing` 黃金案例、30 次執行的八個已移植 JUnit 套件，以及每個演算法的一次掃描證明，掃描中每個確定性案例要嘛一致、要嘛已被診斷；[alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)）。範圍內的每個演算法都已對照基準實作掃描，每個演算法的結果發布在一致性報告中（[parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)）。

## 與 ELK Java 及基準實作的關係

![ELK Java、基準實作建置、黃金參考檔與 elk-engine 之間的關係](/diagrams/overview-1.svg)

本任務中的修補檔系列為空（AD-3）。黃金案例已提交，因此 CI 不需要 JVM（AD-5）。比較方式：結構完全一致，座標在 1e-6 的容差內一致（AD-4）。

## 主要流程

ELK 中的版面配置，elk-engine 目前為 `fixed`、`box` 和 `random` 重現它（詳情請見 [component-map.md](#元件對應圖) 與 [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)）：

![一次版面配置呼叫流經遞迴版面配置引擎的流程](/diagrams/overview-2.svg)

JSON 轉接器（`graph.json`、`ElkGraphJson`）：輸入的 ELK JSON 在版面配置前由匯入器轉為 ElkGraph；版面配置後，計算出的座標與邊區段會傳回輸出的 JSON。基準實作測試框架以相同的兩個步驟使用 Java 轉接器，因此雙方共用 JSON 契約。

文字轉接器（`graph.text`、`ElkGraphText`）：`.elkt` 文字透過建立在小型 Xtext 子集（`src/xtext`）上的手寫剖析器、連結器與驗證器載入為 ElkGraph，ElkGraph 也可序列化回 `.elkt`。進入點是內部的；請見 [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)。

文字化 JSON 轉接器（`graph.json.text`、`ElkGraphJsonText`）：`.elkj` 文字透過同一個 Xtext 子集與手寫剖析器載入，並像 Xtext 的 `LazyLinker` 一樣延遲連結：邊的端點是在讀取時才解析的 EMF 代理（`src/emf`）。ElkGraph 透過針對該文法的寫出器序列化回 `.elkj`。進入點是內部的；請見 [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)。

隨機圖形產生器（`core.debug.grandom`、`GRandomText`）：`.elkr` 文字透過同一 Xtext 子集（`src/xtext`）上手寫的詞法分析器與剖析器解析，`RandomGraphGenerator` 以與 JVM 完全相同的 `Random` 序列將設定轉換為 ElkGraph。帶種子的輸出與基準實作逐位元組一致，並重現九個 `test/corpus/generated/*.json` 檔案；不帶種子的路徑（邊標籤文字、跨階層洗牌、缺少的種子）僅以不變量檢查。進入點是內部的；請見 [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)。

## 技術堆疊

| 關注點         | 選擇                                                          |
| -------------- | ------------------------------------------------------------- |
| 語言           | TypeScript 7.0.2（原生 `tsc`）、ES2022、NodeNext、`strict`    |
| 測試           | vitest 5.0.x 搭配 `@vitest/coverage-v8`（90% 門檻）           |
| 打包           | esbuild 0.28.x                                                |
| 指令碼執行器   | tsx                                                           |
| 執行階段       | Node 22 或更新版本；`src/` 本身可安全用於瀏覽器               |
| 僅基準實作使用 | Maven 3.9+ 與 JDK 21（備援為 JDK 17），用於 ELK 的 Tycho 建置 |

## 適應度限制（AD-8）

bundle 的匯入方向遵循 `test/architecture/bundle-deps.json`；每個程式碼檔案都有 SPDX 標頭；`src/` 中沒有 Node 內建模組或 `process.env`；允許清單之外沒有模組層級的可變 `let`。

## 文件與發行工具鏈

由路線圖第 12 列加入；決策 DP1 至 DP9 請見 [`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md)。`1.0.0` 已於 2026-11-23 發布。

| 組成部分 | 內容                                                                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 匯出介面 | 已接受（2026-11-23），列於 [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md)，並由 `src/index.test.ts` 保證與 `src/index.ts` 一致；在首次 npm 發布 `1.0.0` 時凍結（AD-14） |
| API 參考 | `npm run docs:api`：在私有套件 `tools/typedoc/` 中執行 typedoc，該套件自帶 TypeScript 6（typedoc 沒有 TypeScript 7 版本，AD-6），輸出到產生的 `/reference/`                                                               |
| 範例     | `test/docs/examples/*.ts`，在網站的入門頁面中以程式碼片段呈現，並與基準實作參考檔比較（`test/golden/refs/elk-examples/`、`regen-goldens.sh --set examples`）                                                              |
| 連結檢查 | `npm run docs:linkcheck`：對建置好的網站執行 linkinator，檢查內部連結與片段，在 CI 中執行；外部連結每週檢查（`links.yml`）                                                                                                |
| 封裝演練 | `npm run pack:smoke`：封裝、檢查檔案清單、離線安裝到乾淨的專案中、匯入、在其中對一個範例做版面配置，並與其基準實作參考檔比較                                                                                              |
| 發行     | semantic-release 設定與 `release.yml`，在每次推送到 `main` 時執行；執行手冊請見 [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                          |

# 元件對應圖

| 圖表               | 顯示內容                                       |
| ------------------ | ---------------------------------------------- |
| 1. bundle 相依關係 | 範圍內的 13 個 bundle 及其 `Require-Bundle` 邊 |
| 2. 核心執行階段    | 版面配置演算法如何接入引擎                     |

名稱省略 `org.eclipse.elk.` 前綴。範圍：[清單](/guide/inventory)。

## 1. 範圍內的 bundle 相依關係

權威來源：`test/architecture/bundle-deps.json`，由 `tools/bundle-deps.ts` 從每個 bundle 的 `META-INF/MANIFEST.MF` 推導而來，並由適應度測試強制執行（AD-8）。圖中共有 **32 條邊**，等於 JSON 中的 32 筆 `requires` 項目（graph.json x 2、core x 1、alg.common x 2、九個演算法 x 3）。第三方需求（Guava、EMF、Gson、Xtend 程式庫）與範圍外的 bundle 已省略。箭頭 `A --> B` 表示 A 需要 B，因此 A 的目錄可以匯入 B 的目錄。`src/java` 可在任何地方匯入，圖中未顯示。

![範圍內 13 個 ELK bundle 之間的相依關係](/diagrams/component-map-1.svg)

沒有任何演算法需要另一個演算法：演算法之間唯一共用的相依是 `alg.common`。除非 Java 資訊清單有相同的邊，否則在演算法目錄之間新增匯入會使適應度測試失敗。

## 2. 核心執行階段組成

類別位置位於 `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core` 之下，另有註明者除外；已在固定提交上驗證。

| 類別                              | 路徑                                | 角色                                                          |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                        |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | 走訪階層，在每一層執行提供者                                  |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | 每個演算法的基底類別；實作 `IGraphLayoutEngine`               |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | 演算法、選項與類別資料的單例登錄表                            |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`；每個演算法 bundle 產生一個（來自 `.melk`） |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | 演算法 id 加上提供者的 `getInstancePool()`                    |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | 具型別的選項鍵，以及 `getProperty` 背後的對應表持有者         |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | 圖形模型；元素為 `EMapPropertyHolder`                         |

由任務 5a 移植（[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)）：`RecursiveGraphLayoutEngine`（與 `RecursiveGraphLayoutEngineTopdown` 拆分，M17）、`LayoutAlgorithmResolver`，以及 `AbstractLayoutProvider` 的子類別 `FixedLayoutProvider`、`BoxLayoutProvider` 和 `RandomLayoutProvider`。`LayoutMetaDataService`、`LayoutAlgorithmData` 與屬性型別更早完成（任務 2 和 3）。任務 5b（[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)）完成了該 bundle：`AlgorithmAssembler` 與 `LayoutProcessorConfiguration`（每個演算法 bundle 使用的管線）、`LayoutConfigurator`、`ElkSpacings`、`ElkMath` 各部分、`ElkGraphAdapters`、`util/selection/*` 與 `comments/*`。其 JDK shim 是 `src/java/awt/geom`（`Rectangle2D`）與 `src/java/util/regex`（`Pattern`、`WordBoundary`），與 `src/java/lang` 中的 `JavaCharacter` 並列；它們由 `awt.json`、`regex.json`、`character.json` 與 `regex-boundary.json` 證明。任務 6a 與 6b（[alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)）移植了整個 `alg.common`；6b 新增了 `nodespacing` 與 `NodeMicroLayout`，由 326 列 `NodeMicroLayout` 基準實作重播證明。

![ELK 核心執行階段的類別關係](/diagrams/component-map-2.svg)

演算法如何接入：

1. 演算法 bundle 提供一個 `AbstractLayoutProvider` 子類別（例如 `alg.layered` 的 `LayeredLayoutProvider`），以及一個宣告其 id、選項與支援功能的 `.melk` 檔案。
2. `.melk` 編譯器產生一個 `ILayoutMetaDataProvider` 與一個選項類別。其 `apply(Registry)` 會註冊一個 `LayoutAlgorithmData`，其執行個體集區負責建立提供者。
3. `LayoutMetaDataService` 收集這些提供者。`LayoutAlgorithmResolver` 依據 `algorithm` 選項，在每個節點上設定演算法 id。
4. `RecursiveGraphLayoutEngine.executeAlgorithm` 從節點的 `LayoutAlgorithmData.getInstancePool()` 取得一個提供者並呼叫 `layout(layoutNode, progressMonitor)`，然後釋放它（失敗後則呼叫 `dispose()`）。

在 elk-engine 中，`.melk` 步驟由產生器取代（AD-12，[melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)），ElkGraph 則成為純 TS 類別（AD-11）。對應到 TS 檔案：[移植對應表](/guide/port-map)（英文）；規則：[翻譯規則](/guide/translation-rules)（英文）。
