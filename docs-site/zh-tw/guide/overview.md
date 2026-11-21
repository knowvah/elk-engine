---
title: 概覽
sourceHash: ae706ea0c693889bbac9d0298ac9906f2282efda6d617acd987e7c3a37e406eb
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 概覽

`@knowvah/elk-engine` 是 [Eclipse Layout Kernel](https://www.eclipse.org/elk)（ELK，Java 圖形版面配置程式庫）的忠實 TypeScript 移植。沒有 Java，也沒有 WASM：版面配置演算法以純 TypeScript 重新實作，並對照 Java 實作進行驗證。

::: warning Pre-1.0
範圍內的所有 ELK 版面配置演算法均已移植，並已對照從原始碼建置的 ELK 進行驗證；結果請見[一致性報告](/parity)（英文）。公開匯出介面已獲核准，但尚未寫入 `src/index.ts`，因此套件進入點目前沒有匯出任何公開內容。在 1.0 之前，API 仍可能變動。後續計畫請見[路線圖](/guide/roadmap)（英文）。
:::

## Java 即是規格

固定的 ELK 提交 `8bca22f4afa3371562d2f702d59929818f7f7b71` 上的 Java 原始碼是權威規格。本移植嚴格遵循它：

- 演算法不做最佳化或簡化。若 Java 看起來有冗餘，冗餘會被保留。
- 每個分支都會移植，除非 TypeScript 強制要求變更，否則方法邊界一律保留。
- JUnit 測試與其所測試的程式碼一併移植。
- ELK 所依賴的 Java 執行階段行為（32 位元整數運算、`HashMap` 迭代順序、`Random` 序列）由 shim 重現。請見 [Java 基礎](/zh-tw/guide/java-foundations)。

[翻譯規則](/guide/translation-rules)（英文）列出每個 Java 概念如何對應到 TypeScript。

## 以基準實作驗證

基準實作（oracle）是從原始碼建置的上游 ELK，位於固定提交上的分離 git worktree 中。移植的輸出會與基準實作的輸出比較：

- id、元素數量、邊區段拓撲、彎折點數量與非數值內容必須完全一致。
- 數值座標與尺寸必須在 `1e-6` 的絕對容差內一致。

經過挑選的基準實作輸出會以黃金參考檔的形式提交，因此執行測試不需要 JVM。完整流程請見[一致性](/zh-tw/conformance)頁面。

## 公開契約

公開 API 是 [#90](https://github.com/knowvah/elk-engine/issues/90) 中核准的匯出介面：ElkGraph 物件模型與 `ElkGraphUtil` 工廠、版面配置引擎、每個演算法的中繼資料提供者及其選項（含選項值的型別），以及 ELK JSON 與文字圖形格式。ELK JSON 是 I/O 轉接器，而非核心模型。[快速入門](/guide/getting-started)（英文）展示了此介面的用法。在 1.0 之前版本號維持 0.x；1.0 將凍結此介面。

## 執行階段限制

- `src/` 可安全用於瀏覽器：沒有 Node 內建模組，沒有 `process.env`，僅使用 ES 模組。
- 沒有任何執行階段相依。

## 後續閱讀

- [架構](/zh-tw/guide/architecture)：基準實作、bundle 與版面配置引擎如何組合。
- [移植對應表](/guide/port-map)與[清單](/guide/inventory)（英文）：哪些 Java 套件對應到哪些模組。
- [參與貢獻](/zh-tw/guide/contributing)：關卡與工作流程。
