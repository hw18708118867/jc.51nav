---
title: Linux 目录结构与基础命令：从 ls 到三剑客 grep/sed/awk
description: Linux 一切皆文件。这篇带你认清目录结构，掌握 ls/cd/cat 等基础命令，并入门文本处理三剑客 grep、sed、awk。
category: linux
subcategory: linux
tags: ['Linux', '目录结构', '基础命令', 'grep', 'sed', 'awk']
pubDate: 2026-07-18
order: 2
---

装好系统，打开终端，眼前一片黑。别慌——Linux 的世界"一切皆文件"，先把目录结构和基础命令摸熟，后面就顺了。

很多人学命令靠死记硬背，结果过两天就忘。其实 Linux 命令是有逻辑的：它们大多对应一个"动作"（列出、切换、查看、复制、移动），记住动作就不怕忘单词。这一篇我们先建立"目录地图"，再学最常用的一批命令，最后认识被誉为"文本处理三剑客"的 grep/sed/awk——它们是你在 Linux 下处理日志、配置的核武器。

## Linux 的目录结构

Linux 用一棵**倒置的树**组织文件，最顶层是 `/`（根目录）。记住几个最常用的"房间"：

| 目录 | 作用 |
| --- | --- |
| `/` | 根目录，所有文件的起点 |
| `/home` | 普通用户的"家"，比如 `/home/student` 是你的私人目录 |
| `/root` | 管理员 root 的家（注意不是 `/home/root`） |
| `/etc` | 配置文件集中地（网络、服务、用户都在这里配） |
| `/var` | 经常变化的文件，比如日志 `/var/log`、网站 `/var/www` |
| `/tmp` | 临时文件，重启可能清空 |
| `/usr` | 系统软件和程序，类似 Windows 的 `C:\Program Files` |
| `/bin`、`/sbin` | 基础命令可执行文件 |

> 记忆技巧：`etc` = "edit to configure"（去配置），`var` = "variable"（会变）。看到 `/etc` 下的文件，基本都是在改系统设置；看到 `/var/log`，基本是在查日志。

## 最基础的一批命令

### 看清楚：ls / pwd / cd

```bash
pwd              # 显示"我现在在哪个目录"（print working directory）
ls               # 列出当前目录下的文件和文件夹
ls -l            # 详细列表（权限、大小、时间）
ls -a            # 连隐藏文件（以 . 开头的）也显示
ls -lh           # 大小用人类可读单位（K/M/G）
cd /etc          # 切换到 /etc 目录
cd ~             # 回到自己的家目录
cd ..            # 回到上一级目录
cd -             # 回到上一次所在的目录
```

`cd` 是"change directory"（切换目录），`ls` 是"list"（列出）。这俩是你用得最多的组合。

### 看内容：cat / less / head / tail

```bash
cat 文件名        # 一次性把文件全部内容打印出来（短文件用）
less 文件名       # 分页查看（长文件用，空格翻页，q 退出）
head -n 20 文件名 # 看前 20 行
tail -n 20 文件名 # 看最后 20 行
tail -f 文件名    # 实时追踪文件新增内容（看日志神器！）
```

`tail -f /var/log/messages` 能让你盯着日志实时滚动，服务出问题第一时间就能看到报错。这是运维日常。

### 建/删/改：mkdir / touch / cp / mv / rm

```bash
mkdir mydir            # 新建文件夹
mkdir -p a/b/c         # 多级目录一起建
touch test.txt         # 新建空文件（或更新已有文件的时间戳）
cp file1 file2         # 复制文件
cp -r dir1 dir2        # 复制文件夹（必须加 -r 递归）
mv file1 /tmp/         # 移动文件（也可用来改名：mv a.txt b.txt）
rm file1               # 删除文件
rm -r dir1             # 删除文件夹
rm -rf dir1            # 强制删除文件夹（危险！）
```

⚠️ **`rm -rf` 是 Linux 头号危险命令**，尤其 `rm -rf /` 会删光整个系统。永远确认路径再回车，别用通配符乱删。

### 找东西：find / which

```bash
find /home -name "*.log"     # 在 /home 下找所有 .log 文件
find / -name "nginx.conf"    # 全系统找 nginx 配置
which ls                     # 查看某个命令的可执行文件在哪
```

## 文本处理三剑客

这是 Linux 区别于图形界面的精髓——用命令"流式"处理文本。它们都遵循"读入一行、处理、输出一行"的模式，可以管道 `|` 串起来。

### grep：按内容"搜"

`grep` 是"全局正则表达式打印"，用来从文本里筛出匹配的行。

```bash
grep "error" app.log              # 找出含 error 的行
grep -i "error" app.log           # 忽略大小写
grep -n "error" app.log           # 显示行号
grep -v "info" app.log            # 反向：去掉含 info 的行（只看非 info）
grep -r "timeout" /etc/           # 递归搜索目录下所有文件
```

管道配合：`cat app.log | grep "error" | grep -v "timeout"` 意思是"先拿出日志，再筛 error，再去掉 timeout 的"，一步步缩小范围。

### sed：按行"改"

`sed`（流编辑器）擅长"不改原文件、对每一行做替换/删除"。最常用是替换：

```bash
sed 's/旧/新/' file.txt           # 把每行第一个"旧"换成"新"
sed 's/旧/新/g' file.txt          # 加 g（global），一行里所有"旧"都换
sed 's/127.0.0.1/0.0.0.0/g' nginx.conf   # 改配置里的 IP
sed -i 's/旧/新/g' file.txt       # 加 -i 直接改原文件（危险，先备份！）
sed '3d' file.txt                 # 删除第 3 行
```

`sed -i` 直接改文件，生产环境务必先备份再操作。

### awk：按列"算"

`awk` 把每行按"字段"（默认空格分隔）拆开，能取某一列、做统计，像一门迷你数据处理语言。

```bash
awk '{print $1}' file.txt         # 打印每行的第 1 列
awk '{print $1, $3}' file.txt     # 打印第 1、3 列
awk -F: '{print $1}' /etc/passwd  # -F: 指定冒号分隔（passwd 用冒号分隔）
awk '{sum+=$1} END {print sum}' nums.txt   # 求第一列的总和
```

`awk` 特别适合处理格式化的日志和表格数据，比如统计访问量、算平均值。

### 三剑客串起来

真实场景常常三者组合。比如"找出 nginx 日志里所有 404 的请求，统计出现最多的前 5 个路径"：

```bash
grep " 404 " access.log | awk '{print $7}' | sort | uniq -c | sort -rn | head -5
```

这一行串起了 grep（筛 404）、awk（取第 7 列路径）、sort/uniq（统计次数）、sort -rn（按次数倒序）、head（取前 5）。这就是 Linux 命令行的威力——每个小工具只做一件事，但组合起来能解决复杂问题。

## 管道与重定向

- **管道 `|`**：把左边命令的输出，当成右边命令的输入。上面例子全是管道。
- **重定向 `>`**：把输出写进文件（覆盖）。`ls > list.txt`。
- **重定向 `>>`**：追加到文件末尾。`echo "done" >> log.txt`。
- **`2>`**：把错误信息单独导出。`command 2> error.log`。

## 常见新手坑

- **`rm` 删错找不回**：Linux 没有回收站，`rm` 基本不可逆。重要文件先 `cp` 备份。
- **`cd` 后路径有空格**：路径含空格要加引号 `cd "my folder"`，或用反斜杠转义 `cd my\ folder`。
- **`tail -f` 卡住**：这是正常的，它在等日志更新，按 `Ctrl+C` 退出。
- **`grep` 搜不到**：确认大小写，必要时加 `-i`；确认文件确实存在、路径对。

## 这一篇你该记住的

- Linux 目录是倒置树，根 `/` 下重点记 `/home`(用户家)、`/etc`(配置)、`/var`(日志)、`/usr`(程序)。
- 基础命令：`pwd/ls/cd` 看位置、`cat/less/head/tail` 看内容（`tail -f` 看实时日志）、`mkdir/cp/mv/rm` 增删改。
- **`rm -rf` 极度危险**，删前确认路径。
- 文本三剑客：`grep` 按内容搜、`sed` 按行改（替换用 `s/旧/新/g`）、`awk` 按列算（取 `$1` 列）。
- 用管道 `|` 把小工具串起来，能解决复杂问题；`>` 覆盖、`>>` 追加。

下一篇我们讲 Linux 的"门禁系统"——为什么有的命令要加 sudo、rwx 权限到底管什么，以及 SUID 这类特殊权限。
