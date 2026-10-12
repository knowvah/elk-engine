---
title: 架构
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-engine 架构概览

| 文档                                                | 内容                                           |
| --------------------------------------------------- | ---------------------------------------------- |
| [inventory.md](/guide/inventory)                    | 每个 ELK bundle：用途、LOC、生成的源代码、范围 |
| [port-map.md](/guide/port-map)                      | Java 包到 `src/` 模块的映射                    |
| [component-map.md](#组件图)                         | 范围内的 bundle 依赖；运行时核心组成部分       |
| [../translation-rules.md](/guide/translation-rules) | Java 到 TypeScript 的规则                      |
| [../conformance.md](/zh-cn/conformance)             | 基准实现的比较标准与流程（本任务稍后提供）     |

## elk-engine 是什么

`@knowvah/elk-engine` 是 Eclipse Layout Kernel（ELK）的忠实 TypeScript 移植。固定提交 `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` 处的 Java 即是规范（AD-1、AD-2）。它是一个库：浏览器安全，零运行时依赖，没有 Java 或 WASM。其公共契约是 ElkGraph 对象模型加上 `ElkGraphUtil` 工厂；ELK JSON 是 I/O 适配器（AD-14）。范围内共有十三个 bundle，手写代码约 134,600 行（见清单）。本任务只交付脚手架：尚未移植任何布局算法。

## 与 ELK Java 及基准实现的关系

![ELK Java、基准实现构建、黄金参考与 elk-engine 之间的关系](/diagrams/overview-1.svg)

本任务中补丁系列为空（AD-3）。黄金用例已提交入库，因此 CI 不需要 JVM（AD-5）。比较方式：结构完全一致，坐标在 1e-6 容差内一致（AD-4）。

## 关键流程

elk-engine 所重现的 ELK 布局（详见 [component-map.md](#组件图)）：

![一次布局调用经过递归布局引擎的时序](/diagrams/overview-2.svg)

JSON 适配器（`graph.json`、`ElkGraphJson`）：输入的 ELK JSON 在布局前由导入器转换为 ElkGraph；布局后，计算出的坐标和边段被传回输出的 JSON。基准实现的测试台以相同的两个步骤使用 Java 适配器，因此双方共享 JSON 契约。

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

![ELK 核心运行时的类关系](/diagrams/component-map-2.svg)

算法如何接入：

1. 算法 bundle 提供一个 `AbstractLayoutProvider` 子类（例如 `alg.layered` 的 `LayeredLayoutProvider`）和一个声明其 ID、选项及所支持特性的 `.melk` 文件。
2. `.melk` 编译器生成一个 `ILayoutMetaDataProvider` 和一个选项类。其 `apply(Registry)` 注册一个 `LayoutAlgorithmData`，其实例池负责创建提供者。
3. `LayoutMetaDataService` 收集这些提供者。`LayoutAlgorithmResolver` 根据 `algorithm` 选项为每个节点设置算法 ID。
4. `RecursiveGraphLayoutEngine.executeAlgorithm` 从节点的 `LayoutAlgorithmData.getInstancePool()` 获取一个提供者并调用 `layout(layoutNode, progressMonitor)`，然后释放它（失败后则调用 `dispose()`）。

在 elk-engine 中，`.melk` 步骤由生成器取代（AD-12，未来任务），ElkGraph 则成为普通的 TS 类（AD-11）。到 TS 文件的映射：[移植映射](/guide/port-map)；规则：[翻译规则](/guide/translation-rules)。
