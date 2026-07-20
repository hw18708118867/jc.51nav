---
title: TypeScript 基础：用类型系统挡住一半 bug
description: 从"JS 的动态类型之痛"讲起，掌握 TypeScript 的类型注解、接口、联合类型与泛型，理解为什么大型项目离不开类型检查。
category: frontend
subcategory: engineering
tags: ['工程化', 'TypeScript', '类型系统', '前端']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 3
---

JavaScript 是"动态类型"语言：变量可以一会儿是字符串、一会儿是数字，运行时才报错。小项目无所谓，但项目一大、人多、模块多，这种"运行时才炸"的 bug 会要命——而且往往炸在生产环境。

**TypeScript（TS）** 是 JS 的"超集"：它给 JS 加了**静态类型**，让你在写代码时（甚至编辑器里）就发现"这里类型不对"。这一篇我们讲清为什么需要 TS、基础类型怎么写、接口和泛型解决什么，以及它如何成为大型项目的标配。

## JS 的动态类型之痛

看这段 JS：

```js
function getLength(str) {
  return str.length;
}
getLength('hello');  // 5
getLength(123);      // undefined（数字没 length，但不报错！）
```

`123` 没有 `.length`，但 JS 运行时**不报错**，返回 `undefined`，等你拿这个结果去做下一步运算才崩——而且崩在离源头十万八千里的地方，极难定位。

TS 会在你写 `getLength(123)` 时**立刻红线报错**："数字不能传给要字符串的函数"。错误在写代码时就暴露，不用等到上线。

## TS 是什么、怎么跑

TS 代码不能直接被浏览器跑（浏览器只认 JS）。它要经**编译器 `tsc` 或构建工具**"擦掉类型"转成 JS 再运行——类型只存在于开发阶段，运行时其实还是 JS。所以 TS 是"开发时的安全带"，不影响运行性能。

```ts
function getLength(str: string): number {
  return str.length;
}
getLength(123); // 编译报错：Argument of type 'number' is not assignable to 'string'
```

`: string` 是"参数类型注解"，`: number` 是"返回值类型注解"。加了它们，TS 就帮你盯着类型对不对。

## 基础类型与类型推断

TS 支持 JS 所有类型，外加显式注解：

```ts
let name: string = '小明';
let age: number = 18;
let isStudent: boolean = true;
let hobbies: string[] = ['篮球', '阅读'];   // 数组
let tuple: [string, number] = ['小明', 18]; // 元组（固定结构）
let anything: any = 123;                     // any：放弃类型检查（慎用）
```

但多数时候**不用写注解**，TS 会"推断"：

```ts
let city = '北京';  // 推断为 string，之后赋值数字会报错
city = 123;        // 报错
```

经验：**能推断就别写注解**，只在推断不出来或想明确约束时才写。滥用 `any` 等于退回 JS，失去 TS 意义。

## 接口：描述"对象的形状"

后端返回的用户、表单提交的数据，都是对象。TS 用 **`interface`（接口）** 描述"这个对象该有哪些字段、各是什么类型"：

```ts
interface User {
  id: number;
  name: string;
  age?: number;        // ? 表示可选
  readonly token: string; // 只读，不能改
}

function printUser(u: User) {
  console.log(u.name);
}

printUser({ id: 1, name: '小明', token: 'abc' }); // OK
printUser({ id: 2 }); // 报错：缺 name、token
```

接口的价值：**函数参数、API 返回值、组件 props 都声明成接口**，调用方和 TS 都知道"该传什么、会拿到什么"。配合后端 API 文档（OpenAPI 篇），甚至能自动生成 TS 类型，前后端类型一致，改一个字段编译期就全暴露。

## 联合类型与类型收窄

有时一个值可能是"几种类型之一"，用 **`|` 联合类型**：

```ts
function format(id: number | string) {
  if (typeof id === 'string') {
    return id.toUpperCase(); // 这里 TS 知道 id 是 string
  }
  return id.toString();      // 这里 TS 知道 id 是 number
}
```

`typeof` 判断后，TS 自动"收窄"类型——这就是类型守卫。还有字面量联合：

```ts
type Status = 'success' | 'loading' | 'error';
let s: Status = 'loading'; // 只能取这三个值之一
```

这比用 `0/1/2` 魔法数字清晰太多，拼写错 TS 立刻报。

## 泛型：让函数"类型参数化"

有时你写一个函数，类型"跟着输入走"。比如"返回数组第一个元素"，输入 `number[]` 该返回 `number`，输入 `string[]` 该返回 `string`。**泛型 `<T>`** 表达这种"类型占位"：

```ts
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

first([1, 2, 3]);        // 推断 T 为 number，返回 number
first(['a', 'b']);      // 推断 T 为 string，返回 string
```

`T` 是"调用时才确定的类型参数"。泛型在写通用工具、容器、API 客户端时极有用——既保持灵活，又不丢类型安全。React 的 `useState<T>`、Vue 的 `ref<T>` 都是泛型。

## 常见新手坑

- **滥用 `any`**：`let x: any = ...` 到处写，等于关掉类型检查，bug 回来。能用具体类型/联合/泛型就别 any；实在未知用 `unknown`（比 any 安全，用前须先判断）。
- **以为 TS 运行时也检查**：TS 只在编译期检查，运行时仍是 JS，类型擦除。`'123' as number` 编译过，运行时还是字符串，别迷信类型转换。
- **接口字段和实际对不上**：后端改了字段名，前端接口没更，编译报错但容易"随便加 any 糊弄"。应同步更新接口定义。
- **`null/undefined` 没处理**：TS 严格模式下 `string | null`，直接用会报错，逼你判空——这是好事，别用 `!` 强行断言跳过（可能运行时崩）。
- **类型写得太死**：过度标注导致改一点就要改多处类型。用推断、用泛型保持灵活。

## 实战：给 API 响应加类型

把 TS 和 API 调用结合，类型贯穿全程：

```ts
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface User {
  id: number;
  name: string;
}

async function fetchUser(id: number): Promise<ApiResponse<User>> {
  const res = await fetch(`/api/users/${id}`);
  return res.json(); // 类型标注让调用方拿到强类型 data
}

const r = await fetchUser(1);
console.log(r.data.name); // TS 知道 data 是 User，有 name
```

`ApiResponse<User>` 这个泛型结构，让"任何接口"都能复用，且 `r.data.name` 有完整类型提示和检查。这就是 TS 在真实项目里的日常价值：API 数据从进入前端那一刻起，就带着类型"护甲"。

## 新手怎么把 TS 用熟

TS 初学有点"束手束脚"——以前随便写，现在处处报错。但坚持一周，你会发现自己"敢改代码了"：重构时 TS 帮你找出所有受影响的地方，不用全文搜。建议从"给现有 JS 项目慢慢加类型"起步：先给函数参数返回值加注解，再给对象定义接口，最后用泛型写工具函数。

另一个心法：**把类型当文档**。看一个函数签名 `function login(req: LoginRequest): Promise<ApiResponse<Token>>`，不用读实现就知道"传什么、得什么"。好的类型标注本身就是最准确的文档，且不会过期（代码改了类型不对编译就报，文档却常忘更）。

还有，理解 `strict` 模式的价值。TS 有个 `strict: true` 配置，开启后强制 `null` 检查、禁止隐式 any 等，初期报错多，但长期大幅减少运行时 bug。团队项目建议直接开 strict，早严格晚轻松。

## 小测验：看看你掌握了没

- 问题一：TS 的类型检查发生在什么时候？运行时还有类型吗？答案：编译期（开发时）检查；运行时类型被擦除，仍是 JS，类型不影响运行性能。
- 问题二：接口（interface）主要用来描述什么？答案：描述对象的"形状"——有哪些字段、各是什么类型，用于函数参数、API 数据、props 的约束。
- 问题三：泛型 `<T>` 解决什么问题？答案：让类型"参数化"，函数/容器能跟着输入类型走，既灵活又不丢类型安全。

## 这一篇你该记住的

- JS 动态类型"运行时才炸"，TS 加静态类型让错误在写代码时就暴露。
- TS 是 JS 超集，编译时擦除类型转成 JS，类型只在开发期起作用。
- 基础类型可注解也可推断；`any` 慎用（退回 JS），未知用 `unknown`。
- 接口 `interface` 描述对象形状；`?` 可选、`readonly` 只读。
- 联合类型 `A | B` + 类型收窄；泛型 `<T>` 让类型参数化，写通用代码。
- 实战：API 响应用泛型接口贯穿类型，类型即文档且永不过期。

下一篇我们讲 **代码规范：ESLint 与 Prettier**：让团队代码"像一个人写的"，把风格争论交给工具。
