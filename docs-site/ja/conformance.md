---
title: 適合性
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 適合性: 「一致」とは何か

@knowvah/elk-engine は、ソースからビルドした upstream の Eclipse ELK (Java) に対して検証されます。TypeScript のレイアウトがオラクルに**適合**するとは、両者を ELK JSON としてパースした後、構造と数値以外のすべての値が完全に等しく、有限のすべての数値が絶対許容誤差 `1e-6` の範囲内で一致することを指します。
比較器は [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts) です。この文書はその実装内容を説明します。移植ルールは [`docs/translation-rules.md`](/guide/translation-rules) にあります。

| #   | セクション                                      | 答える問い                                   |
| --- | ----------------------------------------------- | -------------------------------------------- |
| 1   | [オラクル](#1-オラクル)                         | 何が「正しい」のか、どのコミットか。         |
| 1a  | [適合性の単位](#1a-適合性の単位)                | 1 つのケースとは何か、どのケースがあるか。   |
| 2   | [適合性の基準](#2-適合性の基準)                 | 何をもって等しいとするか。                   |
| 3   | [ゴールデンとコーパス](#3-ゴールデンとコーパス) | 参照出力はどこから来るのか。                 |
| 4   | [シームパッチ](#4-シームパッチ)                 | オラクルをどう変更するか。                   |
| 5   | [オラクルの運用](#5-オラクルの運用ランブック)   | 壊れたときに何をすればよいか。               |
| 6   | [ゲート](#6-ゲート)                             | 変更が取り込まれる前に何が通る必要があるか。 |

## 1. オラクル

オラクル (AD-3) は、**ソースからビルドした** upstream の ELK です。`$ELK_SOURCE_DIR` の detached な git worktree 内でビルドされ、`tools/oracle/build.sh` が `$ELK_ORACLE_DIR` に作成します。どちらもこのリポジトリの外にあり、同梱されません。

| 項目                    | 場所                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| 固定された ELK コミット | `tools/oracle/ELK_COMMIT` (現在は `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)              |
| パッチシリーズ          | `tools/oracle/patches/*.patch`。辞書順に `git am --3way` で適用                            |
| ビルド                  | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21。Tycho が p2 アーティファクトをダウンロード) |
| バッチランナー          | `tools/oracle/run.sh <outDir> <input>...` または `run.sh --cases <cases.jsonl> <outDir>`   |
| ハーネス                | `tools/oracle/harness/ElkOracle.java`                                                      |
| ビルドマニフェスト      | `$ELK_ORACLE_DIR/oracle-build.json` (コミット、パッチ、JDK、バンドルごとの jar)            |

**ビルド。** `build.sh` は、worktree 内の `build/` から `mvn -P elk-meta clean install -DskipTests` (melk コンパイラ) を実行し、続けて `mvn clean install -DskipTests -Dmaven.test.skip=true` を実行します。その後、対象範囲内の各バンドルの jar (`core`、`graph`、`graph.json`、`alg.common`、およびアルゴリズム `layered`、`mrtree`、`radial`、`force`、`disco`、`rectpacking`、`spore`、`topdownpacking`、`vertiflex`) を `oracle-build.json` に記録します。既存の worktree は、`ELK_COMMIT` の子孫であり、`tools/oracle/patches/` にあるパッチの件名とちょうど同じものを持ち、ビルド出力を除いてクリーンである場合にのみ再利用されます。そうでない場合、`build.sh` は `2` で終了し、worktree には手を加えません。

**実行。** `run.sh` は、バンドルの jar と、Tycho の p2 キャッシュ (`P2_BUNDLES`、既定は `~/.m2/repository/p2/osgi/bundle`。それぞれ最新のバージョンを使用) にあるサードパーティのバンドル (Gson、Guava、EMF、Xtext/Xtend ライブラリ) に対して `ElkOracle.java` をコンパイルします。1 つの JVM が `RecursiveGraphLayoutEngine` ですべての入力をレイアウトし、`<outDir>/<input basename>.json` を書き出します。出力にはレイアウト、ゼロの寸法、ゼロの位置が含まれ、未知のレイアウトオプションは省略されます。失敗した入力は `ERROR <input>: <message>` を出力し、いずれかの入力が失敗した場合、JVM は `1` で終了します。出力名はベース名なので、入力のベース名は 1 回の実行内で一意でなければなりません。

**パッチシリーズの意味。** 現在、このシリーズにはパッチが 1 つあります。

| パッチ                                                                  | 効果                                                                                                                                                                                                                                                 | 対になる TS のシーム                                                                                                                                      |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` は ID の衝突を `"_g" + Random.nextInt(1000000)` で解決します。このパッチは、その `Random` をシステムプロパティ `org.eclipse.elk.graph.json.exportSeed` でシードします (未設定なら ELK の動作)。`run.sh` は `EXPORT_SEED=1` を渡します | `graph.json` の移植における注入可能な `Random`。この移植の完了待ち (TS の `Random` シムはすでに同じ列を再現します。シード 1 で 548985、764588 になります) |

パッチは、JVM と JS の動作を比較可能にする、範囲を絞ったシームを追加するためだけに存在します。それぞれが TS 側のシームと対になります (セクション 4)。

**なぜ elkjs ではないのか。** elkjs は GWT でコンパイルされた ELK です。私たちのパッチシリーズを適用できず、GWT による JRE のエミュレーションは、移植元の JVM と異なります。オラクルとしては参照しません。

## 1a. 適合性の単位

**ケース**は `(algorithm, model, variant)` です (D1)。パリティダッシュボードには、レイアウトアルゴリズムごとに 1 行があります。elk-models のフォルダーと census の特徴はフィルターであり、行ではありません。

**ケース ID。** `<tier>/<algorithmSuffix>/<variant>/<modelId>`。例: `native/layered/default/tickets/layered/546_borderGaps`。`algorithmSuffix` は、`org.eclipse.elk.` を除いたアルゴリズム ID です。生成されたモデルでは、`modelId` は `generated/<name>` です。

**モデル ID とソース (D3)。** モデル ID は、elk-models 内のパスから拡張子を除いたものです。ケースは `.json` があればそれを読み、なければ `.elkt` を読みます。`.elkg` (EMF XMI) は読みません。

**バリアント (D6)。** `test/corpus/variants.json` にある名前付きのオプションオーバーレイで、ルートに適用されます。
`default` (なし)、`direction-right`、`direction-left`、`direction-down`、`direction-up`、`hierarchy-separate` (`SEPARATE_CHILDREN`)、`hierarchy-include` (`INCLUDE_CHILDREN`)。

| ティア       | アルゴリズム                                       | モデル                           | バリアント            |
| ------------ | -------------------------------------------------- | -------------------------------- | --------------------- |
| native       | モデル自身の `rootAlgorithm`                       | すべての census モデル           | 7 つすべて            |
| retarget     | モデル自身のものを除く、一覧のすべてのアルゴリズム | すべての census モデル           | `default` のみ (OR-1) |
| generated    | ファイル名の接頭辞が示すアルゴリズム               | `test/corpus/generated/*.json`   | 7 つすべて            |
| ported JUnit | アルゴリズムのミッションごと                       | upstream の JUnit ケース (AD-13) | 移植されたとおり      |

`tools/oracle/run.sh --list-algorithms` は、アルゴリズム ID の一覧です (現在は 14 個)。

**Retarget (D2)。** ハーネスは、**子を持つすべてのノード**に `org.eclipse.elk.algorithm` を設定し、宣言済みの値を置き換えます。また、ルートに `org.eclipse.elk.randomSeed = 1` を設定します。ELK はアルゴリズムをノードごとに解決し、未設定のノードは layered にフォールバックします。子のないルートにはシードだけが設定されます。retarget ティアは、各モデル自身の `rootAlgorithm` をスキップします (native ティアがそれを扱います)。

## 2. 適合性の基準

AD-4。`compareLayout(expected, actual, { tol })` の実装どおりです。

| ルール                 | 動作                                                                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 許容誤差               | 絶対値。`DEFAULT_TOLERANCE = 1e-6`。有限の数値は `abs(e - a) <= tol` のとき通過                                                                                               |
| 有限でない数値         | `NaN` と `±Infinity` は、`tol: Infinity` であっても完全に等しくなければならない (`Object.is` または `===`)                                                                    |
| 文字列、真偽値、`null` | 厳密に等しいこと。そうでなければ `value`                                                                                                                                      |
| 種類の不一致           | JSON の種類 (`null`、配列、オブジェクト、数値、文字列、真偽値) が異なる場合は、`type` の差分が 1 つ                                                                           |
| オブジェクトのキー     | キーの集合は同一でなければならない。expected にのみあるキーは `missing`、actual にのみあるキーは `extra`                                                                      |
| 配列                   | 両側のすべての要素が文字列の `id` を持つオブジェクトで、`id` が各側で一意であるとき、**`id` で**対応付ける (空の配列はキー付きとして扱う)。そうでなければ**位置で**対応付ける |
| キー付き配列           | 片側にしかない ID は、`path[id=<id>]` での `structure` の差分。順序は無視される                                                                                               |
| 位置による配列         | 長さの違いは `structure` の差分が 1 つで、要素はそれ以上比較されない                                                                                                          |
| 差分の種類             | `structure`、`value`、`type`、`missing`、`extra`。`path` は JSON パスに似た形式 (`children[id=n1].x`)                                                                         |

結果として、要素の ID、要素数、エッジセクションのトポロジー、ベンドポイント数は、ID と配列の長さが完全一致であるため厳密です。座標とサイズには `1e-6` が適用されます。`formatDiffs` は最大 20 件の差分を出力します。

**既知の相違に関する方針。** 相違は、`tol` を引き上げたりゴールデンを編集したりして吸収することはありません (AD-13)。それぞれの相違は、原因と影響を受けるテストまたはフィクスチャとともに、ここに記録されます。受け入れられるクラスは次のとおりです。

- **ulp レベルの `Math.*` の差。** V8 と JVM は、`sin`、`cos`、`exp`、`log`、`pow` などの最下位ビットで異なる場合があります。Java の `StrictMath` はビット単位で正確に規定されていますが、`Math` はそうではありません。すでに発生した例: `nextGaussian` は `StrictMath.log` を使うと規定されているため、`src/java/util/Random.ts` は `Math.log` ではなく、`StrictMath.log` と厳密に一致する実装を持っています。許容誤差を広げるよりも、`StrictMath` アルゴリズムをビット単位で正確に移植することを優先してください。
- **アイデンティティハッシュの反復 (AD-10)。** アイデンティティハッシュを持つオブジェクトをキーとする `HashMap`/`HashSet` の反復は、Java 自体で非決定的です。その箇所をジャーナルに記録し、挿入順で移植します。ゴールデンはこれに依存してはなりません。値でハッシュされるキー (String、Integer) は、Java の順序を再現しなければなりません。
- **時刻でシードされる `Random`。** `randomSeed = 0` の場合、ELK は時計からシードするため (`core/Core.melk:608`)、出力は再現できません。ゴールデンの入力では、シードを未設定にするか、0 以外にする必要があります (layered の既定のシードは `1`)。

具体的な項目 (追加はユーザーの承認がある場合のみ)。

| #   | 相違                         | 原因                                                                             | 範囲                                                                                                                                                 | 承認                     |
| --- | ---------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | パースエラーメッセージの文言 | ANTLR のメッセージは生成されたパーサーの副産物であり、そのパーサーは移植されない | 無効な文法の入力 (`.elkt`、`.elkj`、`.elkr`): パース失敗の_有無_だけが一致すればよく、メッセージは問わない。有効な入力は完全に一致しなければならない | D8、ユーザー、2026-10-11 |

**判定。** 各ケースには、オラクルの 2 回の別々の JVM 実行から 1 つの判定が付きます (D4、D5、OR-2)。

| 判定               | 意味                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | 両方の実行でモデルがレイアウトされ、出力ファイルがバイト単位で同一                                                                                                        |
| `throws`           | 両方の実行が同じ例外をスロー: クラスが完全に同じで、`@[0-9a-f]+` を `@<hash>` にした後のメッセージも完全に同じ (メッセージは null の場合がある。例: `StackOverflowError`) |
| `nondeterministic` | 実行結果が一致しない (出力バイト、例外、または一方が `ok` でもう一方が `throws`)                                                                                          |
| `oracle-error`     | ハーネスの不具合 (読めない入力、未知のバリアント/アルゴリズム/オプション、結果行の欠落)。決して許容されない                                                               |
| `timeout`          | 実行が `ELK_SWEEP_TIMEOUT_MS` を超過                                                                                                                                      |

優先順位: `oracle-error`、次に `timeout`、次に両者が等しい場合は `ok`/`throws`、それ以外は `nondeterministic`。バイト比較の前に、両方の出力のすべての `@[0-9a-f]+` トークンを、例外メッセージと同様に `@<hash>` に置き換えます (D5a。`tools/corpus/sweep.ts` の `sameOutput`)。原因: disco のプログラムによる `debug.discoGraph` オプションは `...DCGraph@<identity hash>` をエクスポートし、どのシードでも固定できません。TS の比較器も同じ置き換えを適用します。非決定的なケースは別に報告され、上記のアイデンティティハッシュの方針に沿って、合格数から除外されます。

`nondeterministic` の、残っている本当の原因 (ELK の動作であり、ハーネスの不具合ではありません。件数はパリティレポートにあります): spore (`ElkGraphImporter.java:169` が `Math.random` でジッターを加える) と `random` (既定の `randomSeed` 0 は、入れ子の複合ノードではシードされない。retarget はルートだけをシードし (D2)、ユーザーの決定により維持される)。エクスポーターの `_g<random>` による ID の変更は原因ではありません。シームパッチがそれを修正します。

## 3. ゴールデンとコーパス

AD-5。CI が JVM を必要としないよう、参照出力はコミットされています。

| 項目                 | 場所                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| 固定されたコーパス   | `test/corpus/manifest.json` の `commit` にある `eclipse-elk/elk-models` (同梱されない)          |
| モデルディレクトリ   | `$ELK_MODELS_DIR`。既定はこのリポジトリからの相対パスで `../../eclipse-elk/elk-models`          |
| キュレートされた集合 | `test/corpus/manifest.json` の `golden[]`: `{ id, path, note }`                                 |
| Refs                 | `test/golden/refs/elk/<id>.json`。マニフェストの `id` ごとに 1 つ                               |
| 来歴                 | `test/golden/refs/elk/_meta.json`: `elkCommit`、`patches`、`jdk`、`modelsCommit`、`generatedBy` |

**ID からパスへの対応。** `golden[].path` は `$ELK_MODELS_DIR` からの相対パスで、入力は `$ELK_MODELS_DIR/<path>` です。`regen-goldens.sh` はそれらの入力でハーネスを実行し、各 `<basename>.json` の出力を `refs/elk/<id>.json` として配置します。
例: ID `ptolemy-scrambler` は `realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json` です。

**再生成** (`tools/oracle/regen-goldens.sh`):

1. models のクローンがマニフェストのコミットとちょうど一致している必要があります (そうでなければ終了コード `1`)。
2. ビルド済みのオラクルが必要です (`run.sh` には `oracle-build.json` が必要)。
3. すべての refs と `_meta.json` を `test/golden/refs/.elk-staging.*` に配置し、その後ディレクトリを 2 回のリネームで入れ替えます。そのため、失敗した実行では古い refs が残ります。
4. `_meta.json` にはタイムスタンプがありません (`builtAt` は `oracle-build.json` に残ります)。そのため、入力が変わっていない再生成は、git 上でバイト単位の何もしない操作になります。

**再生成するタイミング:** `ELK_COMMIT`、パッチシリーズ、マニフェストの `golden[]` の集合または `commit`、あるいはハーネスを変更した後。それ以外では行いません。

**ジャーナルのルール。** ref を変更するすべての再生成は、原因 (パッチ ID またはコミットの更新) とともにジャーナルに記録します。refs を手で編集することはありません。TS のアサーションやゴールデンが、変更しなければ通らない場合は、停止してジャーナルに記録します (AD-13)。

**Census。** `npx tsx tools/corpus/census.ts` はレイアウトを一切行いません。パースモードでオラクルをすべてのモデルに対して実行し、その結果をコミット済みの `test/corpus/census.json` (898 モデル: ID、形式、ソース、ルートアルゴリズム、特徴の数) と比較します。等しければ終了コード `0`、ずれがあれば `1` です。`--write` はファイルを書き換えます。固定された models のクローンでのみ動作し、ハーネスの不具合があれば中断します。

**生成コーパス (D7)。** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` にはシード済みの grandom 設定が入っており、隣にある `.json` は、オラクルが生成した、レイアウト前の入力です。9 つの設定が、どの elk-models のモデルも使っていないアルゴリズム ID (`disco`、`force`、`mrtree`、`radial`、`random`、`sporeCompaction`、`sporeOverlap`、`topdownpacking`、`vertiflex`) を扱います。それぞれ最大 50 ノードで、エッジラベルはありません (`BlindTextGenerator` はシードされないため)。ELK の `JsonExporter` はシードされないランダムな接尾辞で ID の衝突を解決するため、ハーネスは生成されたルートに `root` という名前を付けます。再生成は `tools/oracle/regen-generated.sh` でのみ行ってください (ステージングディレクトリとリネーム。失敗した設定があれば古いファイルが残ります)。何も変わっていない再実行は、git 上では何もしない操作です。TS の grandom 移植は、これらの `.json` ファイルをバイト単位で再現しなければなりません。アルゴリズムのゴールデンはこれに依存しません。

**スイープ。** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` はすべてのケースを計画し、それぞれを別々の JVM で 2 回実行し (シャード数の既定は `min(cpus, 8)` 個の同時 `run.sh` プロセス)、`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}` に書き出します。`--plan-only` はティアごとのケース数を出力し、何も実行しません。`--filter` は、部分文字列を含むケース ID を残します。`--limit` は等間隔のサンプルを取ります。終了コードは、`oracle-error` のケースがない限り `0` で (ある場合は `1`)、ツールの失敗は `2` で終了します。ケースごとの出力はローカルに残ります (AD-5)。`ELK_SWEEP_TIMEOUT_MS` (既定は `30000`、`tools/` のみが読み取る) は各ケースを制限します。`run.sh` はタイムアウト (JVM の終了コード 75) の後、結果行のないケースについて JVM を再起動します。

**パリティレポート (D9)。** `docs/parity-report.md` はスイープのキャッシュから生成され、コミットされます。アルゴリズムと判定ごとの件数が、ELK と models のコミットとともに記載され、タイムスタンプはありません。再生成は `npx tsx tools/corpus/parity-report.ts --write` で行います。`--write` なしでは、コミット済みのレポートが古い場合にコマンドが `1` で終了します。手で編集してはいけません。

**コーパステスト。** `test/corpus/corpus.ts` の `resolveModelsDir()` は、クローンが存在しない、または別のコミットにある場合に `skip` の理由を返します。それを必要とするテストは、メッセージに固定された sha を含めてスキップされます。現在、`test/golden/oracle-refs.test.ts` はコミット済みの refs だけを検査します。マニフェストの ID ごとに 1 つあること、すべてのノード、ポート、ラベル、エッジにジオメトリがあること、自己比較、そして `_meta.json` が `ELK_COMMIT`、マニフェスト、ジェネレーターと一致することです。TS とオラクルのレイアウトテストはまだなく、最初に移植されるアルゴリズムとともに追加されます。

## 4. シームパッチ

シームパッチはオラクルを変更します。まれにしか使われず、常に TS のシームと対になります。

1. オラクルの worktree (`$ELK_ORACLE_DIR`) で編集してコミットするか、`ELK_COMMIT` のスクラッチクローンでパッチを作成します。完成したパッチを既存の worktree にそのまま追加するには (worktree を削除すると消えてしまう `census/` と `sweep/` のキャッシュが保持されます)、`build.sh` のアイデンティティで適用します。
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`。
   その後、`build.sh` がシリーズを検証してその場で再ビルドする (約 3 分) ため、手順 4-5 は省略できます。
2. エクスポートします。
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (または新しいコミットだけ)。ファイル名は `NNNN-<slug>.patch` で、数字の接頭辞が適用順を決めます。
3. 対応する TS のシームを `src/` に追加します (同じ動作で、注入可能)。テストの期待値はパッチ適用済みのオラクルから得ます (AD-13)。
4. そうでない場合は worktree を削除します: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR` (ビルド出力で汚れている場合は `--force` を付けます)。
5. 再ビルドします: `tools/oracle/build.sh` (シリーズを最初から再適用します)。
6. 再生成します: `tools/oracle/regen-goldens.sh`。`git diff test/golden/refs` を確認します。
7. パッチ (`NNNN-<slug>.patch`) を挙げ、変更されたすべての ref を列挙したジャーナルエントリを書きます。`_meta.json` の `patches` はシリーズを自動的に記録します。

コミットされていない編集を worktree に残してはいけません。`build.sh` はそれを古い状態として扱います (終了コード `2`)。`ELK_SOURCE_DIR` 自体は決して編集しないでください。

## 5. オラクルの運用（ランブック）

| 障害                                                                                   | 検出                                                                                                                                                                                                                                                                 | 対処                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tycho のビルドが失敗する (p2 に到達できない、JDK、Maven のバージョン)                  | `tools/oracle/build.sh` がゼロ以外で終了します。完全な Maven の出力はリポジトリルートの `.oracle-build.log` にあります。終了コード `1` はツールの欠落または Maven の誤り、`3` はバンドルの jar が生成されなかったことを意味します                                    | Maven は **3.9.x** でなければなりません。Tycho 4.0.12 は Maven 3.10 (Homebrew の 3.10.0) で `ProvisionException: No implementation for MavenTargetLocationFactory was bound` により失敗します。ローカルの 3.9.11 は `.tools/apache-maven-3.9.11/` (gitignore 対象) にあります: `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`。JDK 21 を使うか、`JAVA_HOME` 経由で JDK 17 を使ってください。ネットワークを確認し (初回の実行は p2 アーティファクトをダウンロードします)、再実行してください。`build.sh --record-only` は Maven をスキップし、ビルド済みの jar から `oracle-build.json` を書き直すだけです。終了コード `2`: worktree を削除し (セクション 4 の手順 4)、再ビルドしてください。それ以外はログの末尾を添えてエスカレーションしてください |
| パッチを適用した直後に `build.sh` が `2` で終了する                                    | worktree が古いと報告される                                                                                                                                                                                                                                          | `build.sh` は折り返されたパッチの件名を元に戻し (`git format-patch` は約 78 文字を超えると折り返します)、追跡されていない `census/` と `sweep/` のキャッシュを無視します。それ以外の汚れや、一覧にないパッチは、引き続き終了コード `2` になります: worktree を修復してください (セクション 4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| パッチまたはコミットの更新後のゴールデンのずれ                                         | `tools/oracle/regen-goldens.sh` に続く `git diff --exit-code test/golden/refs` が空でない。古い `_meta.json` (`elkCommit`、`modelsCommit`) で `test/golden/oracle-refs.test.ts` が失敗する。TS の適合性テストは、存在すれば `formatDiffs` のレポートとともに失敗する | 再ビルドし (`build.sh`)、`regen-goldens.sh` を実行し、差分を確認し、パッチ ID をジャーナルに記録してください。ref を手で編集したり、`tol` を緩めたりしてはいけません                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Xtext/ANTLR の jar が p2 キャッシュにない (`.elkt`、`.elkr`、または `run.sh` の起動時) | `run.sh` が `bundle <name> not in p2 cache <dir>` (例: `org.eclipse.xtext`、`org.antlr.runtime`、`org.eclipse.xtext.xbase`) を出力してゼロ以外で終了する                                                                                                             | それを含む Tycho の p2 キャッシュに `P2_BUNDLES` を設定するか、Tycho が取得できるようにネットワークに接続した状態で `build.sh` を実行し、`run.sh` を再実行してください。ほかの場所から jar を代用してはいけません                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| スイープがハングする、または OOM になる                                                | ケースがタイムアウトまで実行され、`timeout` と報告される (stderr の 1 行がそれを示す)。結果行のない実行は `oracle-error` となり、stderr に `sweep: shard <n> run <A or B> exited <code>` が出る。8 つの同時 JVM でマシンがスワップする                               | 並行数とバッチサイズを下げてください: `sweep.sh --shards 2`、`--filter` または `--limit` で絞り込みます。`ELK_SWEEP_TIMEOUT_MS` を上げるのは、遅いが正しいモデルの場合だけです。再現可能な `timeout` は発見事項です: ケース ID をジャーナルに記録し、隠すために制限を広げてはいけません                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ピンの更新後の census のずれ (`ELK_COMMIT` または models の `commit`)                  | `npx tsx tools/corpus/census.ts` が `1` で終了し、異なるモデルを列挙する。`test/corpus/census.test.ts` が失敗する                                                                                                                                                    | クローンとオラクルが新しいピンにあることを確認し、`census.ts --write` を再実行し、`git diff test/corpus/census.json` を確認し、原因をジャーナルに記録し、その後 `sweep.sh` を再実行してパリティレポートを再生成してください。census を手で編集してはいけません                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| elk-models がない、または sha が誤っている                                             | コーパステストが、期待される sha を示すメッセージとともにスキップされる。`regen-goldens.sh` が `1` で終了する (`elk-models at <sha>, expected pinned <sha>`)                                                                                                         | `test/corpus/fetch.sh` を実行してください (固定されたコミットをクローンしてチェックアウトします)。既存のクローンが別のコミットにある場合、`2` で終了し、そのクローンには触れません: そのクローンを自分で直すか、`ELK_MODELS_DIR` を新しいパスに向けてください。スクリプトから既存のクローンの HEAD を動かしてはいけません                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

`run.sh` のその他の失敗: `oracle-build.json missing` または `oracle jar missing` は、先に `build.sh` を実行するという意味です。`bundle <name> not in p2 cache` は、`P2_BUNDLES` を Tycho の p2 キャッシュに設定するか、ネットワークに接続した状態で `build.sh` を再実行するという意味です。

## 6. ゲート

すべての変更:

| ゲート             | コマンド                                                  | 基準                                                                                   |
| ------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 型                 | `npm run typecheck`                                       | 終了コード 0                                                                           |
| テストとカバレッジ | `npm run coverage`                                        | すべてのテストが通る。`src/**` に対して statements、branches、functions、lines が 90%  |
| アーキテクチャ     | `test/architecture/*.fitness.test.ts` (`npm test` が実行) | モジュール境界、モジュールグローバル、`src/` に Node 組み込みがないこと、SPDX ヘッダー |
| オラクル refs      | `test/golden/oracle-refs.test.ts`                         | コミット済みの refs がマニフェストおよび `ELK_COMMIT` と一貫していること               |

`tools/oracle/`、マニフェスト、またはパッチシリーズの変更では、さらに次が必要です。

| ゲート             | コマンド                                                                        | 基準                                                                                   |
| ------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| オラクルのビルド   | `tools/oracle/build.sh`                                                         | 終了コード 0                                                                           |
| オラクルの実行     | `tools/oracle/run.sh <outDir> <input.json>...`                                  | 終了コード 0、`ERROR` 行なし                                                           |
| ゴールデンの安定性 | `tools/oracle/regen-goldens.sh`、続けて `git diff --exit-code test/golden/refs` | 差分なし。ただし、変更が refs を動かす意図であり、ジャーナルに記録されている場合を除く |
| シェル             | `shellcheck tools/oracle/*.sh`                                                  | 問題なし                                                                               |

`tools/oracle/` または `tools/corpus/` の変更では、さらに次が必要です。

| ゲート           | コマンド                                                                               | 基準                                                            |
| ---------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Census           | `npx tsx tools/corpus/census.ts`                                                       | 終了コード 0 (ずれなし)                                         |
| 生成物の安定性   | `tools/oracle/regen-generated.sh`、続けて `git diff --exit-code test/corpus/generated` | 差分なし                                                        |
| スイープ         | `tools/oracle/sweep.sh` (サンプルには `--filter`/`--limit`)                            | 終了コード 0: `oracle-error` なし                               |
| パリティレポート | `npx tsx tools/corpus/parity-report.ts`                                                | 終了コード 0 (コミット済みのレポートが最新)。`--write` で再生成 |
