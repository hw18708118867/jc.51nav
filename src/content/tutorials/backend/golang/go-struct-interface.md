---
title: Go 结构体与接口：没有"类"也能面向对象
description: 从结构体讲起，掌握字段、方法、指针接收者，再用接口理解"鸭子类型"，看看 Go 如何用组合替代继承写出可扩展的后端服务。
category: backend
subcategory: golang
tags: ['Go', '结构体', '接口', '面向对象']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 3
---

如果你是从 Java、C++ 过来的，可能会到处找 `class` 关键字——别找了，Go 里**没有类，也没有继承**。那它怎么写"对象"？答案是**结构体（struct）+ 接口（interface）**，再加上一种叫"组合"的思路。

Go 的设计哲学是：**能用简单机制解决的，绝不引入复杂概念**。继承容易把代码绑死成一棵脆弱的树，而 Go 让你把功能"拼"起来。这一篇我们把结构体和接口这对组合讲透，它们是写出可扩展后端服务的地基。

## 结构体：把相关的数据打包

结构体就是把若干个字段捆在一起，描述一个"事物"：

```go
type User struct {
    ID   int
    Name string
    Age  int
}
```

创建和访问：

```go
u := User{ID: 1, Name: "小明", Age: 18}
fmt.Println(u.Name) // 小明

// 也可以按顺序，但不推荐（容易错位）
u2 := User{1, "小红", 20}
```

零值也很友好：没赋值的字段会自动填上对应类型的零值（`int` 是 0，`string` 是空串，`bool` 是 false）。用 `&` 取地址得到指针，结构体大时传指针更省内存：

```go
up := &User{ID: 2, Name: "小刚"}
fmt.Println(up.Age) // 0（零值）
```

## 方法：给结构体"绑"上行为

Go 没有"类里的方法"，但可以给任意类型（通常是结构体）定义**方法**，语法是在 `func` 和函数名之间加一个"接收者"：

```go
func (u User) Greeting() string {
    return "你好，我是" + u.Name
}

fmt.Println(u.Greeting()) // 你好，我是小明
```

接收者有两种：

- **值接收者 `(u User)`**：方法拿到的是副本，改了不影响原值。
- **指针接收者 `(u *User)`**：方法拿到的是原对象的指针，修改会生效，且避免大对象拷贝。

```go
func (u *User) GrowUp() {
    u.Age++ // 改的是原对象
}

u.GrowUp()
fmt.Println(u.Age) // 19
```

经验法则：**需要修改接收者、或结构体较大时，用指针接收者**；否则值接收者。同一个类型的方法，接收者类型要统一，别一会儿值一会儿指针。

## 接口：定义"能做什么"

接口是一组**方法签名的集合**，它不关心"你是什么类型"，只关心"你能做什么"。这就是著名的"鸭子类型"：如果一只鸟走起来像鸭子、叫起来像鸭子，那它就是鸭子。

```go
type Speaker interface {
    Speak() string
}

type Dog struct{}
func (d Dog) Speak() string { return "汪汪" }

type Cat struct{}
func (c Cat) Speak() string { return "喵喵" }

func introduce(s Speaker) {
    fmt.Println("它说：", s.Speak())
}

introduce(Dog{}) // 它说：汪汪
introduce(Cat{}) // 它说：喵喵
```

注意：`Dog` 和 `Cat` 并**没有**声明"我实现了 Speaker 接口"，只要它们有 `Speak() string` 这个方法，就自动算实现了接口。这种"隐式实现"是 Go 接口最舒服的地方——解耦、无需继承。

## 空接口与 any：装任何东西的盒子

`interface{}`（Go 1.18 后写作 `any`）是"没有任何方法的接口"，任何类型都满足它，相当于一个万能容器：

```go
var x any = 10
x = "hello"
x = User{ID: 1}
```

但取出来用时要用**类型断言**确认它到底是什么：

```go
v, ok := x.(string)
if ok {
    fmt.Println("是字符串:", v)
}
```

空接口在写"通用容器"时有用，但别滥用——它丢了类型安全。现代 Go 更推荐用**泛型**（1.18+）来写通用函数。

## 组合优于继承

Go 没有 `extends`，但可以把一个结构体"嵌"进另一个，这叫**结构体嵌入（embedding）**：

```go
type Engine struct {
    Power int
}
func (e Engine) Run() string { return "引擎启动" }

type Car struct {
    Engine // 嵌入，不是字段
    Brand  string
}

c := Car{Engine{100}, "比亚迪"}
fmt.Println(c.Run())      // 引擎启动（直接调用嵌入的方法）
fmt.Println(c.Power)      // 100（直接访问嵌入的字段）
```

`Car` "拥有" `Engine` 的能力，像继承了，但其实是把 `Engine` 组合进来。接口也靠组合扩展：

```go
type Reader interface { Read() }
type Writer interface { Write() }
type ReadWriter interface { // 组合两个接口
    Reader
    Writer
}
```

这种"小接口拼大接口"的风格，是 Go 标准库（`io.Reader`、`io.Writer`）的核心思想，也是写出松耦合代码的关键。

## 常见新手坑

- **方法接收者类型不统一**：同一个类型一部分方法用值接收者、一部分用指针接收者，会让你在"为什么改不动"上浪费时间。统一用指针接收者最省心。
- **以为要实现接口得显式声明**：Go 是隐式实现，只要方法签名对上就算，不需要 `implements` 关键字。
- **对 nil 指针调用方法会 panic**：`var u *User; u.GrowUp()` 会崩，因为 `u` 是 nil。
- **嵌入和字段同名时的"遮蔽"**：外层同名字段会盖住嵌入的，访问时要想清楚到底取的是谁。
- **把大结构体当值传来传去**：函数参数传大结构体用指针，否则每次调用都拷贝一份，性能吃亏。

## 实战：用接口抽象一个"通知发送器"

假设系统要同时支持邮件和短信通知，用接口把"发送"抽象出来：

```go
type Notifier interface {
    Send(msg string) error
}

type Email struct{ Addr string }
func (e Email) Send(msg string) error {
    fmt.Printf("向 %s 发邮件：%s\n", e.Addr, msg)
    return nil
}

type SMS struct{ Phone string }
func (s SMS) Send(msg string) error {
    fmt.Printf("向 %s 发短信：%s\n", s.Phone, msg)
    return nil
}

func notifyAll(ns []Notifier, msg string) {
    for _, n := range ns {
        n.Send(msg)
    }
}

func main() {
    senders := []Notifier{Email{"a@x.com"}, SMS{"1380000"}}
    notifyAll(senders, "系统升级通知")
}
```

新增一种通知方式（比如微信），只要再写一个满足 `Notifier` 接口的结构体，`notifyAll` 一行都不用改——这就是接口带来的"对扩展开放、对修改封闭"。

## 新手怎么把结构体接口用熟

结构体和接口是 Go 的"面向对象"全部家当，不练熟后面写 Web 服务会处处卡壳。建议每天一个小练习：定义一个 `Book` 结构体（标题、作者、价格），写"打折"方法；定义一个 `Shape` 接口，让 `Circle` 和 `Rectangle` 都实现"面积"方法；用嵌入把 `Logger` 组合进 `Service`。重点体会**"接口越小越好、组合越灵活"**这条 Go 铁律。

另一个常见误区是"什么都想抽象成接口"。在 Go 里，接口应该在"确实需要多态"时才定义，而不是像 Java 那样每个类都配一个接口。接口是"调用方定义的契约"，谁用谁定义，这是 Go 和经典 OOP 最大的思维差异。

还有，多读标准库源码里的 `io.Reader`、`http.Handler` 这类小接口，看它们怎么被各种类型实现、又怎么被组合使用。看多了你会发现：Go 的优雅，全藏在"小接口 + 组合"里。

## 小测验：看看你掌握了没

- 问题一：Go 里怎么实现"多态"？答案：定义小接口，让不同类型各自实现，调用方只依赖接口，不依赖具体类型。
- 问题二：值接收者和指针接收者最大的区别？答案：指针接收者能修改原对象、避免拷贝；值接收者拿到的是副本。
- 问题三：为什么 `Dog{}` 没写 `implements Speaker` 却能被传给 `Speaker` 参数？答案：Go 接口是隐式实现，方法签名对上即满足。

## 这一篇你该记住的

- Go 没有类与继承，用**结构体（数据）+ 方法（行为）+ 接口（契约）**实现面向对象。
- 结构体字段打包数据；方法用"接收者"绑定，指针接收者能改原值、更省内存。
- 接口是一组方法签名，类型**隐式实现**（方法对上即算），这就是鸭子类型。
- `any`/`interface{}` 可装任何类型，但取出要用类型断言，别滥用。
- 用**结构体嵌入**做组合，用**小接口拼大接口**，替代继承。
- 实战价值：接口让代码"对扩展开放、对修改封闭"，是解耦核心。

下一篇我们讲 **goroutine 与 channel**：Go 并发的看家本领，学会它你才真正摸到了 Go 的"快"在哪里。
