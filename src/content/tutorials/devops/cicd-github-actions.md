---
title: GitHub Actions 实战：推一次代码，自动跑测试
description: 从零写一个 GitHub Actions 工作流，让每次 push 都自动安装依赖、跑测试，并理解 workflow、job、step、runner 这些核心概念。
category: devops
subcategory: cicd
tags: ['GitHub Actions', 'CI/CD', '自动化测试', 'YAML']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 2
---

上篇我们建立了 CI/CD 的认知。这一篇直接动手：用 **GitHub Actions** 给你的仓库配一条"推代码就自动跑测试"的流水线。GitHub Actions 是 GitHub 官方提供的 CI/CD 服务，最大优点是**零额外搭建**——只要你的代码在 GitHub 上，写个配置文件就能用，不用自己买服务器。

读完这篇，你能亲手做到：往 `main` 分支推代码后，GitHub 自动帮你拉代码、装依赖、跑测试，并在测试挂掉时给你亮红灯。

## 核心概念先理清

GitHub Actions 里有几个绕不开的词，先用"工厂流水线"打比方：

- **Workflow（工作流）**：一整条流水线，对应一个 `.yml` 配置文件。一个仓库可以有多个 workflow（比如一个管测试，一个管部署）。
- **Job（任务）**：流水线上的一道大工序，比如"跑测试"是一个 job，"部署"是另一个 job。默认多个 job 并行跑。
- **Step（步骤）**：job 里的一个个小动作，比如"执行 `npm install`"是一个 step。
- **Runner（执行机）**：真正跑代码的那台虚拟机，由 GitHub 提供（Linux/Windows/macOS 任选）。
- **Trigger（触发器）**：什么时候启动 workflow，比如 `push` 到 `main` 时、或提 `pull_request` 时。

一句话：**Workflow 由多个 Job 组成，Job 由多个 Step 组成，Step 在 Runner 上执行，由 Trigger 触发。**

## 第一个工作流：自动跑测试

假设我们有一个 Node.js 项目，根目录有 `package.json`，测试命令是 `npm test`。我们要让每次 push 都自动跑测试。

在项目根目录新建文件 `.github/workflows/ci.yml`，内容如下：

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: 拉取代码
        uses: actions/checkout@v4

      - name: 安装 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: 安装依赖
        run: npm install

      - name: 运行测试
        run: npm test
```

我们逐行拆开：

- `name: CI`：工作流在 GitHub 页面上显示的名字。
- `on:` 下面是触发器。`push` 到 `main`、或向 `main` 提 `pull_request` 时触发。
- `jobs:` 下面定义任务，这里只有一个叫 `test` 的 job。
- `runs-on: ubuntu-latest`：用 GitHub 提供的最新 Ubuntu 虚拟机来跑。
- `steps:` 是具体步骤：
  - 第一步 `actions/checkout@v4` 是官方动作，作用是"把仓库代码拉到 Runner 上"——不写这步，Runner 上根本没有你的代码。
  - 第二步 `actions/setup-node@v4` 是装 Node.js 环境，`with` 里指定版本 20。
  - 第三步 `run: npm install` 是直接在 Runner 上执行 shell 命令。
  - 第四步 `run: npm test` 跑测试，测试挂了这步就失败，整个 job 变红。

把这份文件提交并 push 到 `main`，去 GitHub 仓库点 **Actions** 标签页，就能看到流水线在跑了。测试通过显示绿色对勾，失败显示红色叉号，点进去还能看每一步的日志。

## `uses` 和 `run` 的区别

新手常混这两个：

- `uses:` 是"调用一个别人写好的动作（Action）"，比如 `actions/checkout` 是 GitHub 官方动作，负责拉代码。动作可以是别人发布的，也可以是自己写的。
- `run:` 是"在 Runner 上直接执行一段命令行"，比如 `npm install`。

经验法则：拉代码、装语言环境这种通用动作，用官方 `uses`；你自己的业务命令（跑测试、打包）用 `run`。

## 让流水线更快：缓存依赖

每次都 `npm install` 从头下依赖很慢。GitHub Actions 提供缓存机制，把 `node_modules` 缓存起来，下次复用：

```yaml
      - name: 缓存依赖
        uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
```

`key` 里用 `package-lock.json` 的内容哈希做标识：锁文件没变，就命中缓存，省下下载时间；锁文件变了，自动失效重新装。这是 CI 提速的关键技巧。

## 常见坑位提醒

- **忘了 checkout**：不写 `actions/checkout`，Runner 上根本没有你的代码，`npm install` 会找不到 `package.json`。这是新手第一坑。
- **测试命令在本地能跑，CI 挂了**：常见原因是本地 Node 版本和 `setup-node` 指定的版本不一致，或本地有全局包而 CI 是干净环境。保持本地和 CI 版本一致。
- **把密钥写进 YAML**：数据库密码、API Key 绝不能明文写在配置文件里。要用 GitHub 仓库的 **Settings → Secrets** 存起来，配置里用 `${{ secrets.MY_TOKEN }}` 引用。
- **触发分支写错**：`on.push.branches` 写成不存在的分支，导致推了代码流水线不触发。先确认你推的是哪个分支。
- **一个 step 失败但流水线显示成功**：检查是不是用了 `run: command || true` 之类强行忽略错误，这会掩盖失败。

## 实战：加一个"代码风格检查"步骤

在 `test` job 里再加一步 lint，让流水线同时守两道门：

```yaml
      - name: 代码风格检查
        run: npm run lint
```

只要 lint 不过或测试不过，流水线就红，逼你在合并前修好。这就是"把质量门禁前移"的思想。

## 小测验：看看你掌握了没

- 问题一：`uses` 和 `run` 有什么区别？答案：`uses` 调用现成动作（如 checkout），`run` 直接在 Runner 执行命令行。
- 问题二：为什么必须写 `actions/checkout`？答案：它把仓库代码拉到 Runner，否则后续步骤拿不到你的代码。
- 问题三：密钥应该怎么在 workflow 里使用？答案：存到仓库 Secrets，用 `${{ secrets.名称 }}` 引用，绝不明文写。

## 这一篇你该记住的

- GitHub Actions 零搭建，写 `.github/workflows/*.yml` 即可启用。
- 概念层级：**Workflow（文件）→ Job（任务）→ Step（步骤）→ Runner（执行机）**，由 `on` 触发。
- 最小可用流程：`checkout` 拉代码 → `setup-node` 装环境 → `npm install` → `npm test`。
- `uses` 调动作，`run` 跑命令；依赖用 `actions/cache` 缓存提速。
- 密钥走 Secrets，别写死；忘了 checkout 是最常见的红灯原因。

下一篇我们看另一个主流平台 **GitLab CI**，它的配置思路和 GitHub Actions 很像，但语法和运行机制有差异，学会它能覆盖更多企业内网场景。
