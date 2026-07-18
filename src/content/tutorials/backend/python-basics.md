---
title: Python 基础：为什么安全圈都在用 Python 写工具
description: 从"为什么学 Python"讲起，装好环境，掌握标识符、关键字、变量、数据类型、运算符与流程控制，并理解模块的概念，为后面写安全工具打底。
category: backend
subcategory: python
tags: ['Python', '后端入门', '安全工具', '基础语法']
pubDate: 2026-07-18
order: 1
---

你可能在想：我学安全、学渗透，为什么绕不开 Python？答案很现实——**安全圈几乎人手一个 Python 写的脚本**。信息收集要批量扫端口、漏洞验证要自动发包、爬虫要自动翻页面，这些"重复、机械、要快"的活，手写命令又慢又容易错，而 Python 几行就能搞定，而且跨平台、库多、读起来像人话。

打个比方：别的语言像"专业机床"，装好夹具才能干活；Python 像"瑞士军刀"，掏出来就能剪能拧能撬。对安全工程师来说，最重要的是"想到就能马上写出来跑"，Python 刚好满足这一点。

这一篇我们搞定四件事：为什么选 Python、环境怎么装、最基本的语法（变量/类型/运算符/流程控制）、以及"模块"到底是什么。跟着敲，别只看。

## 为什么是 Python 而不是别的

先说清楚动机，免得你学到一半怀疑人生。

- **语法接近自然语言**：`if x > 5:` 这种写法，几乎不用查文档就能猜出意思，学习曲线平缓。
- **库多到离谱**：发 HTTP 请求有 `requests`、解析网页有 `BeautifulSoup`、操作系统有 `os`、并发有 `threading`，安全工具需要的零件基本都有现成的。
- **跨平台**：在 Windows 写的脚本，拷到 Linux 的靶机上往往直接能跑，渗透时特别省心。
- **胶水语言**：能把各种现成工具、命令行程序串起来，做成自动化流水线。

一句话：**安全工具开发追求的是"快写快跑"**，Python 在这方面几乎没有对手。

## 把环境装起来

新手最稳的方式是用官方安装包，避免以后踩一堆路径坑。

- **Windows / macOS**：去 [python.org](https://www.python.org/) 下载最新版（建议 3.10+），安装时**务必勾选 "Add Python to PATH"**，否则命令行找不到 `python`。
- **Linux（Ubuntu/Debian）**：一般自带 Python3，没有就 `sudo apt install python3 python3-pip`。
- **验证**：命令行输入 `python3 --version`（Windows 可能是 `python --version`），能打印版本号就成功了。

包管理用 `pip`，后面装第三方库都靠它：

```bash
pip install requests          # 装一个库
pip list                      # 看已装了哪些
```

> 小提示：建议每个项目用虚拟环境（`python3 -m venv venv`），避免不同项目的库互相打架。新手前期不强制，但要知道有这回事。

## 第一个 Python 程序

新建文件 `hello.py`，内容：

```python
print("你好，Python！")
```

命令行运行：

```bash
python3 hello.py
```

屏幕上出现"你好，Python！"。和 PHP 不同，Python **不需要包在特殊标签里**，直接写语句就行；也不需要分号结尾（写了也不报错，但约定不写）。

## 变量：给数据起个名字

变量就是"贴了标签的盒子"，把数据放进去，以后用名字就能拿出来。Python 的变量**不用声明类型**，赋值即创建：

```python
name = "小明"          # 字符串
age = 18               # 整数
height = 1.75         # 浮点数
is_student = True     # 布尔值
scores = [90, 85, 77] # 列表
```

几个要点：

- 变量名只能是**字母、数字、下划线**，且不能以数字开头。`1name` 非法，`user_name` 合法。
- Python 区分大小写，`Name` 和 `name` 是两个不同的变量。
- 用 `type()` 可以看一个值是什么类型：`type(age)` 会告诉你 `<class 'int'>`。

## 常见数据类型

安全脚本里你天天会碰到这几种：

- **字符串 `str`**：用单引号或双引号包起来。`"GET /admin"`。多个字符串用 `+` 拼接，或者用 f-string 更清爽：

```python
method = "GET"
path = "/admin"
req = f"{method} {path} HTTP/1.1"   # 结果：GET /admin HTTP/1.1
```

- **整数 `int` / 浮点 `float`**：做加减乘除。注意 `3 / 2` 结果是 `1.5`（Python3 除法默认返回浮点），想要整除用 `3 // 2` 得 `1`。
- **布尔 `bool`**：`True` / `False`，用于条件判断。
- **列表 `list`**：有序的一串值，`[1, 2, 3]`，可改、可重复。后面批量存端口、存 URL 全靠它。
- **元组 `tuple`**：和列表像，但**不能改**，`(1, 2, 3)`。适合放固定配置。
- **字典 `dict`**：键值对，`{"host": "127.0.0.1", "port": 80}`，用键取值 `d["host"]`。请求头、参数表几乎都用字典。
- **集合 `set`**：去重且无序，`{1, 2, 2}` 实际只有 `{1, 2}`。批量扫描去重很好用。

## 运算符

和数学差不多，但有几个坑：

```python
a = 10
b = 3
print(a + b)     # 13
print(a % b)     # 1   取余（判断奇偶、分页常用）
print(a ** b)    # 1000 幂运算
print(a == b)    # False 相等判断用 ==，不是 =
print(a != b)    # True 不等于
print(a > 5 and b < 5)   # True 且
print(a > 5 or b > 5)    # True 或
print(not (a > 5))       # False 非
```

> 常见坑：赋值用 `=`，比较用 `==`。写成 `if a = 5:` 会直接报错，这是新手最易犯的错。

## 流程控制：让程序会"判断"和"重复"

**条件 `if`**：

```python
status = 200
if status == 200:
    print("请求成功")
elif status == 404:
    print("页面不存在")
else:
    print("其他状态码")
```

**循环 `for`**：遍历列表、字符串特别顺手。

```python
ports = [80, 443, 8080]
for p in ports:
    print(f"正在检查端口 {p}")
```

配合 `range()` 生成数字序列：

```python
for i in range(1, 6):     # 1 到 5
    print(i)
```

**循环 `while`**：条件成立就一直跑，记得在内部改变条件，否则死循环：

```python
count = 0
while count < 3:
    print("重试中")
    count += 1
```

`break` 提前退出循环，`continue` 跳过本次进入下一轮——写扫描工具跳过已失败目标时经常用。

## 模块：代码的"零件抽屉"

当脚本变长，你不会把所有代码塞一个文件。把功能拆成**模块**（一个 `.py` 文件），用 `import` 拿来用：

```python
import os
print(os.getcwd())        # 打印当前目录

from time import sleep
sleep(2)                  # 暂停 2 秒（发包间隔、防封常用）
```

Python 自带一大批"标准库"模块（`os`、`sys`、`time`、`json`、`re` 等），不用装就能用；第三方库（如 `requests`）才需要 `pip install`。后面每一章其实都是在学不同的模块怎么用。

## 常见新手坑

- **缩进就是语法**：Python 用缩进来区分代码块，该缩进不缩进会报错。统一用 4 个空格，别混用空格和 Tab。
- **字符串和整数不能直接加**：`"端口" + 80` 会报错，要先 `str(80)` 转成字符串。
- **变量名拼错**：`print(nmae)` 会因为 `nmae` 没定义而报错，仔细检查拼写。
- **忘记装库就 import**：`import requests` 报 ModuleNotFoundError，说明没 `pip install requests`。
- **Python2 和 3 混用**：现在一律用 Python3，别照着老教程用 `print "xxx"` 这种 Python2 写法。

## 字符串和列表的常用操作

光会定义不够，安全脚本里这些方法是天天用的：

**字符串**：`split()` 按分隔符切开成列表，`strip()` 去首尾空白，`replace()` 替换，`join()` 把列表拼回字符串。

```python
cookie = "session=abc; user=Tom; admin=0"
pairs = cookie.split(";")          # 切成 ['session=abc', ' user=Tom', ...]
clean = [p.strip() for p in pairs] # 逐个去空格
text = "a,b,c"
print(text.split(","))             # ['a', 'b', 'c']
print("-".join(["192.168.1.1", "80"]))  # 192.168.1.1-80
```

**列表**：`append()` 追加元素，`pop()` 弹出，`in` 判断是否存在，`len()` 取长度，切片 `lst[1:3]` 取一段。

```python
ports = [80, 443]
ports.append(8080)        # [80, 443, 8080]
if 443 in ports:
    print("常见端口在列")
print(ports[0:2])         # [80, 443]
```

**字典**：`keys()` 取所有键，`get()` 安全取值——键不存在时返回你给的默认值，而不是直接报错崩掉。

```python
headers = {"User-Agent": "Mozilla/5.0"}
print(headers.get("Token", "无"))   # 没有 Token 就返回 "无"
```

## 实战：批量拼接待测 URL

把上面串起来，给一串路径批量生成完整 URL——这是目录爆破、批量探测的雏形：

```python
base = "http://192.168.1.10"
paths = ["/admin", "/login", "/api", "/config"]
urls = []
for p in paths:
    url = base.rstrip("/") + p     # 先去掉结尾多余的斜杠
    urls.append(url)
    print(f"已生成：{url}")
print(f"共 {len(urls)} 个目标")
```

`rstrip("/")` 避免拼出 `//` 这种畸形地址；`len(urls)` 让你随时知道进度。这段逻辑看着简单，却是几乎所有批量工具的核心循环：遍历列表、拼装请求、收集结果。

## 新手怎么把基础练熟

到这里你已经认识了变量、类型、运算符和流程控制，但"看懂"和"会写"之间还差大量练习。我的建议是别一上来就背语法，而是用"小目标驱动"：每天给自己一个能跑通的小任务，比如"写一个脚本，接收用户输入的两个数字，输出它们的和与积""写一个循环，打印一到一百里所有的偶数"。任务越小越具体，你越容易获得"跑通"的成就感，而成就感正是坚持下去的关键。

另一个容易踩的弯路是"只看不敲"。Python 是门动手的语言，眼睛扫一遍觉得自己懂了，真到键盘上写往往卡在缩进、拼写、漏括号这些细节。务必把本文每个例子亲手敲一遍，改个数、换个条件看看结果变不变，这种"试错"比看十遍都管用。

还有一点：遇到报错别慌，也别急着复制错误信息去搜就照搬。先读报错最后一行，它通常已经告诉你"哪一类错、在哪一行"。比如 `NameError` 基本就是变量名拼错，`TypeError` 多半是类型不匹配。养成"先读错、再改"的习惯，你的调试速度会肉眼可见地变快。

## 小测验：看看你掌握了没

- 问题一：`"a" + 1` 会怎样？想拼接数字该怎么做？
- 问题二：怎么判断 `"admin"` 是否在列表 `["admin", "guest"]` 里？
- 问题三：要把 `"1,2,3"` 变成整数列表 `[1, 2, 3]`，至少用到哪两个方法？

（答案思路：字符串不能和整数直接加，要用 `str(1)`；用 `in` 判断成员；先 `split(",")` 再对每个元素 `int()`。）

## 这一篇你该记住的

- 安全工具追求"快写快跑"，Python 语法简单、库多、跨平台，是安全圈首选。
- 装好 Python3 并勾选 PATH，用 `pip` 管理第三方库；验证用 `python3 --version`。
- 变量赋值即创建、区分大小写；核心类型有 `str`/`int`/`float`/`bool`/`list`/`dict`/`set`。
- 运算符里 `==` 是比较、`=` 是赋值；`%` 取余、`**` 幂、`//` 整除。
- 流程控制靠 `if`/`for`/`while`，循环里 `break`/`continue` 很常用。
- 模块用 `import` 引入，标准库免安装，第三方库需 `pip install`。

下一篇我们讲**面向对象**：用"类"把扫描器、攻击脚本封装成可复用的零件，这是写复杂工具必须过的坎。
