---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
hero:
  name: '@knowvah/elk-engine'
  text: 純粋な TypeScript による Eclipse ELK
  tagline: Eclipse Layout Kernel の忠実な TypeScript 移植です。Java も WASM も使いません。レイアウトアルゴリズムはプレーンな TypeScript で再実装され、Java 実装に対して検証されています。
  actions:
    - theme: brand
      text: 概要
      link: /ja/guide/overview
    - theme: alt
      text: ショーケース
      link: /ja/showcase/
    - theme: alt
      text: GitHub で見る
      link: https://github.com/knowvah/elk-engine
features:
  - title: ELK Java に忠実
    details: 固定された ELK コミットの Java が仕様です。すべての分岐を移植し、JUnit テストもテスト対象のコードとともに移植します。
  - title: オラクルに対して検証済み
    details: 出力は、ソースからビルドした ELK と比較されます。構造は完全に一致し、座標は 1e-6 の範囲内で一致します。
  - title: ブラウザネイティブ、ランタイム依存なし
    details: ライブラリコードに Java も WASM も Node の組み込みモジュールもありません。バンドルして出荷できます。
  - title: プレアルファ
    details: ツールチェーン、アーキテクチャ、Java ランタイムのシム、検証用の足場は揃っています。レイアウトアルゴリズムはまだ移植されていません。
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning プレアルファ
レイアウトアルゴリズムはまだ移植されておらず、`src/index.ts` は公開されるものを何もエクスポートしていません。最初の npm 公開で公開 API が固定されます。今後の予定は[ロードマップ](/guide/roadmap)（英語）を参照してください。
:::

## 進む道を選ぶ

| 知りたいこと                                      | 最初に読むページ                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| プロジェクトの内容と対象外を理解したい            | [概要](/ja/guide/overview)                                                       |
| 各部分がどう組み合わさるかを見たい                | [アーキテクチャ](/ja/guide/architecture)                                         |
| 「Java と一致する」とは何かを知りたい             | [適合性](/ja/conformance)                                                        |
| Java パッケージが移植先のどこに対応するか調べたい | [移植マップ](/guide/port-map)（英語） · [インベントリ](/guide/inventory)（英語） |
| Java から TypeScript へのルールを学びたい         | [翻訳ルール](/guide/translation-rules)（英語）                                   |
| どの Java ランタイムの挙動が対象かを見たい        | [Java の基盤](/ja/guide/java-foundations)                                        |
| 計画を見たい                                      | [ロードマップ](/guide/roadmap)（英語）                                           |
| 貢献したい                                        | [貢献](/ja/guide/contributing)                                                   |
