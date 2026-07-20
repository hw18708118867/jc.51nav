---
title: Go 并发：goroutine 与 channel 的协作之道
description: 从"为什么需要并发"讲起，掌握 goroutine 的轻量启动、channel 的通信、select 多路复用与 sync 同步原语，理解"不要通过共享内存来通信"的哲学。
category: backend
subcategory: golang
tags: ['Go', '并发', 'goroutine', 'channel']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 4
---

后端服务最典型的场景是什么？是"同时"应付成千上万个请求。传统语言靠线程，但线程贵（一个占几 MB 栈）、切换慢，开几千个就吃不消。Go 的解法是：用**极轻量的 goroutine**（初始栈只有几 KB，可动态扩容）和**channel（通道）**来通信。

Go 有一句名言：**"不要通过共享内存来通信，而要通过通信来共享内存。"** 别的语言多用锁保护共享变量，Go 更推荐用 channel 在 goroutine 之间"传数据"，从根上减少竞态。这一篇我们把并发这套机制讲透。

## goroutine：一行就开一个"轻量线程"

在函数调用前加 `go` 关键字，这个函数就在**新的 goroutine** 里并发执行，主流程不等待它：

```go
func say(msg string) {
    for i := 0; i < 3; i++ {
        fmt.Println(msg)
    }
}

func main() {
    go say("协程A")
    say("主流程")
}
```

`go say("协程A")` 瞬间启动一个新 goroutine 去跑，主流程继续往下走。goroutine 由 Go 运行时（runtime）自己调度在操作系统线程上，你完全不用管线程池。一个程序轻松跑几十万个 goroutine 都不稀奇。

> 注意：上面例子里主流程可能比协程A先结束，程序一退出协程A 就没机会打印完。真实场景要用 channel 或 `sync.WaitGroup` 等它。

## channel：goroutine 之间传数据的管道

channel 是**带类型的管道**，一端发、一端收，自带同步——发的时候如果没人收，就阻塞等；收的时候如果没数据，也阻塞等。这就天然避免了"抢同一个变量"的混乱。

```go
ch := make(chan string) // 创建无缓冲 channel

go func() {
    ch <- "你好 from 协程" // 发送
}()

msg := <-ch // 接收，会阻塞直到有数据
fmt.Println(msg)
```

几个要点：

- `chan T` 是类型，`make(chan T)` 创建。
- `<-ch` 是"从 channel 收"，`ch <- v` 是"往 channel 发"。
- **无缓冲 channel**：发送和接收必须"同时就位"，否则阻塞——这叫"同步交接"。
- **有缓冲 channel**：`make(chan int, 3)` 带容量，满了才阻塞发送，空了才阻塞接收。

## 用 channel 控制并发数量

真实场景常要"并发跑 N 个任务，全部跑完再继续"。用 `WaitGroup` 等所有 goroutine 结束：

```go
func worker(id int, wg *sync.WaitGroup) {
    defer wg.Done() // 结束时通知 WaitGroup 减一
    fmt.Printf("工人%d 干完活\n", id)
}

func main() {
    var wg sync.WaitGroup
    for i := 1; i <= 3; i++ {
        wg.Add(1) // 每启动一个就加一
        go worker(i, &wg)
    }
    wg.Wait() // 阻塞，直到所有 Done 都执行完
    fmt.Println("全部完成")
}
```

`Add` 登记任务数，`Done` 完成一个减一，`Wait` 等到归零。这是 Go 并发里最高频的"等一群活干完"模板。

## select：同时等多个 channel

当一个 goroutine 要等"多个 channel 任意一个有消息"，用 `select`，语法像 `switch`：

```go
select {
case msg1 := <-ch1:
    fmt.Println("收到ch1:", msg1)
case msg2 := <-ch2:
    fmt.Println("收到ch2:", msg2)
case <-time.After(2 * time.Second):
    fmt.Println("等了2秒，超时")
default:
    fmt.Println("没有 channel 就绪，立即走这里")
}
```

`select` 会随机挑一个"就绪"的 case 执行；都沒就绪且有 `default` 就走 default（非阻塞）；没有 default 就阻塞等待。常用来做**超时控制**——这是写网络服务保命的技能。

## sync 原语：当共享真的不可避免

虽然推荐用 channel，但有些场景直接共享变量更方便，这时用 `sync` 包的锁：

```go
var (
    counter int
    mu      sync.Mutex
)

func inc() {
    mu.Lock()   // 加锁
    defer mu.Unlock() // 解锁（defer 保证一定释放）
    counter++
}
```

`Mutex` 保证同一时刻只有一个 goroutine 能进临界区。`sync.Once` 保证某段代码只跑一次（常用于单例初始化），`sync.Map` 是并发安全的 map。

## 常见新手坑

- **主程序提前退出导致 goroutine 没跑完**：忘了用 `WaitGroup` 或 channel 等，协程被腰斩。
- **向已关闭的 channel 发送会 panic**：关闭 channel 用 `close(ch)`，只能由发送方关闭，且关了就不能再发。
- **channel 死锁**：无缓冲 channel 双方都在等对方先动，程序卡死报 `deadlock`。检查收发是否真的能配对。
- **在 goroutine 里直接改外部变量不加锁**：典型数据竞争，结果不可预测，用 `-race` 编译运行能检测。
- **goroutine 泄漏**：goroutine 永远阻塞在收一个永远不会来的消息上，会一直占内存。记得设计好退出机制。

## 实战：并发抓取多个 URL 的状态码

把 goroutine + channel + WaitGroup 串起来，模拟"并发探测多个站点"：

```go
func check(url string, ch chan string, wg *sync.WaitGroup) {
    defer wg.Done()
    // 模拟网络请求耗时
    time.Sleep(100 * time.Millisecond)
    ch <- fmt.Sprintf("%s 状态正常", url)
}

func main() {
    urls := []string{"http://a.com", "http://b.com", "http://c.com"}
    ch := make(chan string, len(urls)) // 有缓冲，避免阻塞
    var wg sync.WaitGroup

    for _, u := range urls {
        wg.Add(1)
        go check(u, ch, &wg)
    }

    go func() {
        wg.Wait()
        close(ch) // 所有任务完成再关 channel
    }()

    for msg := range ch { // channel 关闭后 range 自动结束
        fmt.Println(msg)
    }
}
```

这个模式在真实后端里无处不在：并发调多个下游接口、批量查数据库、并行处理消息队列。把"启动协程 + 用 channel 收结果 + WaitGroup 等齐 + 关 channel"这套骨架记熟，你就掌握了 Go 并发的七成。

## 新手怎么把并发用熟

并发是 Go 最迷人的部分，也是最容易写出 bug 的部分。建议每天一个小练习：用 goroutine 并发打印数字并等它们全结束；用 channel 在两个协程间传一句话；用 `select` + `time.After` 给一个"可能很慢的操作"加超时。重点是**亲手触发一次死锁、一次竞态**，再用 `-race` 和 `WaitGroup` 修好它——踩过的坑比看十遍书都牢。

另一个重要心法：**不要一上来就上锁**。先问自己"能不能用 channel 把数据传出来，而不是让多个协程抢同一个变量"。Channel 是 Go 的母语，锁是外来语。能用 channel 清晰表达的，优先 channel。

还有，注意 goroutine 的生命周期。每个 `go` 启动的协程都要想清楚"它什么时候结束"。长期运行的服务里，泄漏的 goroutine 会悄悄吃掉内存，是线上事故的常见根源。

## 小测验：看看你掌握了没

- 问题一：怎么让主程序等所有 goroutine 干完活？答案：用 `sync.WaitGroup`，`Add` 登记、`Done` 减一、`Wait` 阻塞等归零。
- 问题二：`select` 的 `default` 分支有什么用？答案：让 select 在非阻塞模式下立即执行，没有 channel 就绪就走 default。
- 问题三：无缓冲 channel 和有缓冲 channel 在"发送"行为上有什么区别？答案：无缓冲必须收发同时就位才不阻塞；有缓冲在容量未满前发送不阻塞。

## 这一篇你该记住的

- goroutine 用 `go` 启动，轻量到能开几十万个，由 runtime 调度。
- channel 是 goroutine 间通信的管道，`<-ch` 收、`ch <- v` 发，自带同步。
- 等一群任务用 `sync.WaitGroup`：`Add`/`Done`/`Wait`。
- `select` 多路等待 channel，配 `time.After` 做超时控制。
- 共享变量用 `sync.Mutex` 加锁，但优先用 channel 而非锁。
- 警惕死锁、channel 误关、goroutine 泄漏，可用 `-race` 检测竞态。

下一篇我们讲 **用 Go 写 Web 服务**：`net/http` 标准库一把梭，几分钟起一个能处理 JSON 的 HTTP 接口。
