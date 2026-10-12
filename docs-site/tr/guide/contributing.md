---
title: Katkıda bulunma
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Katkıda bulunma

Önce [Genel bakış](/tr/guide/overview) ve [Çeviri kuralları](/guide/translation-rules) sayfalarını okuyun.
Sabitlenmiş commit'teki Java belirtimdir; tereddüt ederseniz Java'yı okuyun.

## Gate'ler

Bunları her commit'ten önce çalıştırın. Her biri geçmelidir.

| Komut                  | Denetler                                                    |
| ---------------------- | ----------------------------------------------------------- |
| `npm run format:check` | Prettier biçimlendirmesi                                    |
| `npm run typecheck`    | TypeScript tür denetimi (yerel `tsc --noEmit`)              |
| `npm test`             | Golden paketi dahil vitest paketi                           |
| `npm run coverage`     | %90 satır, dal, fonksiyon ve deyim kapsamıyla çalışan paket |

Node 22 veya daha yenisi gerekir. Bağımlılıkları `npm ci` ile kurun.

## Testler değiştirilemez

Beklenen değerler, uygulama yazılmadan önce oracle'dan, JVM vektörlerinden veya Java kaynağından gelir (AD-13).
Bir kez yazıldıktan sonra bir assertion dondurulur: başarısız bir test, uygulamanın yanlış olduğu anlamına gelir.

Bir test yalnızca assertion'ı, bir vektörü veya bir golden'ı değiştirerek geçebiliyorsa durun ve durumu görevin
karar günlüğüne kaydedin. Yeşile dönmek için toleransı gevşetmeyin, bir senaryoyu silmeyin ve bir referansı yeniden
üretmeyin. Golden referansları betikle yeniden üretilir, asla elle değil.

## İş akışı

1. Bir özellik dalı oluşturun, örneğin `feature/<short-description>`.
2. Commit mesajlarını [Conventional Commits](https://www.conventionalcommits.org) olarak yazın, örneğin
   `feat(java): add JavaHashMap`. Konu satırları küçük harfle yazılır ve en çok 72 karakter olur.
3. `main` dalına karşı bir pull request açın. CI, pull request başlığını Conventional Commit olarak denetler.
4. Commit'ler imzalı olmalıdır; depo kural seti bunu gerektirir.
5. Pull request'ler bir merge commit ile birleştirilir.

Her kod dosyası bir SPDX üstbilgisi taşır: `// SPDX-License-Identifier: EPL-2.0`. Bir fitness testi bunu
zorunlu kılar. Bağımlılıklar EPL-2.0 ile uyumlu olmalıdır.

## Dokümantasyon komutları

| Komut                  | Amaç                                                             |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run docs:dev`     | Dokümantasyon sitesini canlı yenilemeyle başlatır                |
| `npm run docs:build`   | Siteyi derler; ölü bir dahili bağlantı derlemeyi başarısız kılar |
| `npm run docs:preview` | Derlenmiş siteyi yerelde sunar                                   |

Çoğu referans sayfası `docs/` içindeki dosyaları içerir. `docs-site/` altındaki sayfayı değil, `docs/`
içindeki dosyayı düzenleyin. İçerilen dosyalardaki PlantUML diyagramları SVG'ye dönüştürülür ve
`docs-site/public/diagrams/` altına eklenir.

## Harici dizinler

Betikler ve testler, komşu checkout'ları ortam değişkenleri aracılığıyla bulur. Varsayılanlar depo köküne
görelidir. Bu değişkenleri yalnızca `tools/` ve `test/` okur; `src/` içindeki kod asla okumaz.

| Değişken         | Varsayılan                     | İçerik                                               |
| ---------------- | ------------------------------ | ---------------------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | Sabitlenmiş commit'teki Eclipse ELK Java kaynağı     |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Ayrık çalışma ağacı ve derlenmiş oracle              |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | Derlem manifestosunda sabitlenmiş elk-models derlemi |

Oracle derlemesi Maven 3.9 veya daha yenisini ve JDK 21'i (yedek olarak JDK 17) gerektirir. Oracle yöntemi için
[Uygunluk](/tr/conformance) sayfasına bakın.
