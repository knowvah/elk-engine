---
title: Java 基礎
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java 基礎

ELK 的結果取決於 Java 執行階段的行為：32 位元整數溢位環繞、`float` 捨入、`HashMap` 的迭代順序、`Random` 序列，以及數值轉文字。java-foundations 任務（於 2026-10-11 完成）交付了重現這些行為的 shim，以及用來證明它們的 JVM 錄製向量。

Shim 僅依據 Javadoc 中的規格實作。不讀取也不複製任何 OpenJDK 原始碼（AD-9）。每個 shim 都以在真實 JVM 上產生的向量進行檢查。

## Shim

| 範圍         | 位置                     | 內容                                                                                                                                                                                              |
| ------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 數值與文字   | `src/java/lang/`         | `Int64`、`Float32`、`JavaString`、`JavaInteger`、`JavaDouble`、`DoubleToString`                                                                                                                   |
| Math         | `src/java/lang/JavaMath` | `l2i`（`long` 的 `(int)` 轉換）                                                                                                                                                                   |
| 例外         | `src/java/lang/`         | 六個例外類別                                                                                                                                                                                      |
| 集合         | `src/java/util/`         | `HashStrategy`、`JavaHashMap`、`JavaHashSet`、`PriorityQueue`                                                                                                                                     |
| Guava 替代品 | `src/guava/`             | 20 個檔案：`Lists`、`Iterables`、`Iterators`、`Strings`、`DoubleMath`、`Joiner`、`Splitter`、`Range`、`Table`、`ImmutableMap`、`ImmutableSet`、`Sets`、`Maps`、`HashBiMap`、`Multimap` 與五個實作 |

`Math.log10` 不需要 shim：原生的 V8 函式與所有 1264 筆錄製資料列相符。Guava 絕不作為相依套件；`src/guava/` 只放小型的本地輔助函式。

## JVM 向量

向量由 `tools/vectors/JavaVectors.java` 錄製（Guava 33.3.0-jre 則由 `GuavaVectors.java` 錄製）。它們是凍結的：重新產生會得到逐位元組相同的檔案。

| 群組   | 資料列或腳本                                                                                               |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| 數值   | `l2i` 78、`Float32` 2704、double 轉 float 72、`log10` 1264、除以零 40、`Int64` 4056                        |
| 雜湊   | `String.hashCode` 229、`Double.hashCode` 65、`doubleToLongBits` 65、`Integer.reverse` 36、KVector 雜湊 256 |
| 文字   | `Double.toString` 14,939、`parseDouble` 96、`Integer.valueOf` 33                                           |
| Random | 序列中途的 `setSeed`：4 個種子，每個 25 個操作                                                             |
| 集合   | 1206 個 `HashMap`、1172 個 `HashSet` 與 231 個 `PriorityQueue` 腳本                                        |
| Guava  | 1518 個腳本，25,611 個步驟                                                                                 |

## 已知限制

- 若 `HashMap` 項目的鍵具有相同的雜湊碼且不是 `Comparable`，JVM 中這些項目的順序取決於物件身分，無法重現。依賴它的一致性案例需要一筆已知差異的項目。
- 依賴物件身分的 `HashMap` 與 `HashSet` 腳本在向量中被略過；`PriorityQueue(Collection)` 腳本也被略過，因為 ELK 沒有呼叫它們的程式碼。
- `Sets.newTreeSet` 回傳的是快照。在移植 `ScanlineOverlapCheck` 與 `ScanlineConstraintCalculator` 之前，需要一個即時（live）的 `TreeSet` shim。

集合的翻譯規則請見[集合規則](/guide/collections-rules)頁面。[路線圖](/guide/roadmap)上的下一個任務是屬性系統與 ElkGraph 模型。
