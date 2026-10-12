---
title: Java 基础
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java 基础

ELK 的结果取决于 Java 运行时的行为：32 位整数回绕、`float` 舍入、`HashMap` 的迭代顺序、`Random` 序列，以及数值到文本的转换。java-foundations 任务（2026-10-11 完成）交付了复现这些行为的 shim，以及证明它们正确的、在 JVM 上记录的向量。

shim 仅依据 Javadoc 中的规范实现。不读取也不复制任何 OpenJDK 源代码（AD-9）。每个 shim 都对照在真实 JVM 上生成的向量进行检查。

## Shim

| 领域         | 位置                     | 内容                                                                                                                                                                                                |
| ------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 数值与文本   | `src/java/lang/`         | `Int64`、`Float32`、`JavaString`、`JavaInteger`、`JavaDouble`、`DoubleToString`                                                                                                                     |
| 数学         | `src/java/lang/JavaMath` | `l2i`（`long` 的 `(int)` 转换）                                                                                                                                                                     |
| 异常         | `src/java/lang/`         | 六个异常类                                                                                                                                                                                          |
| 集合         | `src/java/util/`         | `HashStrategy`、`JavaHashMap`、`JavaHashSet`、`PriorityQueue`                                                                                                                                       |
| Guava 替代品 | `src/guava/`             | 20 个文件：`Lists`、`Iterables`、`Iterators`、`Strings`、`DoubleMath`、`Joiner`、`Splitter`、`Range`、`Table`、`ImmutableMap`、`ImmutableSet`、`Sets`、`Maps`、`HashBiMap`、`Multimap` 以及五个实现 |

`Math.log10` 不需要 shim：原生的 V8 函数与全部 1264 条已记录的行一致。Guava 从来不是依赖；`src/guava/` 只包含小型的本地辅助函数。

## JVM 向量

向量由 `tools/vectors/JavaVectors.java` 记录（Guava 33.3.0-jre 则由 `GuavaVectors.java` 记录）。它们是冻结的：重新生成会得到逐字节相同的文件。

| 分组   | 行数或脚本数                                                                                               |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| 数值   | `l2i` 78、`Float32` 2704、double 转 float 72、`log10` 1264、除以零 40、`Int64` 4056                        |
| 哈希   | `String.hashCode` 229、`Double.hashCode` 65、`doubleToLongBits` 65、`Integer.reverse` 36、KVector 哈希 256 |
| 文本   | `Double.toString` 14,939、`parseDouble` 96、`Integer.valueOf` 33                                           |
| 随机数 | 序列中途 `setSeed`：4 个种子，每个 25 次操作                                                               |
| 集合   | 1206 个 `HashMap`、1172 个 `HashSet` 和 231 个 `PriorityQueue` 脚本                                        |
| Guava  | 1518 个脚本，25,611 个步骤                                                                                 |

## 已知限制

- 对于键的哈希码相同且不是 `Comparable` 的 `HashMap` 条目，JVM 的顺序取决于对象身份，无法复现。依赖它的一致性用例需要一条已知偏差条目。
- 依赖身份的 `HashMap` 和 `HashSet` 脚本在向量中被跳过，`PriorityQueue(Collection)` 脚本也被跳过，因为 ELK 中没有调用方使用它们。
- `Sets.newTreeSet` 返回的是快照。在移植 `ScanlineOverlapCheck` 和 `ScanlineConstraintCalculator` 之前，需要一个实时的 `TreeSet` shim。

集合的翻译规则见[集合规则](/guide/collections-rules)页面。[路线图](/guide/roadmap)上的下一个任务是属性系统和 ElkGraph 模型。
