---
title: 架構
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-engine 架構概覽

| 文件                                                | 內容                                           |
| --------------------------------------------------- | ---------------------------------------------- |
| [inventory.md](/guide/inventory)                    | 每個 ELK bundle：用途、LOC、產生的原始碼、範圍 |
| [port-map.md](/guide/port-map)                      | Java 套件到 `src/` 模組的對應                  |
| [component-map.md](#元件對應圖)                     | 範圍內的 bundle 相依關係；執行階段核心組成     |
| [../translation-rules.md](/guide/translation-rules) | Java 到 TypeScript 的規則                      |
| [../conformance.md](/zh-tw/conformance)             | 基準實作的比較標準與流程（本任務稍後提供）     |

## elk-engine 是什麼

`@knowvah/elk-engine` 是 Eclipse Layout Kernel（ELK）的忠實 TypeScript 移植。固定提交 `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` 上的 Java 即是規格（AD-1、AD-2）。它是一個程式庫：可安全用於瀏覽器、零執行階段相依、沒有 Java 或 WASM。其公開契約是 ElkGraph 物件模型加上 `ElkGraphUtil` 工廠；ELK JSON 是 I/O 轉接器（AD-14）。範圍內共有十三個 bundle，手寫程式碼合計約 134,600 行（請見清單）。本任務只交付骨架：尚未移植任何版面配置演算法。

## 與 ELK Java 及基準實作的關係

![ELK Java、基準實作建置、黃金參考檔與 elk-engine 之間的關係](/diagrams/overview-1.svg)

本任務中的修補檔系列為空（AD-3）。黃金案例已提交，因此 CI 不需要 JVM（AD-5）。比較方式：結構完全一致，座標在 1e-6 的容差內一致（AD-4）。

## 主要流程

ELK 中的版面配置，由 elk-engine 重現（詳情請見 [component-map.md](#元件對應圖)）：

![一次版面配置呼叫流經遞迴版面配置引擎的流程](/diagrams/overview-2.svg)

JSON 轉接器（`graph.json`、`ElkGraphJson`）：輸入的 ELK JSON 在版面配置前由匯入器轉為 ElkGraph；版面配置後，計算出的座標與邊區段會傳回輸出的 JSON。基準實作測試框架以相同的兩個步驟使用 Java 轉接器，因此雙方共用 JSON 契約。

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

![ELK 核心執行階段的類別關係](/diagrams/component-map-2.svg)

演算法如何接入：

1. 演算法 bundle 提供一個 `AbstractLayoutProvider` 子類別（例如 `alg.layered` 的 `LayeredLayoutProvider`），以及一個宣告其 id、選項與支援功能的 `.melk` 檔案。
2. `.melk` 編譯器產生一個 `ILayoutMetaDataProvider` 與一個選項類別。其 `apply(Registry)` 會註冊一個 `LayoutAlgorithmData`，其執行個體集區負責建立提供者。
3. `LayoutMetaDataService` 收集這些提供者。`LayoutAlgorithmResolver` 依據 `algorithm` 選項，在每個節點上設定演算法 id。
4. `RecursiveGraphLayoutEngine.executeAlgorithm` 從節點的 `LayoutAlgorithmData.getInstancePool()` 取得一個提供者並呼叫 `layout(layoutNode, progressMonitor)`，然後釋放它（失敗後則呼叫 `dispose()`）。

在 elk-engine 中，`.melk` 步驟由產生器取代（AD-12，未來任務），ElkGraph 則成為純 TS 類別（AD-11）。對應到 TS 檔案：[移植對應表](/guide/port-map)（英文）；規則：[翻譯規則](/guide/translation-rules)（英文）。
