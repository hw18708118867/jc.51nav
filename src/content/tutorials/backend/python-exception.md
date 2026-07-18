---
title: Python 异常处理：让工具在超时、报错时也不崩
description: 掌握 try/except/finally/else 与自定义异常，学会兜住网络超时、文件缺失、解析失败等意外，写出健壮、不中途崩溃的安全工具。
category: backend
subcategory: python
tags: ['Python', '异常处理', 'try', 'except', '健壮性']
pubDate: 2026-07-20
order: 3
---

写扫描器最怕什么？不是写不出功能，而是跑着跑着**突然崩了**——目标网络抖一下、某个端口连接超时、返回的数据不是你预期的格式……任何一处没接住，整个脚本就 throw 一个红通通的错误退出，前面扫了几百个目标全白费。

**异常处理**就是给程序装"安全气囊"：预感到某段代码可能出意外，提前用 `try/except` 兜住，崩了也能接着跑，或者优雅地记一笔日志继续。

这一篇讲清：什么是异常、怎么捕获、怎么清理资源、怎么自定义异常。学完你的工具能从"一碰就碎"变成"打不死的小强"。

## 异常是什么

异常就是程序运行时的"意外事件"。比如：

```python
print(1 / 0)            # ZeroDivisionError：除零
print(int("abc"))       # ValueError：字符串转不了整数
open("不存在.txt")       # FileNotFoundError：文件找不到
```

这些都会导致程序中断。但很多意外是"正常的业务情况"——网络本来就会超时，目标本来就可能关了端口。与其让程序死掉，不如捕获后处理。

## 用 try/except 兜住

基本结构：

```python
try:
    result = 10 / 0
except ZeroDivisionError:
    print("除零了，换个除数")
```

`try` 里放"可能出错的代码"，`except` 后面写"如果出了某类错，就执行这里"。程序不会中断，而是走到 `except` 分支。

可以捕获多种异常：

```python
try:
    num = int(input("请输入数字："))
    print(100 / num)
except ValueError:
    print("这不是数字")
except ZeroDivisionError:
    print("不能除以零")
```

也可以一个 `except` 兜多种（写成元组）：

```python
except (ValueError, ZeroDivisionError):
    print("输入有问题")
```

> 小提示：别一上来就写 `except:` 或 `except Exception:` 吞掉所有错误。这会连你代码里的真 bug 一起藏起来，排错时非常痛苦。尽量捕获具体的异常类型。

## else 和 finally

`try` 还有两个搭档，写工具时极其实用：

```python
try:
    f = open("data.txt")
except FileNotFoundError:
    print("文件不存在")
else:
    print("打开成功，处理数据")   # 没出错才执行
    f.close()
finally:
    print("无论对错都会执行")     # 一定执行，常用来释放资源
```

- **`else`**：`try` 块**没抛异常**时才执行，适合放"成功后的后续处理"，让正常逻辑和错误处理分开，更清楚。
- **`finally`**：**无论如何都执行**，典型用途是关闭文件、关闭网络连接、释放锁——防止资源泄漏。

真实扫描器里经常这样写：

```python
conn = None
try:
    conn = connect(target, port, timeout=3)
    data = conn.recv(1024)
except TimeoutError:
    print(f"{target}:{port} 超时")
finally:
    if conn:
        conn.close()      # 不管成功失败，连接都要关
```

## 拿到异常对象本身

有时你想看看错误细节，用 `as` 把异常对象接出来：

```python
try:
    import requests
except ImportError as e:
    print(f"缺少库：{e}，请先 pip install requests")
```

`e` 里带着错误信息，记日志、打印提示都靠它。

## 主动抛异常 raise

不是只有系统会抛异常，你也可以主动 `raise` 一个，用来"报错给调用者"：

```python
def scan(target):
    if not target:
        raise ValueError("target 不能为空")
    # 正常逻辑...
```

这在写工具库时很有用：参数不对就立刻明确报错，而不是默默跑出奇怪结果。

还可以"重新抛出"，在记完日志后把异常继续往上扔：

```python
try:
    do_something()
except SomeError:
    log("出错了")
    raise        # 原样抛给上层
```

## 自定义异常

当你的工具有一类专属错误（比如"目标被防火墙拦截"），用 Python 自带的类型不够语义化，可以自己定义一个：

```python
class TargetBlockedError(Exception):
    """目标触发了防火墙拦截"""
    pass

def scan(target):
    if is_blocked(target):
        raise TargetBlockedError(f"{target} 被拦截")
```

自定义异常只要继承 `Exception`（或它的子类）即可。好处是调用方可以精确 `except TargetBlockedError` 做特殊处理，比如换 IP 重试。

## 实战：健壮的端口探测

把异常处理用到扫描里，单个目标失败不影响整体：

```python
import socket

def check_port(host, port, timeout=2):
    s = socket.socket()
    s.settimeout(timeout)
    try:
        s.connect((host, port))
        return True
    except (socket.timeout, ConnectionRefusedError):
        return False
    finally:
        s.close()

targets = [("192.168.1.1", 80), ("192.168.1.1", 9999), ("badhost", 80)]
for host, port in targets:
    try:
        ok = check_port(host, port)
        print(f"{host}:{port} -> {'开放' if ok else '关闭'}")
    except Exception as e:
        print(f"{host}:{port} 探测异常：{e}")
```

即使某个目标主机名解析不了、某个端口连不上，循环照样往下走，最后能拿到完整结果。这就是异常处理带来的"韧性"。

## 常见新手坑

- **`except` 顺序写反**：具体的异常要写在前面，宽泛的（`Exception`）放最后；反过来宽泛的会先截胡，具体的永远轮不到。
- **吞掉异常不处理**：`except: pass` 让错误无声无息，排错时抓瞎。至少打行日志。
- **`finally` 里又抛新异常**：会掩盖 `try` 里的原始异常，清理代码尽量别再出错。
- **忘记关资源**：文件/连接不在 `finally` 里关，程序跑久了耗光句柄。优先用 `with` 自动管理（见下篇文件操作）。

## 用 with 自动清理资源

前面说释放资源要写 `finally`，但还有更优雅的写法——**上下文管理器 `with`**。它保证代码块结束后自动调用清理逻辑，不用你手动 `close()`：

```python
with open("data.txt") as f:
    content = f.read()
# 离开 with 块，文件自动关闭，即使中间出错也会关
```

网络库 `requests` 也支持类似用法。写工具时养成"能用 `with` 就用 `with`"的习惯，能少写一堆 `finally`，也避免忘记关。

## 实战：带重试机制的请求

扫描时网络偶尔抖一下，直接判"失败"太武断。用异常处理包一层"重试"逻辑，更贴近真实需求：

```python
import time

def request_with_retry(url, retries=3, delay=1):
    for i in range(retries):
        try:
            # 这里用伪代码代表发请求
            print(f"第 {i+1} 次请求 {url}")
            # response = requests.get(url, timeout=3)
            return "ok"
        except TimeoutError:
            print(f"超时，{delay} 秒后重试")
            time.sleep(delay)
    raise RuntimeError(f"{url} 重试 {retries} 次仍失败")

try:
    request_with_retry("http://slow.target")
except RuntimeError as e:
    print(f"最终失败：{e}")
```

`for` 循环里捕获超时，次数用尽再 `raise` 向上报告。这种"局部重试、整体兜底"的模式，在写爬虫、爆破、探测工具时几乎是标配。

## 异常链：保留原始错误

有时你在 `except` 里想抛一个新异常，但又不想丢掉原来的错误原因，用 `raise ... from` 保留链条：

```python
try:
    num = int("abc")
except ValueError as e:
    raise RuntimeError("配置解析失败") from e
```

这样排错时能看到"RuntimeError 是由 ValueError 引起的"，而不是只看到一个孤零零的新错误。在写库或者框架时，保留异常链特别重要：调用方拿到错误，能顺着链条一路追到根因，而不是被你包装过的新异常迷惑。记住一条原则——能修的当场修，修不了的带着原因再上报，别把真相弄丢。

## 异常处理不是万能药

最后要泼盆冷水：异常处理解决的是"可预期的意外"，不是用来掩盖逻辑错误的。有人写代码喜欢外层包一个大 `try/except`，里面逻辑乱写，反正崩了也不报错——这等于把故障藏起来，问题会在更隐蔽的地方爆发，排错成本反而更高。正确的姿势是：先保证正常逻辑写对，只对那些"确实可能失败、且失败后可恢复"的环节做异常捕获，比如网络、文件、用户输入。

还有一个常见误区是"捕获了就完事"。真正健壮的工具，捕获异常后至少要记录发生了什么，包括时间、目标、错误类型，方便事后复盘。比如批量扫描时某个目标超时，你记一行日志，整体结果里也标个"未知"，而不是默默跳过——否则你永远不知道是工具没扫到，还是它真的没开端口。异常处理的终点不是"不崩"，而是"崩得明白、跑得下去"。

## 小测验：看看你掌握了没

- 问题一：有一段代码无论成功失败都要关闭数据库连接，该用 `else` 还是 `finally`？
- 问题二：`except Exception:` 为什么不建议随便用？
- 问题三：想让文件用完自动关闭，优先用 `try/finally` 还是 `with`？

（答案思路：`finally` 必定执行；`except Exception` 会连真 bug 一起吞掉难排查；优先 `with`，更简洁不易漏。）

## 这一篇你该记住的

- 异常是运行时的意外（除零、类型错、文件缺失等），会让程序中断。
- `try/except` 捕获具体异常类型，别滥用 `except Exception` 吞掉所有错误。
- `else` 在无异常时执行，`finally` 必定执行，适合释放文件/连接等资源。
- `as e` 拿到异常对象看详情；`raise` 主动抛错，`raise` 不带参数可原样重抛。
- 自定义异常继承 `Exception`，让调用方能精确区分错误类型。
- 扫描器用异常处理保证"单点失败不中断整体"，工具才稳。

下一篇讲**文件操作**：扫描结果要存盘、字典要读取、日志要追加，全靠 `open` 和 `with`。
