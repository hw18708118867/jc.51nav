---
title: Git 分支：在"平行宇宙"里安心写新功能
description: 搞懂分支为什么是 Git 的灵魂，掌握创建、切换、合并分支的常用命令，理解主分支与功能分支的协作模式。
category: tools
subcategory: git
tags: ['Git', '分支', 'branch']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 3
---

如果说提交是"存档点"，那**分支（branch）** 就是"平行宇宙"。你正在主线上写代码，突然要临时修个紧急 bug，又不想把半成品功能混进去——这时开一条新分支，就像切到另一个平行世界去干活，主线干干净净，互不干扰。

Git 的分支极其轻量，创建一条分支只是新建一个指针，几乎不花时间，所以业界推荐"一个功能一条分支"的工作流。

## 分支到底是什么

你可以把 Git 的提交历史想成一串珠子，用线串起来。一条**分支**其实就是这串珠子上贴的一个"书签"，指向最新的那颗珠子。你在新分支上提交，珠子往后加，书签跟着往前移；主线那边纹丝不动。

初始仓库默认有一条主分支，现在社区惯例叫 `main`（早年是 `master`）。我们之前 `git config --global init.defaultBranch main` 就是设这个默认名。

## 查看与创建分支

```bash
# 看当前有哪些分支，* 号表示你正站在哪条上
git branch

# 新建一条功能分支（但不会自动切过去）
git branch feature-login

# 新建并直接切换过去（最常用）
git checkout -b feature-login
# 新版本 Git 也支持：
git switch -c feature-login
```

`checkout -b` 和 `switch -c` 都是"建完立刻切过去"。`switch` 是后来专门为了切换分支而加的命令，语义更清晰，推荐新项目用 `switch`。

## 切换分支

```bash
# 切到已有的分支
git switch main
git checkout main
```

切换时，Git 会把工作区文件自动变成那条分支最新的样子。所以切换前最好把当前分支的改动先提交，否则未提交的改动可能被带到另一条分支，造成混乱。

## 合并分支：把平行宇宙汇合

功能在 `feature-login` 上写好了，要合回主线：

```bash
# 先回到目标分支（要合到哪，就站在哪）
git switch main

# 把功能分支合并进来
git merge feature-login
```

合并成功后，`main` 就拥有了功能分支的全部提交。如果两条分支改的是不同文件、或同一文件不同位置，Git 会自动合并，无需你插手。

## 删掉用完的分支

功能合并完，那条分支就完成了使命，可以删掉保持整洁：

```bash
# 删除已合并的分支
git branch -d feature-login

# 强制删除（未合并也删，慎用）
git branch -D feature-login
```

## 一个典型的功能开发流程

```bash
git switch main
git pull                # 先同步最新主线
git switch -c feature-x # 开功能分支
# ... 写代码、add、commit ...
git switch main
git merge feature-x     # 合回主线
git branch -d feature-x # 清理
```

这套"主线不动、功能分支上开发、完事合并"的模式，让你可以同时并行开发多个功能，互不踩踏。

## 常见新手坑

- **在 main 上直接开干**：没开功能分支，半成品和紧急修复混在一起，回滚时牵一发而动全身。
- **切换分支前不提交**：未提交的改动跟着你"穿越"到另一条分支，容易误提交。
- **忘了先切回 main 就 merge**：结果把功能合到了另一条功能分支上，主线没更新。
- **分支名乱起**：`test1`、`tmp`、`aaa` 之类，时间一长分不清每条是干嘛的。建议用 `feature-xxx`、`fix-xxx`、`hotfix-xxx` 前缀。

## 小测验

- 问题1：Git 创建一条分支成本高吗？为什么？答案：极低，分支只是指向某次提交的一个指针，不复制文件。
- 问题2：`git merge feature-x` 时，你应当先站在哪个分支？答案：要合并进去的目标分支（比如 main）。
- 问题3：切换分支前最好做什么？答案：先把当前分支的改动提交，避免未提交改动被带到别的分支。

## 更多实战：并行开发两个功能

假设你主线在跑，又要同时做"登录"和"导出"两个功能：

```bash
git switch main
git switch -c feature-login     # 开登录分支去写
# ... 写完后 ...
git switch main
git switch -c feature-export    # 开导出分支，主线状态不受影响
```

两条分支互不可见对方的改动，你在 `feature-export` 上改崩了，也不影响 `feature-login`——这就是分支隔离的价值。两个都写完后分别合并回 main。

## 分支命名与清理习惯

- 用清晰前缀：`feature-` 新功能、`fix-` 修 bug、`hotfix-` 线上紧急修复、`release-` 发版。
- 合并完立刻 `git branch -d` 删掉，别让仓库里堆几十条死分支。
- 远程也删：`git push origin --delete feature-login`，保持远端整洁。

## 自测：你真的懂了吗

- `git switch -c` 和先 `git branch` 再 `git switch` 区别？答案：前者一步建并切，后者分两步。
- 合并完的分支为什么建议删？答案：避免仓库分支越堆越多、历史难读。
- 切换分支前最好做什么？答案：提交当前改动，避免未提交内容被带到别的分支。

## 常见认知误区

分支是 Git 最容易被误用的能力。误区一是"在 main 上直接开干"——觉得功能小、懒得开分支，结果半成品和紧急修复混在一起，想回滚某一项时牵一发动全身。哪怕再小的改动，开条 `feature-xxx` 分支也是好习惯。误区二是"分支名随便起"，`test1`、`tmp`、`aaa` 之类过几天自己都分不清每条是干嘛的，建议用 `feature-`、`fix-`、`hotfix-` 前缀。误区三是"切分支前不提交"——未提交的改动会跟着你穿越到另一条分支，容易误提交或冲突，切换前先 `git status` 确认工作区干净。误区四是"合并完舍不得删分支"——死分支越堆越多，历史图越看越乱，合并且确认上线后立刻 `git branch -d` 清理。

## 这一篇你该记住的

- 分支是 Git 的灵魂，轻量到可以"一个功能一条分支"。
- `git branch` 查看；`git switch -c 名` 新建并切换；`git switch 名` 切换。
- 合并：`git switch main` 后 `git merge 功能分支`。
- 合并完用 `git branch -d 名` 清理已合并分支。
- 标准姿势：main 保持干净，功能在独立分支开发，完事合并回来。

下一篇我们讲 **远程仓库与 GitHub 协作**：怎么把本地仓库推到云端、怎么和别人一起改同一个项目、Pull Request 又是什么。
