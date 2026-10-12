---
title: 参与贡献
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 参与贡献

请先阅读[概览](/zh-cn/guide/overview)和[翻译规则](/guide/translation-rules)。固定提交处的 Java 即是规范；如有疑问，请阅读 Java 代码。

## 检查关卡

每次提交前请运行下列命令，每一项都必须通过。

| 命令                   | 检查内容                                        |
| ---------------------- | ----------------------------------------------- |
| `npm run format:check` | Prettier 格式                                   |
| `npm run typecheck`    | TypeScript 类型检查（原生 `tsc --noEmit`）      |
| `npm test`             | vitest 测试套件，包括黄金用例套件               |
| `npm run coverage`     | 行、分支、函数和语句覆盖率均达到 90% 的测试套件 |

需要 Node 22 或更高版本。使用 `npm ci` 安装依赖。

## 测试不可变

预期值在实现编写之前就来自基准实现、JVM 向量或 Java 源代码（AD-13）。断言一旦写成即被冻结：测试失败意味着实现有误。

如果一个测试只有修改其断言、某个向量或某个黄金用例才能通过，请停下来，并将该情形记录在任务的决策日志中。不要为了变绿而放宽容差、删除用例或重新生成参考。黄金参考通过脚本重新生成，绝不手工修改。

## 工作流

1. 创建功能分支，例如 `feature/<short-description>`。
2. 按 [Conventional Commits](https://www.conventionalcommits.org) 编写提交信息，例如 `feat(java): add JavaHashMap`。主题行使用小写，且不超过 72 个字符。
3. 向 `main` 发起拉取请求。CI 会将拉取请求标题作为 Conventional Commit 进行检查。
4. 提交必须签名；仓库规则集要求如此。
5. 拉取请求以合并提交（merge commit）方式合并。

每个代码文件都带有 SPDX 头部 `// SPDX-License-Identifier: EPL-2.0`，由适应度测试强制执行。依赖必须与 EPL-2.0 兼容。

## 文档命令

| 命令                   | 用途                                   |
| ---------------------- | -------------------------------------- |
| `npm run docs:dev`     | 启动带实时重载的文档站点               |
| `npm run docs:build`   | 构建站点；存在失效的内部链接时构建失败 |
| `npm run docs:preview` | 在本地提供已构建的站点                 |

大多数参考页面会包含 `docs/` 中的文件。请编辑 `docs/` 中的文件，而不是 `docs-site/` 下的页面。被包含文件中的 PlantUML 图会渲染为 SVG，并提交到 `docs-site/public/diagrams/`。

## 外部目录

脚本和测试通过环境变量定位相邻的检出目录。默认值相对于仓库根目录。只有 `tools/` 和 `test/` 读取这些变量；`src/` 中的代码从不读取。

| 变量             | 默认值                         | 内容                                  |
| ---------------- | ------------------------------ | ------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | 固定提交处的 Eclipse ELK Java 源代码  |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | 独立 worktree 与已构建的基准实现      |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | elk-models 语料库，固定于语料库清单中 |

构建基准实现需要 Maven 3.9 或更高版本以及 JDK 21（JDK 17 作为后备）。基准实现的流程请参阅[一致性](/zh-cn/conformance)。
