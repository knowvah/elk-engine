---
layout: home
sourceHash: 13520b5cd8cfe1522d01c0b3ec7b47afad3fce1879618a87194b477c8ef962ec
hero:
  name: '@knowvah/elk-engine'
  text: 純 TypeScript 的 Eclipse ELK
  tagline:
    Eclipse Layout Kernel 的忠實 TypeScript 移植。沒有 Java，沒有 WASM — 版面配置演算法以純 TypeScript 重新實作，並對照 Java
    實作進行驗證。
  actions:
    - theme: brand
      text: 概覽
      link: /zh-tw/guide/overview
    - theme: alt
      text: 範例集
      link: /zh-tw/showcase/
    - theme: alt
      text: 在 GitHub 上檢視
      link: https://github.com/knowvah/elk-engine
features:
  - title: 忠於 ELK Java
    details: 固定 ELK 提交上的 Java 即是規格。每個分支都會移植，JUnit 測試也會與其所測試的程式碼一併移植。
  - title: 以基準實作驗證
    details: 輸出會與從原始碼建置的 ELK 進行比較。結構完全一致；座標在 1e-6 的容差內一致。
  - title: 原生支援瀏覽器，零執行階段相依
    details: 程式庫程式碼中沒有 Java、沒有 WASM、沒有 Node 內建模組。打包後即可發布。
  - title: Pre-1.0
    details: 範圍內的所有 ELK 版面配置演算法均已移植，並已對照從原始碼建置的 ELK 進行驗證。在 1.0 之前，API 仍可能變動。
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-1.0
範圍內的所有 ELK 版面配置演算法均已移植，並已對照從原始碼建置的 ELK 進行驗證；結果請見[一致性報告](/parity)（英文）。公開匯出介面已獲核准，但尚未寫入 `src/index.ts`，因此套件進入點目前沒有匯出任何公開內容。在 1.0 之前版本號維持 0.x，API 仍可能變動。後續計畫請見[路線圖](/guide/roadmap)（英文）。
:::

## 選擇您的路徑

| 我想要…                          | 從這裡開始                                                               |
| -------------------------------- | ------------------------------------------------------------------------ |
| 了解本專案是什麼、不是什麼       | [概覽](/zh-tw/guide/overview)                                            |
| 了解各部分如何組合               | [架構](/zh-tw/guide/architecture)                                        |
| 了解「與 Java 一致」的意義       | [一致性](/zh-tw/conformance)                                             |
| 找出 Java 套件在移植中的位置     | [移植對應表](/guide/port-map)（英文） · [清單](/guide/inventory)（英文） |
| 學習 Java 到 TypeScript 的規則   | [翻譯規則](/guide/translation-rules)（英文）                             |
| 了解已涵蓋哪些 Java 執行階段行為 | [Java 基礎](/zh-tw/guide/java-foundations)                               |
| 了解規劃中的內容                 | [路線圖](/guide/roadmap)（英文）                                         |
| 參與貢獻                         | [參與貢獻](/zh-tw/guide/contributing)                                    |
