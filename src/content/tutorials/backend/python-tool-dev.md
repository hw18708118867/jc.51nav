---
title: Python 工具开发：把前面所学合成实战武器
description: 综合前面所有知识，做出目录爆破、服务识别、子域名收集三件高频工具，并了解 Burp/Sqlmap 插件开发思路，形成可复用的安全工具箱。
category: backend
subcategory: python
tags: ['Python', '工具开发', '目录爆破', '服务识别', '子域名', '插件']
pubDate: 2026-07-26
updatedDate: 2026-07-26
order: 9
---

走到这一章，你已经集齐了写工具的所有零件：变量与流程控制、面向对象组织代码、异常处理兜底、标准库读写文件、requests 发包、多线程提速、爬虫采集。接下来就是"组装"——把零件拼成真的能用的安全工具。

文档里这一章列了目录扫描、服务扫描、子域名扫描、Burp 插件、Sqlmap 插件、综合漏洞工具。我们挑最高频的三件（目录爆破、服务识别、子域名收集）做完整实现，再点一下插件开发的思路，让你知道"工具箱"还能怎么扩展。

## 工具一：目录爆破（DirBrute）

目标站点常藏着 `/admin`、`/login`、`/api` 这类不对外链接的目录。目录爆破就是拿一份常见路径字典，逐个请求看哪个返回 200。

```python
import requests

def dir_brute(base_url, wordlist, exts=("",)):
    found = []
    for word in wordlist:
        for ext in exts:
            url = f"{base_url.rstrip('/')}/{word}{ext}"
            try:
                r = requests.get(url, timeout=3, allow_redirects=False)
                if r.status_code in (200, 301, 302, 403):
                    print(f"[{r.status_code}] {url}")
                    found.append(url)
            except requests.exceptions.RequestException:
                pass
    return found

words = ["admin", "login", "api", "config", "backup"]
dir_brute("http://test.com", words, exts=("", ".php", ".bak"))
```

关键点：`allow_redirects=False` 避免 301/302 被自动跟随后误判；`403` 也值得记——说明路径存在只是禁止访问。配合上篇的多线程，把 `wordlist` 换成几千词的字典，就是真实可用的爆破器。

## 工具二：服务识别（指纹）

扫到开放端口后，下一步是"跑在上面的是什么服务、什么版本"。最简单的方法是发个探测包看它回什么"招牌"。

```python
import socket

def grab_banner(host, port, timeout=2):
    s = socket.socket()
    s.settimeout(timeout)
    try:
        s.connect((host, port))
        s.sendall(b"HEAD / HTTP/1.0\r\n\r\n")   # 对 Web 端口发个 HTTP 探测
        banner = s.recv(1024).decode(errors="ignore")
        return banner.strip().split("\n")[0]
    except (socket.timeout, ConnectionRefusedError, OSError):
        return ""
    finally:
        s.close()

print(grab_banner("127.0.0.1", 80))
```

不同服务返回的"banner"不同：HTTP 服务会回状态行，SSH 会回 `SSH-2.0-...`，FTP 会回 `220 ...`。靠这些特征就能粗略判断服务类型和版本，这正是 Nmap 指纹识别的简化原理。

## 工具三：子域名收集

收集目标子域名（如 `admin.xxx.com`、`api.xxx.com`）能扩大攻击面。思路之一是请求一个公开的证书透明日志接口或 DNS 解析接口：

```python
import requests

def subdomains(domain):
    results = []
    # 示例：用 crt.sh 的证书透明日志查历史子域（仅示意，需联网）
    try:
        r = requests.get(f"https://crt.sh/?q=%.{domain}&output=json", timeout=8)
        for item in r.json():
            name = item.get("name_value", "")
            if name and name not in results:
                results.append(name)
    except (requests.exceptions.RequestException, ValueError):
        pass
    return results

print(subdomains("example.com"))
```

真实工具还会结合 DNS 爆破（用字典猜 `a.example.com`、`b.example.com` 能否解析）、搜索引擎语法等，多源交叉，覆盖面才广。注意这类查询会对外发请求，务必只对你有权测试的目标做。

## 把它们组织成一个工具箱

前面学的面向对象这时派上用场：每个工具做成一个类，统一接口、统一结果格式、统一日志。

```python
class Target:
    def __init__(self, host):
        self.host = host
        self.open_ports = []
        self.dirs = []
        self.subs = []

    def run_all(self):
        # 依次调用端口扫描、目录爆破、子域收集
        print(f"对 {self.host} 开始综合侦察")
        # ...各模块结果填进 self
        return self

t = Target("test.com")
report = t.run_all()
```

这样你得到一个"侦察对象"，所有发现都挂在它身上，最后统一导出 JSON 报告。随着经验增长，往 `Target` 里加方法（漏洞验证、弱口令尝试）就行，结构始终清晰。

## 插件开发：让工具长在平台里

文档还提到 Burp 插件、Sqlmap 插件。思路是：大平台（Burp、Sqlmap）提供了扩展接口，你写的 Python 脚本注册进去，就能在平台流程里自动干活。

- **Burp 插件**：用 Burp 的 Extender API，可以自动修改请求、标记可疑参数、把流量喂给你的分析脚本。写之前要先学它用的接口规范（Burp 原生偏 Java，也有通过 Montoya API 或桥接方式接 Python 的方案）。
- **Sqlmap 插件**：Sqlmap 支持 `--eval`、自定义 tamper 脚本（用 Python 写，对 payload 做编码变形绕过 WAF）。这是渗透里极实用的"插件"，专门对付各种过滤规则。

插件开发门槛比独立脚本高，因为要懂宿主平台的接口。但核心能力还是你这几章练出来的：读文档、发请求、解析响应、处理异常。先把独立工具写熟，再碰插件自然水到渠成。

## 工具开发的工程习惯

能跑和"能长期用"之间差着习惯：

- **参数化**：目标、字典路径、线程数、超时都做成命令行参数（`argparse`），别写死在代码里，换目标改参数即可。
- **结果落盘**：扫描结果及时写文件（JSON/CSV），中断也能从断点续，也方便事后分析。
- **日志分级**：正常发现、警告、错误分开记，排错一眼定位。
- **失败兜底**：每个外部调用都假设会失败，用异常兜住，单点失败不拖垮整体。
- **可维护**：用类组织、函数拆细、加注释，三个月后你自己还看得懂。

## 常见新手坑

- **字典写死**：换目标还要改代码，正确做法是参数传入字典文件路径。
- **不落盘**：跑了一小时断电，结果全没，白干。
- **无延迟狂扫**：被目标封 IP，还踩合规红线。
- **忽略编码**：响应中文乱码导致解析出错，记得设 `encoding`。
- **插件不看宿主接口规范**：照自己想象写，注册不进去或运行时崩。

## 小测验：看看你掌握了没

- 问题一：目录爆破时，为什么 403 也值得记录下来？
- 问题二：服务识别靠什么判断"跑的是什么"？
- 问题三：综合工具为什么建议用类来组织，而不是全写全局变量？

## 工具写完后，怎么验证它真的有用

很多人写完工具跑通一次就以为大功告成，结果一到真实场景就露馅。验证工具有三个层次：第一，用明显该成功的目标测——比如目录爆破拿 `admin` 去一个真有 `/admin` 的测试站，确认能报出来；第二，用明显该失败的目标测——拿一个干净站点，确认它安静地返回"无发现"而不是崩溃或误报；第三，边界测试——空字典、超长路径、目标宕机、网络断开，看工具是优雅兜底还是红一片。

最好建一个"测试清单"文件，把每次要验的点列出来，新加功能就补一条。再进阶一点，给核心函数写几个小测试（哪怕只是断言返回类型对不对），改动后跑一遍，能拦住大部分"改 A 坏 B"的回归问题。工具的价值不在于写得多花哨，而在于"每次用都靠谱"——而靠谱是验证出来的，不是自封的。把验证当成写工具的最后一环，你的武器库才会越用越顺手。

## 给工具配个 README 和版本号

工具写多了，三个月后你未必记得每个参数怎么用。给每个脚本头上加几行说明：它干什么、要什么参数、跑出来结果在哪。再正式点，建个 `README.md` 写用法示例，用 `argparse` 的 `--help` 自动生成帮助。给工具标个版本号（比如 `v0.1`），改动后升版本，出问题时能分清"现在跑的是哪一版"。

这些琐事看似不重要，却是工具从"玩具"变成"生产力"的分水岭。能复用、能交接、能回溯，才算真工具，而不是写一次就扔的草稿。你花十分钟写的说明，可能替未来的自己省下半小时重新读代码——这笔账怎么算都划算。

## 这一篇你该记住的

- 目录爆破：拿路径字典逐个请求，关注 200/301/302/403，配合多线程提速。
- 服务识别：连上端口发探测包，读 banner 特征判断服务与版本（Nmap 指纹的简化版）。
- 子域名收集：查证书透明日志、DNS 爆破、搜索引擎多源交叉，扩大攻击面。
- 用类把多个工具组织成"侦察对象"，统一接口与结果，方便扩展和导出报告。
- 插件（Burp/Sqlmap）是进阶，核心是读懂宿主接口规范，底子还是发请求+解析+异常处理。
- 工程习惯：参数化、结果落盘、日志分级、失败兜底、代码可维护。

到这篇，四阶段的 Python 安全工具开发九章全部写完。你已经能从零写出目录爆破、服务识别、子域名收集这类实战工具，后面五阶段的 APP 渗透、代码审计、Java 漏洞复现，都会反复用到这一整套本领。
