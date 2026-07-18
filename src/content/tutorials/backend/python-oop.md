---
title: Python 面向对象：用"类"把工具封装成可复用零件
description: 搞懂类和对象、属性与方法、封装与继承，学会把扫描器、攻击脚本组织成清晰的代码结构，写出能复用、好维护的安全工具。
category: backend
subcategory: python
tags: ['Python', '面向对象', '类', '封装', '继承']
pubDate: 2026-07-19
order: 2
---

前面我们写的都是"一条线从头跑到尾"的脚本。脚本短还好，一旦你想写一个像样的扫描器——又要发请求、又要解析结果、又要存数据库、又要出报告——全堆在一个文件里会乱成一锅粥，改一处崩一片。

**面向对象（OOP）**就是来解决"代码变复杂后怎么不乱"的问题。它的核心思想特别生活化：把现实里的东西抽象成"对象"，每个对象有自己的**属性**（长什么样）和**方法**（能干什么）。比如"一个端口扫描器"这个对象，属性可以是目标 IP、端口列表，方法可以是"开始扫描""生成报告"。

这一篇讲清：类与对象、属性与方法、封装、继承。学完你就能把工具拆成干净的积木。

## 类与对象：图纸和实物

**类（class）**是"图纸"，**对象（object）**是按图纸造出来的"实物"。先画图纸：

```python
class Scanner:
    pass
```

这就定义了一个叫 `Scanner` 的空类。造一个实物（对象）：

```python
s = Scanner()      # 实例化：根据类创建对象
print(type(s))     # <class '__main__.Scanner'>
```

实际写工具时，类里会放属性和方法。

## 属性：对象"长什么样"

属性就是对象携带的数据。两种常见写法：

```python
class Scanner:
    timeout = 2          # 类属性：所有对象共享，比如默认超时 2 秒

    def __init__(self, target):
        self.target = target   # 实例属性：每个对象各自一份
```

`__init__` 是"构造函数"，对象一创建就自动执行，用来初始化。`self` 代表"当前这个对象自己"，必须写在方法第一个参数，但通过对象调用时不用传它。

```python
s1 = Scanner("192.168.1.1")
s2 = Scanner("10.0.0.5")
print(s1.target)     # 192.168.1.1
print(s2.target)     # 10.0.0.5
```

`s1` 和 `s2` 是两份独立的对象，各自的 `target` 互不干扰。`timeout` 是类属性，两个对象共用同一份。

## 方法：对象"能干什么"

方法就是定义在类里的函数，第一个参数永远是 `self`：

```python
class Scanner:
    def __init__(self, target):
        self.target = target
        self.open_ports = []

    def scan_port(self, port):
        # 这里简化成打印，真实场景会发 TCP 探测包
        print(f"正在扫描 {self.target}:{port}")
        self.open_ports.append(port)

    def report(self):
        print(f"{self.target} 开放端口：{self.open_ports}")

s = Scanner("192.168.1.1")
s.scan_port(80)
s.scan_port(443)
s.report()
```

注意 `scan_port` 里用了 `self.target` 和 `self.open_ports`——方法通过 `self` 访问对象自己的属性。这样数据和方法绑在一起，比满屏全局变量清晰太多。

## 封装：把内部细节藏起来

**封装**的意思是：对外只暴露必要的接口，内部怎么实现不让你操心。比如扫描器内部用哪种探测方式，调用者不需要知道，只要会 `scan_port()` 就行。

Python 用**命名约定**做封装（不是强制的）：

- 单下划线 `_x`：约定"这是内部用的，别随便访问"。
- 双下划线 `__x`：会触发名称改写，外部更难直接访问，算"较强私有"。

```python
class Scanner:
    def __init__(self, target):
        self.target = target
        self._raw_results = []     # 内部原始结果，别直接动

    def scan_port(self, port):
        self._raw_results.append(port)   # 内部自己用
```

真实工具里，你还会把"发包""解析响应""判断漏洞"拆成不同方法，调用者只调一个 `run()`，内部流程全藏起来。这就是封装带来的清爽。

## 继承：站在巨人肩膀上

**继承**让你基于一个已有类，扩展出新类，复用它的代码，只改需要改的地方。比如你有一个通用的 `Scanner`，想派生一个专门扫 Web 的 `WebScanner`：

```python
class Scanner:
    def __init__(self, target):
        self.target = target

    def ping(self):
        print(f"ping {self.target}")

class WebScanner(Scanner):        # 括号里写父类
    def check_title(self):
        print(f"抓取 {self.target} 的网页标题")

w = WebScanner("example.com")
w.ping()              # 继承自父类的方法，直接用
w.check_title()       # 自己新增的方法
```

`WebScanner` 白拿了父类的 `ping()`，又加了 `check_title()`。如果父类方法不够用，还可以在子类里**重写（override）**：

```python
class WebScanner(Scanner):
    def ping(self):
        print(f"Web 方式探测 {self.target}")
```

这样调用 `w.ping()` 就用子类自己的版本。继承特别适合写"一系列同类工具"：基础类管通用逻辑，子类各自实现差异部分。

## 一个能跑的小例子：目录扫描器骨架

把前面学的串起来，搭一个目录爆破工具的雏形：

```python
import time

class DirBruter:
    def __init__(self, base_url, wordlist):
        self.base_url = base_url.rstrip("/")
        self.wordlist = wordlist
        self.found = []

    def _build_url(self, path):
        return f"{self.base_url}/{path}"

    def run(self):
        for word in self.wordlist:
            url = self._build_url(word)
            # 真实场景用 requests.get(url) 判断状态码
            print(f"探测 {url}")
            time.sleep(0.1)      # 放慢，别把目标打挂
            self.found.append(url)
        return self.found

bruter = DirBruter("http://test.com", ["admin", "login", "api"])
bruter.run()
```

这里 `_build_url` 是内部方法（单下划线），`run()` 是对外入口，`found` 存结果。结构清晰，后面接上真实请求库就能用。

## 常见新手坑

- **忘了 `self`**：方法定义不写 `self`，调用时反而报错；或者调用时手滑传了 `self`（不用，`s.method()` 自动传）。
- **在 `__init__` 外直接赋值却想共享**：写在类里的属性（如 `timeout=2`）才是类属性，写在 `__init__` 里 `self.x=...` 是实例属性，别搞混。
- **把可变对象当类属性**：比如 `open_ports = []` 写在类里，所有对象会共用同一个列表，导致数据串台。可变状态请放 `__init__` 里用 `self`。
- **继承链太长**：一层套一层反而难懂。工具开发一般一两层继承足够，别过度设计。

## 类方法、静态方法与友好打印

除了普通实例方法，还有两种特殊方法经常用到：

**类方法 `@classmethod`**：第一个参数是 `cls`（代表类本身），常用于提供"另一种构造对象的方式"。

```python
class Scanner:
    def __init__(self, target):
        self.target = target

    @classmethod
    def from_file(cls, path):
        with open(path) as f:
            return cls(f.read().strip())   # 从文件读目标再建对象
```

**静态方法 `@staticmethod`**：既不接收 `self` 也不接收 `cls`，相当于类里的"独立工具函数"，适合放和类相关但不依赖对象状态的逻辑。

```python
class Scanner:
    @staticmethod
    def is_valid_ip(ip):
        return len(ip.split(".")) == 4    # 粗略判断是不是 IPv4
```

**`__str__`**：定义对象被 `print()` 时显示什么，调试时一眼看清状态。

```python
class Scanner:
    def __init__(self, target):
        self.target = target
    def __str__(self):
        return f"Scanner(目标={self.target})"
```

不定义的话，打印出来是一串看不懂的内存地址；定义了就清清爽爽。

## 实战：写一个漏洞检测类

把继承、封装、方法都用上，搭一个 SQL 注入检测的骨架：

```python
class VulnChecker:
    def __init__(self, url):
        self.url = url
        self.vulnerable = False

    def _build_payload(self):
        return f"{self.url}?id=1'"

    def run(self):
        # 真实场景用 requests 发请求、比对响应差异
        print(f"对 {self.url} 注入测试：{self._build_payload()}")
        # 假设发现异常报错，判定存在
        self.vulnerable = True
        return self.vulnerable

class TimeBasedChecker(VulnChecker):
    """基于时间的盲注检测，重写判断逻辑"""
    def run(self):
        print(f"对 {self.url} 发起延时注入")
        self.vulnerable = True
        return self.vulnerable

base = VulnChecker("http://a.com/news")
base.run()
TimeBasedChecker("http://a.com/news").run()
```

父类管通用流程，子类只改 `run()` 里的判断策略——这就是面向对象在真实工具里的价值：改动局部、复用整体。

## 常见新手坑（补充）

- **`@classmethod` 写成 `@staticmethod` 却用了 `cls`**：两者参数不同，混用会报"缺少参数"。
- **`__str__` 里又打印自己**：容易递归爆栈，返回字符串即可，别在里头 `print(self)`。
- **过度继承**：能用一个函数解决的事，不必硬套类。脚本小、逻辑直，普通函数反而更清楚。

## 什么时候该用面向对象

很多新手学完类，就恨不得把所有脚本都写成类，结果反而更绕。一个实用的判断标准是：当你发现代码里出现"一组数据加上围绕这组数据的多个操作"时，类就顺理成章。比如一个扫描器，它既有目标、端口、结果这些"数据"，又有扫描、解析、报告这些"操作"，天然适合封装成类。反过来，如果你只是写个一次性小脚本，比如"把当前目录的日志按日期重命名"，一个函数就搞定，硬套类只会多写样板代码。

另外，面向对象最大的收益在"项目变大、要长期维护"时才显现。今天你写的爆破工具，下周想加代理功能、下个月想支持多种协议，如果一开始就用类把结构理清，扩展只是加方法或加子类；如果全是一坨全局变量和函数，改动时就要处处小心。所以与其问"要不要学面向对象"，不如问"我想写的工具能不能活过三个月"——能，就值得用类组织。

## 这一篇你该记住的

- 类是图纸、对象是实物；`__init__` 负责初始化，`self` 指当前对象。
- 属性存数据（类属性共享、实例属性各一份），方法写行为，方法里用 `self` 访问属性。
- 封装用下划线约定隐藏内部细节，让调用者只关心接口。
- 继承通过 `class 子类(父类)` 复用代码，可重写父类方法；适合写同类工具家族。
- 真实工具把"发包/解析/存储/报告"拆成不同方法，结构远比一坨脚本清晰。

下一篇讲**异常处理**：网络请求会超时、文件可能不存在、目标可能崩，学会用 `try/except` 兜住这些意外，工具才稳。
