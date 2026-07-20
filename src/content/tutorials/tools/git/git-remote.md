---
title: Git 远程仓库与 GitHub 协作：把代码搬上云端
description: 搞懂本地仓库和远程仓库的关系，掌握 clone/push/pull 三件套，理解 Fork 与 Pull Request 的协作流程。
category: tools
subcategory: git
tags: ['Git', 'GitHub', '远程仓库']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 4
---

前面几篇我们都在自己电脑上玩 Git，仓库躺在本地。但 Git 真正的威力在**协作**——把仓库放到云端（远程仓库），你和同事就能围着同一份代码干活。GitHub、GitLab、Gitee 都是常见的远程托管平台，本篇以 GitHub 为例。

把远程仓库想成"云盘里的共享文件夹"：你本地改完，上传（`push`）同步过去；别人改了，你下载（`pull`）拿回来。区别是它是按 Git 的提交历史来同步的，不是简单覆盖文件。

## 本地仓库与远程仓库的关系

- **本地仓库**：你电脑上 `.git` 那份，包含所有历史，你平时 `commit` 都进这里。
- **远程仓库**：托管在 GitHub 上的那份，是大家共享的中枢。
- 两者之间靠 `push`（本地→远程）和 `pull`/`fetch`（远程→本地）同步。

一个本地仓库可以关联多个远程（用 `git remote add 名字 地址`），但通常一个 `origin` 就够了。

## 从零开始：把本地仓库推上去

你本地已经 `git init` 并提交了几次，现在要推到 GitHub：

```bash
# 1. 在 GitHub 上新建一个空仓库，拿到地址（形如 https://github.com/你/项目.git）
# 2. 本地关联远程，惯例名叫 origin
git remote add origin https://github.com/你/项目.git

# 3. 第一次推送，并把本地 main 和远程 main 关联起来
git push -u origin main
```

`-u`（等价于 `--set-upstream`）只需第一次加，它记住"本地 main 对应远程 main"。之后直接 `git push` 就行，不用每次写全。

## 从云端开始：克隆别人的仓库

更常见的起点是仓库已经在 GitHub 上了，你直接克隆到本地：

```bash
git clone https://github.com/某人/项目.git
cd 项目
```

`clone` 会把整个仓库（含全部历史）下载下来，并自动建好 `origin` 远程关联。进去就能直接 `branch`、`commit`。

## 日常同步：push 与 pull

```bash
# 你改完了，推到远程
git push

# 别人推了新东西，你拉下来
git pull
```

`git pull` 实际是两步合一：`git fetch`（把远程新提交下载到本地但不合并）+ `git merge`（合并进当前分支）。如果担心自动合并出意外，可以先 `git fetch` 看看，再手动 `merge`。

## 协作经典流程：Fork + Pull Request

参与开源或跨团队贡献时，你通常**没有直接推送权限**，流程是：

1. 在 GitHub 上 **Fork** 对方仓库——相当于复制一份到你自己账号下。
2. `git clone` 你 Fork 出来的那份，改完 `push` 到你自己的远程。
3. 在 GitHub 上发起 **Pull Request（PR）**：请求对方把你这份的改动合并进他的仓库。
4. 对方 review（审阅）通过后，点合并，你的代码就进了主仓库。

PR 是协作的核心：它不只是"传代码"，更是一次**代码评审**。队友能在 PR 里逐行评论、提修改意见，质量就在这来回中提上来了。

## 常见新手坑

- **`push` 被拒**：通常因为远程有你本地没有的新提交（别人先推了）。先 `git pull` 合并再 `push`。
- **忘了 `-u` 第一次推送**：后续 `git push` 不知道推到哪条远程分支，报错。
- **直接往别人的仓库 `push`**：没权限会失败；正确做法是用 Fork + PR。
- **`pull` 前本地有未提交改动**：可能合并冲突，先 `commit` 或 `stash` 再拉。

## 小测验

- 问题1：`git clone` 和 `git pull` 的区别？答案：clone 是首次把整个远程仓库下载到本地并建好关联；pull 是在已有仓库里拉取并合并最新改动。
- 问题2：第一次 `git push -u origin main` 里的 `-u` 有什么用？答案：建立本地分支与远程分支的跟踪关系，之后 `git push` 不用再写全。
- 问题3：没有推送权限时怎么给别人的项目贡献代码？答案：Fork 到自己的账号，改完推过去，再发 Pull Request。

## 更多实战：和同事协作一个仓库

假设你们三个人共做一个项目，典型一天是这样：

```bash
git switch main
git pull                 # 早上先拉最新，避免基于旧代码开发
git switch -c feature-x  # 开自己的分支
# ... 写代码、提交 ...
git switch main
git pull                 # 合之前再拉一次，拿到别人新提交
git merge feature-x      # 合回主线
git push                # 推上去，队友就能拉到了
```

关键是**每次合并前先 `pull`**，把别人的新提交先合进来，再推自己的，能大幅减少冲突。

## SSH 还是 HTTPS

连接远程有两种方式：

- **HTTPS**：第一次 push 要输用户名密码（或 token），简单但每次可能要认证。
- **SSH**：本地生成密钥对，把公钥加到 GitHub，之后免密推送，更安全方便。

新手先用 HTTPS 跑通流程，熟悉后再配 SSH 免密。GitHub 现在已不支持密码推送，需用 **Personal Access Token** 当密码。

## 自测：你真的懂了吗

- 为什么合并前要先 `pull`？答案：先拿到别人新提交，减少冲突概率。
- 没有推送权限怎么贡献代码？答案：Fork 到自己账号，改完发 Pull Request。
- GitHub 现在还能用账号密码 push 吗？答案：不能，需用 Personal Access Token（或 SSH 密钥）。

## 常见认知误区

远程协作的坑大多出在"同步时机"上。误区一是"推送前不先拉"——你本地改完直接 `git push`，若别人先推了新提交，服务器会拒绝，因为两边历史对不上；正确做法是用前先 `git pull`，把别人的新提交先合进来再推。误区二是"直接往别人仓库 push"——没有权限会失败，正确姿势是 Fork 到自己账号再发 Pull Request。误区三是"用账号密码推送"——GitHub 早已不支持密码推送，得用 Personal Access Token 或 SSH 密钥。误区四是"克隆下来不会关联"——`git clone` 会自动建好 `origin` 远程，之后直接 `git push`/`git pull` 即可，不用再手动 `remote add`。还有人分不清 `git pull` 和 `git fetch`：`pull` 是"下载并自动合并"，`fetch` 只是"下载不合并"，想先看清楚再手动合并就用 `fetch`。

## 这一篇你该记住的

- 远程仓库是云端共享中枢，靠 `push`/`pull` 与本地同步。
- 本地推远程：`git remote add origin 地址` + `git push -u origin main`（首次）。
- 从云端起步：`git clone 地址`。
- 日常：`git push` 上传，`git pull` 拉取合并。
- 没权限时用 Fork + Pull Request 协作，PR 本质是代码评审。

下一篇我们讲 **合并与变基、冲突解决**：当两条分支改了同一处，Git 怎么办，以及 merge 和 rebase 该怎么选。
