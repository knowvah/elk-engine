---
title: Java temelleri
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java temelleri

ELK'in sonuçları Java çalışma zamanı davranışına bağlıdır: 32 bit tam sayı taşması, `float` yuvarlaması,
`HashMap` yineleme sırası, `Random` dizileri ve sayıdan metne dönüşüm. java-foundations misyonu
(2026-10-11'de tamamlandı) bu davranışı yeniden üreten shim'leri ve onları kanıtlayan, JVM üzerinde
kaydedilmiş vektörleri teslim etti.

Shim'ler yalnızca Javadoc'taki belirtimden uygulanır. Hiçbir OpenJDK kaynağı okunmaz veya
kopyalanmaz (AD-9). Her shim, gerçek bir JVM üzerinde üretilmiş vektörlere karşı denetlenir.

## Shim'ler

| Alan                  | Konum                    | İçerik                                                                                                                                                                                                |
| --------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sayılar ve metin      | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                       |
| Math                  | `src/java/lang/JavaMath` | `l2i` (bir `long` değerinin `(int)` dönüşümü)                                                                                                                                                         |
| İstisnalar            | `src/java/lang/`         | Altı istisna sınıfı                                                                                                                                                                                   |
| Koleksiyonlar         | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                         |
| Guava yerine geçenler | `src/guava/`             | 20 dosya: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` ve beş uygulama |

`Math.log10` için shim gerekmez: yerel V8 fonksiyonu kaydedilmiş 1264 satırın tamamıyla eşleşir. Guava
asla bir bağımlılık değildir; `src/guava/` küçük yerel yardımcılar içerir.

## JVM vektörleri

Vektörler `tools/vectors/JavaVectors.java` tarafından kaydedilir (Guava 33.3.0-jre için
`GuavaVectors.java`). Donmuş durumdadırlar: yeniden üretmek bayt bayt özdeş dosyalar verir.

| Grup          | Satırlar veya betikler                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Sayısal       | `l2i` 78, `Float32` 2704, double'dan float'a 72, `log10` 1264, sıfıra bölme 40, `Int64` 4056               |
| Hash          | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, KVector hash 256 |
| Metin         | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                           |
| Random        | dizinin ortasında `setSeed`: her biri 25 işlemli 4 tohum                                                   |
| Koleksiyonlar | 1206 `HashMap`, 1172 `HashSet` ve 231 `PriorityQueue` betiği                                               |
| Guava         | 1518 betik, 25,611 adım                                                                                    |

## Bilinen sınırlar

- Anahtarları eşit hash koduna sahip olan ve `Comparable` olmayan `HashMap` girdilerinin JVM sırası
  nesne kimliğini izler ve yeniden üretilemez. Buna bağlı uygunluk senaryoları bir
  bilinen-sapma girdisine ihtiyaç duyar.
- Kimliğe bağımlı `HashMap` ve `HashSet` betikleri vektörlerde atlanır; `PriorityQueue(Collection)`
  betikleri de atlanır, çünkü ELK'in bunlar için bir çağıranı yoktur.
- `Sets.newTreeSet` bir anlık görüntü döndürür. `ScanlineOverlapCheck` ve
  `ScanlineConstraintCalculator` taşınmadan önce canlı bir `TreeSet` shim'i gerekir.

Koleksiyon çeviri kuralları [koleksiyon kuralları](/guide/collections-rules) sayfasındadır.
[Yol haritası](/guide/roadmap)ndaki bir sonraki misyon, özellik sistemi ve ElkGraph modelidir.
