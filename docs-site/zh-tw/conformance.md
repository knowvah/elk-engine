---
title: 一致性
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 一致性：「相符」的意義

@knowvah/elk-engine 以從原始碼建置的上游 Eclipse ELK（Java）作為驗證基準。當 TypeScript 版面配置與基準實作（oracle，從原始碼建置的 ELK）兩者都解析為 ELK JSON 後，結構與每個非數值的值完全相等，且每個有限數值在 `1e-6` 的絕對容差內一致時，該 TypeScript 版面配置即與基準實作**一致**。比較器是 [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts)；本文件說明它所實作的內容。移植規則請見 [`docs/translation-rules.md`](/guide/translation-rules)。

| #   | 章節                                    | 回答的問題                             |
| --- | --------------------------------------- | -------------------------------------- |
| 1   | [基準實作](#1-基準實作)                 | 什麼才算「正確」，以哪個 commit 為準？ |
| 1a  | [一致性單元](#1a-一致性單元)            | 一個案例是什麼，有哪些案例？           |
| 2   | [一致性基準](#2-一致性基準)             | 什麼算相等？                           |
| 3   | [黃金案例與語料庫](#3-黃金案例與語料庫) | 參考輸出從何而來？                     |
| 4   | [Seam 修補檔](#4-seam-修補檔)           | 如何變更基準實作？                     |
| 5   | [基準實作維運](#5-基準實作維運手冊)     | 出問題時該怎麼辦？                     |
| 6   | [檢核關卡](#6-檢核關卡)                 | 變更合併前必須通過什麼？               |

## 1. 基準實作

基準實作（AD-3）是**從原始碼建置**的上游 ELK，建置於 `$ELK_SOURCE_DIR` 的分離式 git worktree 中，由 `tools/oracle/build.sh` 建立在 `$ELK_ORACLE_DIR`。兩者都位於本儲存庫之外；皆不隨附。

| 項目              | 位置                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------ |
| 固定的 ELK commit | `tools/oracle/ELK_COMMIT`（目前為 `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`）       |
| 修補檔系列        | `tools/oracle/patches/*.patch`，依字典順序以 `git am --3way` 套用                    |
| 建置              | `tools/oracle/build.sh`（Maven 3.9.x + JDK 21；Tycho 會下載 p2 構件）                |
| 批次執行器        | `tools/oracle/run.sh <outDir> <input>...` 或 `run.sh --cases <cases.jsonl> <outDir>` |
| Harness           | `tools/oracle/harness/ElkOracle.java`                                                |
| 建置清單          | `$ELK_ORACLE_DIR/oracle-build.json`（commit、修補檔、JDK、每個 bundle 的 jar）       |

**建置。** `build.sh` 會先執行 `mvn -P elk-meta clean install -DskipTests`（melk 編譯器），再在 worktree 的 `build/` 中執行 `mvn clean install -DskipTests -Dmaven.test.skip=true`，接著將範圍內每個 bundle 的 jar（`core`、`graph`、`graph.json`、`alg.common`，以及 `layered`、`mrtree`、`radial`、`force`、`disco`、`rectpacking`、`spore`、`topdownpacking`、`vertiflex` 等演算法）記錄到 `oracle-build.json`。既有的 worktree 只有在同時符合下列條件時才會重複使用：它源自 `ELK_COMMIT`、所帶的修補檔主旨與 `tools/oracle/patches/` 完全一致，且除建置輸出外保持乾淨；否則 `build.sh` 會以 `2` 結束，並且不動它。

**執行。** `run.sh` 會針對各 bundle 的 jar 以及 Tycho p2 快取中的第三方 bundle（Gson、Guava、EMF、Xtext/Xtend 程式庫；`P2_BUNDLES`，預設為 `~/.m2/repository/p2/osgi/bundle`，每個 bundle 取用最新版本）編譯 `ElkOracle.java`。單一 JVM 以 `RecursiveGraphLayoutEngine` 對每個輸入進行版面配置，並寫出 `<outDir>/<input basename>.json`，其中包含版面配置、零尺寸與零位置，並省略未知的版面配置選項。輸入失敗時會印出 `ERROR <input>: <message>`；只要有任何輸入失敗，JVM 就以 `1` 結束。同一次執行中的輸入基本名稱必須是唯一的，因為輸出檔名就是基本名稱。

**修補檔系列的語意。** 目前系列中只有一個修補檔：

| 修補檔                                                                  | 效果                                                                                                                                                                                                             | 對應的 TS seam                                                                                                               |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` 以 `"_g" + Random.nextInt(1000000)` 解決 id 衝突；此修補檔以系統屬性 `org.eclipse.elk.graph.json.exportSeed` 為該 `Random` 設定種子（未設定即為 ELK 原本的行為）。`run.sh` 會傳入 `EXPORT_SEED=1` | `graph.json` 移植中可注入的 `Random`；待該移植完成後再處理（TS 的 `Random` shim 已能重現該序列：種子 1 得到 548985、764588） |

修補檔的存在只是為了加入範圍狹窄的 seam，使 JVM 與 JS 的行為可以比較；每個修補檔都與一個 TS 端的 seam 配對（第 4 節）。

**為何不用 elkjs？** elkjs 是以 GWT 編譯的 ELK。它無法承載我們的修補檔系列，而且 GWT 對 JRE 的模擬與我們所移植來源的 JVM 不同。因此不將它當作基準實作。

## 1a. 一致性單元

一個**案例**是 `(algorithm, model, variant)`（D1）。對齊度儀表板每個版面配置演算法佔一列；elk-models 資料夾與 census 特徵是篩選條件，不是列。

**案例 id。** `<tier>/<algorithmSuffix>/<variant>/<modelId>`，例如 `native/layered/default/tickets/layered/546_borderGaps`。`algorithmSuffix` 是不含 `org.eclipse.elk.` 的演算法 id。對於產生的模型，`modelId` 是 `generated/<name>`。

**模型 id 與來源（D3）。** 模型 id 是 elk-models 中不含副檔名的路徑。案例若存在 `.json` 就讀取它，否則讀取 `.elkt`；`.elkg`（EMF XMI）一律不讀取。

**變體（D6）。** 位於 `test/corpus/variants.json` 中具名的選項覆蓋，套用於根節點：`default`（無）、`direction-right`、`direction-left`、`direction-down`、`direction-up`、`hierarchy-separate`（`SEPARATE_CHILDREN`）、`hierarchy-include`（`INCLUDE_CHILDREN`）。

| 層級         | 演算法                             | 模型                           | 變體                 |
| ------------ | ---------------------------------- | ------------------------------ | -------------------- |
| native       | 模型自己的 `rootAlgorithm`         | 每個 census 模型               | 全部七個             |
| retarget     | 除模型自己的之外，列出的每個演算法 | 每個 census 模型               | 僅 `default`（OR-1） |
| generated    | 檔名前綴所指名的演算法             | `test/corpus/generated/*.json` | 全部七個             |
| ported JUnit | 依各演算法任務而定                 | 上游 JUnit 案例（AD-13）       | 依移植而定           |

`tools/oracle/run.sh --list-algorithms` 是演算法 id 的清單（目前為 14 個）。

**Retarget（D2）。** Harness 會在**每個有子節點的節點**上設定 `org.eclipse.elk.algorithm`，取代任何已宣告的值，並在根節點上設定 `org.eclipse.elk.randomSeed = 1`。ELK 逐節點解析演算法，未設定的節點會退回使用 layered。沒有子節點的根節點只會取得種子。retarget 層級會略過每個模型自己的 `rootAlgorithm`（由 native 層級涵蓋）。

## 2. 一致性基準

AD-4，與 `compareLayout(expected, actual, { tol })` 的實作完全一致：

| 規則                 | 行為                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 容差                 | 絕對容差，`DEFAULT_TOLERANCE = 1e-6`；有限數值在 `abs(e - a) <= tol` 時通過                                              |
| 非有限數值           | `NaN` 與 `±Infinity` 必須完全相等（`Object.is` 或 `===`），即使使用 `tol: Infinity` 也一樣                               |
| 字串、布林值、`null` | 嚴格相等，否則為 `value`                                                                                                 |
| 種類不符             | 不同的 JSON 種類（`null`、陣列、物件、數值、字串、布林值）產生一筆 `type` 差異                                           |
| 物件鍵               | 鍵集合必須相同：只出現在 expected 中的鍵為 `missing`，只出現在 actual 中的為 `extra`                                     |
| 陣列                 | 當兩側每個元素都是具有字串 `id` 的物件，且每側的 id 皆唯一時（空陣列視為以鍵比對），**依 `id`** 比對；否則**依位置**比對 |
| 以鍵比對的陣列       | 只存在於一側的 id 是位於 `path[id=<id>]` 的一筆 `structure` 差異；順序會被忽略                                           |
| 以位置比對的陣列     | 長度不同是一筆 `structure` 差異，且不再進一步比較元素                                                                    |
| 差異種類             | `structure`、`value`、`type`、`missing`、`extra`；`path` 類似 JSON 路徑（`children[id=n1].x`）                           |

結果：元素 id、元素數量、邊區段（edge-section）拓撲與彎折點數量都是精確比對，因為 id 與陣列長度是精確比對；座標與尺寸則適用 `1e-6`。`formatDiffs` 最多列印 20 筆差異。

**已知差異政策。** 絕不以提高 `tol` 或編輯黃金案例的方式吸收差異（AD-13）。每一項差異都記錄於此，並附上其原因以及所影響的測試或測試資料（fixture）。可接受的類別：

- **ulp 等級的 `Math.*` 差異。** V8 與 JVM 在 `sin`、`cos`、`exp`、`log`、`pow` 等函式的最後一位元上可能不同；Java 的 `StrictMath` 規定為位元精確，`Math` 則不是。已遇到的案例：`nextGaussian` 規定使用 `StrictMath.log`，因此 `src/java/util/Random.ts` 帶有與 `StrictMath.log` 精確一致的實作，而非 `Math.log`。比起放寬容差，應優先採用 `StrictMath` 演算法的位元精確移植。
- **身分雜湊的迭代（AD-10）。** 迭代以身分雜湊（identity-hashed）物件為鍵的 `HashMap`/`HashSet`，在 Java 本身就是不確定的。請將該處記入日誌，並以插入順序移植；黃金案例不得依賴它。以值雜湊（String、Integer）的鍵必須重現 Java 的順序。
- **以時間為種子的 `Random`。** 當 `randomSeed = 0` 時，ELK 以時鐘作為種子（`core/Core.melk:608`），因此輸出無法重現。黃金案例的輸入必須讓種子保持未設定或非零（layered 的預設種子為 `1`）。

具體項目（僅在取得使用者同意後才新增）：

| #   | 差異               | 原因                                                   | 範圍                                                                                                                | 核准                   |
| --- | ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | 解析錯誤訊息的文字 | ANTLR 訊息是產生的剖析器的產物，而該剖析器絕不會被移植 | 無效的文法輸入（`.elkt`、`.elkj`、`.elkr`）：只需「有」發生解析失敗這件事相符，不要求訊息相符。有效輸入必須完全相符 | D8，使用者，2026-10-11 |

**判定。** 每個案例會根據基準實作的兩次獨立 JVM 執行得到一個判定（D4、D5、OR-2）：

| 判定               | 意義                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | 兩次執行都完成了模型的版面配置，且輸出檔案逐位元組相同                                                                                  |
| `throws`           | 兩次執行拋出相同的例外：類別完全相同，且在 `@[0-9a-f]+` 轉為 `@<hash>` 之後訊息也完全相同（訊息可以是 null，例如 `StackOverflowError`） |
| `nondeterministic` | 兩次執行不一致（輸出位元組、例外，或一次 `ok` 一次 `throws`）                                                                           |
| `oracle-error`     | Harness 錯誤（無法讀取的輸入、未知的變體/演算法/選項、遺失的結果列）；絕不可接受                                                        |
| `timeout`          | 某次執行超過 `ELK_SWEEP_TIMEOUT_MS`                                                                                                     |

優先順序：`oracle-error`，其次 `timeout`，相等時為 `ok`/`throws`，否則為 `nondeterministic`。在逐位元組比較之前，兩份輸出中每個 `@[0-9a-f]+` 標記都會被取代為 `@<hash>`，與例外訊息的處理相同（D5a；`tools/corpus/sweep.ts` 中的 `sameOutput`）。原因：disco 以程式方式設定的 `debug.discoGraph` 選項會匯出 `...DCGraph@<identity hash>`，任何種子都無法固定它。TS 比較器套用相同的取代。不確定的案例會另行回報，並從通過數中排除，與上述身分雜湊政策一致。

`nondeterministic` 真正仍然存在的來源（這是 ELK 的行為，不是 harness 錯誤；數量見對齊度報告）：spore（`ElkGraphImporter.java:169` 以 `Math.random` 加入抖動）與 `random`（預設 `randomSeed` 0 在巢狀複合節點上不設定種子；retarget 只為根節點設定種子，D2，依使用者決定保留）。匯出器的 `_g<random>` id 重新命名不是來源：seam 修補檔已修正它們。

## 3. 黃金案例與語料庫

AD-5。參考輸出已提交至儲存庫，因此 CI 不需要 JVM。

| 項目         | 位置                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------- |
| 固定的語料庫 | `eclipse-elk/elk-models`，位於 `test/corpus/manifest.json` 中的 `commit`（不隨附）              |
| 模型目錄     | `$ELK_MODELS_DIR`，預設為相對於本儲存庫的 `../../eclipse-elk/elk-models`                        |
| 精選集合     | `test/corpus/manifest.json` 中的 `golden[]`：`{ id, path, note }`                               |
| 參考檔       | `test/golden/refs/elk/<id>.json`，每個清單 `id` 各一個                                          |
| 來源溯源     | `test/golden/refs/elk/_meta.json`：`elkCommit`、`patches`、`jdk`、`modelsCommit`、`generatedBy` |

**id 對路徑的對應。** `golden[].path` 相對於 `$ELK_MODELS_DIR`，輸入為 `$ELK_MODELS_DIR/<path>`。`regen-goldens.sh` 對這些輸入執行 harness，並將每個 `<basename>.json` 輸出暫存為 `refs/elk/<id>.json`。範例：id `ptolemy-scrambler` 對應 `realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`。

**重新產生**（`tools/oracle/regen-goldens.sh`）：

1. 要求 models 的複本剛好位於清單中的 commit（否則以 `1` 結束）。
2. 要求已建置基準實作（`run.sh` 需要 `oracle-build.json`）。
3. 將所有參考檔與 `_meta.json` 暫存於 `test/golden/refs/.elk-staging.*`，再以兩次更名換入該目錄，因此失敗的執行會保留舊的參考檔。
4. `_meta.json` 沒有時間戳記（`builtAt` 留在 `oracle-build.json`），因此在輸入沒有變更時重新產生，在 git 中逐位元組為無變化。

**何時重新產生：** 變更 `ELK_COMMIT`、修補檔系列、清單的 `golden[]` 集合或 `commit`，或 harness 之後。其他時候絕不重新產生。

**日誌規則。** 每次改變參考檔的重新產生，都要將原因（修補檔 id，或 commit 升級）記入日誌。參考檔絕不手動編輯。若 TS 斷言或黃金案例只能靠變更才能通過，請停止並記入日誌（AD-13）。

**Census。** `npx tsx tools/corpus/census.ts` 不做任何版面配置：它以解析模式對每個模型執行基準實作，並將結果與已提交的 `test/corpus/census.json` 比較（898 個模型：id、格式、來源、根演算法、特徵計數）。相等時以 `0` 結束，漂移時以 `1` 結束；`--write` 會改寫該檔案。它只在固定的 models 複本中執行，並在 harness 錯誤時中止。

**產生的語料庫（D7）。** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` 存放有種子的 grandom 設定；與它同名的 `.json` 是由基準實作產生、尚未做版面配置的輸入。九個設定涵蓋沒有任何 elk-models 模型使用的演算法 id：`disco`、`force`、`mrtree`、`radial`、`random`、`sporeCompaction`、`sporeOverlap`、`topdownpacking`、`vertiflex`。每個設定最多 50 個節點，且沒有邊標籤（`BlindTextGenerator` 不設定種子）。Harness 將產生的根節點命名為 `root`，因為 ELK 的 `JsonExporter` 會以未設定種子的隨機後綴解決 id 衝突。只能用 `tools/oracle/regen-generated.sh` 重新產生（暫存目錄加更名；設定失敗時會保留舊檔案）；在沒有變更時重跑，在 git 中為無變化。TS 的 grandom 移植必須逐位元組重現這些 `.json` 檔案；演算法的黃金案例絕不依賴它。

**Sweep。** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` 會規劃每個案例，在不同的 JVM 中各執行兩次（分片數預設為 `min(cpus, 8)` 個並行的 `run.sh` 程序），並寫出 `$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`。`--plan-only` 印出各層級的案例數而不執行任何內容；`--filter` 保留包含該子字串的案例 id；`--limit` 取等間隔的樣本。除非有案例為 `oracle-error`（`1`），否則以 `0` 結束；工具失敗則以 `2` 結束。各案例的輸出留在本機（AD-5）。`ELK_SWEEP_TIMEOUT_MS`（預設 `30000`，僅由 `tools/` 讀取）限制每個案例；逾時後（JVM 結束碼 75），`run.sh` 會為沒有結果列的案例重新啟動 JVM。

**對齊度報告（D9）。** `docs/parity-report.md` 由 sweep 快取產生並提交：依演算法與判定的計數，附上 ELK 與 models 的 commit，沒有時間戳記。以 `npx tsx tools/corpus/parity-report.ts --write` 重新產生；不加 `--write` 時，若已提交的報告已過時，指令會以 `1` 結束。絕不手動編輯。

**語料庫測試。** `test/corpus/corpus.ts` 中的 `resolveModelsDir()` 在複本遺失或位於其他 commit 時，會回傳 `skip` 原因；需要它的測試會跳過，並在訊息中附上固定的 sha。目前 `test/golden/oracle-refs.test.ts` 只檢查已提交的參考檔：每個清單 id 一個、每個節點、連接埠、標籤與邊上的幾何資料、自我比較，以及 `_meta.json` 與 `ELK_COMMIT`、清單與產生器相符。目前還沒有 TS 對基準實作的版面配置測試；它會隨第一個移植的演算法一起出現。

## 4. Seam 修補檔

Seam 修補檔會變更基準實作；它們很少見，而且一律與一個 TS seam 配對。

1. 在基準實作 worktree（`$ELK_ORACLE_DIR`）中編輯並提交，或在位於 `ELK_COMMIT` 的暫用複本中撰寫修補檔。若要將已完成的修補檔就地加入既有 worktree（保留 `census/` 與 `sweep/` 快取，移除 worktree 會刪除它們），請使用 `build.sh` 的身分套用：
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`；
   `build.sh` 接著會驗證系列並就地重建（約 3 分鐘），因此可略過步驟 4-5。
2. 匯出：
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   （或僅匯出新的 commit）。檔案命名為 `NNNN-<slug>.patch`；數字前綴決定套用順序。
3. 加入對應的 TS seam（相同行為、可注入、位於 `src/`），其測試的預期值來自已修補的基準實作（AD-13）。
4. 否則移除 worktree：`git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`（若建置輸出使其變髒，請加上 `--force`）。
5. 重建：`tools/oracle/build.sh`（從頭重新套用系列）。
6. 重新產生：`tools/oracle/regen-goldens.sh`；檢視 `git diff test/golden/refs`。
7. 記入一筆日誌，指出該修補檔（`NNNN-<slug>.patch`）並列出每個變更的參考檔。`_meta.json` 的 `patches` 會自動記錄該系列。

絕不要在 worktree 中留下未提交的編輯：`build.sh` 會將其視為過時（以 `2` 結束）。絕不編輯 `ELK_SOURCE_DIR` 本身。

## 5. 基準實作維運手冊

| 失敗情形                                                                | 偵測方式                                                                                                                                                                                                                                           | 緩解措施                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tycho 建置失敗（p2 無法連線、JDK、Maven 版本）                          | `tools/oracle/build.sh` 以非零值結束；完整的 Maven 輸出位於儲存庫根目錄的 `.oracle-build.log`。結束碼 `1` 表示缺少工具或 Maven 版本錯誤；結束碼 `3` 表示未產生某個 bundle 的 jar                                                                   | Maven 必須是 **3.9.x**：Tycho 4.0.12 在 Maven 3.10（Homebrew 的 3.10.0）上會失敗，並出現 `ProvisionException: No implementation for MavenTargetLocationFactory was bound`。本機的 3.9.11 位於 `.tools/apache-maven-3.9.11/`（已 gitignore）：`ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`。請使用 JDK 21，或透過 `JAVA_HOME` 使用 JDK 17。檢查網路（首次執行會下載 p2 構件），然後重新執行。`build.sh --record-only` 會略過 Maven，只根據已建置的 jar 重寫 `oracle-build.json`。結束碼 `2`：移除 worktree（第 4 節步驟 4）並重建。否則請附上日誌結尾向上回報 |
| `build.sh` 在套用修補檔後立即以 `2` 結束                                | worktree 被回報為過時                                                                                                                                                                                                                              | `build.sh` 會展開被換行的修補檔主旨（`git format-patch` 會在約 78 個字元處折行），並忽略未追蹤的 `census/` 與 `sweep/` 快取；其他的髒內容或未列出的修補檔仍會以結束碼 `2` 結束：請修復 worktree（第 4 節）                                                                                                                                                                                                                                                                                                                                                                              |
| 修補檔或 commit 升級後的黃金案例漂移                                    | `tools/oracle/regen-goldens.sh` 之後接著執行 `git diff --exit-code test/golden/refs` 的結果不為空；`test/golden/oracle-refs.test.ts` 因 `_meta.json` 過時而失敗（`elkCommit`、`modelsCommit`）；TS 一致性測試一旦存在，會以 `formatDiffs` 報告失敗 | 重建（`build.sh`），執行 `regen-goldens.sh`，檢視差異，將修補檔 id 記入日誌。絕不手動編輯參考檔或放寬 `tol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| p2 快取中缺少 Xtext/ANTLR jar（`.elkt`、`.elkr`，或任何 `run.sh` 啟動） | `run.sh` 以非零值結束，並顯示 `bundle <name> not in p2 cache <dir>`（例如 `org.eclipse.xtext`、`org.antlr.runtime`、`org.eclipse.xtext.xbase`）                                                                                                    | 將 `P2_BUNDLES` 設為包含它的 Tycho p2 快取，或在可連網的情況下執行 `build.sh`，讓 Tycho 取得它；然後重新執行 `run.sh`。不要用其他來源的 jar 替代                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Sweep 卡住或 OOM                                                        | 某個案例執行到逾時並回報 `timeout`（stderr 的一行會指出它）；沒有結果列的執行會得到 `oracle-error`，並在 stderr 顯示 `sweep: shard <n> run <A or B> exited <code>`；在 8 個並行 JVM 下機器發生 swap                                                | 降低並行度與批次大小：`sweep.sh --shards 2`，並以 `--filter` 或 `--limit` 縮小範圍。只有在模型緩慢但正確時才提高 `ELK_SWEEP_TIMEOUT_MS`。可重現的 `timeout` 是一項發現：將案例 id 記入日誌，不要為了掩蓋它而放寬限制                                                                                                                                                                                                                                                                                                                                                                    |
| 固定版本升級後的 census 漂移（`ELK_COMMIT` 或 models 的 `commit`）      | `npx tsx tools/corpus/census.ts` 以 `1` 結束並列出不同的模型；`test/corpus/census.test.ts` 失敗                                                                                                                                                    | 確認複本與基準實作位於新的固定版本，重新執行 `census.ts --write`，檢視 `git diff test/corpus/census.json`，將原因記入日誌，然後重新執行 `sweep.sh` 並重新產生對齊度報告。絕不手動編輯 census                                                                                                                                                                                                                                                                                                                                                                                            |
| elk-models 遺失或 sha 錯誤                                              | 語料庫測試會跳過，並顯示指出預期 sha 的訊息；`regen-goldens.sh` 以 `1` 結束（`elk-models at <sha>, expected pinned <sha>`）                                                                                                                        | 執行 `test/corpus/fetch.sh`（複製並檢出固定的 commit）。若既有複本位於其他 commit，它會以 `2` 結束且不會動它：請自行修復該複本，或將 `ELK_MODELS_DIR` 指向全新的路徑。絕不從腳本中移動既有複本的 HEAD                                                                                                                                                                                                                                                                                                                                                                                   |

`run.sh` 的其他失敗：`oracle-build.json missing` 或 `oracle jar missing` 表示先執行 `build.sh`；`bundle <name> not in p2 cache` 表示將 `P2_BUNDLES` 設為 Tycho p2 快取，或在可連網的情況下重新執行 `build.sh`。

## 6. 檢核關卡

每一項變更：

| 關卡           | 指令                                                        | 基準                                                             |
| -------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| 型別           | `npm run typecheck`                                         | 結束碼 0                                                         |
| 測試與覆蓋率   | `npm run coverage`                                          | 所有測試通過；`src/**` 的陳述式、分支、函式與行覆蓋率皆達 90%    |
| 架構           | `test/architecture/*.fitness.test.ts`（由 `npm test` 執行） | 模組邊界、模組全域變數、`src/` 中不使用 Node 內建模組、SPDX 標頭 |
| 基準實作參考檔 | `test/golden/oracle-refs.test.ts`                           | 已提交的參考檔與清單及 `ELK_COMMIT` 一致                         |

對 `tools/oracle/`、清單或修補檔系列的變更，另外還需要：

| 關卡           | 指令                                                                          | 基準                                               |
| -------------- | ----------------------------------------------------------------------------- | -------------------------------------------------- |
| 基準實作建置   | `tools/oracle/build.sh`                                                       | 結束碼 0                                           |
| 基準實作執行   | `tools/oracle/run.sh <outDir> <input.json>...`                                | 結束碼 0，沒有 `ERROR` 列                          |
| 黃金案例穩定性 | `tools/oracle/regen-goldens.sh`，然後 `git diff --exit-code test/golden/refs` | 無差異，除非該變更本意就是要移動參考檔且已記入日誌 |
| Shell          | `shellcheck tools/oracle/*.sh`                                                | 無問題                                             |

對 `tools/oracle/` 或 `tools/corpus/` 的變更，另外還需要：

| 關卡         | 指令                                                                                 | 基準                                                  |
| ------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Census       | `npx tsx tools/corpus/census.ts`                                                     | 結束碼 0（無漂移）                                    |
| 產生的穩定性 | `tools/oracle/regen-generated.sh`，然後 `git diff --exit-code test/corpus/generated` | 無差異                                                |
| Sweep        | `tools/oracle/sweep.sh`（或以 `--filter`/`--limit` 取樣）                            | 結束碼 0：沒有 `oracle-error`                         |
| 對齊度報告   | `npx tsx tools/corpus/parity-report.ts`                                              | 結束碼 0（已提交的報告為最新）；以 `--write` 重新產生 |
