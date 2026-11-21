---
title: Genel bakış
sourceHash: ae706ea0c693889bbac9d0298ac9906f2282efda6d617acd987e7c3a37e406eb
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Genel bakış

`@knowvah/elk-engine`, Java grafik yerleşim kütüphanesi olan [Eclipse Layout
Kernel](https://www.eclipse.org/elk)'in (ELK) aslına sadık bir TypeScript taşımasıdır. Java yok, WASM yok:
yerleşim algoritmaları düz TypeScript ile yeniden uygulanmıştır ve Java uygulamasına karşı doğrulanmıştır.

::: warning Pre-1.0
Kapsamdaki tüm ELK yerleşim algoritmaları taşındı ve kaynaktan derlenmiş ELK'ya karşı denetlendi; sonuçlar
[eşdeğerlik raporunda](/parity) yer alır. Herkese açık dışa aktarım yüzeyi kabul edildi ancak henüz
`src/index.ts` içinde değil; bu yüzden paket girişi henüz herkese açık hiçbir şey dışa aktarmaz. 1.0'a kadar API
değişebilir. Sıradakiler için [yol haritasına](/guide/roadmap) bakın.
:::

## Java belirtimdir

Sabitlenmiş ELK commit'i `8bca22f4afa3371562d2f702d59929818f7f7b71` üzerindeki Java kaynağı, bağlayıcı
belirtimdir. Taşıma onu yakından izler:

- Algoritmalar ne optimize edilir ne de basitleştirilir. Java gereksiz görünüyorsa, gereksizlik korunur.
- Her dal taşınır ve TypeScript bir değişikliği zorunlu kılmadıkça metot sınırları korunur.
- JUnit testleri, test ettikleri kodla birlikte taşınır.
- ELK'nın dayandığı Java çalışma zamanı davranışı (32 bit tamsayı aritmetiği, `HashMap` yineleme sırası, `Random`
  dizileri) shim'lerle yeniden üretilir. Bkz. [Java temelleri](/tr/guide/java-foundations).

[Çeviri kuralları](/guide/translation-rules), her Java kavramının TypeScript'e nasıl eşlendiğini listeler.

## Bir oracle'a karşı doğrulama

Oracle, sabitlenmiş commit'teki ayrık bir git çalışma ağacında kaynaktan derlenmiş upstream ELK'dır.
Taşımanın çıktıları, oracle'ın çıktılarıyla karşılaştırılır:

- Kimlikler, öğe sayıları, kenar bölümü topolojisi, büküm noktası sayıları ve sayısal olmayan değerler birebir
  eşleşmelidir.
- Sayısal koordinatlar ve boyutlar `1e-6` mutlak toleransı içinde eşleşmelidir.

Seçilmiş oracle çıktıları golden referansları olarak depoya eklenmiştir; bu yüzden testleri çalıştırmak için JVM
gerekmez. Tam yöntem [uygunluk](/tr/conformance) sayfasındadır.

## Herkese açık sözleşme

Herkese açık API, [#90](https://github.com/knowvah/elk-engine/issues/90) numaralı konuda kabul edilen dışa
aktarım yüzeyidir: ElkGraph nesne modeli ve `ElkGraphUtil` fabrikaları, yerleşim motoru, her algoritmanın
meta veri sağlayıcısı ile seçenekleri ve değer türleri, ayrıca ELK JSON ve metin tabanlı graf biçimleri. ELK JSON
bir G/Ç bağdaştırıcısıdır, çekirdek model değildir. [Başlangıç](/guide/getting-started) sayfası bu yüzeyi
kullanım halinde gösterir. Sürümler 1.0'a kadar 0.x kalır; 1.0 yüzeyi sabitler.

## Çalışma zamanı kısıtları

- `src/` tarayıcıda güvenle çalışır: Node yerleşikleri yok, `process.env` yok, yalnızca ES modülleri.
- Sıfır çalışma zamanı bağımlılığı vardır.

## Sonraki adımlar

- [Mimari](/tr/guide/architecture): oracle, bundle'lar ve yerleşim motoru nasıl bir araya gelir.
- [Taşıma haritası](/guide/port-map) ve [envanter](/guide/inventory): hangi Java paketleri hangi modüllere
  eşlenir.
- [Katkıda bulunma](/tr/guide/contributing): gate'ler ve iş akışı.
