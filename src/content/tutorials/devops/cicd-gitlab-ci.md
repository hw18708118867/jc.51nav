---
title: GitLab CI 实战：用 .gitlab-ci.yml 串起构建与部署
description: 理解 GitLab CI 的 pipeline、stage、job 模型，写一个能自动构建、测试并部署的 .gitlab-ci.yml，并对比它和 GitHub Actions 的差异。
category: devops
subcategory: cicd
tags: ['GitLab CI', 'CI/CD', '流水线', 'DevOps']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 3
---

上篇我们用 GitHub Actions 跑通了"推代码自动测试"。这一篇换一个企业里非常常见的平台：**GitLab CI**。很多公司用 GitLab 做代码托管（尤其内网私有部署），它的 CI 能力和 GitHub Actions 思路相通，但配置方式和运行机制有自己的特点。

读完这篇，你能写出一个 `.gitlab-ci.yml`，让 GitLab 在每次 push 时自动跑"构建 → 测试 → 部署"三段流水线，并看懂 stage 和 job 的关系。

## GitLab CI 的核心模型

GitLab CI 的概念比 GitHub Actions 更"显式"地强调**阶段**：

- **Pipeline（流水线）**：一次 push 或 merge 触发的一整条流水线，由若干 **Stage** 组成。
- **Stage（阶段）**：流水线的纵向分层，比如 `build`、`test`、`deploy`。**同一个 Stage 里的多个 Job 并行跑，所有 Job 成功才进入下一个 Stage**；任一 Job 失败，后续 Stage 全部不跑。
- **Job（任务）**：某个 Stage 里的一个具体工作，比如"跑单元测试"。
- **Runner（执行器）**：真正干活的机器。GitLab 的 Runner 是独立程序，可以装在你的服务器上（私有 Runner），也可以用 GitLab 提供的共享 Runner。

对比 GitHub Actions：GitHub 用 `jobs` 下嵌套 `steps`，GitLab 用 `stages` 统领多个并列的 `job`。两者都把"测试挂了就不部署"作为默认行为。

## 第一个 .gitlab-ci.yml

假设项目是 Node.js，我们要三段流水线：先构建、再测试、最后部署到测试环境。在仓库根目录新建 `.gitlab-ci.yml`：

```yaml
stages:
  - build
  - test
  - deploy

build-job:
  stage: build
  script:
    - npm install
    - npm run build
  artifacts:
    paths:
      - dist/

test-job:
  stage: test
  script:
    - npm test

deploy-job:
  stage: deploy
  script:
    - echo "部署到测试环境"
    - ./deploy.sh
  only:
    - main
```

逐段解释：

- `stages:` 先声明整条流水线有几个阶段，按顺序 `build → test → deploy`。
- `build-job:` 是一个 job 名，它属于 `stage: build`。`script` 里是要执行的命令：`npm install` 装依赖、`npm run build` 构建。
- `artifacts:` 是"构建产物"。`dist/` 是构建出来的目录，声明为 artifacts 后，后续 Stage 的 job 能自动拿到它。这解决了"build 生成的文件，test/deploy 怎么用"的问题——GitHub Actions 里靠缓存或上传，GitLab 靠 artifacts 传递。
- `test-job:` 属于 `test` 阶段，跑 `npm test`。
- `deploy-job:` 属于 `deploy` 阶段，执行部署脚本。`only: [main]` 表示**只有 push 到 main 分支才跑部署**，避免在特性分支上误部署。

提交并 push，去 GitLab 仓库的 **CI/CD → Pipelines** 页面，就能看到三个阶段依次跑，绿色表示通过，红色表示失败，点进去看日志。

## artifacts 和 cache 的区别

这是 GitLab CI 新手最易混的一对：

- **artifacts（产物）**： job 之间**传递文件**用，比如 build 生成的 `dist/`，给 deploy 用。有有效期，默认保留一阵供下载。
- **cache（缓存）**：**加速**用，比如缓存 `node_modules`，避免每次重新下载。它不保证一定命中，目的是快。

记忆法：artifacts 是"交给下游的包裹"，cache 是"自己留着下次省事"。

## 用变量管理环境差异

不同环境（测试/生产）的配置不同，别写死。GitLab 支持在 **Settings → CI/CD → Variables** 里配置变量，YAML 里直接引用：

```yaml
deploy-job:
  stage: deploy
  script:
    - echo "部署到 $DEPLOY_HOST"
  only:
    - main
```

`$DEPLOY_HOST` 来自仓库变量配置，敏感信息不进代码库。这和 GitHub Actions 的 Secrets 异曲同工。

## 常见坑位提醒

- **stages 顺序和 job 的 stage 对不上**：job 写了 `stage: deploy`，但顶层 `stages` 里没声明 `deploy`，流水线会报错。先列 stages，再让 job 归属其中。
- **忘了 only/except 导致分支乱跑**：不限制分支，任何 push 都会触发部署，极其危险。用 `only` 约束到 `main` 或特定分支/标签。
- **artifacts 路径写错**：路径相对项目根目录，写错下游 job 拿不到文件。用 `paths: [dist/]` 这种目录形式更稳。
- **Runner 没注册或离线**：私有 Runner 如果没启动，job 会一直"等待中（pending）"。检查 Runner 状态和标签（tags）是否匹配。
- **把密钥明文写进 YAML**：同 GitHub，敏感信息走 CI/CD Variables，绝不提交明文。

## 实战：给流水线加一个"手动确认"部署

生产部署往往不想全自动，可以加 `when: manual` 让人点一下再部署：

```yaml
deploy-prod:
  stage: deploy
  script:
    - ./deploy-prod.sh
  when: manual
  only:
    - main
```

这样流水线跑到 `deploy-prod` 会停住，等你在页面上点"播放"按钮才执行。这正好对应上篇说的"持续交付（人工确认）"。

## GitHub Actions vs GitLab CI 一句话对比

- 配置位置：GitHub 在 `.github/workflows/`，GitLab 在根目录 `.gitlab-ci.yml`。
- 阶段模型：GitHub 用 `jobs`+`needs` 表达依赖，GitLab 用显式 `stages` 顺序。
- Runner：GitHub 托管为主，GitLab 可私有部署 Runner，更适合内网。
- 核心思想完全一致：**自动化、快速失败、测试不过不部署**。

## 小测验：看看你掌握了没

- 问题一：GitLab 里同一 Stage 的多个 job 是并行还是串行？答案：并行；所有 job 成功才进下一 Stage。
- 问题二：artifacts 和 cache 分别解决什么？答案：artifacts 在 job 间传递文件，cache 加速重复构建。
- 问题三：为什么部署 job 要加 `only: [main]`？答案：避免特性分支 push 就触发部署，防止误上线。

## 这一篇你该记住的

- GitLab CI 模型：**Pipeline → Stage（顺序）→ Job（并行）→ Runner**。
- `.gitlab-ci.yml` 先声明 `stages`，再让每个 job 用 `stage:` 归属其中。
- `artifacts` 跨 job 传文件，`cache` 加速；两者用途不同别混。
- 用 `only`/`except` 约束触发分支，部署务必限定到 `main`；生产可用 `when: manual` 人工确认。
- 变量/密钥走 CI/CD Variables，不写进代码；私有 Runner 离线会导致 job 卡 pending。

学完 CI/CD 三篇，你已经能让代码自动测试、自动部署。但上线只是开始——服务跑起来后**到底健不健康、用户有没有被卡住**，靠的是监控。下个系列我们就聊可观测性的三支柱。
