---
title: Java の基盤
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java の基盤

ELK の結果は、Java ランタイムの動作に依存します。32 ビット整数のラップアラウンド、`float` の丸め、`HashMap` の反復順序、`Random` の列、そして数値からテキストへの変換です。java-foundations ミッション (2026-10-11 完了) は、この動作を再現するシムと、それを証明する JVM で記録されたベクトルを提供しました。

シムは Javadoc の仕様のみから実装されます。OpenJDK のソースは読まず、コピーもしません (AD-9)。各シムは、実際の JVM で生成されたベクトルに対して検証されます。

## シム

| 領域           | 場所                     | 内容                                                                                                                                                                                                   |
| -------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 数値とテキスト | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                        |
| Math           | `src/java/lang/JavaMath` | `l2i` (`long` の `(int)`)                                                                                                                                                                              |
| 例外           | `src/java/lang/`         | 6 つの例外クラス                                                                                                                                                                                       |
| コレクション   | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                          |
| Guava の代替   | `src/guava/`             | 20 ファイル: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` と 5 つの実装 |

`Math.log10` にシムは不要です。ネイティブの V8 の関数が、記録された 1264 行すべてと一致します。Guava は依存関係にはなりません。`src/guava/` には小さなローカルのヘルパーがあります。

## JVM ベクトル

ベクトルは `tools/vectors/JavaVectors.java` (Guava 33.3.0-jre 用には `GuavaVectors.java`) によって記録されます。これらは固定されており、再生成するとバイト単位で同一のファイルになります。

| グループ     | 行数またはスクリプト数                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| 数値         | `l2i` 78, `Float32` 2704, double から float 72, `log10` 1264, ゼロ除算 40, `Int64` 4056                        |
| ハッシュ     | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, KVector ハッシュ 256 |
| テキスト     | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                               |
| Random       | 列の途中での `setSeed`: 4 つのシードに各 25 回の操作                                                           |
| コレクション | 1206 の `HashMap`、1172 の `HashSet`、231 の `PriorityQueue` のスクリプト                                      |
| Guava        | 1518 スクリプト、25,611 ステップ                                                                               |

## 既知の制限

- ハッシュコードが等しく `Comparable` でないキーを持つ `HashMap` エントリの JVM での順序は、オブジェクトのアイデンティティに従うため、再現できません。これに依存する適合性のケースには、既知の相違の項目が必要です。
- アイデンティティに依存する `HashMap` と `HashSet` のスクリプトはベクトルではスキップされます。また、ELK に呼び出し元がないため、`PriorityQueue(Collection)` のスクリプトもスキップされます。
- `Sets.newTreeSet` はスナップショットを返します。`ScanlineOverlapCheck` と `ScanlineConstraintCalculator` を移植する前に、ライブな `TreeSet` のシムが必要です。

コレクションの変換ルールは [コレクションのルール](/guide/collections-rules) のページにあります。[ロードマップ](/guide/roadmap)の次のミッションは、プロパティシステムと ElkGraph モデルです。
