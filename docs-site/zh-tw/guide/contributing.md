---
title: 參與貢獻
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 參與貢獻

請先閱讀[概覽](/zh-tw/guide/overview)與[翻譯規則](/guide/translation-rules)（英文）。固定提交上的 Java 即是規格；有疑問時，請閱讀 Java。

## 關卡

每次提交前都請執行這些指令，且每一項都必須通過。

| 指令                   | 檢查內容                                            |
| ---------------------- | --------------------------------------------------- |
| `npm run format:check` | Prettier 格式                                       |
| `npm run typecheck`    | TypeScript 型別檢查（原生 `tsc --noEmit`）          |
| `npm test`             | vitest 測試套件，包含黃金測試套件                   |
| `npm run coverage`     | 要求行、分支、函式與陳述式涵蓋率皆達 90% 的測試套件 |

需要 Node 22 或更新版本。請以 `npm ci` 安裝相依套件。

## 測試不可變更

預期值在實作撰寫之前，就來自基準實作、JVM 向量或 Java 原始碼（AD-13）。斷言一旦寫成即被凍結：測試失敗代表實作有誤。

若某個測試只有修改其斷言、向量或黃金案例才能通過，請停下來，並將該案例記錄於任務的決策日誌。不可為了轉綠而放寬容差、刪除案例或重新產生參考檔。黃金參考檔以指令碼重新產生，絕不手動修改。

## 工作流程

1. 建立功能分支，例如 `feature/<short-description>`。
2. 以 [Conventional Commits](https://www.conventionalcommits.org) 格式撰寫提交訊息，例如 `feat(java): add JavaHashMap`。主旨一律小寫，且最多 72 個字元。
3. 對 `main` 開啟 pull request。CI 會將 pull request 標題當作 Conventional Commit 進行 lint 檢查。
4. 提交必須經過簽署；儲存庫規則集有此要求。
5. Pull request 以合併提交（merge commit）方式合併。

每個程式碼檔案都帶有 SPDX 標頭 `// SPDX-License-Identifier: EPL-2.0`，並由適應度測試強制執行。相依套件必須與 EPL-2.0 相容。

## 文件指令

| 指令                   | 用途                               |
| ---------------------- | ---------------------------------- |
| `npm run docs:dev`     | 啟動具即時重新載入的文件網站       |
| `npm run docs:build`   | 建置網站；內部連結失效會使建置失敗 |
| `npm run docs:preview` | 在本機提供已建置的網站             |

大多數參考頁面會引入 `docs/` 中的檔案。請編輯 `docs/` 中的檔案，而非 `docs-site/` 下的頁面。被引入檔案中的 PlantUML 圖表會轉譯為 SVG，並提交於 `docs-site/public/diagrams/`。

## 外部目錄

指令碼與測試透過環境變數找到相鄰的簽出目錄。預設值相對於儲存庫根目錄。只有 `tools/` 與 `test/` 會讀取這些變數；`src/` 中的程式碼絕不讀取。

| 變數             | 預設值                         | 內容                                    |
| ---------------- | ------------------------------ | --------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | 固定提交上的 Eclipse ELK Java 原始碼    |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | 分離 worktree 與已建置的基準實作        |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | elk-models 語料庫，固定於語料庫資訊清單 |

建置基準實作需要 Maven 3.9 或更新版本與 JDK 21（以 JDK 17 作為備援）。基準實作的流程請見[一致性](/zh-tw/conformance)。
