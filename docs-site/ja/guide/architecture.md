---
title: アーキテクチャ
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-engine アーキテクチャ概要

| ドキュメント                                        | 内容                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                    | すべての ELK バンドル: 目的、LOC、生成ソース、スコープ           |
| [port-map.md](/guide/port-map)                      | Java パッケージから `src/` モジュールへの対応                    |
| [component-map.md](#コンポーネントマップ)           | スコープ内のバンドル依存関係、ランタイムの中核部分               |
| [../translation-rules.md](/guide/translation-rules) | Java から TypeScript へのルール                                  |
| [../conformance.md](/ja/conformance)                | オラクルとの比較基準と手順（このミッションの後半で追加されます） |

## elk-engine とは

`@knowvah/elk-engine` は、Eclipse Layout Kernel（ELK）の忠実な TypeScript 移植です。固定コミット `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` の Java が仕様です（AD-1、AD-2）。これはライブラリであり、ブラウザで安全に動作し、ランタイム依存はなく、Java も WASM も使いません。公開コントラクトは ElkGraph オブジェクトモデルと `ElkGraphUtil` ファクトリで、ELK JSON は I/O アダプターです（AD-14）。手書きの合計約 134,600 行にのぼる 13 個のバンドルがスコープに入っています（インベントリを参照）。このミッションが提供するのは足場だけで、レイアウトアルゴリズムはまだ移植されていません。

## ELK Java とオラクルの関係

![ELK Java、オラクルのビルド、ゴールデン参照、elk-engine の関係](/diagrams/overview-1.svg)

このミッションでは、パッチシリーズは空です（AD-3）。ゴールデンはコミット済みのため、CI に JVM は不要です（AD-5）。比較は、構造は完全一致、座標は 1e-6 の範囲内です（AD-4）。

## 主要なフロー

elk-engine が再現する ELK でのレイアウト（詳細は [component-map.md](#コンポーネントマップ)）:

![再帰的レイアウトエンジンを通るレイアウト呼び出しのフロー](/diagrams/overview-2.svg)

JSON アダプター（`graph.json`、`ElkGraphJson`）: 入力の ELK JSON は、レイアウトの前にインポーターによって ElkGraph になります。レイアウトの後、計算された座標とエッジセクションが出力の JSON に書き戻されます。オラクルのハーネスも Java のアダプターを同じ 2 段階で使うため、双方が JSON コントラクトを共有します。

## 技術スタック

| 関心事         | 選択                                                                    |
| -------------- | ----------------------------------------------------------------------- |
| 言語           | TypeScript 7.0.2（ネイティブ `tsc`）、ES2022、NodeNext、`strict`        |
| テスト         | vitest 5.0.x と `@vitest/coverage-v8`（しきい値 90%）                   |
| バンドル       | esbuild 0.28.x                                                          |
| スクリプト実行 | tsx                                                                     |
| ランタイム     | Node 22 以降。`src/` 自体はブラウザで安全に動作                         |
| オラクル専用   | ELK の Tycho ビルド用の Maven 3.9+ と JDK 21（フォールバックは JDK 17） |

## フィットネス制約（AD-8）

バンドルのインポート方向は `test/architecture/bundle-deps.json` に従います。すべてのコードファイルに SPDX ヘッダーを付けます。`src/` に Node の組み込みモジュールや `process.env` を置きません。許可リスト外のモジュールレベルの可変 `let` を置きません。

# コンポーネントマップ

| 図                    | 内容                                                         |
| --------------------- | ------------------------------------------------------------ |
| 1. バンドルの依存関係 | スコープ内の 13 個のバンドルと、その `Require-Bundle` エッジ |
| 2. コアランタイム     | レイアウトアルゴリズムがエンジンにどう組み込まれるか         |

名前では `org.eclipse.elk.` プレフィックスを省略しています。スコープ: [インベントリ](/guide/inventory)（英語）。

## 1. スコープ内のバンドル依存関係

信頼できる情報源は `test/architecture/bundle-deps.json` です。これは各バンドルの `META-INF/MANIFEST.MF` から `tools/bundle-deps.ts` によって導出され、フィットネステストによって強制されます（AD-8）。図には **32 本のエッジ** があり、JSON の 32 個の `requires` エントリと等しくなっています（graph.json x 2、core x 1、alg.common x 2、9 個のアルゴリズム x 3）。サードパーティの要件（Guava、EMF、Gson、Xtend ライブラリ）とスコープ外のバンドルは省略しています。矢印 `A --> B` は A が B を必要とすることを意味し、したがって A のディレクトリから B のディレクトリをインポートしてよいことを表します。`src/java` はどこからでもインポート可能なため、図には示していません。

![スコープ内の 13 個の ELK バンドル間の依存関係](/diagrams/component-map-1.svg)

他のアルゴリズムを必要とするアルゴリズムはありません。アルゴリズム間で共有される依存は `alg.common` だけです。Java のマニフェストに同じエッジがない限り、アルゴリズムのディレクトリ間に新しいインポートを加えるとフィットネステストが失敗します。

## 2. コアランタイムの構成要素

クラスの場所は、特記がない限り `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core` 以下です。固定コミットで確認済みです。

| クラス                            | パス                                | 役割                                                                    |
| --------------------------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                                  |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | 階層を走査し、各レベルでプロバイダーを実行する                          |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | すべてのアルゴリズムの基底クラス。`IGraphLayoutEngine` を実装する       |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | アルゴリズム、オプション、カテゴリのデータのシングルトンレジストリ      |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`。アルゴリズムのバンドルごとに（`.melk` から）1 つ生成 |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | アルゴリズム ID と、プロバイダーの `getInstancePool()`                  |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | 型付きのオプションキーと、`getProperty` の背後にあるマップホルダー      |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | グラフモデル。要素は `EMapPropertyHolder`                               |

![ELK コアランタイムのクラス間の関係](/diagrams/component-map-2.svg)

アルゴリズムの組み込み方:

1. アルゴリズムのバンドルは、`AbstractLayoutProvider` のサブクラス（たとえば `alg.layered` の `LayeredLayoutProvider`）と、ID、オプション、サポートする機能を宣言する `.melk` ファイルを提供します。
2. `.melk` コンパイラは `ILayoutMetaDataProvider` とオプションクラスを生成します。その `apply(Registry)` が `LayoutAlgorithmData` を登録し、そのインスタンスプールがプロバイダーを作成します。
3. `LayoutMetaDataService` がプロバイダーを収集します。`LayoutAlgorithmResolver` が、`algorithm` オプションから各ノードにアルゴリズム ID を設定します。
4. `RecursiveGraphLayoutEngine.executeAlgorithm` は、ノードの `LayoutAlgorithmData.getInstancePool()` からプロバイダーを取り出して `layout(layoutNode, progressMonitor)` を呼び出し、その後プロバイダーを解放します（失敗した後は `dispose()` を呼び出します）。

elk-engine では、`.melk` の手順はジェネレーターに置き換えられ（AD-12、将来のミッション）、ElkGraph はプレーンな TS クラスになります（AD-11）。TS ファイルへの対応: [移植マップ](/guide/port-map)（英語）。ルール: [翻訳ルール](/guide/translation-rules)（英語）。
