---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
hero:
  name: '@knowvah/elk-engine'
  text: 纯 TypeScript 实现的 Eclipse ELK
  tagline:
    Eclipse Layout Kernel 的忠实 TypeScript 移植。没有 Java，没有 WASM——布局算法以纯 TypeScript 重新实现，并已对照 Java
    实现进行验证。
  actions:
    - theme: brand
      text: 概览
      link: /zh-cn/guide/overview
    - theme: alt
      text: 示例集
      link: /zh-cn/showcase/
    - theme: alt
      text: 在 GitHub 上查看
      link: https://github.com/knowvah/elk-engine
features:
  - title: 忠实于 ELK Java
    details: 固定的 ELK 提交处的 Java 代码即是规范。每个分支都被移植，JUnit 测试与其所测试的代码一并移植。
  - title: 对照基准实现验证
    details: 输出与从源码构建的 ELK 进行比较。结构完全一致；坐标在 1e-6 的容差内一致。
  - title: 原生支持浏览器，零运行时依赖
    details: 库代码中没有 Java，没有 WASM，也没有 Node 内置模块。打包即可发布。
  - title: Pre-alpha
    details: 工具链、架构、Java 运行时 shim 和验证脚手架均已就绪。尚未移植任何布局算法。
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-alpha
尚未移植任何布局算法，`src/index.ts` 也没有导出任何公共内容。首次 npm 发布将冻结公共 API。后续计划请参阅[路线图](/guide/roadmap)。
:::

## 选择您的路径

| 我想要…                        | 从这里开始                                             |
| ------------------------------ | ------------------------------------------------------ |
| 了解本项目是什么、不是什么     | [概览](/zh-cn/guide/overview)                          |
| 了解各部分如何组合             | [架构](/zh-cn/guide/architecture)                      |
| 了解“与 Java 一致”意味着什么   | [一致性](/zh-cn/conformance)                           |
| 查找某个 Java 包在移植中的位置 | [移植映射](/guide/port-map) · [清单](/guide/inventory) |
| 学习 Java 到 TypeScript 的规则 | [翻译规则](/guide/translation-rules)                   |
| 了解已覆盖哪些 Java 运行时行为 | [Java 基础](/zh-cn/guide/java-foundations)             |
| 了解后续计划                   | [路线图](/guide/roadmap)                               |
| 参与贡献                       | [参与贡献](/zh-cn/guide/contributing)                  |
