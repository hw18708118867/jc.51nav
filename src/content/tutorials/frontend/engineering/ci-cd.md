---
title: CI/CD 与自动化：让"交付"变成流水线
description: 从"手工部署的痛"讲起，理解持续集成与持续交付的概念，用 GitHub Actions 跑自动测试与构建，把"推代码"到"上线"串成一条自动流水线。
category: frontend
subcategory: engineering
tags: ['工程化', 'CI/CD', 'GitHub Actions', '自动化']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 5
---

你写完代码，是不是这样上线的：本地 `build` 一下，打开 FTP/服务器，把 `dist/` 拖上去，覆盖旧文件，祈祷别传错。这种方式在小项目里能凑合，但一旦多人协作、一天发几次版，手工部署就会变成灾难——传漏文件、环境不一致、忘了跑测试、回滚无门。

**CI/CD** 就是把"测试 → 构建 → 部署"变成**自动流水线**：你只管推代码，剩下的机器全包了。这一篇我们讲清概念，并用 GitHub Actions 跑通一个最小自动化。

## 手工部署的痛

- **环境不一致**：你本地 Node 18 能 build，服务器 Node 14 崩了。"在我电脑上是好的"经典重现。
- **忘了跑测试**：急着上线跳过测试，结果把 bug 带生产。
- **人为失误**：传错文件、覆盖错目录、权限没设，半夜被叫起来救火。
- **不可复现**：谁部署的、用的哪个 commit、怎么回滚，全凭记忆和聊天记录。

这些痛，本质都是"靠人"的不可靠。CI/CD 用"靠机器 + 固定脚本"解决。

## CI 与 CD 分别是什么

- **CI（Continuous Integration，持续集成）**：开发者频繁把代码合并到主干，每次合并**自动跑构建和测试**，尽早发现冲突和 bug。核心是"早集成、早发现问题"。
- **CD（Continuous Delivery/Deployment，持续交付/部署）**：在 CI 通过后，**自动把产物部署到测试/预发/生产环境**。Delivery 是"自动准备好，手动点一下上线"；Deployment 是"全自动上线"。

一句话：**CI 保证"合进来的是好的"，CD 保证"好的能自动上线"**。

## 流水线的基本形态

一个典型的 CI/CD 流水线（以推代码到 `main` 分支触发）长这样：

```
开发者 push
   ↓
触发流水线
   ↓
① 安装依赖（pnpm install，用 lockfile 保证一致）
   ↓
② 代码检查（lint）+ 类型检查（tsc）
   ↓
③ 跑测试（单元测试）
   ↓
④ 构建（build 出 dist/）
   ↓
⑤ 部署（把 dist/ 传到服务器/CDN/平台）
```

任一步失败，流水线立刻红，问题在"刚提交的那一刻"就被发现，而不是上线后用户投诉。这就是自动化的价值：**把反馈环从"几天"缩到"几分钟"**。

## GitHub Actions：配置即代码

**GitHub Actions** 是 GitHub 自带的 CI/CD，用仓库里的 `.github/workflows/*.yml` 文件定义流水线（"配置即代码"，随项目走、可版本管理）。

一个最小的前端 CI 工作流：

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]      # 推到 main 触发
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4      # 拉代码
      - uses: pnpm/action-setup@v3     # 装 pnpm
        with: { version: 8 }
      - uses: actions/setup-node@v4    # 装 Node
        with: { node-version: 18, cache: pnpm }
      - run: pnpm install              # 装依赖（用 lockfile）
      - run: pnpm lint                 # 代码检查
      - run: pnpm build                # 构建
```

推一次代码，GitHub 会在云端起一个干净虚拟机，按步骤装依赖、检查、构建。全绿说明"这次提交至少能正常构建"，比本地口头保证可靠得多。

## 加上测试与部署

真实流水线还会跑测试和部署。测试（以 Vitest 为例）：

```yaml
      - run: pnpm test --run           # 跑单元测试，全过才继续
```

部署（以推到静态平台为例，用官方 action）：

```yaml
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist           # 把构建产物发到 gh-pages
```

注意 `secrets`：敏感信息（token、密钥）**绝不写进代码**，存在仓库的 Secrets 里，流水线运行时注入。这是安全底线。

## 为什么自动化部署更可靠

- **环境一致**：每次都在全新虚拟机用同版本 Node、同 lockfile 装依赖，杜绝"环境差异"。
- **不可变产物**：部署的是 `build` 出来的 `dist/`，不是手工拼的文件，可复现、可回滚（重新部署旧 commit 即可）。
- **门禁清晰**：lint/test/build 任一不过，部署不会发生，坏代码进不了生产。
- **审计可追溯**：每次部署对应哪个 commit、谁触发的、什么时候，平台全记着。

## 常见新手坑

- **把密钥写进 workflow 文件**：明文 token 提交进 git 即泄露。用 `secrets`，文件里只引用 `${{ secrets.XXX }}`。
- **CI 能过但本地崩/反之**：本地 Node 版本、依赖和 CI 不一致。统一用 lockfile + 指定 Node 版本。
- **忘了缓存依赖**：每次都重新 `pnpm install` 全量下载，流水线慢。配 `cache` 加速。
- **测试没写就开 CD**：构建过不代表逻辑对，没有测试的 CD 是把 bug 自动送上线。CI 先有测试门禁。
- **生产部署没审批/没回滚预案**：全自动 Deployment 一旦出错影响全部用户。重要系统保留手动确认或灰度。
- **workflow 文件缩进错**：YAML 对缩进敏感，格式错整个流水线不跑。提交前用在线 YAML 校验。

## 实战：一个"推 main 即部署"的最小流水线

综合上面，一个前端站点的完整 `.github/workflows/deploy.yml`：

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 8 }
      - uses: actions/setup-node@v4
        with: { node-version: 18, cache: pnpm }
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test --run
      - run: pnpm build
      - name: Deploy to Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

从此你改完文章/代码，`git push` 之后去喝杯水，回来站点已经自动更新好了——而且你知道"它经过了 lint、test、build 三道门禁才上线"。这就是工程化给个人的"解放"。

## 新手怎么把 CI/CD 用起来

CI/CD 听起来"是大厂才用的高级东西"，其实个人项目用 GitHub Actions 完全免费（有额度），且收益立竿见影：再也不用记"部署要哪几步"、再也不怕传错。建议从"只做 CI（lint+build）"起步，跑通后再加测试和部署。重点是**让流水线成为"单一事实来源"**——上线只走流水线，不手工传文件，规矩立住了，事故就少了。

另一个心法：**流水线也是代码，要 review**。workflow 文件写错了，要么不跑要么乱部署。改它和改业务代码一样要认真，且先在分支试跑（用 pull_request 触发）再合到主干。

还有，理解"门禁"思维。CI/CD 不是"自动跑一遍"，而是"设一道道关卡，过不了就停"。lint 卡风格、test 卡逻辑、build 卡可编译、部署卡环境——每一道都在替你挡住一类风险。关卡越清晰，半夜被叫醒的次数越少。这正是工程化"用流程换安稳"的精髓。

## 小测验：看看你掌握了没

- 问题一：CI 和 CD 的区别？答案：CI 是"频繁合码自动跑测试/构建，早发现问题"；CD 是"CI 通过后自动把产物部署上线"。
- 问题二：密钥为什么不能写进 workflow 文件？答案：会随代码进 git 泄露；应存仓库 Secrets，运行时用 `${{ secrets.XXX }}` 注入。
- 问题三：没有测试的 CD 有什么风险？答案：构建过≠逻辑对，等于把未验证的 bug 自动送上线，且全量影响用户。

## 这一篇你该记住的

- 手工部署痛在环境不一致、易失误、不可复现；CI/CD 用固定脚本+机器替代人。
- CI 保证"合进来的是好的"（早集成早发现问题）；CD 保证"好的能自动上线"。
- 流水线：安装 → lint → 测试 → build → 部署，任一步失败即停。
- GitHub Actions 用 `.github/workflows/*.yml` 定义（配置即代码）。
- 密钥存 Secrets，绝不进代码；依赖用 lockfile + 指定 Node 版本保一致。
- 门禁思维：lint/test/build/部署层层卡关，流程换安稳。

到这里，前端工程化从"包管理""构建工具""TypeScript""代码规范"到"CI/CD"五篇走完。你已具备从"写单个页面"到"团队协作、自动交付"的完整能力——这也是现代前端工程师和"只会写 demo"的本质分水岭。
