---
title: Python 常用内置模块：写工具前先认识这批"免费零件"
description: 掌握 os、sys、math、datetime、json、re 等标准库模块的常用玩法，学会不装第三方库就能做系统操作、时间处理、数据解析与正则匹配。
category: backend
subcategory: python
tags: ['Python', '标准库', '内置模块', 'os', 'json', 're']
pubDate: 2026-07-21
updatedDate: 2026-07-21
order: 4
---

前面几篇我们都在用 Python 的"语法积木"。但真正写安全工具时，你很快会发现：发请求、读文件、处理时间、解析返回数据……这些事如果每样都从零写，会累死。好消息是，Python 装好就自带一大包**标准库模块**，不用 `pip install` 就能直接用。

打个比方：语法是"扳手螺丝刀"，标准库是"已经做好的电机、水泵、仪表"，你拧上就能用。这一篇带你认识最常用的一批：`os`、`sys`、`math`、`datetime`、`json`、`re`。学完你会发现，很多工具的核心功能，标准库就够撑起来。

## os：和操作系统打交道

`os` 模块让你用 Python 操作文件和目录，写批量处理、路径拼接、执行命令都靠它。

```python
import os

print(os.getcwd())              # 当前工作目录
os.mkdir("results")             # 新建文件夹
print(os.listdir("."))          # 列出当前目录内容
print(os.path.exists("a.txt"))  # 文件是否存在
os.rename("a.txt", "b.txt")     # 重命名
```

路径拼接千万别手写斜杠，用 `os.path.join`，它能自动适配 Windows 的反斜杠和 Linux 的正斜杠：

```python
path = os.path.join("results", "scan_2026.txt")
print(path)     # results/scan_2026.txt（Windows 下是 results\scan_2026.txt）
```

还有一个极实用的 `os.walk`，能递归遍历一个目录下的所有文件——写"扫描某目录下所有脚本"这类工具时离不开它。

## sys：和解释器本身打交道

`sys` 主要用来读命令行参数、控制退出、看 Python 环境信息。

```python
import sys

print(sys.argv)        # 命令行参数列表，argv[0] 是脚本名
print(sys.version)     # Python 版本
sys.exit(1)            # 以状态码 1 退出程序
```

写命令行工具时，`sys.argv` 就是用户传进来的参数。比如 `python scan.py 192.168.1.1`，`sys.argv` 就是 `['scan.py', '192.168.1.1']`。不过参数一多，更推荐用专门的 `argparse` 模块（标准库也有），它能自动生成帮助信息、做类型校验。

## math 与 datetime：算数和算时间

`math` 提供数学函数，`datetime` 处理日期时间——扫描报告、超时控制、日志时间戳都常用。

```python
import math
print(math.ceil(4.1))     # 5  向上取整
print(math.floor(4.9))    # 4  向下取整
print(math.sqrt(16))      # 4.0 开方

from datetime import datetime, timedelta
now = datetime.now()
print(now.strftime("%Y-%m-%d %H:%M:%S"))   # 格式化成字符串
later = now + timedelta(hours=1)           # 一小时后
print(later)
```

`strftime` 里的 `%Y` 是四位年、`%m` 是月、`%d` 是日、`%H:%M:%S` 是时分秒，记住这套占位符，时间格式化就不慌。

## json：数据的通用语言

现代 Web 接口几乎都用 JSON 传数据。Python 的 `json` 模块能在字符串和字典之间互相转换。

```python
import json

data = {"host": "192.168.1.1", "ports": [80, 443], "vuln": True}
text = json.dumps(data, ensure_ascii=False)   # 字典转字符串
print(text)

back = json.loads(text)                       # 字符串转回字典
print(back["host"])                           # 192.168.1.1
```

两个坑必须记住：第一，`dumps` 默认把中文变成 `\uXXXX`，加 `ensure_ascii=False` 才能正常显示中文；第二，从网络拿到的 JSON 如果格式不对，`loads` 会抛 `JSONDecodeError`，记得用前面学的异常处理兜住。把扫描结果存成 JSON，既方便程序再读，也方便人看。

## re：正则表达式，文本匹配的瑞士军刀

`re` 模块用来按"模式"查找、提取文本。比如从一段 HTML 里抠出所有链接、从响应里匹配版本号，正则最顺手。

```python
import re

html = '<a href="http://a.com">A</a><a href="http://b.com">B</a>'
links = re.findall(r'href="(.*?)"', html)
print(links)        # ['http://a.com', 'http://b.com']

text = "版本号：v2.3.1"
m = re.search(r'v(\d+\.\d+\.\d+)', text)
if m:
    print(m.group(1))   # 2.3.1
```

`findall` 返回所有匹配，`search` 找第一个，`group(1)` 取括号里捕获的那部分。正则语法本身值得单独学，但记住一句：能不用正则就别用，简单字符串操作用 `split`/`in` 更直观；真要解析复杂结构（比如 HTML），优先上专门的解析库。

## 实战：扫描结果存成 JSON 报告

把上面几个模块串起来，做一个"收集开放端口并导出报告"的小工具骨架：

```python
import os
import json
from datetime import datetime

def build_report(target, open_ports):
    return {
        "target": target,
        "open_ports": open_ports,
        "scan_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

report = build_report("192.168.1.1", [80, 443])
os.makedirs("results", exist_ok=True)     # 不存在才建，不会报错
with open(os.path.join("results", "report.json"), "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=2)
print("报告已生成")
```

这里 `os.makedirs(..., exist_ok=True)` 避免目录已存在时报错，`json.dump` 带 `ensure_ascii=False` 和 `indent=2` 让文件既含中文又排版好看。一个真实工具的"采集—组装—落盘"流程，标准库就全包了。

## 新手怎么挑模块用

标准库有上百个模块，不用全记，遇到需求先想"这功能是不是很通用"。文件操作用 `os`/`pathlib`，时间用 `datetime`，数据交换用 `json`，命令行参数用 `argparse`，网络请求标准库有 `urllib` 但不好用（下一篇讲更顺手的 `requests`）。养成习惯：动手前先搜一下"Python 标准库 某某功能"，十有八九已经有现成的，别自己造轮子。

## 小测验：看看你掌握了没

- 问题一：要跨平台拼接路径 `logs/scan.txt`，该用字符串相加还是 `os.path.join`？为什么？
- 问题二：`json.dumps` 默认中文变成乱码似的 `\uXXXX`，怎么让它显示正常中文？
- 问题三：从一段文本里提取所有邮箱，你倾向用正则还是手写循环？什么情况下该收手用专门库？

## 现学现卖：用 dir 和 help 探索陌生模块

你不可能记住每个模块的所有函数，真正的高手也不是靠背，而是知道怎么现查。Python 自带两个神器：`dir` 列出一个对象或模块里有什么，`help` 看具体用法。比如导入 `os` 之后，`dir(os)` 会返回一长串名字，你从中猜哪个像你要的功能，比如看到 `listdir`、`mkdir`，再用 `help` 确认参数和返回值。这个习惯比到处搜博客快得多，而且看到的是官方原版说明，不会过时，也不会因为版本变化而踩坑。

另外一个实用思路：写工具时先把你要做什么用中文列成清单，再逐个想哪类模块能搞定。读命令行参数对应 `sys` 或 `argparse`，解析 JSON 对应 `json`，算时间差对应 `datetime`，拼路径对应 `os.path`。把需求翻译成模块名，是写工具的基本功。标准库覆盖不了时再去 PyPI 找第三方库，但优先用内置的——依赖越少，工具越好分发，也越不容易在别人的环境里装不上、跑不起来。

还有个容易被忽略的点：标准库函数大多经过大量测试和优化，自己手写的同类逻辑往往边界情况没考虑全。比如你手写递归遍历目录，可能漏掉符号链接导致的死循环，而 `os.walk` 已经帮你处理好了。所以能调用标准库就别自己造，既省事又更稳。最后提醒一句：别为了用模块而用模块，有时候一个简单的字符串切片、一次普通的加减法就能解决的事，硬去调 `math` 或 `re` 反而把代码写复杂。模块是工具不是炫耀资本，哪里顺手用哪里，代码让人一眼看懂比写得花哨重要得多。

## 把模块拼成一条流水线

单个模块会用了，下一步是让它们协作。一个典型的扫描辅助工具，流程往往是：用 `sys` 读入目标，用 `os` 建结果目录，用 `datetime` 打时间戳，用 `json` 或 `csv` 存结果，用 `re` 从响应里抠关键信息。每个模块负责一小段，串起来就是完整工具。

举个例子，你想做个"批量检测网站标题"的小工具：`requests` 抓首页，`re` 或简单字符串找出 `<title>` 内容，`json` 把"网址—标题"存成报告，`os` 保证目录存在。这里没有任何功能需要你自己造轮子，全是标准库加一个 `requests`。当你习惯用这种"搭积木"的思路看待任务，写工具的速度会突飞猛进——你不再想"这个功能怎么实现"，而是想"哪个模块能帮我实现"。

顺带一提，标准库模块名大多见名知意：`os` 是 operating system，`sys` 是 system，`re` 是正则 regular expression。记住这层对应关系，看到陌生模块名时你能先猜个大概，再配合 `dir` 和 `help` 确认，上手速度会更快。模块名本身就是最好的说明书目录。多用几次，你会对这套命名越来越熟，遇到新需求时脑子里立刻就能蹦出该查哪个模块。

## 这一篇你该记住的

- 标准库装好即用，无需 `pip install`，是写工具的"免费零件"。
- `os` 管文件目录，`os.path.join` 跨平台拼路径，`os.walk` 递归遍历。
- `sys.argv` 读命令行参数；参数复杂时用 `argparse` 更专业。
- `math`/`datetime` 管计算与时间，`strftime` 用 `%Y%m%d%H%M%S` 占位符格式化。
- `json` 做字典与字符串互转，记得 `ensure_ascii=False` 保中文、`loads` 可能抛 `JSONDecodeError`。
- `re` 做正则匹配，`findall`/`search`/`group` 最常用；能简单处理就别上正则。

下一篇讲**文件操作**：文本、二进制、CSV 怎么读怎么写，以及为什么 `with` 是最好用的打开方式。
