---
title: 架构
sourceHash: b28f7adf145c6e3ab8efc737a9e5e9bb883714a2c79e0811ade88704241f3c21
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-engine 架构概览

| 文档                                                                                                                   | 内容                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | 每个 ELK bundle：用途、LOC、生成的源代码、范围                                                                    |
| [port-map.md](/guide/port-map)                                                                                         | Java 包到 `src/` 模块的映射                                                                                       |
| [component-map.md](#组件图)                                                                                            | 范围内的 bundle 依赖；运行时核心组成部分                                                                          |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Java 到 TypeScript 的规则                                                                                         |
| [../conformance.md](/conformance)                                                                                      | 基准实现的比较标准与流程（本任务稍后提供）                                                                        |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | ELK Text（`.elkt`）移植、Xtext 子集、运行手册与推迟项                                                             |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | ELK Textual JSON（`.elkj`）移植、延迟链接、运行手册与推迟项                                                       |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | grandom（`.elkr`）随机图生成器移植、证据与运行手册                                                                |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | 布局引擎以及 fixed、box 和 random 提供者（任务 5a）                                                               |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | `.melk` 生成器、待定类型、惰性常量、重新生成                                                                      |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | 度量每个函数的复杂度门禁（`npm run complexity`）                                                                  |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Layered 框架（任务 7a）：LGraph 模型、转换、分阶段的类、运行手册                                                  |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Layered 节点放置（任务 7d）：p4nodes、Brandes-Köpf、五个处理器、几何行、运行手册                                  |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Layered 边布线（任务 7e）：p5edges 正交、折线、样条、六个处理器、布线行、运行手册                                 |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Layered 流水线（任务 7f）：`ElkLayered`、`GraphConfigurator`、组件、四个处理器、完整布局行、runner 子集、运行手册 |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Layered 标签（任务 7f2）：标签与注释处理器、拆层、调试输出、访问者、标签行、扫描、运行手册                        |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Layered 自环、换行、压缩（任务 7g）：loops 包、断点、一维压缩、`ComponentsCompactor`、行、扫描、运行手册          |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Layered 复合图（任务 7h）：`compound` 包、层级驱动器、整树停点、黄金用例、扫描、哈希顺序孪生、运行手册            |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | TS 对基准实现的扫描（第 9 行）：分片运行器、摘要契约、注解、报告、运行手册                                        |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | 可插拔的标签文本度量（第 10 行）：补丁 0003、TS 孪生、固定模式、证据、运行手册                                    |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | 移动 ELK 固定点（第 13 行）：净差异分诊、补丁系列、重建、重新录制、扫描、参考差异分诊、演练模式                   |

## elk-engine 是什么

`@knowvah/elk-engine` 是 Eclipse Layout Kernel（ELK）的忠实 TypeScript 移植。固定提交 `8bca22f4afa3371562d2f702d59929818f7f7b71` 处的 Java 即是规范（AD-1、AD-2）。它是一个库：浏览器安全，零运行时依赖，没有 Java 或 WASM。其公共契约是 ElkGraph 对象模型加上 `ElkGraphUtil` 工厂；ELK JSON 是 I/O 适配器（AD-14）。范围内共有十三个 bundle，手写代码约 134,600 行（见清单）。当前状态：布局引擎（`RecursiveGraphLayoutEngine`、`LayoutAlgorithmResolver`、`GraphValidator`）和三个核心提供者 `fixed`、`box` 和 `random` 已移植，并在精选黄金用例上与基准实现一致（任务 5a，[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)）。`core` 的其余部分也已移植（任务 5b：处理器流水线、`LayoutConfigurator`、`ElkSpacings`、`ElkMath`、样条、注释附着；见 [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)）。共享的 `alg.common` bundle 已全部移植（任务 6a：几何、network simplex、一维压缩、重叠、spore、polyomino；任务 6b：`nodespacing` 和 `NodeMicroLayout`，由 326 行基准实现重放证明；见 [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)）。layered 框架已移植（任务 7a：选项包、LGraph 模型、ElkGraph ↔ LGraph 转换和提供者外壳，由 272 行和 330 行的两个基准实现向量文件证明；布局阶段在 7b–7h 中跟进；见 [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)）。它的前两个阶段已移植（任务 7b：十一个环打破器、九个分层器及其周围的十个处理器，由 651 行基准实现阶段行和一次 32,652 个用例的扫描证明；[alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)）。它的第三个阶段已移植（任务 7c：带计数器的交叉最小化、greedy switch、模型顺序比较器以及 P2 与 P3 之间的八个处理器，由 808 行基准实现顺序行和一次 6,728 个用例的扫描证明；[alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)）。它的第四个阶段已移植（任务 7d：带 Brandes-Köpf 的四个节点放置器以及 P4 停点所需的五个处理器，由 610 行带几何的基准实现放置行和一次 8,410 个用例的扫描证明；[alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)）。它的第五个阶段已移植（任务 7e：正交、折线和样条布线器以及已布线结果所需的六个处理器，由 950 行带边几何的基准实现布线行和一次 6,728 个用例的扫描证明；[alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)）。layered 流水线已运行（任务 7f：驱动器、连通分量包、方向转换器、层级端口布线器和三个处理器，由 1,311 行整体布局与停点的基准实现行、经真实驱动器对先前各行的 2,351 行重新重放、28 个已移植的 JUnit 套件以及一次 6,646 个用例的扫描证明；[alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)）。带标签和注释的布局、拆层以及日志监视器同样已运行（任务 7f2：标签族、注释处理器、`AlternatingLayerUnzipper`、`InteractiveLayeredGraphVisitor` 和调试工具，由 1,305 行停点与整体布局的基准实现行、11 个基线 JUnit 套件以及一次 1,105 个用例的扫描证明，其中 935 个 ok 用例完全一致；[alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)）。自环、图换行和压缩也已运行（任务 7g：loops 包、四个自环处理器、断点和单边包装器、`HorizontalGraphCompactor`、layered 的 `compaction` 包以及 `ComponentsCompactor`，由 1,627 行基准实现行（`full` 731、`models` 307、`scenarios` 525、`sites` 64）、10 个基线 JUnit 套件、一次 3,073 个用例的扫描（其中 2,997 个 ok 用例完全一致，76 个 throw 在两侧都一致）以及留下 58 个已移植分支的九分支接线证明；[alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)）。复合图同样已运行（任务 7h：`compound` 包、`HierarchicalNodeResizingProcessor` 和最后一个分支，由 540 行基准实现行（`full` 355、带整树停点的 `models` 73、`scenarios` 88、`sites` 24）、24 个 layered 黄金用例、九个 issue 套件和三个 graph.json 方法，以及一次 1,169 个用例的扫描（其中 1,164 个 ok 用例完全一致，5 个 throw 在两侧都一致）证明；[alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)）。layered 算法现在运行每一种层级处理模式：59 个枚举分支已移植，没有待定项，分阶段列表为空。只有 issue #58 的三个 `elk.stress` 用例仍在等待（任务 8b）。其他布局算法尚未运行（mrtree、radial、force、disco、rectpacking、spore、topdownpacking、vertiflex）。自任务 8a 起，mrtree、radial 和 vertiflex 也已运行（由四个引用文件中 1,181 行整体布局与停点的基准实现行、一个 2,656 行的单元向量引用、40 个 `trees` 黄金用例、分别为 6/6 和 2/2 的 `MrTreeGraphSizeTest` 与 `CenterOnRootTest`，以及每个算法 906 个用例的扫描证明，扫描中每个用例要么一致要么已被诊断；两个其结果取决于树化哈希桶顺序的 radial 行被归类，而非匹配；[alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)）。自任务 8b 起，force、stress 和 disco 也已运行（由三个引用文件中 21,420 行整体布局与停点的基准实现行、45 个 `force-disco` 黄金用例、均为 3/3 的 `ForceImportTest` 与 `TwoBitGridTest`，以及每个算法的一次扫描证明，扫描中每个用例要么一致要么已被诊断；Eades 的 `Math.log` 是逐位精确的 fdlibm 移植；[alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)）。自任务 8c 起，rectpacking、spore（`sporeOverlap`、`sporeCompaction`）和 topdownpacking 也已运行（由三个引用文件中 2,593 行基准实现行、44 个 `packing` 黄金用例、30 次运行的八个已移植 JUnit 套件，以及每个算法的一次扫描证明，扫描中每个确定性用例要么一致要么已被诊断；[alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)）。范围内的每个算法都已对照基准实现扫描，每个算法的结果发布在一致性报告中（[parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)）。

## 与 ELK Java 及基准实现的关系

![ELK Java、基准实现构建、黄金参考与 elk-engine 之间的关系](/diagrams/overview-1.svg)

本任务中补丁系列为空（AD-3）。黄金用例已提交入库，因此 CI 不需要 JVM（AD-5）。比较方式：结构完全一致，坐标在 1e-6 容差内一致（AD-4）。

## 关键流程

elk-engine 目前为 `fixed`、`box` 和 `random` 所重现的 ELK 布局（详见 [component-map.md](#组件图) 和 [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)）：

![一次布局调用经过递归布局引擎的时序](/diagrams/overview-2.svg)

JSON 适配器（`graph.json`、`ElkGraphJson`）：输入的 ELK JSON 在布局前由导入器转换为 ElkGraph；布局后，计算出的坐标和边段被传回输出的 JSON。基准实现的测试台以相同的两个步骤使用 Java 适配器，因此双方共享 JSON 契约。

文本适配器（`graph.text`、`ElkGraphText`）：`.elkt` 文本通过基于小型 Xtext 子集（`src/xtext`）手写的解析器、链接器和校验器加载为 ElkGraph，ElkGraph 也可序列化回 `.elkt`。入口点是内部的；见 [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)。

文本化 JSON 适配器（`graph.json.text`、`ElkGraphJsonText`）：`.elkj` 文本通过同一个 Xtext 子集和手写解析器加载，并像 Xtext 的 `LazyLinker` 一样延迟链接：边的端点是在读取时才解析的 EMF 代理（`src/emf`）。ElkGraph 通过针对该语法的写出器序列化回 `.elkj`。入口点是内部的；见 [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)。

随机图生成器（`core.debug.grandom`、`GRandomText`）：`.elkr` 文本通过同一 Xtext 子集（`src/xtext`）上手写的词法分析器和解析器解析，`RandomGraphGenerator` 以与 JVM 完全相同的 `Random` 序列将配置转换为 ElkGraph。带种子的输出与基准实现逐字节一致，并重现九个 `test/corpus/generated/*.json` 文件；不带种子的路径（边标签文本、跨层级洗牌、缺失的种子）仅按不变量检查。入口点是内部的；见 [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)。

## 技术栈

| 关注点     | 选择                                                        |
| ---------- | ----------------------------------------------------------- |
| 语言       | TypeScript 7.0.2（原生 `tsc`）、ES2022、NodeNext、`strict`  |
| 测试       | vitest 5.0.x 搭配 `@vitest/coverage-v8`（90% 阈值）         |
| 打包       | esbuild 0.28.x                                              |
| 脚本运行器 | tsx                                                         |
| 运行时     | Node 22 或更高版本；`src/` 本身是浏览器安全的               |
| 仅基准实现 | Maven 3.9+ 和 JDK 21（JDK 17 后备），用于 ELK 的 Tycho 构建 |

## 适应度约束（AD-8）

bundle 的导入方向遵循 `test/architecture/bundle-deps.json`；每个代码文件都带有 SPDX 头部；`src/` 中没有 Node 内置模块或 `process.env`；允许列表之外没有模块级可变 `let`。

## 文档与发布工具链

由路线图第 12 行加入；决策 DP1 至 DP9 见 [`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md)。`1.0.0` 已于 2026-11-23 发布。

| 组成部分 | 内容                                                                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 导出接口 | 已接受（2026-11-23），列于 [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md)，并由 `src/index.test.ts` 保证与 `src/index.ts` 一致；在首次 npm 发布 `1.0.0` 时冻结（AD-14） |
| API 参考 | `npm run docs:api`：在私有包 `tools/typedoc/` 中运行 typedoc，该包自带 TypeScript 6（typedoc 没有 TypeScript 7 版本，AD-6），输出到生成的 `/reference/`                                                                   |
| 示例     | `test/docs/examples/*.ts`，在站点的入门页面中以代码片段展示，并与基准实现引用文件比较（`test/golden/refs/elk-examples/`、`regen-goldens.sh --set examples`）                                                              |
| 链接检查 | `npm run docs:linkcheck`：对构建好的站点运行 linkinator，检查内部链接和片段，在 CI 中运行；外部链接每周检查（`links.yml`）                                                                                                |
| 打包演练 | `npm run pack:smoke`：打包、检查文件列表、离线安装到干净的项目中、导入、在其中布局一个示例，并与其基准实现引用文件比较                                                                                                    |
| 发布     | semantic-release 配置和 `release.yml`，在每次推送到 `main` 时运行；运行手册见 [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                            |

# 组件图

| 图             | 展示内容                                       |
| -------------- | ---------------------------------------------- |
| 1. bundle 依赖 | 范围内的 13 个 bundle 及其 `Require-Bundle` 边 |
| 2. 核心运行时  | 布局算法如何接入引擎                           |

名称省略了 `org.eclipse.elk.` 前缀。范围：[清单](/guide/inventory)。

## 1. 范围内的 bundle 依赖

权威来源：`test/architecture/bundle-deps.json`，由 `tools/bundle-deps.ts` 从每个 bundle 的 `META-INF/MANIFEST.MF` 推导而来，并由适应度测试强制执行（AD-8）。该图有 **32 条边**，等于 JSON 中的 32 个 `requires` 条目（graph.json x 2、core x 1、alg.common x 2、九个算法 x 3）。第三方依赖（Guava、EMF、Gson、Xtend 库）和范围外的 bundle 均已省略。箭头 `A --> B` 表示 A 依赖 B，因此 A 的目录可以导入 B 的目录。`src/java` 在任何地方都可导入，图中未显示。

![范围内 13 个 ELK bundle 之间的依赖](/diagrams/component-map-1.svg)

没有任何算法依赖另一个算法：算法之间唯一共享的依赖是 `alg.common`。算法目录之间新增导入会使适应度测试失败，除非 Java 清单中有相同的边。

## 2. 核心运行时组成部分

类的位置位于 `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core` 之下，另有说明者除外；已在固定提交处验证。

| 类                                | 路径                                | 作用                                                        |
| --------------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                      |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | 遍历层级，在每一层运行提供者                                |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | 每个算法的基类；实现 `IGraphLayoutEngine`                   |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | 算法、选项、类别数据的单例注册表                            |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`；每个算法 bundle 生成一个（来自 `.melk`） |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | 算法 ID 加上提供者的 `getInstancePool()`                    |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | 类型化的选项键，以及 `getProperty` 背后的映射持有者         |
| `ElkNode`（ElkGraph）             | `graph/.../graph/ElkNode.java`      | 图模型；元素是 `EMapPropertyHolder`                         |

由任务 5a 移植（[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)）：`RecursiveGraphLayoutEngine`（与 `RecursiveGraphLayoutEngineTopdown` 拆分，M17）、`LayoutAlgorithmResolver`，以及 `AbstractLayoutProvider` 的子类 `FixedLayoutProvider`、`BoxLayoutProvider` 和 `RandomLayoutProvider`。`LayoutMetaDataService`、`LayoutAlgorithmData` 和属性类型更早完成（任务 2 和 3）。任务 5b（[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)）完成了该 bundle：`AlgorithmAssembler` 和 `LayoutProcessorConfiguration`（每个算法 bundle 使用的流水线）、`LayoutConfigurator`、`ElkSpacings`、`ElkMath` 各部分、`ElkGraphAdapters`、`util/selection/*` 和 `comments/*`。其 JDK shim 是 `src/java/awt/geom`（`Rectangle2D`）和 `src/java/util/regex`（`Pattern`、`WordBoundary`），与 `src/java/lang` 中的 `JavaCharacter` 并列；它们由 `awt.json`、`regex.json`、`character.json` 和 `regex-boundary.json` 证明。任务 6a 和 6b（[alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)）移植了整个 `alg.common`；6b 增加了 `nodespacing` 和 `NodeMicroLayout`，由 326 行 `NodeMicroLayout` 基准实现重放证明。

![ELK 核心运行时的类关系](/diagrams/component-map-2.svg)

算法如何接入：

1. 算法 bundle 提供一个 `AbstractLayoutProvider` 子类（例如 `alg.layered` 的 `LayeredLayoutProvider`）和一个声明其 ID、选项及所支持特性的 `.melk` 文件。
2. `.melk` 编译器生成一个 `ILayoutMetaDataProvider` 和一个选项类。其 `apply(Registry)` 注册一个 `LayoutAlgorithmData`，其实例池负责创建提供者。
3. `LayoutMetaDataService` 收集这些提供者。`LayoutAlgorithmResolver` 根据 `algorithm` 选项为每个节点设置算法 ID。
4. `RecursiveGraphLayoutEngine.executeAlgorithm` 从节点的 `LayoutAlgorithmData.getInstancePool()` 获取一个提供者并调用 `layout(layoutNode, progressMonitor)`，然后释放它（失败后则调用 `dispose()`）。

在 elk-engine 中，`.melk` 步骤由生成器取代（AD-12，[melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)），ElkGraph 则成为普通的 TS 类（AD-11）。到 TS 文件的映射：[移植映射](/guide/port-map)；规则：[翻译规则](/guide/translation-rules)。
