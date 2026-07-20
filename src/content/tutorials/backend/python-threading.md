---
title: Python 多线程：让扫描工具并行跑起来
description: 掌握 threading 创建线程、join 等待、Lock 防竞争、Queue 安全传递任务，理解 GIL 与 daemon，写出一个真正提速的多线程端口扫描器。
category: backend
subcategory: python
tags: ['Python', '多线程', 'threading', 'Lock', 'Queue', '并发']
pubDate: 2026-07-24
updatedDate: 2026-07-24
order: 7
---

前面我们写的扫描器都是"单线程"：一个端口扫完才扫下一个。扫十个端口还行，扫一千个、扫整个网段，你得等到地老天荒。现实里目标不会因为你慢就多等一秒，所以**并发**是安全工具的必修课。

Python 里做并发有两套：`threading`（多线程）和 `multiprocessing`（多进程）。对"等网络响应"这类任务，多线程最划算——线程在等网络时空出来去干别的。这一篇讲 `threading` 的核心：怎么开线程、怎么等它们结束、怎么避免多个线程抢同一份数据打起来。

## 线程是什么，为什么能提速

**线程**是程序里的一条"执行流"。单线程像只有一个收银台，顾客排成一队；多线程像开了多个收银台，同时结账。当任务在"等"（比如等网络返回、等磁盘读写）时，别的线程能趁机干活，整体吞吐量就上去了。

Python 开线程很简单：

```python
import threading

def job(name):
    print(f"线程 {name} 开始干活")

t = threading.Thread(target=job, args=("A",))
t.start()          # 启动线程
t.join()           # 等这个线程结束再往下走
```

`target` 是要跑的函数，`args` 是传给它的参数（必须是元组）。`start()` 真正开跑，`join()` 阻塞当前线程直到它结束——如果你想等所有线程都完事再汇总结果，`join` 少不了。

## 实战：多线程端口扫描

把单线程扫描改成多线程，速度立刻起飞：

```python
import socket
import threading

open_ports = []
lock = threading.Lock()

def scan(host, port):
    s = socket.socket()
    s.settimeout(1)
    try:
        s.connect((host, port))
        with lock:
            open_ports.append(port)
        print(f"[开放] {port}")
    except (socket.timeout, ConnectionRefusedError):
        pass
    finally:
        s.close()

host = "127.0.0.1"
ports = [21, 22, 80, 443, 3306, 8080]
threads = []
for port in ports:
    t = threading.Thread(target=scan, args=(host, port))
    t.start()
    threads.append(t)

for t in threads:
    t.join()       # 等所有线程结束

print("开放端口：", open_ports)
```

每个端口一个线程同时去连，原来串行的等待被压成了并行。真实工具会把端口数做成几千、线程数控制在几十到几百，既快又不把本机打爆。

## Lock：别让线程抢同一份数据

注意上面用了 `lock`。为什么？因为多个线程可能同时往 `open_ports` 里 `append`，而列表的 `append` 在极端情况下不是"原子"的，并发改同一个变量会丢数据或出错。用 `Lock` 把"读—改—写"锁成一段，同一时刻只有一个线程能进：

```python
lock = threading.Lock()
with lock:
    open_ports.append(port)   # 同一时刻只有一个线程能执行这里
```

凡是多个线程会改的"共享数据"（结果列表、计数器、写入同一个文件），都要用 `Lock` 保护。漏了锁，bug 会时有时无、极难复现，是并发编程最隐蔽的坑。

## Queue：线程间的安全信箱

比直接共享列表更优雅的做法是用 `queue.Queue`——它是线程安全的"队列"，天生支持多生产者多消费者，不用自己加锁：

```python
import queue

task_q = queue.Queue()
for port in ports:
    task_q.put(port)     # 生产者放任务

def worker(host):
    while not task_q.empty():
        port = task_q.get()
        scan(host, port)
        task_q.task_done()

for _ in range(20):      # 开 20 个工作线程
    threading.Thread(target=worker, args=(host,), daemon=True).start()

task_q.join()            # 等队列里任务全处理完
```

`Queue` 把"任务分发"和"结果收集"解耦，是写线程池类工具的标准套路。`task_done()` 和 `join()` 配合，能精确知道"活都干完了吗"。

## daemon 线程：主线程退出就跟着走

普通线程不结束，整个程序就不会退出（会一直挂起等它）。设 `daemon=True` 的线程是"守护线程"，主线程一结束它就强制退出，适合做后台心跳、日志这类"可有可无"的任务：

```python
t = threading.Thread(target=heartbeat, daemon=True)
t.start()
```

但注意：守护线程里的资源不会被优雅清理，别拿它做"必须存盘"的关键活。

## GIL：Python 多线程的真相

必须泼盆冷水：CPython 有 **GIL（全局解释器锁）**，同一时刻只有一个线程在跑 Python 字节码。这意味着多线程**算数密集**的任务（比如暴力破解哈希）并不能真正并行，提速有限；但**网络/IO 密集**的任务（等响应）不受影响，因为等的时候线程把 GIL 让出来了——而扫描、爬虫恰好是 IO 密集，所以多线程依然香。

如果你真要榨干多核做重计算，用 `multiprocessing`（多进程，每个进程有独立 GIL）。记住一句话：等网络用多线程，拼算力用多进程。

## 常见新手坑

- **共享数据不加锁**：结果偶尔丢失、计数不准，且难以复现。
- **忘了 join**：主线程跑完直接退出，子线程的活还没干完，结果不全。
- **线程开太多**：开上万个线程，上下文切换反而拖慢，还可能耗尽系统资源。控制在几十到几百。
- **误以为多线程能加速一切**：算数密集任务受 GIL 限制，该用多进程。
- **守护线程做关键落盘**：主线程退出它也被杀，数据可能没写完。

## 小测验：看看你掌握了没

- 问题一：多个线程要往同一个列表追加结果，为什么必须加锁或用 Queue？
- 问题二：主线程启动了一堆子线程就结束了，但结果不全，最可能漏了哪句？
- 问题三：扫描器是网络密集任务，用多线程还是多进程更合适？为什么？

## 多线程什么时候该收手

并发不是越多越好，这是新手最容易上头的地方。开几百个线程去连目标，本地上下文切换的开销会抵消并行的收益，目标那边也可能因为瞬间大量连接把你整个 IP 封掉。一个务实的经验值：扫描类工具线程数控制在二十到两百之间，具体看目标承受力和你的网络带宽，宁可慢一点稳一点。

调试并发 bug 也和单线程不同。因为多个线程交错执行，同一个 bug 可能跑十次才出现一次，用 print 打日志往往看不到真相。建议的做法是：把共享数据访问都用 Lock 或 Queue 管住，缩小"临界区"（需要加锁的代码段）到最小；出问题时临时把线程数降到一，单线程复现，确认逻辑对了再加回并发。另外，给每个线程起个名字（`Thread(name=...)`），日志里带上线程名，出事时能直接定位是哪条线。

还有一个心态问题：别为了用多线程而用多线程。如果你的工具一次只扫一个端口、跑完就退，那单线程反而更清晰。并发是用来解决"大量等待"的，不是用来炫技的。先把单线程逻辑写对、写稳，再考虑加并发，这个顺序能省掉无数焦虑。

## 更省心的写法：concurrent.futures

如果你嫌自己管 `Thread`、`Lock`、`Queue` 太麻烦，标准库有个高级封装 `concurrent.futures.ThreadPoolExecutor`，几行就能开线程池：

```python
from concurrent.futures import ThreadPoolExecutor

def scan(port):
    # ...探测逻辑...
    return port

with ThreadPoolExecutor(max_workers=20) as ex:
    results = ex.map(scan, [80, 443, 3306])
```

`max_workers` 控制并发数，`map` 把任务分给线程并收集结果，连 `join` 都不用写。线程池是日常写工具最常用到的并发形态，建议优先掌握，等底层 API 用熟了再回来对比，你会更懂它帮你省了哪些坑。日常写扫描、爆破类工具，线程池基本是默认选择，先用熟它就能应付大多数场景。它把"开线程、等结束、收结果"这三件麻烦事打包好了，你只管写任务函数。新手写工具优先用这个，既安全又简洁，底层还是 `threading`，只是帮你把脏活揽了。等你需要精细控制（比如动态增减线程、拿中间进度）时，再回头用底层 API 也不迟。多线程这块，先把"能并行、要加锁、控数量"三件事吃透，剩下的都是在这上面的组合与取舍。

## 这一篇你该记住的

- 线程是"执行流"，多线程能让"等网络"的空闲被利用，整体提速。
- `threading.Thread(target=..., args=(...))` 创建，`start()` 启动，`join()` 等结束。
- 共享数据（结果列表、文件）必须用 `Lock` 保护，或用线程安全的 `queue.Queue`。
- `Queue` + 多 worker 是写线程池工具的标准套路，`task_done`/`join` 判断活干完没。
- `daemon=True` 的守护线程随主线程退出，别用它做必须落盘的关键任务。
- GIL 让多线程算数密集任务无法真并行；网络/IO 密集（扫描、爬虫）用多线程正合适。

下一篇讲**爬虫**：用 requests 抓页面、用 BeautifulSoup 或正则提取链接和标题，把"人工翻页"变成"脚本自动翻"。
