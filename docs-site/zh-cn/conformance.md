---
title: 一致性
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 一致性：“匹配”的含义

@knowvah/elk-engine 以从源码构建的上游 Eclipse ELK（Java）为验证基准。将 TypeScript 布局与基准实现（oracle）的布局都解析为 ELK JSON 之后，如果二者的结构和所有非数值取值完全相等，且每个有限数值在 `1e-6` 的绝对容差内一致，则该 TypeScript 布局与基准实现**一致**。比较器是 [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts)；本文档描述它的实现。移植规则见 [`docs/translation-rules.md`](/guide/translation-rules)。

| #   | 章节                                    | 回答的问题                   |
| --- | --------------------------------------- | ---------------------------- |
| 1   | [基准实现](#1-基准实现)                 | 什么是“正确”，对应哪个提交？ |
| 1a  | [一致性单元](#1a-一致性单元)            | 什么是一个用例，有哪些用例？ |
| 2   | [一致性标准](#2-一致性标准)             | 怎样才算相等？               |
| 3   | [黄金用例与语料库](#3-黄金用例与语料库) | 参考输出从何而来？           |
| 4   | [Seam 补丁](#4-seam-补丁)               | 如何修改基准实现？           |
| 5   | [基准实现运维](#5-基准实现运维运行手册) | 出问题时该怎么办？           |
| 6   | [质量门禁](#6-质量门禁)                 | 变更合入前必须通过什么？     |

## 1. 基准实现

基准实现（AD-3）是**从源码构建**的上游 ELK，位于 `$ELK_SOURCE_DIR` 的一个分离（detached）git 工作树中，由 `tools/oracle/build.sh` 创建在 `$ELK_ORACLE_DIR`。两者都在本仓库之外；均不随仓库分发。

| 项目                | 位置                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------ |
| 固定的 ELK 提交     | `tools/oracle/ELK_COMMIT`（当前为 `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`）       |
| 补丁序列            | `tools/oracle/patches/*.patch`，按字典序以 `git am --3way` 应用                      |
| 构建                | `tools/oracle/build.sh`（Maven 3.9.x + JDK 21；Tycho 下载 p2 构件）                  |
| 批量运行器          | `tools/oracle/run.sh <outDir> <input>...` 或 `run.sh --cases <cases.jsonl> <outDir>` |
| 测试工具（harness） | `tools/oracle/harness/ElkOracle.java`                                                |
| 构建清单            | `$ELK_ORACLE_DIR/oracle-build.json`（提交、补丁、JDK、每个 bundle 的 jar）           |

**构建。** `build.sh` 先在工作树的 `build/` 目录中运行 `mvn -P elk-meta clean install -DskipTests`（melk 编译器），再运行 `mvn clean install -DskipTests -Dmaven.test.skip=true`，然后把每个范围内 bundle（`core`、`graph`、`graph.json`、`alg.common`，以及 `layered`、`mrtree`、`radial`、`force`、`disco`、`rectpacking`、`spore`、`topdownpacking`、`vertiflex` 这些算法）的 jar 记录到 `oracle-build.json`。只有当现有工作树派生自 `ELK_COMMIT`、携带的补丁主题与 `tools/oracle/patches/` 完全一致、且除构建输出外保持干净时，才会复用它；否则 `build.sh` 以 `2` 退出，并保持该工作树不变。

**运行。** `run.sh` 针对各 bundle 的 jar 以及来自 Tycho p2 缓存的第三方 bundle（Gson、Guava、EMF、Xtext/Xtend 库）编译 `ElkOracle.java`（`P2_BUNDLES`，默认为 `~/.m2/repository/p2/osgi/bundle`；每个 bundle 使用最新版本）。一个 JVM 使用 `RecursiveGraphLayoutEngine` 对所有输入进行布局，并写出 `<outDir>/<input basename>.json`，其中包含布局、零尺寸和零位置，未知的布局选项被省略。输入失败时打印 `ERROR <input>: <message>`；只要有任何输入失败，JVM 就以 `1` 退出。同一次运行内的输入基本名必须唯一，因为输出文件名就是基本名。

**补丁序列的语义。** 该序列目前只有一个补丁：

| 补丁                                                                    | 作用                                                                                                                                                                                                       | 配对的 TS seam                                                                                                       |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` 用 `"_g" + Random.nextInt(1000000)` 解决 id 冲突；该补丁用系统属性 `org.eclipse.elk.graph.json.exportSeed` 为这个 `Random` 设置种子（未设置 = ELK 原有行为）。`run.sh` 传入 `EXPORT_SEED=1` | `graph.json` 移植中可注入的 `Random`；待该移植完成（TS 的 `Random` shim 已能复现该序列：种子 1 得到 548985、764588） |

补丁的存在只是为了加入范围狭窄的 seam，使 JVM 与 JS 的行为可以比较；每个补丁都与一个 TS 侧的 seam 配对（第 4 节）。

**为什么不用 elkjs？** elkjs 是经 GWT 编译的 ELK。它无法承载我们的补丁序列，而且 GWT 对 JRE 的仿真与我们据以移植的 JVM 不同。因此不把它当作基准实现。

## 1a. 一致性单元

一个**用例**是 `(algorithm, model, variant)`（D1）。对齐度（parity）仪表板为每种布局算法设一行；elk-models 文件夹和 census 特征只是过滤条件，不是行。

**用例 id。** `<tier>/<algorithmSuffix>/<variant>/<modelId>`，例如 `native/layered/default/tickets/layered/546_borderGaps`。`algorithmSuffix` 是去掉 `org.eclipse.elk.` 的算法 id。对于生成的模型，`modelId` 是 `generated/<name>`。

**模型 id 与来源（D3）。** 模型 id 是 elk-models 中不含扩展名的路径。用例在 `.json` 存在时读取它，否则读取 `.elkt`；从不读取 `.elkg`（EMF XMI）。

**变体（D6）。** `test/corpus/variants.json` 中具名的选项叠加，应用于根节点：`default`（无）、`direction-right`、`direction-left`、`direction-down`、`direction-up`、`hierarchy-separate`（`SEPARATE_CHILDREN`）、`hierarchy-include`（`INCLUDE_CHILDREN`）。

| Tier         | 算法                           | 模型                           | 变体                 |
| ------------ | ------------------------------ | ------------------------------ | -------------------- |
| native       | 模型自身的 `rootAlgorithm`     | 每个 census 模型               | 全部七个             |
| retarget     | 除模型自身算法外的每个已列算法 | 每个 census 模型               | 仅 `default`（OR-1） |
| generated    | 由文件名前缀指明的算法         | `test/corpus/generated/*.json` | 全部七个             |
| ported JUnit | 按各算法任务（mission）而定    | 上游 JUnit 用例（AD-13）       | 与移植时一致         |

`tools/oracle/run.sh --list-algorithms` 给出算法 id 列表（目前 14 个）。

**Retarget（D2）。** harness 在**每个有子节点的节点**上设置 `org.eclipse.elk.algorithm`，替换任何已声明的值，并在根节点上设置 `org.eclipse.elk.randomSeed = 1`。ELK 按节点解析算法，未设置的节点回退到 layered。没有子节点的根节点只会得到种子。retarget tier 跳过每个模型自身的 `rootAlgorithm`（由 native tier 覆盖）。

## 2. 一致性标准

AD-4，与 `compareLayout(expected, actual, { tol })` 的实现完全一致：

| 规则                   | 行为                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 容差                   | 绝对容差，`DEFAULT_TOLERANCE = 1e-6`；有限数值在 `abs(e - a) <= tol` 时通过                                        |
| 非有限数值             | `NaN` 和 `±Infinity` 必须完全相等（`Object.is` 或 `===`），即使 `tol: Infinity` 也是如此                           |
| 字符串、布尔值、`null` | 严格相等，否则为 `value`                                                                                           |
| 类型不匹配             | JSON 类型不同（`null`、数组、对象、数值、字符串、布尔值）时给出一条 `type` 差异                                    |
| 对象键                 | 键集合必须相同：仅在 expected 中的键为 `missing`，仅在 actual 中的键为 `extra`                                     |
| 数组                   | 当两侧每个元素都是带字符串 `id` 的对象且每侧 id 唯一时，**按 `id`** 匹配（空数组视为按键匹配）；否则**按位置**匹配 |
| 按键匹配的数组         | 仅一侧存在的 id 是位于 `path[id=<id>]` 的一条 `structure` 差异；忽略顺序                                           |
| 按位置匹配的数组       | 长度不同是一条 `structure` 差异，且不再继续比较元素                                                                |
| 差异种类               | `structure`、`value`、`type`、`missing`、`extra`；`path` 类似 JSON 路径（`children[id=n1].x`）                     |

由此可知：元素 id、元素数量、边段拓扑和折点数量都是精确匹配的，因为 id 和数组长度是精确匹配的；坐标和尺寸适用 `1e-6`。`formatDiffs` 最多打印 20 条差异。

**已知偏差策略。** 偏差绝不通过提高 `tol` 或编辑黄金用例来吸收（AD-13）。每一项都记录在此，注明原因以及它影响的测试或夹具。可接受的类别：

- **`Math.*` 的 ulp 级差异。** V8 与 JVM 在 `sin`、`cos`、`exp`、`log`、`pow` 等函数的最后一位上可能不同；Java 的 `StrictMath` 被规定为逐位精确，`Math` 则不是。已经遇到的情形：`nextGaussian` 被规定使用 `StrictMath.log`，因此 `src/java/util/Random.ts` 携带的是与 `StrictMath.log` 精确一致的实现，而非 `Math.log`。应优先逐位精确地移植 `StrictMath` 算法，而不是放宽容差。
- **身份哈希迭代（AD-10）。** 遍历键为身份哈希对象的 `HashMap`/`HashSet`，在 Java 本身中就是不确定的。记录该位置到日志，并按插入顺序移植；黄金用例不得依赖它。值哈希的键（String、Integer）必须复现 Java 的顺序。
- **以时间作种子的 `Random`。** 当 `randomSeed = 0` 时，ELK 以时钟作种子（`core/Core.melk:608`），因此输出不可复现。黄金用例的输入必须不设置种子或将其设为非零（layered 的默认种子为 `1`）。

具体条目（仅在获得用户批准后添加）：

| #   | 偏差               | 原因                                                   | 范围                                                                                                          | 批准                 |
| --- | ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | -------------------- |
| 1   | 解析错误的消息文本 | ANTLR 消息是生成的解析器的产物，而该解析器永远不会移植 | 无效的语法输入（`.elkt`、`.elkj`、`.elkr`）：只要求解析失败的_出现_一致，不要求消息一致。有效输入必须完全一致 | D8，用户，2026-10-11 |

**判定。** 每个用例根据基准实现两次独立的 JVM 运行得到一个判定（D4、D5、OR-2）：

| 判定               | 含义                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | 两次运行都完成了模型布局，且输出文件逐字节相同                                                                                        |
| `throws`           | 两次运行抛出相同的异常：类完全相同，且在 `@[0-9a-f]+` 变为 `@<hash>` 之后消息也完全相同（消息可以为 null，例如 `StackOverflowError`） |
| `nondeterministic` | 两次运行不一致（输出字节、异常，或一次 `ok` 一次 `throws`）                                                                           |
| `oracle-error`     | harness 故障（输入不可读、未知的变体/算法/选项、丢失结果行）；绝不可接受                                                              |
| `timeout`          | 某次运行超过了 `ELK_SWEEP_TIMEOUT_MS`                                                                                                 |

优先级：`oracle-error`，然后是 `timeout`，然后是相同时的 `ok`/`throws`，否则为 `nondeterministic`。在逐字节比较之前，两份输出中的每个 `@[0-9a-f]+` 记号都被替换为 `@<hash>`，与异常消息的处理相同（D5a；见 `tools/corpus/sweep.ts` 中的 `sameOutput`）。原因：disco 以编程方式设置的 `debug.discoGraph` 选项会导出 `...DCGraph@<identity hash>`，任何种子都无法固定它。TS 比较器采用同样的替换。不确定的用例单独报告，并从通过计数中排除，与上文的身份哈希策略一致。

`nondeterministic` 真正残留的来源（是 ELK 的行为，不是 harness 故障；数量见对齐度报告）：spore（`ElkGraphImporter.java:169` 使用 `Math.random` 抖动）和 `random`（默认 `randomSeed` 0 在嵌套复合节点上不设种子；retarget 只给根节点设种子，D2，经用户决定保留）。导出器的 `_g<random>` id 重命名不是来源：seam 补丁已修复它们。

## 3. 黄金用例与语料库

AD-5。参考输出已提交入库，因此 CI 不需要 JVM。

| 项目             | 位置                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| 固定的语料库     | `eclipse-elk/elk-models`，位于 `test/corpus/manifest.json` 中的 `commit`（不随仓库分发）        |
| 模型目录         | `$ELK_MODELS_DIR`，默认为相对于本仓库的 `../../eclipse-elk/elk-models`                          |
| 精选集           | `test/corpus/manifest.json` 中的 `golden[]`：`{ id, path, note }`                               |
| 参考输出（Refs） | `test/golden/refs/elk/<id>.json`，每个清单 `id` 一个                                            |
| 来源信息         | `test/golden/refs/elk/_meta.json`：`elkCommit`、`patches`、`jdk`、`modelsCommit`、`generatedBy` |

**id 到路径的映射。** `golden[].path` 相对于 `$ELK_MODELS_DIR`，输入为 `$ELK_MODELS_DIR/<path>`。`regen-goldens.sh` 在这些输入上运行 harness，并把每个 `<basename>.json` 输出暂存为 `refs/elk/<id>.json`。示例：id `ptolemy-scrambler` 对应 `realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`。

**重新生成**（`tools/oracle/regen-goldens.sh`）：

1. 要求 models 克隆恰好位于清单中的提交（否则以 `1` 退出）。
2. 要求已构建基准实现（`run.sh` 需要 `oracle-build.json`）。
3. 把所有 refs 和 `_meta.json` 暂存在 `test/golden/refs/.elk-staging.*` 中，然后通过两次重命名换入该目录，因此运行失败时会保留旧的 refs。
4. `_meta.json` 不含时间戳（`builtAt` 保留在 `oracle-build.json` 中），因此在输入未变时重新生成，在 git 中逐字节不产生任何变化。

**何时重新生成：** 在更改 `ELK_COMMIT`、补丁序列、清单的 `golden[]` 集合或 `commit`、或 harness 之后。其他时候绝不重新生成。

**日志记录规则。** 每次改变了某个 ref 的重新生成，都要连同原因（补丁 id 或提交升级）记入日志。绝不手工编辑 refs。如果某个 TS 断言或黄金用例只有通过修改才能通过，则停止并记入日志（AD-13）。

**Census。** `npx tsx tools/corpus/census.ts` 不做任何布局：它以解析模式对每个模型运行基准实现，并将结果与已提交的 `test/corpus/census.json`（898 个模型：id、格式、来源、根算法、特征计数）比较。相等时以 `0` 退出，出现漂移时以 `1` 退出；`--write` 会重写该文件。它只在固定的 models 克隆中运行，遇到 harness 故障时中止。

**生成的语料库（D7）。** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` 保存带种子的 grandom 配置；与之并列的 `.json` 是由基准实现生成的、尚未布局的输入。九个配置覆盖了没有 elk-models 模型使用的算法 id：`disco`、`force`、`mrtree`、`radial`、`random`、`sporeCompaction`、`sporeOverlap`、`topdownpacking`、`vertiflex`。每个配置最多 50 个节点，且没有边标签（`BlindTextGenerator` 不设种子）。harness 将生成的根节点命名为 `root`，因为 ELK 的 `JsonExporter` 用不带种子的随机后缀来解决 id 冲突。只能通过 `tools/oracle/regen-generated.sh` 重新生成（暂存目录加重命名；某个配置失败时保留旧文件）；在无变化时重新运行在 git 中不产生任何变化。TS 的 grandom 移植必须逐字节复现这些 `.json` 文件；算法黄金用例从不依赖它。

**Sweep。** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` 规划每个用例，在各自独立的 JVM 中把每个用例运行两次（分片数默认为 `min(cpus, 8)` 个并发的 `run.sh` 进程），并写出 `$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`。`--plan-only` 打印各 tier 的用例数量而不运行任何内容；`--filter` 保留用例 id 包含该子串的用例；`--limit` 按等间隔步长取样。除非有用例为 `oracle-error`（`1`），否则以 `0` 退出；工具故障以 `2` 退出。单个用例的输出保留在本地（AD-5）。`ELK_SWEEP_TIMEOUT_MS`（默认 `30000`，仅由 `tools/` 读取）限制每个用例；超时（JVM 退出码 75）之后，`run.sh` 会重启 JVM，运行尚无结果行的用例。

**对齐度报告（D9）。** `docs/parity-report.md` 由 sweep 缓存生成并提交入库：按算法和判定统计数量，附 ELK 与 models 的提交，不含时间戳。使用 `npx tsx tools/corpus/parity-report.ts --write` 重新生成；不带 `--write` 时，如果已提交的报告已过期，该命令以 `1` 退出。绝不手工编辑。

**语料库测试。** `test/corpus/corpus.ts` 中的 `resolveModelsDir()` 在克隆缺失或位于其他提交时返回 `skip` 原因；需要它的测试会跳过，并在消息中给出固定的 sha。目前 `test/golden/oracle-refs.test.ts` 只检查已提交的 refs：每个清单 id 一个、每个节点、端口、标签和边上都有几何信息、自我比较，以及 `_meta.json` 与 `ELK_COMMIT`、清单和生成器一致。目前还没有 TS 与基准实现之间的布局测试；它将随第一个移植完成的算法一同出现。

## 4. Seam 补丁

Seam 补丁会修改基准实现；它们很少见，并且总是与一个 TS seam 配对。

1. 在基准实现工作树（`$ELK_ORACLE_DIR`）中编辑并提交，或在位于 `ELK_COMMIT` 的临时克隆中编写补丁。若要把一个完成的补丁就地加入现有工作树（这样会保留 `census/` 和 `sweep/` 缓存，而删除工作树会删掉它们），请使用 `build.sh` 的身份应用它：
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`；
   随后 `build.sh` 会验证该序列并就地重新构建（约 3 分钟），因此可以跳过第 4-5 步。
2. 导出：
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   （或只导出新的提交）。文件命名为 `NNNN-<slug>.patch`；数字前缀决定应用顺序。
3. 添加配对的 TS seam（行为相同、可注入，位于 `src/`），其测试的期望值来自打过补丁的基准实现（AD-13）。
4. 否则删除工作树：`git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`（如果构建输出使其变脏，则加上 `--force`）。
5. 重新构建：`tools/oracle/build.sh`（从头重新应用该序列）。
6. 重新生成：`tools/oracle/regen-goldens.sh`；检查 `git diff test/golden/refs`。
7. 在日志中记录一条条目，写明该补丁（`NNNN-<slug>.patch`）并列出每个发生变化的 ref。`_meta.json` 的 `patches` 会自动记录该序列。

绝不要在工作树中留下未提交的编辑：`build.sh` 会将其视为过期（以 `2` 退出）。绝不要编辑 `ELK_SOURCE_DIR` 本身。

## 5. 基准实现运维（运行手册）

| 故障                                                                    | 检测方式                                                                                                                                                                                                                               | 缓解措施                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tycho 构建失败（p2 不可达、JDK、Maven 版本）                            | `tools/oracle/build.sh` 以非零退出；完整的 Maven 输出在仓库根目录的 `.oracle-build.log` 中。退出码 `1` 表示缺少工具或 Maven 不对；退出码 `3` 表示某个 bundle 的 jar 没有生成                                                           | Maven 必须是 **3.9.x**：Tycho 4.0.12 在 Maven 3.10（Homebrew 的 3.10.0）上会失败，报 `ProvisionException: No implementation for MavenTargetLocationFactory was bound`。本地的 3.9.11 位于 `.tools/apache-maven-3.9.11/`（已被 gitignore）：`ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`。使用 JDK 21，或通过 `JAVA_HOME` 使用 JDK 17。检查网络（首次运行会下载 p2 构件），然后重新运行。`build.sh --record-only` 跳过 Maven，仅根据已构建的 jar 重写 `oracle-build.json`。退出码 `2`：删除工作树（第 4 节第 4 步）并重新构建。否则附上日志末尾内容并上报 |
| `build.sh` 在应用补丁后立即以 `2` 退出                                  | 工作树被报告为过期                                                                                                                                                                                                                     | `build.sh` 会展开被折行的补丁主题（`git format-patch` 会把超过约 78 个字符的主题折行），并忽略未跟踪的 `census/` 和 `sweep/` 缓存；其他脏内容或未列出的补丁仍会以 `2` 退出：修复工作树（第 4 节）                                                                                                                                                                                                                                                                                                                                                                                   |
| 补丁或提交升级后出现黄金用例漂移                                        | 运行 `tools/oracle/regen-goldens.sh` 后，`git diff --exit-code test/golden/refs` 非空；`test/golden/oracle-refs.test.ts` 因 `_meta.json` 过期（`elkCommit`、`modelsCommit`）而失败；TS 一致性测试一旦存在，会以 `formatDiffs` 报告失败 | 重新构建（`build.sh`），运行 `regen-goldens.sh`，检查差异，把补丁 id 记入日志。绝不手工编辑 ref，也绝不放宽 `tol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| p2 缓存中缺少 Xtext/ANTLR jar（`.elkt`、`.elkr`，或任何 `run.sh` 启动） | `run.sh` 以非零退出，并输出 `bundle <name> not in p2 cache <dir>`（例如 `org.eclipse.xtext`、`org.antlr.runtime`、`org.eclipse.xtext.xbase`）                                                                                          | 把 `P2_BUNDLES` 设置为包含它的 Tycho p2 缓存，或在可联网的情况下运行 `build.sh` 让 Tycho 获取它；然后重新运行 `run.sh`。不要用来自别处的 jar 替代                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Sweep 挂起或 OOM                                                        | 某个用例一直运行到超时并报告 `timeout`（stderr 的一行会指明它）；没有结果行的运行会得到 `oracle-error`，并在 stderr 输出 `sweep: shard <n> run <A or B> exited <code>`；8 个并发 JVM 下机器发生交换                                    | 降低并发度和批大小：`sweep.sh --shards 2`，用 `--filter` 或 `--limit` 缩小范围。仅对运行缓慢但结果正确的模型才提高 `ELK_SWEEP_TIMEOUT_MS`。可复现的 `timeout` 是一项发现：把用例 id 记入日志，不要放宽限制来掩盖它                                                                                                                                                                                                                                                                                                                                                                  |
| 固定版本升级（`ELK_COMMIT` 或 models 的 `commit`）后 census 漂移        | `npx tsx tools/corpus/census.ts` 以 `1` 退出并列出不同的模型；`test/corpus/census.test.ts` 失败                                                                                                                                        | 确认克隆和基准实现都位于新的固定版本，重新运行 `census.ts --write`，检查 `git diff test/corpus/census.json`，把原因记入日志，然后重新运行 `sweep.sh` 并重新生成对齐度报告。绝不手工编辑 census                                                                                                                                                                                                                                                                                                                                                                                      |
| elk-models 缺失或 sha 错误                                              | 语料库测试跳过并给出指明期望 sha 的消息；`regen-goldens.sh` 以 `1` 退出（`elk-models at <sha>, expected pinned <sha>`）                                                                                                                | 运行 `test/corpus/fetch.sh`（克隆并检出固定的提交）。如果已有克隆位于其他提交，它以 `2` 退出且不会触碰该克隆：请自行修复该克隆，或将 `ELK_MODELS_DIR` 指向一个全新的路径。绝不要在脚本中移动已有克隆的 HEAD                                                                                                                                                                                                                                                                                                                                                                         |

其他 `run.sh` 失败：`oracle-build.json missing` 或 `oracle jar missing` 表示需要先运行 `build.sh`；`bundle <name> not in p2 cache` 表示需要把 `P2_BUNDLES` 设置为 Tycho p2 缓存，或在可联网的情况下重新运行 `build.sh`。

## 6. 质量门禁

每一次变更：

| 门禁          | 命令                                                        | 标准                                                           |
| ------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| 类型          | `npm run typecheck`                                         | 退出码 0                                                       |
| 测试与覆盖率  | `npm run coverage`                                          | 所有测试通过；`src/**` 的语句、分支、函数和行覆盖率均达到 90%  |
| 架构          | `test/architecture/*.fitness.test.ts`（由 `npm test` 运行） | 模块边界、模块全局变量、`src/` 中不使用 Node 内置模块、SPDX 头 |
| 基准实现 refs | `test/golden/oracle-refs.test.ts`                           | 已提交的 refs 与清单和 `ELK_COMMIT` 一致                       |

对 `tools/oracle/`、清单或补丁序列的变更还需要：

| 门禁           | 命令                                                                          | 标准                                           |
| -------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| 基准实现构建   | `tools/oracle/build.sh`                                                       | 退出码 0                                       |
| 基准实现运行   | `tools/oracle/run.sh <outDir> <input.json>...`                                | 退出码 0，没有 `ERROR` 行                      |
| 黄金用例稳定性 | `tools/oracle/regen-goldens.sh`，然后 `git diff --exit-code test/golden/refs` | 无差异，除非该变更本就要移动 refs 且已记入日志 |
| Shell          | `shellcheck tools/oracle/*.sh`                                                | 无告警                                         |

对 `tools/oracle/` 或 `tools/corpus/` 的变更还需要：

| 门禁         | 命令                                                                                 | 标准                                                  |
| ------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Census       | `npx tsx tools/corpus/census.ts`                                                     | 退出码 0（无漂移）                                    |
| 生成物稳定性 | `tools/oracle/regen-generated.sh`，然后 `git diff --exit-code test/corpus/generated` | 无差异                                                |
| Sweep        | `tools/oracle/sweep.sh`（或用 `--filter`/`--limit` 取样）                            | 退出码 0：没有 `oracle-error`                         |
| 对齐度报告   | `npx tsx tools/corpus/parity-report.ts`                                              | 退出码 0（已提交的报告为最新）；用 `--write` 重新生成 |
