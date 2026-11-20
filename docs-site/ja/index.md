---
layout: home
sourceHash: 13520b5cd8cfe1522d01c0b3ec7b47afad3fce1879618a87194b477c8ef962ec
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
  - title: 1.0 以前
    details: 対象範囲の ELK レイアウトアルゴリズムはすべて移植済みで、ソースからビルドした ELK に対して検証されています。1.0 までは API が変わる可能性があります。
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning 1.0 以前
対象範囲の ELK レイアウトアルゴリズムはすべて移植済みで、ソースからビルドした ELK に対して検証されています。結果は[パリティレポート](/parity)（英語）にあります。公開するエクスポートの範囲は承認済みですが、まだ `src/index.ts` には入っていないため、パッケージのエントリーは公開されるものをまだ何もエクスポートしていません。バージョンは 1.0 まで 0.x のままで、それまでは API が変わる可能性があります。今後の予定は[ロードマップ](/guide/roadmap)（英語）を参照してください。
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
