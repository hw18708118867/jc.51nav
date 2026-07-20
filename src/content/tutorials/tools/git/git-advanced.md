---
title: Git 进阶救命命令：stash、cherry-pick 与回退
description: 掌握 stash 临时暂存、cherry-pick 摘取单个提交、reset/checkout 回退改动等进阶命令，应对日常翻车场景。
category: tools
subcategory: git
tags: ['Git', 'stash', 'cherry-pick', '回退']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 6
---

前面几篇是 Git 的日常动作，这一篇是"应急工具箱"。当你切分支却发现手头改动没提交、想把别人一条提交挪到自己这、或者改崩了想回到昨天的干净状态——下面这些命令能救命。

把它们想成工具箱里的不同扳手：平时用不上，真遇到对应故障时，没有它们你就只能重来。

## stash：把半成品"塞进抽屉"

场景：你正在 `feature-a` 上改到一半，突然要切去 `main` 修个紧急 bug。但改动没写完，提交又舍不得（会留下半成品提交）。这时：

```bash
# 把当前未提交的改动暂存起来（工作区恢复干净）
git stash

# 去修 bug、提交完，切回 feature-a，再把改动取出来
git switch feature-a
git stash pop
```

`stash` 像把半成品塞进抽屉，抽屉里的东西不影响分支切换。`pop` 取出来并删掉抽屉记录；`git stash apply` 取出来但保留抽屉记录（想留备份时用）。

```bash
# 看抽屉里塞了几份
git stash list

# 给 stash 起个名，方便辨认
git stash push -m "登录页半成品"
```

## cherry-pick：从别的分支"摘"一条提交

场景：同事在 `feature-b` 修了个通用 bug，你这条分支也想要那次修复，但不想合整个 `feature-b`。用 cherry-pick 把那一条提交单独摘过来：

```bash
# 拿到那条提交的哈希
git log --oneline feature-b

# 在当前分支摘取它
git cherry-pick a1b2c3d
```

它会在当前分支**新建一个提交**，内容和那条一样（哈希不同）。适合"只要某次改动，不要整条分支"的精细操作。

## 回退三兄弟：checkout / restore / reset

改错了想撤销，不同"错"对应不同命令：

```bash
# 1. 撤销工作区某个文件的修改（还没 add）
git checkout -- 文件名
# 新版本推荐：
git restore 文件名

# 2. 把已 add 进暂存区的文件撤出来（取消暂存，改动还在工作区）
git restore --staged 文件名

# 3. 回退到某次提交（危险操作，见下）
git reset --soft <哈希>   # 回退提交，改动留在暂存区
git reset --mixed <哈希>  # 回退提交，改动留在工作区（默认）
git reset --hard <哈希>   # 回退提交，工作区也清空（改动全没！）
```

`reset --hard` 是**核弹级**命令：它会把工作区也抹掉，没提交的改动直接消失，找不回来。用之前务必确认工作区没有舍不得的东西，或先用 `git stash` 存一份。

## 还没 push 的提交想改写

```bash
# 把最新的提交撤回，改动回到工作区（相当于"拆掉最后一次存档"）
git reset --soft HEAD~1

# 撤回最近两次
git reset --soft HEAD~2
```

`HEAD~1` 表示"当前提交的前一个"。这常用于"刚 commit 发现漏了文件，拆了重提"。

## 已经 push 了想反悔？

已推送的提交**不要 `reset` 改写**（会坑队友）。正确做法是 `revert`——它生成一条"反向提交"来抵消原改动，历史是新增而不是改写：

```bash
git revert <要撤销的提交哈希>
git push
```

这样历史里清清楚楚记录着"某次改动被撤销了"，对协作最安全。

## 常见新手坑

- **`git stash` 后忘了 `pop`**：切换回来发现改动"不见了"，其实在抽屉里，`git stash list` 能找到。
- **`reset --hard` 后悔了**：工作区被清空，未提交的改动难找回（可用 `git reflog` 碰碰运气，但别指望百分百）。
- **对已推送提交用 `reset`**：改写公共历史，队友拉取冲突。改用 `revert`。
- **`cherry-pick` 摘了带依赖的提交**：只摘一条，但它依赖的上一条没摘，导致代码不完整。摘之前想清楚依赖关系。

## 小测验

- 问题1：改到一半要切分支但不想提交，用什么？答案：`git stash` 暂存，回来再 `git stash pop`。
- 问题2：已推送到远程的提交想撤销，用 `reset` 还是 `revert`？答案：用 `revert`，它新增反向提交、不改写历史，对协作安全。
- 问题3：`git reset --hard` 为什么危险？答案：它会清空工作区未提交的改动，且难以恢复。

## 更多实战：翻车现场的救援

场景一：改崩了想回到昨天干净的状态（改动还没提交）。

```bash
git stash              # 先把半成品收起来
git stash list         # 确认收好了
# 现在工作区干净，可以安心切分支或拉代码
git stash pop         # 回来再取出继续
```

场景二：刚 `commit` 发现漏了个文件，不想多一条"补文件"的提交。

```bash
# 把漏的文件加进来，和上次提交合并成一次
git add 漏的文件.js
git commit --amend --no-edit    # 不改说明，直接并入上一次
```

场景三：已经推送到远程的某次提交引入了 bug，要撤销。

```bash
git revert <那次提交的哈希>
git push              # revert 生成反向提交，历史安全
```

## 救命命令：reflog

如果你 `reset --hard` 误删了还没提交的改动，或回退错了提交，`git reflog` 能列出你所有的操作记录（包括已"消失"的提交），找到对应哈希就能 `git reset --hard <哈希>` 救回来。它是最后的救命稻草，但别指望百分百找回未提交的内容。

## 自测：你真的懂了吗

- 改到一半要切分支但不想提交？答案：`git stash` 收起，回来 `git stash pop`。
- 已推送的提交想撤销，用 reset 还是 revert？答案：revert，安全不改写历史。
- `reset --hard` 后还有救吗？答案：未提交改动难找回，已提交的可试 `git reflog`。

## 常见认知误区

这些"救命命令"用错了反而更危险。误区一是"随意 `git reset --hard`"——它会把工作区也清空，未提交的改动直接消失且难以恢复，用之前务必确认工作区没有舍不得的东西，或先 `git stash` 存一份。误区二是"已推送的提交用 reset 回退"——改写公共历史会让协作者崩溃，正确做法是用 `git revert` 生成反向提交，历史是新增而不是改写，对协作最安全。误区三是"stash 之后忘了 pop"——切换回来发现改动"不见了"，其实在抽屉里，`git stash list` 能找到，取出来即可。误区四是"cherry-pick 随便摘"——只摘一条提交却不管它的依赖，可能导致代码不完整，摘之前想清楚那条提交是否依赖上一条。最后记住 `git reflog` 是最后的救命稻草，即使 `reset` 错了也能从历史操作记录里找回哈希，但别指望百分百找回未提交的改动。

## 这一篇你该记住的

- `git stash` / `git stash pop`：临时收起半成品改动，切分支不慌。
- `git cherry-pick <哈希>`：从别的分支单独摘一条提交过来。
- 撤销未提交：`git restore 文件`（工作区）、`git restore --staged 文件`（暂存区）。
- 回退提交：`reset --soft/mixed`（改动保留）vs `reset --hard`（连工作区清空，慎用）。
- 已推送的提交用 `git revert` 安全撤销，别用 `reset` 改写公共历史。

到这篇，Git 的核心能力你都齐了：从安装配置、提交、分支、远程协作、冲突解决到应急回退。下一块我们转向**编辑器**——把 VS Code 调教成你的主力开发环境。
