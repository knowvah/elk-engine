---
title: 概览
sourceHash: a7927ee742347e04a529a2939dfbcb685d8b1e32ba94b375d45da70747fd90f2
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 概览

`@knowvah/elk-engine` 是 [Eclipse Layout Kernel](https://www.eclipse.org/elk)（ELK，Java 图布局库）的忠实 TypeScript
移植。它没有 Java，也没有 WASM：布局算法以纯 TypeScript 重新实现，并已对照 Java 实现进行验证。

::: tip 1.0 版本
`@knowvah/elk-engine@1.0.0` 已发布到 npm。范围内的所有 ELK 布局算法均已移植，并已对照从源码构建的 ELK 进行验证；结果见[一致性报告](/parity)，仍未解决的差异以 issue 跟踪。公共 API 共 72 个导出，自 1.0.0 起冻结，版本号遵循 semver。请从[快速开始](/guide/getting-started)入手；后续计划请参阅[路线图](/guide/roadmap)。
:::

## Java 即是规范

固定的 ELK 提交 `8bca22f4afa3371562d2f702d59929818f7f7b71` 处的 Java 源代码是权威规范。移植紧密遵循它：

- 算法不做优化或简化。如果 Java 看起来冗余，这种冗余也予以保留。
- 每个分支都被移植，方法边界予以保留，除非 TypeScript 迫使其改变。
- JUnit 测试与其所测试的代码一并移植。
- ELK 所依赖的 Java 运行时行为（32 位整数运算、`HashMap` 迭代顺序、`Random` 序列）由 shim 重现。请参阅 [Java 基础](/zh-cn/guide/java-foundations)。

[翻译规则](/guide/translation-rules)列出了每个 Java 概念如何映射到 TypeScript。

## 对照基准实现验证

基准实现（oracle）是从源码构建的上游 ELK，位于固定提交处的独立 git worktree 中。移植的输出与基准实现的输出进行比较：

- ID、元素数量、边段拓扑、折点数量以及非数值必须完全一致。
- 数值坐标和尺寸必须在 `1e-6` 的绝对容差内一致。

经过筛选的基准实现输出作为黄金参考提交入库，因此运行测试不需要 JVM。完整流程见[一致性](/conformance)页面。

## 公共契约

公共 API 是 [#90](https://github.com/knowvah/elk-engine/issues/90) 中获批的导出接口面，共 72 个导出：ElkGraph 对象模型和 `ElkGraphUtil` 工厂、布局引擎、每个算法的元数据提供者及其选项类、核心选项值的类型、ELK JSON 适配器，以及异步的 `layout` 函数。ELK JSON 是 I/O 适配器，而非核心模型。[快速开始](/guide/getting-started)展示了该接口面的用法。该接口面自 1.0.0 起冻结，版本号遵循 semver：移除一个导出即为主版本变更。

## 运行时约束

- `src/` 是浏览器安全的：没有 Node 内置模块，没有 `process.env`，仅使用 ES 模块。
- 没有运行时依赖。

## 后续阅读

- [架构](/zh-cn/guide/architecture)：基准实现、bundle 与布局引擎如何组合。
- [移植映射](/guide/port-map)和[清单](/guide/inventory)：哪些 Java 包映射到哪些模块。
- [参与贡献](/zh-cn/guide/contributing)：检查关卡与工作流。
