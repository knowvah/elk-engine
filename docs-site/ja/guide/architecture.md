---
title: アーキテクチャ
sourceHash: bd9497d352debbb8c889e45fc334c90f3e318451e38381e96d0a09fdce150fe5
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-engine アーキテクチャ概要

| ドキュメント                                                                                                           | 内容                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | すべての ELK バンドル: 目的、LOC、生成ソース、スコープ                                                                                                                        |
| [port-map.md](/guide/port-map)                                                                                         | Java パッケージから `src/` モジュールへの対応                                                                                                                                 |
| [component-map.md](#コンポーネントマップ)                                                                              | スコープ内のバンドル依存関係、ランタイムの中核部分                                                                                                                            |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Java から TypeScript へのルール                                                                                                                                               |
| [../conformance.md](/conformance)                                                                                      | オラクルとの比較基準と手順（このミッションの後半で追加されます）                                                                                                              |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | ELK Text（`.elkt`）の移植、Xtext のサブセット、ランブック、先送り事項                                                                                                         |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | ELK Textual JSON（`.elkj`）の移植、遅延リンク、ランブック、先送り事項                                                                                                         |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | grandom（`.elkr`）ランダムグラフジェネレーターの移植、根拠、ランブック                                                                                                        |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | レイアウトエンジンと fixed、box、random プロバイダー（ミッション 5a）                                                                                                         |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | `.melk` ジェネレーター、保留中の型、遅延定数、再生成                                                                                                                          |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | すべての関数を計測する複雑度ゲート（`npm run complexity`）                                                                                                                    |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | layered フレームワーク（ミッション 7a）: LGraph モデル、変換、段階的クラス、ランブック                                                                                        |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | layered のノード配置（ミッション 7d）: p4nodes、Brandes-Köpf、5 つのプロセッサ、ジオメトリ行、ランブック                                                                      |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | layered のエッジルーティング（ミッション 7e）: p5edges の orthogonal、polyline、spline、6 つのプロセッサ、ルーティング行、ランブック                                          |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | layered パイプライン（ミッション 7f）: `ElkLayered`、`GraphConfigurator`、コンポーネント、4 つのプロセッサ、完全レイアウト行、ランナーのサブセット、ランブック                |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | layered のラベル（ミッション 7f2）: ラベルとコメントのプロセッサ、アンジッピング、デバッグ出力、ビジター、ラベル行、スイープ、ランブック                                      |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | layered の自己ループ、ラッピング、コンパクション（ミッション 7g）: loops パッケージ、ブレーキングポイント、1D コンパクション、`ComponentsCompactor`、行、スイープ、ランブック |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | layered の複合グラフ（ミッション 7h）: `compound` パッケージ、階層ドライバー、ツリー全体の停止、ゴールデン、スイープ、ハッシュ順の双子、ランブック                            |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | オラクルに対する TS のスイープ（行 9）: シャード化されたランナー、サマリーコントラクト、注釈、レポート、ランブック                                                            |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | 差し替え可能なラベルテキスト計測（行 10）: パッチ 0003、TS の双子、固定モード、根拠、ランブック                                                                               |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | ELK のピンの移動（行 13）: 正味差分のトリアージ、パッチシリーズ、再ビルド、再記録、スイープ、ref 差分のトリアージ、リハーサルモード                                           |

## elk-engine とは

`@knowvah/elk-engine` は、Eclipse Layout Kernel（ELK）の忠実な TypeScript 移植です。固定コミット `8bca22f4afa3371562d2f702d59929818f7f7b71` の Java が仕様です（AD-1、AD-2）。これはライブラリであり、ブラウザで安全に動作し、ランタイム依存はなく、Java も WASM も使いません。公開コントラクトは ElkGraph オブジェクトモデルと `ElkGraphUtil` ファクトリで、ELK JSON は I/O アダプターです（AD-14）。手書きの合計約 134,600 行にのぼる 13 個のバンドルがスコープに入っています（インベントリを参照）。現在の状態: レイアウトエンジン（`RecursiveGraphLayoutEngine`、`LayoutAlgorithmResolver`、`GraphValidator`）と、中核の 3 つのプロバイダー `fixed`、`box`、`random` は移植済みで、厳選したゴールデンでオラクルと一致します（ミッション 5a、[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)）。`core` の残りも移植済みです（ミッション 5b: プロセッサパイプライン、`LayoutConfigurator`、`ElkSpacings`、`ElkMath`、スプライン、コメントのアタッチ。[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b) を参照）。共有の `alg.common` バンドルは完全に移植済みです（ミッション 6a: ジオメトリ、ネットワークシンプレックス、1D コンパクション、オーバーラップ、spore、polyomino。ミッション 6b: `nodespacing` と `NodeMicroLayout`、326 行のオラクルリプレイで証明。[alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md) を参照）。layered フレームワークは移植済みです（ミッション 7a: オプションパッケージ、LGraph モデル、ElkGraph ↔ LGraph 変換、プロバイダーシェル。272 行と 330 行の 2 つのオラクルベクターファイルで証明。レイアウトのフェーズは 7b〜7h で続きます。[alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md) を参照）。最初の 2 つのフェーズは移植済みです（ミッション 7b: 11 個のサイクルブレーカー、9 個のレイヤラー、その周囲の 10 個のプロセッサ。651 行のオラクルフェーズ行と 32,652 ケースのスイープで証明。[alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)）。3 番目のフェーズは移植済みです（ミッション 7c: カウンターを備えた交差最小化、greedy switch、モデル順序コンパレーター、P2 と P3 の間の 8 個のプロセッサ。808 行のオラクル順序行と 6,728 ケースのスイープで証明。[alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)）。4 番目のフェーズは移植済みです（ミッション 7d: Brandes-Köpf を含む 4 つのノードプレーサーと、P4 停止に必要な 5 つのプロセッサ。ジオメトリ付きの 610 行のオラクル配置行と 8,410 ケースのスイープで証明。[alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)）。5 番目のフェーズは移植済みです（ミッション 7e: orthogonal、polyline、spline の各ルーターと、ルーティング結果に必要な 6 つのプロセッサ。エッジジオメトリ付きの 950 行のオラクルルーティング行と 6,728 ケースのスイープで証明。[alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)）。layered パイプラインは動作します（ミッション 7f: ドライバー、連結成分パッケージ、方向トランスフォーマー、階層ポートルーター、3 つのプロセッサ。完全なレイアウトと停止の 1,311 行のオラクル行、実際のドライバーを通した以前の行の 2,351 行の再リプレイ、移植済みの 28 個の JUnit スイート、6,646 ケースのスイープで証明。[alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)）。ラベルとコメント付きのレイアウト、レイヤーのアンジッピング、ログ用モニターも動作します（ミッション 7f2: ラベルファミリー、コメントプロセッサ、`AlternatingLayerUnzipper`、`InteractiveLayeredGraphVisitor`、デバッグユーティリティ。停止と完全なレイアウトの 1,305 行のオラクル行、11 個のベースライン JUnit スイート、1,105 ケースのスイープ（うち ok の 935 ケースが完全一致）で証明。[alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)）。自己ループ、グラフのラッピング、コンパクションも動作します（ミッション 7g: loops パッケージ、4 つの自己ループプロセッサ、ブレーキングポイントラッパーと単一エッジラッパー、`HorizontalGraphCompactor`、layered の `compaction` パッケージ、`ComponentsCompactor`。1,642 行のオラクル行（`full` 731、`models` 307、`scenarios` 525、`sites` 79）、10 個のベースライン JUnit スイート、3,073 ケースのスイープ（ok の 2,997 ケースが完全一致し、76 件のスローが両側で一致）、58 個のアームを移植済みとして残す 9 アームの配線で証明。[alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)）。複合グラフも動作します（ミッション 7h: `compound` パッケージ、`HierarchicalNodeResizingProcessor`、最後のアーム。540 行のオラクル行（`full` 355、`models` 73 でツリー全体の停止を含む、`scenarios` 88、`sites` 24）、24 個の layered ゴールデン、9 個の issue スイートと 3 つの graph.json メソッド、1,169 ケースのスイープ（ok の 1,164 ケースが完全一致し、5 件のスローが両側で一致）で証明。[alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)）。layered アルゴリズムは、これで階層処理のすべてのモードで動作します。59 個の enum アームが移植済みで、保留中のものはなく、ステージング済みのリストは空です。issue #58 の 3 つの `elk.stress` ケースはミッション 8b を待っていましたが、その裁定が実施されてから動作しています（ミッション layered-stress-cases）。他のレイアウトアルゴリズムはまだ動作しません（mrtree、radial、force、disco、rectpacking、spore、topdownpacking、vertiflex）。ミッション 8a 以降は、mrtree、radial、vertiflex も動作します（完全なレイアウトと停止を収めた 4 つの ref の 1,181 行のオラクル行、2,656 行の単体ベクター ref、40 個の `trees` ゴールデン、6/6 と 2/2 の `MrTreeGraphSizeTest` と `CenterOnRootTest`、アルゴリズムごとの 906 ケースのスイープ（すべてのケースが一致するか診断済み）で証明。ツリー化されたハッシュビンの順序に結果が依存する 2 つの radial 行は、一致させるのではなく分類しています。[alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)）。ミッション 8b 以降は、force、stress、disco も動作します（完全なレイアウトと停止を収めた 3 つの ref の 21,420 行のオラクル行、45 個の `force-disco` ゴールデン、それぞれ 3/3 の `ForceImportTest` と `TwoBitGridTest`、アルゴリズムごとのスイープ（すべてのケースが一致するか診断済み）で証明。Eades の `Math.log` はビット単位で正確な fdlibm 移植です。[alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)）。ミッション 8c 以降は、rectpacking、spore（`sporeOverlap`、`sporeCompaction`）、topdownpacking も動作します（3 つの ref の 2,593 行のオラクル行、44 個の `packing` ゴールデン、30 回の実行となる移植済みの 8 個の JUnit スイート、アルゴリズムごとのスイープ（決定的なすべてのケースが一致するか診断済み）で証明。[alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)）。スコープ内のすべてのアルゴリズムがオラクルに対してスイープされ、アルゴリズムごとの結果はパリティレポートで公開されています（[parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)）。

## ELK Java とオラクルの関係

![ELK Java、オラクルのビルド、ゴールデン参照、elk-engine の関係](/diagrams/overview-1.svg)

このミッションでは、パッチシリーズは空です（AD-3）。ゴールデンはコミット済みのため、CI に JVM は不要です（AD-5）。比較は、構造は完全一致、座標は 1e-6 の範囲内です（AD-4）。

## 主要なフロー

elk-engine が現時点で `fixed`、`box`、`random` について再現する ELK でのレイアウト（詳細は [component-map.md](#コンポーネントマップ) と [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)）:

![再帰的レイアウトエンジンを通るレイアウト呼び出しのフロー](/diagrams/overview-2.svg)

JSON アダプター（`graph.json`、`ElkGraphJson`）: 入力の ELK JSON は、レイアウトの前にインポーターによって ElkGraph になります。レイアウトの後、計算された座標とエッジセクションが出力の JSON に書き戻されます。オラクルのハーネスも Java のアダプターを同じ 2 段階で使うため、双方が JSON コントラクトを共有します。

テキストアダプター（`graph.text`、`ElkGraphText`）: `.elkt` テキストは、小さな Xtext サブセット（`src/xtext`）上に構築された手書きのパーサー、リンカー、バリデーターを通して ElkGraph に読み込まれ、ElkGraph は `.elkt` に書き戻されます。エントリポイントは内部用です。[elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md) を参照してください。

テキスト形式 JSON アダプター（`graph.json.text`、`ElkGraphJsonText`）: `.elkj` テキストは、同じ Xtext サブセットと手書きのパーサーで読み込まれ、Xtext の `LazyLinker` のように遅延してリンクされます。エッジの端点は EMF プロキシ（`src/emf`）で、読み取られたときに解決されます。ElkGraph は、文法専用のライターで `.elkj` に書き戻されます。エントリポイントは内部用です。[elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md) を参照してください。

ランダムグラフジェネレーター（`core.debug.grandom`、`GRandomText`）: `.elkr` テキストは、同じ Xtext サブセット（`src/xtext`）上の手書きのレキサーとパーサーで解析され、`RandomGraphGenerator` が、JVM の `Random` と完全に同じ数列で設定を ElkGraph に変換します。シード付きの出力はオラクルとバイト単位で一致し、9 個の `test/corpus/generated/*.json` ファイルを再現します。シードなしの経路（エッジラベルのテキスト、階層をまたぐシャッフル、シードの欠落）は不変条件だけで検査します。エントリポイントは内部用です。[grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md) を参照してください。

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

## ドキュメントとリリースのツールチェーン

ロードマップの行 12 で追加されました。決定 DP1 から DP9 は [`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md) にあります。`1.0.0` は 2026-11-23 に公開されました。

| 要素             | 内容                                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| エクスポート面   | 承認済み（2026-11-23）。[public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) に一覧があり、`src/index.test.ts` によって `src/index.ts` と等しく保たれます。最初の npm 公開である `1.0.0` で凍結されます（AD-14） |
| API リファレンス | `npm run docs:api`: 専用パッケージ `tools/typedoc/` の typedoc を、独自の TypeScript 6 で実行します（typedoc には TypeScript 7 のリリースがありません、AD-6）。出力は生成される `/reference/`                                                                |
| サンプル         | `test/docs/examples/*.ts`。サイトのはじめにページにスニペットとして表示され、オラクルの ref（`test/golden/refs/elk-examples/`、`regen-goldens.sh --set examples`）と比較されます                                                                             |
| リンクチェック   | `npm run docs:linkcheck`: ビルド済みサイトに対する linkinator。内部リンクとフラグメントを CI で検査し、外部リンクは毎週検査します（`links.yml`）                                                                                                             |
| パックの予行演習 | `npm run pack:smoke`: パックし、ファイル一覧を確認し、クリーンなプロジェクトにオフラインでインストールし、インポートし、そこでサンプルをレイアウトして、そのオラクル ref と比較します                                                                        |
| リリース         | semantic-release の設定と `release.yml`。`main` への push のたびに実行されます。ランブックは [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                                |

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

ミッション 5a で移植済み（[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)）: `RecursiveGraphLayoutEngine`（`RecursiveGraphLayoutEngineTopdown` と分割、M17）、`LayoutAlgorithmResolver`、そして `AbstractLayoutProvider` のサブクラスである `FixedLayoutProvider`、`BoxLayoutProvider`、`RandomLayoutProvider`。`LayoutMetaDataService`、`LayoutAlgorithmData`、プロパティ型は先に移植されました（ミッション 2 と 3）。ミッション 5b（[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)）でバンドルが完成しました: `AlgorithmAssembler` と `LayoutProcessorConfiguration`（すべてのアルゴリズムバンドルが使うパイプライン）、`LayoutConfigurator`、`ElkSpacings`、`ElkMath` の各セクション、`ElkGraphAdapters`、`util/selection/*`、`comments/*`。その JDK シムは `src/java/awt/geom`（`Rectangle2D`）と `src/java/util/regex`（`Pattern`、`WordBoundary`）で、`src/java/lang` の `JavaCharacter` と並びます。これらは `awt.json`、`regex.json`、`character.json`、`regex-boundary.json` で証明されています。ミッション 6a と 6b（[alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)）で `alg.common` のすべてが移植されました。6b では `nodespacing` と `NodeMicroLayout` が加わり、326 行の `NodeMicroLayout` オラクルリプレイで証明されています。

![ELK コアランタイムのクラス間の関係](/diagrams/component-map-2.svg)

アルゴリズムの組み込み方:

1. アルゴリズムのバンドルは、`AbstractLayoutProvider` のサブクラス（たとえば `alg.layered` の `LayeredLayoutProvider`）と、ID、オプション、サポートする機能を宣言する `.melk` ファイルを提供します。
2. `.melk` コンパイラは `ILayoutMetaDataProvider` とオプションクラスを生成します。その `apply(Registry)` が `LayoutAlgorithmData` を登録し、そのインスタンスプールがプロバイダーを作成します。
3. `LayoutMetaDataService` がプロバイダーを収集します。`LayoutAlgorithmResolver` が、`algorithm` オプションから各ノードにアルゴリズム ID を設定します。
4. `RecursiveGraphLayoutEngine.executeAlgorithm` は、ノードの `LayoutAlgorithmData.getInstancePool()` からプロバイダーを取り出して `layout(layoutNode, progressMonitor)` を呼び出し、その後プロバイダーを解放します（失敗した後は `dispose()` を呼び出します）。

elk-engine では、`.melk` の手順はジェネレーターに置き換えられ（AD-12、[melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)）、ElkGraph はプレーンな TS クラスになります（AD-11）。TS ファイルへの対応: [移植マップ](/guide/port-map)（英語）。ルール: [翻訳ルール](/guide/translation-rules)（英語）。
