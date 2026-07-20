---
title: Go 函数：多返回值与 defer 延迟调用的魔法
description: 从函数定义讲起，掌握 Go 标志性的多返回值、命名返回值、可变参数、defer 延迟调用与匿名函数，理解"错误即值"的设计哲学。
category: backend
subcategory: golang
tags: ['Go', '函数', 'defer', '错误处理']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 2
---

写 Go 写得多了，你会发现它有个"怪癖"：几乎所有函数都有两个返回值，第一个是结果，第二个是 `error`。第一次见的人会愣一下——别的语言不是用异常吗？怎么 Go 把错误当普通值返回？

这恰恰是 Go 最被推崇的设计：**错误不是意外，而是流程的一部分**。网络会断、文件会不存在、用户输入会乱，这些都是"正常会发生的事"，所以 Go 让你显式地拿到错误、显式地处理它，而不是靠 `try/catch` 在某个角落悄悄捕获。这一篇我们就把函数这套机制讲透。

## 函数的基本定义

Go 用 `func` 关键字定义函数，参数和返回值都要写**类型**：

```go
func add(a int, b int) int {
    return a + b
}
```

如果相邻参数类型相同，可以合并写：`func add(a, b int) int`。返回值类型写在参数括号后面。

调用很简单：

```go
result := add(3, 5)
fmt.Println(result) // 8
```

## 多返回值：Go 的招牌特性

别的函数通常只返回一个值，Go 可以轻松返回多个，用括号包起来：

```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, fmt.Errorf("除数不能为 0")
    }
    return a / b, nil
}
```

调用时两个值一起接：

```go
res, err := divide(10, 2)
if err != nil {
    fmt.Println("出错了:", err)
    return
}
fmt.Println("结果:", res)
```

这里的套路你以后会写一万遍：**先调用拿到 `结果, err`，然后 `if err != nil` 就处理错误并退出，否则继续用结果**。Go 没有异常机制，错误就是个普通的值，你得像检查返回值一样检查它。

## 命名返回值：给返回值起名字

Go 允许给返回值预先起名，函数体里直接给它们赋值，最后 `return` 不带参数即可：

```go
func split(sum int) (x, y int) {
    x = sum * 4 / 9
    y = sum - x
    return // 自动返回 x, y
}
```

命名返回值有两个好处：一是文档作用，调用方一眼看出每个返回值代表啥；二是配合 `defer` 可以"事后修改"返回值（下面讲）。但别滥用——简单的函数用普通返回值更清爽。

## 可变参数：参数个数不固定

有时你不知道要传几个参数，比如求一堆数的和。用 `...` 表示"可变数量的参数"：

```go
func sum(nums ...int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

fmt.Println(sum(1, 2, 3))       // 6
fmt.Println(sum(1, 2, 3, 4, 5)) // 15
```

函数内部，`nums` 就是一个 `[]int` 切片，可以像普通切片一样遍历。如果想把一个切片"展开"传进去，在后面加 `...`：

```go
s := []int{1, 2, 3}
fmt.Println(sum(s...)) // 6
```

## defer：延迟调用，资源清理的利器

`defer` 的意思是"延迟执行"——被它修饰的函数调用，会**推迟到外层函数 return 之前**才执行。最常见用途是**关闭资源**，比如文件、数据库连接、锁：

```go
func readFile() error {
    f, err := os.Open("config.txt")
    if err != nil {
        return err
    }
    defer f.Close() // 函数结束前一定关闭，哪怕中间 return 或 panic
    // ... 读文件逻辑
    return nil
}
```

`defer` 有几个特性新手容易迷糊：

- **执行顺序是"后进先出"**（像栈）：多个 `defer` 时，最后写的先执行。
  ```go
  defer fmt.Println("一")
  defer fmt.Println("二")
  defer fmt.Println("三")
  // 输出顺序：三、二、一
  ```
- **defer 在注册时就确定了参数值**（不是执行时）。下面的 `i` 在 defer 注册时就是 0：
  ```go
  i := 0
  defer fmt.Println(i) // 打印 0，不是 1
  i++
  ```
- 配合命名返回值，defer 可以修改最终返回：
  ```go
  func double() (result int) {
      defer func() { result *= 2 }()
      result = 10
      return // 返回 20
  }
  ```

## 匿名函数与闭包

函数可以不写名字，当场定义当场调用，这叫**匿名函数**：

```go
func() {
    fmt.Println("我是个没有名字的函数")
}() // 末尾的 () 表示立即执行
```

更强大的是**闭包**：匿名函数可以"捕获"它外面的变量，并且记住这个变量：

```go
func counter() func() int {
    count := 0
    return func() int {
        count++
        return count
    }
}

c := counter()
fmt.Println(c()) // 1
fmt.Println(c()) // 2
fmt.Println(c()) // 3
```

返回的匿名函数"记住"了 `count`，每次调用都基于上一次的值累加。闭包是 Go 实现工厂函数、中间件、回调的核心机制。

## 常见新手坑

- **忘了检查 `err`**：`res, _ := doSomething()` 用 `_` 丢弃错误很爽，但生产代码里几乎总是要检查 `err != nil`，否则出错时你毫无知觉。
- **`defer` 写在 `err` 判断之前导致资源泄漏**：`f, err := os.Open(...)` 后若 `err != nil` 就 `return`，此时 `f` 是 nil，`defer f.Close()` 会 panic。正确做法是先判错再 defer。
- **以为 `defer` 参数会变**：记住 defer 注册时就把参数值定下来了。
- **命名返回值和普通返回值混用导致混淆**：团队里统一风格，别一会儿命名一会儿不命名。

## 实战：写一个带超时和清理的查询函数

把多返回值、`error`、`defer` 串起来，模拟一个"查数据库"的函数：

```go
func queryUser(id int) (string, error) {
    if id <= 0 {
        return "", fmt.Errorf("非法 id: %d", id)
    }
    // 模拟打开连接
    conn := "db-connection"
    defer fmt.Println("关闭连接:", conn) // 一定执行清理

    if id == 999 {
        return "", fmt.Errorf("用户不存在")
    }
    return fmt.Sprintf("用户-%d", id), nil
}

func main() {
    for _, id := range []int{1, 999, -3} {
        name, err := queryUser(id)
        if err != nil {
            fmt.Println("查询失败:", err)
            continue
        }
        fmt.Println("查到:", name)
    }
}
```

运行后你会看到：合法 id 正常返回、非法 id 和不存在的 id 都走了错误分支，而"关闭连接"的 defer 每次都执行了——这正是资源清理不被遗漏的关键。

## 新手怎么把函数用熟

函数和多返回值是 Go 的肌肉记忆，不写熟后面寸步难行。建议每天一个小练习：写一个"解析字符串成数字，返回值和错误"的函数；写一个"接收若干名字，返回拼接后的问候语"的可变参数函数；写一个"打开文件、defer 关闭、统计行数"的函数。重点是**刻意练习 `if err != nil` 这个套路**——它会出现在你 90% 的 Go 代码里。

另一个容易忽略的点是函数"单一职责"：一个函数只做一件事，返回值清晰，错误在出错的那一层就返回，别把错误藏着带到上层再处理。Go 的代码读起来顺不顺，很大程度上取决于函数拆得干不干净。

还有，别怕写很多小函数。Go 社区偏好"短函数"，一个函数二三十行是常态。函数越短，越容易测试、越容易复用、越不容易出 bug。

## 小测验：看看你掌握了没

- 问题一：Go 为什么用多返回值返回错误，而不是用异常？答案：错误是正常流程的一部分，显式返回让调用方必须处理，代码更可预测。
- 问题二：多个 `defer` 的执行顺序是什么？答案：后进先出（栈），最后注册的先执行。
- 问题三：下面代码打印什么？
  ```go
  func f() (i int) {
      defer func() { i++ }()
      i = 10
      return
  }
  ```
  答案：返回 11，因为 defer 在 return 前把命名返回值 i 从 10 改成了 11。

## 这一篇你该记住的

- Go 没有异常，用**多返回值 `(结果, error)`** 显式传递错误。
- 标准套路：`res, err := f()` 之后 `if err != nil { 处理; return }`。
- 命名返回值可当文档，配合 `defer` 能修改最终返回。
- 可变参数用 `...T`，调用时切片展开用 `s...`。
- `defer` 延迟到函数 return 前执行，适合关文件/连接；多个 defer 后进先出。
- 闭包能"记住"外部变量，是中间件和工厂函数的基石。
- 生产代码别用 `_` 随便丢弃 `error`。

下一篇我们讲**结构体与接口**：Go 没有"类"，却用结构体和接口玩出了面向对象的能力，这是写出可扩展后端服务的关键。
