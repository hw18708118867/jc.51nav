---
title: Go 写 Web 服务：用 net/http 起一个能跑的 HTTP 接口
description: 从 HTTP 基础讲起，用标准库 net/http 起服务、写路由、处理 JSON 请求与响应，并理解中间件与优雅关闭，几分钟上线一个 API。
category: backend
subcategory: golang
tags: ['Go', 'Web', 'net/http', 'JSON', 'API']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 5
---

前面四篇把 Go 的语法、函数、结构体、并发都过了一遍，现在到了"学以致用"的时刻：**用 Go 写一个 HTTP 服务**。你会发现，Go 标准库自带的 `net/http` 已经足够强大，一个极简 API 甚至不需要任何第三方框架，几行代码就能起服务。

这也是 Go 在后端圈这么吃香的原因：别的语言写个 Web 服务往往要先 `npm install express` 或 `pip install flask`，Go 直接"开箱即用"，编译出一个二进制扔服务器上就能跑。这一篇我们从一个最小服务，讲到 JSON 接口、路由分组和中间件。

## 第一个 HTTP 服务

`net/http` 的核心是 `http.HandleFunc` 注册一个"路径 → 处理函数"，再用 `http.ListenAndServe` 启动监听：

```go
package main

import (
    "fmt"
    "net/http"
)

func hello(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "你好，Go Web！")
}

func main() {
    http.HandleFunc("/", hello)
    http.ListenAndServe(":8080", nil)
}
```

处理函数固定签名：`func(w http.ResponseWriter, r *http.Request)`。`w` 是"往客户端写响应的笔"，`r` 是"客户端发来的请求"。`fmt.Fprintln(w, ...)` 把内容写回浏览器。运行后访问 `http://localhost:8080` 就能看到输出。

> 小提示：`:8080` 表示监听本机 8080 端口。生产环境常用 80 或 443，但开发阶段用高位端口避免权限问题。

## 理解 Request 和 ResponseWriter

**Request `r`** 里装着客户端的所有信息：

```go
func handler(w http.ResponseWriter, r *http.Request) {
    fmt.Println("方法:", r.Method)          // GET / POST ...
    fmt.Println("路径:", r.URL.Path)        // /api/users
    fmt.Println("参数:", r.URL.Query().Get("id")) // ?id=1
    fmt.Println("User-Agent:", r.Header.Get("User-Agent"))
}
```

**ResponseWriter `w`** 用来回写响应。记得先设状态码和 `Content-Type`，再写正文：

```go
w.WriteHeader(http.StatusOK) // 200，可省略（默认200）
w.Header().Set("Content-Type", "text/plain; charset=utf-8")
w.Write([]byte("纯文本响应"))
```

顺序很重要：**先设置 Header 和状态码，再写正文**。一旦开始 `Write` 正文，状态码和 Header 就定型了，之后再改无效。

## 处理 JSON：现代 API 的标配

现在几乎每个 API 都返回 JSON。Go 标准库 `encoding/json` 负责编解码。先用结构体定义数据形状：

```go
type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
    Age  int    `json:"age"`
}
```

结构体字段后面的反引号部分是 **struct tag**，告诉 JSON 编码器"这个字段在 JSON 里叫什么名字"。然后：

```go
func getUser(w http.ResponseWriter, r *http.Request) {
    u := User{ID: 1, Name: "小明", Age: 18}
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(u) // 把结构体编码成 JSON 写回
}
```

访问它会返回 `{"id":1,"name":"小明","age":18}`。反过来，读客户端发来的 JSON 用 `json.NewDecoder(r.Body).Decode(&u)`：

```go
func createUser(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "只支持 POST", http.StatusMethodNotAllowed)
        return
    }
    var u User
    if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
        http.Error(w, "JSON 解析失败", http.StatusBadRequest)
        return
    }
    fmt.Printf("收到新用户：%s\n", u.Name)
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{"msg": "创建成功"})
}
```

`http.Error` 是快速返回错误响应（状态码 + 正文）的便捷函数，写接口时极常用。

## 路由：别只用一个 "/"

`net/http` 原生的路由是"前缀匹配"，`/api/` 会匹配所有以 `/api/` 开头的路径。稍微规整一点，可以手动判断 `r.URL.Path`：

```go
func router(w http.ResponseWriter, r *http.Request) {
    switch r.URL.Path {
    case "/":
        hello(w, r)
    case "/api/users":
        if r.Method == "GET" {
            getUser(w, r)
        } else if r.Method == "POST" {
            createUser(w, r)
        }
    default:
        http.NotFound(w, r) // 返回 404
    }
}

func main() {
    http.HandleFunc("/", router)
    http.ListenAndServe(":8080", nil)
}
```

真实项目里路径一多，手写 `switch` 会很累，那时会引入 `gin`、`echo` 等第三方路由框架。但理解"路由本质就是路径到处理函数的映射"很重要——框架只是帮你少写 `switch`。

## 中间件：在真正处理前"插一脚"

中间件是 Web 开发的核心套路：在请求到达业务逻辑之前，统一做点事（比如打印日志、校验登录、跨域处理）。用函数包裹处理器即可：

```go
func logging(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        fmt.Printf("[%s] %s\n", r.Method, r.URL.Path)
        next(w, r) // 调用真正的处理函数
    }
}

func main() {
    http.HandleFunc("/", logging(hello))
    http.HandleFunc("/api/users", logging(getUser))
    http.ListenAndServe(":8080", nil)
}
```

`logging` 包住 `hello`，先打印日志再放行。多个中间件可以一层层套：`auth(logging(handler))`。这就是 Express 的 `app.use`、Gin 的 `router.Use` 的底层原理。

## 优雅关闭：别让请求半路失踪

直接 `Ctrl+C` 杀进程，正在处理的请求会瞬间中断。生产服务要"优雅关闭"——等现有请求处理完再退：

```go
func main() {
    srv := &http.Server{Addr: ":8080", Handler: router}
    go srv.ListenAndServe()

    // 监听系统中断信号
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, os.Interrupt)
    <-stop // 阻塞，直到收到 Ctrl+C

    fmt.Println("正在关闭...")
    srv.Shutdown(context.Background()) // 等进行中的请求结束
    fmt.Println("已关闭")
}
```

## 常见新手坑

- **忘了设 `Content-Type`**：浏览器可能把 JSON 当文件下载，记得 `w.Header().Set("Content-Type", "application/json")`。
- **先 Write 后设 Header 无效**：Header 和状态码必须在写正文前定好。
- **JSON 字段没导出**：只有首字母大写的字段才会被 `json` 包编码，小写字段会被忽略——这是 Go 访问控制导致的常见"丢字段"问题。
- **struct tag 写错引号**：`json:"name"` 用的是反引号，且键名必须是双引号字符串。
- **没处理错误就继续**：`Decode` 失败还往下走，会得到零值结构体，调试时一头雾水。

## 实战：一个迷你用户 API

把上面串起来，做一个能"查列表 / 建用户"的小服务：

```go
var users = []User{{ID: 1, Name: "小明", Age: 18}}

func listUsers(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(users)
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/", logging(hello))
    mux.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {
        if r.Method == "GET" {
            listUsers(w, r)
        } else if r.Method == "POST" {
            createUser(w, r)
        } else {
            http.Error(w, "方法不支持", http.StatusMethodNotAllowed)
        }
    })
    http.ListenAndServe(":8080", mux)
}
```

`http.NewServeMux()` 是 Go 推荐的"多路复用器"，比直接 `HandleFunc` 更清晰，也方便以后换框架。这个骨架加上数据库，就是一个真实微服务的雏形。

## 新手怎么把 Web 服务写熟

Web 服务是 Go 最常用武之地，不写熟等于白学。建议每天一个小练习：写个返回当前时间的接口；写个接收 JSON 并原样返回的接口；给所有接口加一个打印耗时的中间件。重点是**亲手用 `curl` 或浏览器测一遍**：`curl http://localhost:8080/api/users`、`curl -X POST ... -d '{"name":"x"}'`。只看代码不测，永远不知道 `Content-Type` 有没有设对。

另一个心法：**先标准库，后框架**。很多人一上来就 `gin`，结果连 `http.Request` 里有什么都不清楚。把 `net/http` 这套摸熟，再上框架会觉得"不过是把我手写的路由和中间件封装了一下"，学起来飞快，排错也有底。

还有，时刻记住"错误处理"。每个 `Decode`、每个外部调用都可能失败，Go 的 `if err != nil` 套路在 Web 层同样适用——一个没处理的错误，轻则返回空数据，重则服务 panic。把错误当成一等公民，是 Go 后端工程师的基本素养。

## 小测验：看看你掌握了没

- 问题一：为什么 JSON 字段首字母必须大写？答案：Go 只有导出的（大写）字段才能被 `encoding/json` 包访问和编码，小写字段会被忽略。
- 问题二：中间件本质上是什么？答案：一个"接收 HandlerFunc、返回新 HandlerFunc"的函数，在真正处理前做统一逻辑（日志、鉴权）。
- 问题三：Header 和状态码应该在什么时候设置？答案：在写正文（Write）之前，一旦开始写正文就定型了。

## 这一篇你该记住的

- 标准库 `net/http` 开箱即用：`HandleFunc` 注册路由，`ListenAndServe` 启动。
- 处理器签名固定 `func(w, r)`：`w` 写响应、`r` 读请求（方法、路径、参数、Header）。
- JSON 用 `encoding/json`：`Encode` 出、`Decode` 入；字段靠 `json:"tag"` 映射，且必须大写导出。
- 原生路由是前缀匹配，真实项目用 `NewServeMux` 或框架管理。
- 中间件 = 包裹处理器的函数，用于日志、鉴权、跨域等统一逻辑。
- 生产服务要做优雅关闭（`signal` + `srv.Shutdown`），别硬杀进程。

到这里，Go 从语法到写一个能跑的 API 你已经走通了。接下来建议深入数据库操作（database/sql）、配置管理，再选一个框架（gin/echo）提升开发效率。
