---
title: Python 网络通信：用 requests 和 socket 让工具会"发包"
description: 掌握 requests 发 GET/POST、带请求头与代理，以及 socket 做底层 TCP 探测，理解超时与异常处理，写出能真正和目标通信的工具。
category: backend
subcategory: python
tags: ['Python', '网络通信', 'requests', 'socket', 'HTTP', '代理']
pubDate: 2026-07-23
updatedDate: 2026-07-23
order: 6
---

安全工具的本质，说白了就是"和目标服务器说话"：发个请求看它回什么、探个端口看开没开、提交个 payload 看有没有漏洞。不会网络通信，工具就是个哑巴。

Python 做网络通信有两层：上层用 `requests` 发 HTTP 请求，简单到不像在写网络代码；底层用 `socket` 直接操作 TCP，适合做端口扫描、自定义协议。这一篇两层都讲，并强调超时和异常处理——网络世界最不缺的就是"等不到回应"。

## requests：发 HTTP 请求的首选

标准库自带 `urllib`，但语法啰嗦，几乎没人直接用。第三方库 `requests` 是事实标准，先装：

```bash
pip install requests
```

发一个最简单的 GET：

```python
import requests

r = requests.get("http://example.com")
print(r.status_code)     # 200
print(r.text[:100])      # 响应正文前 100 字
```

`r.status_code` 是状态码，`r.text` 是正文（自动按编码解码成字符串），`r.headers` 是响应头字典。就这么三行，你已经完成一次完整的 HTTP 通信。

## 带请求头、参数和超时

真实目标常看请求头判断你是不是"正常浏览器"，爬虫和扫描器都得伪装：

```python
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36",
    "Cookie": "session=abc123"
}
params = {"id": 1, "page": 2}
r = requests.get("http://target.com/news", headers=headers, params=params, timeout=5)
```

`params` 会自动拼成 `?id=1&page=2`；`timeout=5` 表示最多等 5 秒，**一定要设**，否则目标不回应你的脚本就永远卡在那。超时抛的是 `requests.exceptions.Timeout`，用前面学的 `try/except` 兜住。

## POST：提交数据

登录、上传、调接口都靠 POST：

```python
data = {"username": "admin", "password": "123456"}
r = requests.post("http://target.com/login", data=data, timeout=5)

# 发 JSON 用 json= 参数，requests 会自动加 Content-Type: application/json
r2 = requests.post("http://api.com/v1", json={"key": "val"}, timeout=5)
```

`data=` 发表单格式，`json=` 发 JSON 格式，别混。响应若是 JSON，直接 `r.json()` 转成字典，比自己 `json.loads(r.text)` 省事。

## 会话保持：Session

需要"登录后带着 cookie 继续操作"（比如进后台），用 `Session` 自动维持 cookie：

```python
s = requests.Session()
s.post("http://target.com/login", data={"u": "admin", "p": "x"})
r = s.get("http://target.com/admin")   # 自动带上登录后的 cookie
```

`Session` 还会复用 TCP 连接，批量请求更快。写需要鉴权的工具（后台扫描、越权测试）几乎必用。

## socket：底层 TCP 探测

`requests` 只管 HTTP。要做端口扫描、发原始 TCP、玩自定义协议，得用 `socket`：

```python
import socket

s = socket.socket()
s.settimeout(2)
try:
    s.connect(("192.168.1.1", 80))
    print("端口开放")
except (socket.timeout, ConnectionRefusedError):
    print("端口关闭或过滤")
finally:
    s.close()
```

`connect` 成功说明端口有人监听；抛 `ConnectionRefusedError` 通常代表"端口关"；超时则可能是"被防火墙过滤"。这三种状态正是端口扫描要区分的。配合 `with` 或 `finally` 关掉 socket，别留半开连接。

## 实战：一个极简端口扫描器

把 `socket` 和循环结合，扫一组常见端口：

```python
import socket

def scan_host(host, ports):
    open_ports = []
    for port in ports:
        s = socket.socket()
        s.settimeout(1)
        try:
            s.connect((host, port))
            open_ports.append(port)
            print(f"[开放] {host}:{port}")
        except (socket.timeout, ConnectionRefusedError):
            pass
        finally:
            s.close()
    return open_ports

result = scan_host("127.0.0.1", [21, 22, 80, 443, 3306, 8080])
print("开放端口：", result)
```

这段就是所有端口扫描器的核心：遍历端口、尝试连接、收集开放项。真实工具会加上多线程（下下篇讲）把速度提上去，再加服务指纹识别。

## 代理：让流量走特定通道

做测试时，常把流量导进 Burp 这类代理来观察：

```python
proxies = {
    "http": "http://127.0.0.1:8080",
    "https": "http://127.0.0.1:8080"
}
requests.get("http://target.com", proxies=proxies, timeout=5)
```

所有请求就会先经过本机 8080 端口的代理。调试请求为什么不对、看服务器到底回了什么，代理是利器。

## 常见新手坑

- **不设 timeout**：脚本卡死在等一个不回应的目标上，批量跑直接废掉。
- **`requests` 没装就 import**：先 `pip install requests`，别和内置 `urllib` 搞混。
- **POST 用错 data/json**：表单接口传成 JSON 会 400，反之亦然，看接口要求。
- **socket 忘了关**：半开连接堆积，可能被目标当成扫描封锁，也浪费本地资源。
- **忽略状态码**：只管 `r.text` 不看 `r.status_code`，遇到 403/500 还当成功处理，结果全错。

## 小测验：看看你掌握了没

- 问题一：发请求时为什么一定要加 `timeout`？不加会怎样？
- 问题二：登录后访问后台接口，用普通 `requests.get` 还是 `Session`？为什么？
- 问题三：`socket.connect` 抛 `ConnectionRefusedError` 和超时，分别代表端口什么状态？

## 网络工具的礼貌与风控

能发包之后，紧接着要学的是"怎么发才不闯祸"。很多新手一激动就写个循环疯狂请求目标，结果要么把对方打挂、要么自己 IP 被封、要么踩到法律红线。

第一，控制速度。在请求之间加 `time.sleep(小延迟)`，别用零间隔狂轰。批量扫描尤其是目录爆破，目标服务器也是别人的资产，毫无节制的请求等同于拒绝服务攻击，既不安全也不道德，在授权测试之外更是违规。合理的间隔、单线程或受限并发，是对目标的基本尊重。

第二，只打你有权测试的目标。这是底线：未经授权对任何网站做扫描、爆破、注入测试，都可能触犯法律。写工具时最好内置"目标白名单"或"确认弹窗"，避免手滑把脚本指向了不该指的地方。专业的渗透测试永远先拿书面授权。

第三，留意自己的出口。公司或学校网络里，大量异常出站请求可能触发安防告警，甚至连累整个网段。用代理、限流量、挑非高峰时段，都是成熟工程师的自觉。

第四，优雅处理失败。网络世界充满意外：目标宕机、链路抖动、返回畸形数据。每一次请求都假设它可能失败，用超时和异常兜住，失败就记日志跳过，而不是让整个工具崩掉。把"稳"放在"快"前面，你的工具才配叫工具。

## 读懂响应比发出去更重要

很多新手把精力全花在"怎么把请求发出去"，却忽略了一件更关键的事：发出去之后，怎么从响应里拿到有价值的信息。一个 HTTP 响应里藏着很多信号：状态码告诉你请求是否被接受（200 成功、301 跳转、403 禁止、404 不存在、500 服务器错）；响应头里的 Server 字段可能泄露后端类型（Apache、Nginx、IIS），往往顺带暴露版本；正文里可能有错误信息、框架特征、甚至内网地址。

成熟的工具会把响应当成"情报"来解析，而不只是打印出来给人看。比如发现响应头 Server 是 IIS 6.0，你就知道可以重点关注它特有的解析漏洞；发现 403 但页面提示"需要登录"，说明路径存在只是权限不够，值得记一笔。养成"每收到响应都问一句：它告诉了我什么"的习惯，你的扫描器就从"敲门工具"升级成"侦察兵"。

还有一点：别只盯着成功响应。超时、连接拒绝、SSL 报错，这些"失败"本身也是情报——它可能意味着端口被过滤、服务挂了、或者你被 WAF 拦了。把这些状态分门别类记下来，比单纯打印一个红错更有用。网络通信的精髓，不在于你把包发得多漂亮，而在于你能从来回的对话里听出多少门道。

最后说个实用习惯：把每次请求的耗时记下来。网络慢往往不是你代码的问题，而是目标或链路的问题，但记录耗时能帮你发现异常——某个请求突然从几十毫秒变成几十秒，可能意味着目标开始限流，或者你已经被拦截。性能数据也是侦察情报的一部分，别只盯着功能对不对，也看看它跑得顺不顺。

另外，遇到 HTTPS 证书错误时不要急着关校验（`verify=False`）蒙混过关，那会让你暴露在中间人攻击之下；先搞清楚为什么证书不对，是目标自己配错了，还是你真的处在被劫持的网络里。关掉校验能跑通，但也可能让你看到的全是假响应。安全测试里，宁可请求失败，也别在不可信网络中贸然关掉证书校验。

## 这一篇你该记住的

- `requests` 是发 HTTP 的首选：`get`/`post`，`status_code`/`text`/`headers`/`json()` 取结果。
- 伪装用 `headers`（User-Agent/Cookie），参数用 `params`，POST 用 `data`(表单)或 `json`(JSON)。
- 务必设 `timeout`，并用 `try/except` 捕获 `requests.exceptions.Timeout`。
- 需鉴权连续操作请用 `Session`，自动维持 cookie、复用连接。
- 底层探测用 `socket`：`connect` 成功=开放，拒绝=关闭，超时=可能被过滤。
- 代理用 `proxies` 参数把流量导进 Burp 观察；socket 用完记得关。

下一篇讲**多线程**：单线程扫一百个端口要等半天，用 `threading` 让工具并行起来，速度起飞。
