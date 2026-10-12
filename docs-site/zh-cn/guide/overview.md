---
title: 概览
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 概览

`@knowvah/elk-engine` 是 [Eclipse Layout Kernel](https://www.eclipse.org/elk)（ELK，Java 图布局库）的忠实 TypeScript
移植。它没有 Java，也没有 WASM：布局算法以纯 TypeScript 重新实现，并已对照 Java 实现进行验证。

::: warning Pre-alpha
尚未移植任何布局算法。仓库中包含工具链、架构文档、验证脚手架和 Java 运行时 shim。`src/index.ts` 目前没有导出任何公共内容。算法的加入顺序请参阅[路线图](/guide/roadmap)。
:::

## Java 即是规范

固定的 ELK 提交 `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` 处的 Java 源代码是权威规范。移植紧密遵循它：

- 算法不做优化或简化。如果 Java 看起来冗余，这种冗余也予以保留。
- 每个分支都被移植，方法边界予以保留，除非 TypeScript 迫使其改变。
- JUnit 测试与其所测试的代码一并移植。
- ELK 所依赖的 Java 运行时行为（32 位整数运算、`HashMap` 迭代顺序、`Random` 序列）由 shim 重现。请参阅 [Java 基础](/zh-cn/guide/java-foundations)。

[翻译规则](/guide/translation-rules)列出了每个 Java 概念如何映射到 TypeScript。

## 对照基准实现验证

基准实现（oracle）是从源码构建的上游 ELK，位于固定提交处的独立 git worktree 中。移植的输出与基准实现的输出进行比较：

- ID、元素数量、边段拓扑、折点数量以及非数值必须完全一致。
- 数值坐标和尺寸必须在 `1e-6` 的绝对容差内一致。

经过筛选的基准实现输出作为黄金参考提交入库，因此运行测试不需要 JVM。完整流程见[一致性](/zh-cn/conformance)页面。

## 公共契约

公共 API 将是 ElkGraph 对象模型加上 `ElkGraphUtil` 工厂。ELK JSON 是 I/O 适配器，而非核心模型。首次 npm 发布将冻结这一接口面。

## 运行时约束

- `src/` 是浏览器安全的：没有 Node 内置模块，没有 `process.env`，仅使用 ES 模块。
- 没有运行时依赖。

## 后续阅读

- [架构](/zh-cn/guide/architecture)：基准实现、bundle 与布局引擎如何组合。
- [移植映射](/guide/port-map)和[清单](/guide/inventory)：哪些 Java 包映射到哪些模块。
- [参与贡献](/zh-cn/guide/contributing)：检查关卡与工作流。
