---
title: Python 爬虫：自动抓取网页里的链接与信息
description: 用 requests 抓页面、BeautifulSoup 与正则提取标题和链接，结合多线程提速，理解反爬（请求头/限速/robots）与合规边界，写出能自动翻页的采集器。
category: backend
subcategory: python
tags: ['Python', '爬虫', 'requests', 'BeautifulSoup', '反爬', '采集']
pubDate: 2026-07-25
updatedDate: 2026-07-25
order: 8
---

信息收集阶段，最累的活之一就是"把目标站点相关的页面、链接、邮箱、手机号都翻出来"。人工一个个点、复制到表格，几百个页面能让你怀疑人生。爬虫就是干这个的：让脚本自动发请求、自动解析、自动翻到下一篇。

这一篇用 `requests` 抓页面，用 `BeautifulSoup` 和正则提取信息，结合前面学的多线程提速，并讲清楚反爬手段与合规边界——爬虫能做什么、不能碰什么，安全工程师必须心里有数。

## 先装解析库

抓页面用 `requests`，解析 HTML 用 `BeautifulSoup`（第三方库，比正则稳）：

```bash
pip install requests beautifulsoup4 lxml
```

`lxml` 是解析器后端，装上好让 BeautifulSoup 跑得快、容错强。

## 抓取并解析一个页面

```python
import requests
from bs4 import BeautifulSoup

r = requests.get("http://example.com", timeout=5)
r.encoding = r.apparent_encoding      # 尽量用页面声明的编码，避免中文乱码
soup = BeautifulSoup(r.text, "lxml")

title = soup.title.get_text() if soup.title else "无标题"
print("标题：", title)

links = []
for a in soup.find_all("a", href=True):
    links.append(a["href"])
print("链接数：", len(links))
```

`BeautifulSoup(r.text, "lxml")` 把 HTML 变成可查询的对象；`find_all("a", href=True)` 找出所有带 `href` 的链接标签。比起手写正则 `href="(.*?)"`，BeautifulSoup 能正确处理各种引号、换行、属性顺序，解析 HTML 首选它。

## 提取想要的信息

除了链接，常要抠标题、邮箱、表单、特定文本：

```python
# 抠所有邮箱
import re
emails = re.findall(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', r.text)
print("邮箱：", emails)

# 抠所有表单的 action
for form in soup.find_all("form"):
    print("表单提交到：", form.get("action"))

# 抠特定 class 的内容
for tag in soup.select(".price"):
    print("价格：", tag.get_text())
```

`soup.select` 支持 CSS 选择器，比 `find_all` 更灵活。正则适合抠"有固定模式"的文本（邮箱、手机号、IP），结构化的标签内容用 BeautifulSoup。

## 自动翻页：把链接当队列

单页没意思，爬虫的价值在"顺着链接爬"。一个简化思路：维护一个待抓集合，抓完一页把里面的同域链接加进去，循环直到抓够或抓完：

```python
from urllib.parse import urljoin

base = "http://test.com"
seen = set()
to_crawl = [base]

while to_crawl:
    url = to_crawl.pop()
    if url in seen:
        continue
    seen.add(url)
    try:
        r = requests.get(url, timeout=5)
        soup = BeautifulSoup(r.text, "lxml")
        for a in soup.find_all("a", href=True):
            full = urljoin(base, a["href"])   # 相对路径补全成绝对地址
            if full.startswith(base) and full not in seen:
                to_crawl.append(full)
    except requests.exceptions.RequestException:
        pass
    print(f"已抓 {len(seen)} 个页面")
```

`urljoin` 把 `/about` 这种相对路径拼成完整地址；`seen` 集合去重，避免同一个页面被反复抓、陷入死循环。这就是搜索引擎爬虫的迷你版。

## 结合多线程提速

抓几百个页面，单线程太慢。把上篇的 `Queue` + 多线程搬过来：

```python
import queue, threading

task_q = queue.Queue()
for u in seed_urls:
    task_q.put(u)

def worker():
    while not task_q.empty():
        url = task_q.get()
        try:
            r = requests.get(url, timeout=5)
            # 解析、提取、存盘...
        except requests.exceptions.RequestException:
            pass
        task_q.task_done()

for _ in range(10):
    threading.Thread(target=worker, daemon=True).start()
task_q.join()
```

十个线程同时抓，速度翻几倍。注意线程里共享的"已抓集合"和"结果文件"要用 `Lock` 或 `Queue` 保护，别重蹈上篇的坑。

## 反爬：目标不会乖乖让你爬

真实站点有各种反爬，了解它们才能写出"有礼貌"的爬虫：

- **User-Agent 校验**：不伪装成浏览器的请求直接拒绝。加上正常的 UA 头。
- **访问频率限制**：太快会被封 IP。每次请求间 `time.sleep` 加随机延迟，模拟人。
- **验证码 / 登录**：需要会话态。用 `Session` 维持登录后的 cookie。
- **robots.txt**：站点用 `robots.txt` 声明"哪些目录不允许爬"。正规爬虫应当先读它、遵守声明。

```python
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36"}
import time
time.sleep(1 + time.random())    # 1~2 秒随机延迟
```

## 合规边界：爬虫不能越线

这是安全工程师必须牢记的：爬虫能力越强，越要守住法律和道德底线。**只爬你有权测试的目标**，未经授权抓取他人站点、绕过登录限制、突破反爬机制大量采集，都可能触犯法律或网站服务条款。授权范围内的信息收集（比如你自己的资产、客户明确授权的渗透目标）才是正当用途。写爬虫时最好内置"只处理白名单域名""遵守 robots"的开关，既保护自己也不误伤。

## 常见新手坑

- **中文乱码**：没设 `r.encoding`，页面中文变乱码。试 `r.apparent_encoding` 或看 `<meta charset>`。
- **用正则硬解析 HTML**：HTML 稍有格式变化就匹配失败，优先 BeautifulSoup。
- **忘了去重**：没有 `seen` 集合，链接互相引用导致无限循环、内存爆掉。
- **爬太快被封**：零延迟狂抓，IP 很快进黑名单。加延迟、控并发。
- **忽略相对路径**：`/about` 直接当完整 URL 请求会失败，用 `urljoin` 补全。

## 小测验：看看你掌握了没

- 问题一：解析 HTML 为什么优先用 BeautifulSoup 而不是正则？
- 问题二：爬虫怎么避免同一个页面被反复抓取导致死循环？
- 问题三：`/about` 这种相对链接直接请求会怎样？该怎么处理？

## 爬到的数据怎么存最划算

爬虫跑完，抓来的链接、标题、邮箱、表单往哪放？小工具直接打印也行，但稍微正式点就该落盘。最推荐两种格式：JSON 和 CSV。JSON 适合存"嵌套结构"——比如一个页面下挂着多个链接和多个邮箱，用字典套列表很自然，而且人读得懂、程序也好解析；CSV 适合"扁平表格"——比如一列 URL、一列标题、一列状态码，用 Excel 打开一目了然，给非技术的同事看最方便。

存的时候记得用 `with open(..., encoding="utf-8")` 并加 `ensure_ascii=False`，否则中文变成 `\uXXXX` 谁也看不懂。如果数据量大，别等全部爬完才一次性写，边爬边追加（模式用 `'a'`），这样中途断了至少保住一部分，也省内存。把"边采边存"养成习惯，你的采集任务就经得起意外中断。

## 别让爬虫变成别人的负担

再强调一遍节奏问题：爬虫本质是"反复打扰别人服务器"。没有延迟、没有并发上限的爬虫，和拒绝服务攻击只有一线之隔。负责任的做法是：单域名并发别太高，请求间留随机延迟，遇到 429（太多请求）或 503 就退避重试而不是硬刚，发现目标明显扛不住就主动停下。这些不是"仁慈"，而是合规和安全的底线——你写的是安全工具，更该懂分寸。这一点和你在网络通信章节学到的礼貌与风控是一脉相承的。

另外，爬到的数据里可能含他人隐私（邮箱、手机号、内部路径），妥善保管、只用于授权范围内的工作，别随手外传。工具越强，使用者的责任心越要跟上，这也是安全工程师和脚本小子的区别所在。分寸感，往往比技术本身更能决定一个工具该不该被造出来、又该怎么被使用。宁可慢一点稳稳跑通，也别为了快而闯祸惹麻烦，这才是负责任的采集姿态。

## 什么时候该上爬虫框架

当你要爬的站点变多、要处理登录态、要应对复杂反爬、要把数据存进数据库，自己拼 `requests` + `BeautifulSoup` 会越来越臃肿。这时可以考虑 Scrapy 这类专业框架：它内置了调度、去重、中间件、管道，你只写"怎么解析""存到哪里"。但框架有学习成本，小任务杀鸡用牛刀。

经验法则是：一次性小脚本自己写，长期维护、多站点、要稳定的采集工程再上框架。先用手写脚本打牢基础，将来换框架也只是换层皮，底层的"发请求—解析—存盘"逻辑你早已烂熟于心。别一上来就追框架，没有手写功底，框架出问题时你连它背后在干什么都看不懂，反而更被动。框架是拐杖不是翅膀，底子扎实的人才用得动它，否则只是把不懂藏得更深。

## 这一篇你该记住的

- 抓页面用 `requests`，解析 HTML 用 `BeautifulSoup`（配 `lxml`），抠固定模式文本用 `re`。
- `find_all("a", href=True)` 取链接，`select` 用 CSS 选择器，`title.get_text()` 取标题。
- 自动翻页靠"待抓队列 + 已抓集合去重 + urljoin 补全相对路径"，这是迷你搜索引擎。
- 多线程用 `Queue` + worker 提速，共享数据记得加锁。
- 反爬要应对：伪装 UA、加随机延迟、用 Session 维持登录、遵守 robots.txt。
- 合规是底线：只爬授权范围内的目标，控制速度，不越线。

下一篇讲**工具开发**：把前面所有本事合起来，做目录扫描、服务识别、子域名收集这几件渗透里最高频的实战工具。
