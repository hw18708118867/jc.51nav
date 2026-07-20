---
title: Python 文件操作：把扫描结果稳稳存进磁盘
description: 掌握文本/二进制文件的读写、open 的多种模式、with 自动关闭、pathlib 现代路径处理，以及 CSV 的读写，写出不会丢数据的工具。
category: backend
subcategory: python
tags: ['Python', '文件操作', 'open', 'with', 'CSV', 'pathlib']
pubDate: 2026-07-22
updatedDate: 2026-07-22
order: 5
---

写安全工具绕不开"和数据打交道"：字典文件要读进来、扫描结果要写出去、日志要一行行追加、抓到的包可能要存成二进制。如果文件操作不扎实，轻则结果丢失，重则把重要文件覆盖掉。

`open()` 是 Python 读写文件的入口，但它有不少"模式"和"坑"。这一篇把文本、二进制、CSV、现代路径处理 `pathlib` 一次讲清，并强调为什么 `with` 是最好用的打开方式。

## open 的几种模式

`open(文件名, 模式, encoding=...)` 里，模式决定了你怎么操作文件：

- `'r'`：只读（默认）。文件不存在会报错。
- `'w'`：写入，**会清空原内容**再写。文件不存在就新建。
- `'a'`：追加，写在文件末尾，不清空。日志场景最常用。
- `'b'`：二进制模式，配合上面用，如 `'rb'`、`'wb'`，读图片、压缩包用。
- `'+'`：读写，如 `'r+'`。

```python
# 写文本
with open("result.txt", "w", encoding="utf-8") as f:
    f.write("192.168.1.1 开放 80\n")

# 读文本
with open("result.txt", "r", encoding="utf-8") as f:
    content = f.read()
    print(content)
```

`encoding="utf-8"` 一定要显式写上。Windows 默认编码常是 `gbk`，不指定可能读中文文件直接崩，这是跨平台写工具最常见的坑之一。

## 为什么用 with 而不是手动 close

新手常写 `f = open(...)` 然后末尾 `f.close()`。问题是：一旦中间代码抛异常，`close()` 就执行不到，文件句柄泄漏。用 `with` 块，Python 保证退出时**无论对错都自动关闭**：

```python
with open("big.log", "r", encoding="utf-8") as f:
    for line in f:           # 一行行读，省内存
        if "ERROR" in line:
            print(line.strip())
```

这里还有个好处：大文件用 `for line in f` 逐行迭代，不会一次性读进内存，处理几个 G 的日志也不卡。写工具处理海量输出时，这个习惯能救你一命。

## 读写的几种姿势

`read()` 一次性读全部；`readline()` 读一行；`readlines()` 读成列表；最推荐的是直接迭代文件对象（上面那种），既省内存又简洁。

写入时，`write()` 只写字符串且不自动加换行，需要自己加 `\n`；`writelines()` 接一个字符串列表：

```python
lines = ["第一行\n", "第二行\n"]
with open("out.txt", "w", encoding="utf-8") as f:
    f.writelines(lines)
```

> 小提示：想同时写很多行，用 `print(..., file=f)` 也很方便，它会自动帮你加换行：
> ```python
> with open("out.txt", "w", encoding="utf-8") as f:
>     print("状态：成功", file=f)
> ```

## 二进制文件：图片、抓包、证书

碰到非文本（图片、pcap 抓包、证书），必须加 `'b'` 模式，而且**不能指定 encoding**（二进制没有编码概念）：

```python
# 下载并保存一张图
import requests
r = requests.get("http://target/logo.png")
with open("logo.png", "wb") as f:
    f.write(r.content)     # content 是字节
```

读二进制同理用 `'rb'`。忘了加 `b` 又去读图片，会得到一堆乱码甚至直接报错。写"保存漏洞证明截图""落地 webshell"这类功能时，二进制读写是基本功。

## pathlib：更现代的路径写法

`pathlib` 是 Python3 推荐的路径处理模块，用面向对象的方式操作路径，比 `os.path` 字符串拼接更直观：

```python
from pathlib import Path

p = Path("results") / "scan.txt"    # 用 / 拼接，跨平台
p.parent.mkdir(parents=True, exist_ok=True)   # 连父目录一起建
p.write_text("hello", encoding="utf-8")       # 直接写
print(p.read_text(encoding="utf-8"))          # 直接读
print(p.suffix)     # .txt  扩展名
print(p.name)       # scan.txt 文件名
```

`Path` 对象还能用 `glob` 批量找文件，比如 `Path(".").glob("*.py")` 找出当前目录所有 Python 文件。新项目建议优先用 `pathlib`，代码更干净，也少踩路径分隔符的坑。

## CSV：表格数据的读写

扫描结果常要导成表格给同事看，`csv` 模块专门干这个：

```python
import csv

# 写
with open("ports.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["host", "port", "status"])
    w.writerow(["192.168.1.1", 80, "open"])

# 读
with open("ports.csv", "r", encoding="utf-8") as f:
    for row in csv.reader(f):
        print(row)     # ['192.168.1.1', '80', 'open']
```

注意写 CSV 时 `open` 要加 `newline=""`，否则 Windows 上每行之间会多一个空行。读进来每一行都是列表，配合 `DictReader` 还能按列名取，处理带表头的报告很方便。

## 实战：把扫描结果写成 CSV 报告

综合上面，做一个"批量探测端口并导出 CSV"的骨架：

```python
import csv
from pathlib import Path

def save_results(target, results, path="scan_results.csv"):
    p = Path(path)
    with p.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["target", "port", "status"])
        for port, status in results:
            w.writerow([target, port, status])
    print(f"已写入 {p.name}")

save_results("192.168.1.1", [(80, "open"), (443, "open"), (22, "closed")])
```

`Path.open` 和内置 `open` 用法一致，但路径处理更优雅。这样一个可交付的扫描报告就生成了，用 Excel 打开一目了然。

## 常见新手坑

- **`'w'` 覆盖重要文件**：想追加却写成 `'w'`，原内容瞬间没了。写日志务必用 `'a'`，首次写入确认好模式。
- **不写 `encoding="utf-8"`**：跨平台读中文必崩，养成显式指定的习惯。
- **二进制忘了 `'b'`**：读图片、证书出错或乱码。
- **CSV 漏 `newline=""`**：Windows 出现空行。
- **忘记关文件**：不用 `with` 又漏 `close`，句柄耗尽后程序打不开新文件。

## 小测验：看看你掌握了没

- 问题一：要往日志文件末尾追加一行，该用 `'w'` 还是 `'a'`？
- 问题二：读一个中文文本文件，最少要加哪个参数才不会乱码？
- 问题三：保存从网络下载的图片，open 模式要带什么字母？

## 文件操作里的性能与安全意识

会读写文件只是第一步，写出"靠谱"的工具还要想两件事：性能和敏感数据。

性能方面，最大的坑是"一次性读全部"。有人写 `content = f.read()` 去处理几个 G 的日志，结果内存直接爆掉，脚本被系统杀掉。正确做法是逐行迭代 `for line in f`，或者用 `read(size)` 每次读一块，处理完再读下一块，内存占用始终很小。如果你要统计一个大文件里某个关键词出现几次，逐行扫一遍就好，根本不需要把它全装进内存。

安全方面，文件操作涉及"写哪里"和"写什么"。第一，落盘路径别直接用用户传入的字符串拼，攻击者可能传入 `../../etc/passwd` 这类路径穿越，把文件写到意料之外的地方；用 `pathlib` 的 `resolve` 规范化路径、再检查是否还在允许的根目录内，能挡掉这类问题。第二，扫描结果、漏洞证据里可能含敏感信息（内网地址、账号片段），存盘和导出时要清楚这份报告会流向谁，别随手传到公网。第三，写文件前确认目标不是重要文件，尤其是用 `'w'` 模式会清空原内容，自动化脚本批量跑的时候，一个路径拼错就可能把宿主机的配置覆盖掉，这种事故在真实环境里真的发生过。

把"逐行读、路径校验、敏感意识"这三件事刻进习惯，你的文件操作就从"能用"变成"可信赖"。

## 用文件做工具之间的"接力棒"

文件不只是存结果，更是不同工具之间传递数据的桥梁。比如你用一个脚本扫出开放端口，存成 CSV；另一个脚本读这个 CSV，只对有端口开放的主机做漏洞验证。两个脚本都不用改，靠文件"接力"，这就是"小工具各做一件事、用文件串起来"的思想。

这样做的好处是灵活：哪一步想换算法，只改对应脚本；中间结果落盘，断了能从断点重跑，不用从头再来。坏处是要管好文件路径和格式约定。建议给中间文件起清晰的名字、固定格式（优先 JSON 或 CSV，别用奇怪的自定义分隔符），并在脚本开头打印"我在读哪个文件、写出哪个文件"，方便排查。把文件当成工具间的契约，你的整套武器库就会越攒越顺手。另外提醒，中间文件可能含敏感目标信息，妥善保管、别误传，和前面说的安全意识是一脉相承的。

再补充一点：Windows 和 Linux 的路径分隔符不同，但只要你坚持用 `os.path.join` 或 `pathlib` 的斜杠写法，Python 会自动适配，所以写工具时永远别手写反斜杠或正斜杠去拼路径，这是跨平台不出错的关键。很多"在我电脑上能跑、到别人那就报错"的怪事，根子都在路径分隔符上。养成用库拼路径的肌肉记忆，能替你省下大量排错时间。

## 这一篇你该记住的

- `open(文件, 模式, encoding="utf-8")`；`'r'` 读 `'w'` 写(清空) `'a'` 追加 `'b'` 二进制。
- 永远用 `with` 打开文件，退出自动关闭，避免句柄泄漏。
- 大文件用 `for line in f` 逐行读，省内存不卡顿。
- 二进制(图片/抓包)必须加 `'b'`，且不能指定 encoding。
- `pathlib.Path` 用 `/` 拼路径、可 `write_text`/`read_text`/`glob`，更现代。
- 读写 CSV 用 `csv` 模块，写时加 `newline=""` 防空行。

下一篇讲**网络通信**：用 `requests` 发 HTTP 请求、用 `socket` 做底层探测，这是所有 Web 安全工具的命脉。
