---
title: JavaScript 错误处理：别让一个小错搞崩整个页面
description: try / catch / finally 怎么接住异常，throw 怎么主动抛错，常见错误类型（TypeError / ReferenceError），以及异步里错误怎么捕获。
category: frontend
subcategory: javascript
tags: ['JavaScript', '错误处理', 'try-catch', '异常']
pubDate: 2026-07-18
order: 13
---

代码跑着跑着突然白屏、控制台飘红——多半是某个地方"抛了异常"却没人接。JS 一遇到没处理的错误，就会中断当前执行。学会**接住错误**，程序才稳。

没有错误处理的代码，就像没有安全网的杂技表演：一个动作失手，全场就崩。这一篇我们讲怎么用 `try/catch` 接住异常、`throw` 主动报错、认识常见错误类型，以及异步代码里错误怎么捕获。

## 什么是异常（Error）

当 JS 遇到"它处理不了的情况"——比如访问 `null` 的属性、调用不存在的函数、JSON 格式写错——它会**抛出一个异常（Error 对象）**。如果这个异常没被"接住"，JS 就会**停止当前这段代码的执行**（后面的语句都不跑了），并把错误打到控制台。

```js
console.log('开始');
nonexistentFunction();   // 报错：nonexistentFunction is not defined
console.log('结束');       // 这行不会执行！因为上面抛错中断了
```

这就是为什么一个没处理的错误会让"后面全不动了"。我们需要一种机制：即使某步出错，也别让整个程序挂掉。

## try / catch：接住异常

```js
try {
  // 可能出错的代码
  nonexistentFunction();
} catch (err) {
  // 出错了就跑到这里，err 是错误对象
  console.log('出错了：' + err.message);
}
console.log('程序继续跑');   // ✅ 这行会执行
```

执行流程：
1. 先跑 `try` 里的代码。
2. 如果 `try` 里抛错，立刻跳到 `catch`，`err` 就是那个错误对象（含 `message` 错误信息等），`try` 里剩下的代码不跑。
3. 如果 `try` 里没抛错，`catch` 整段跳过。
4. 无论对错，`catch` 之后的代码照常执行。

这样，错误被"接住"了，程序不会崩。

## finally：无论如何都执行

`finally` 里的代码，**不管 `try` 成功还是失败，都会执行**——常用来"清理资源"（比如关掉加载动画、释放连接）：

```js
try {
  console.log('尝试操作');
  // 可能出错
} catch (err) {
  console.log('处理错误');
} finally {
  console.log('无论如何都执行（比如隐藏 loading）');
}
```

`finally` 适合放"不管成功失败都要做"的事，比如关弹窗、停转圈。

## throw：主动抛错

除了 JS 自动抛错，你也能**主动抛出一个错误**，用来在"不符合预期"时中断流程：

```js
function divide(a, b) {
  if (b === 0) {
    throw new Error('除数不能为 0');
  }
  return a / b;
}

try {
  divide(10, 0);
} catch (err) {
  console.log(err.message);   // 除数不能为 0
}
```

`throw new Error('信息')` 抛出一个带说明的错误，被外层 `try/catch` 接住。这在写"工具函数/校验"时很常用：发现非法输入就抛错，让调用方知道出问题了。

## 常见错误类型

认识几个高频错误，报错时能更快定位：

| 错误类型 | 含义 | 典型原因 |
| --- | --- | --- |
| `ReferenceError` | 引用了不存在的变量 | 变量名拼错、没声明就用 |
| `TypeError` | 类型不对 | 对 `null`/`undefined` 取属性、调用非函数 |
| `SyntaxError` | 语法错误 | 少写括号、引号不配对（通常代码根本跑不起来） |
| `RangeError` | 超出范围 | 递归太深、数组长度非法 |
| `URIError` | URI 编解码错误 | `decodeURI` 参数非法 |

最经典的两个：

```js
foo();            // ReferenceError：foo 没定义
const obj = null;
obj.name;         // TypeError：无法读取 null 的属性
```

## 异步里的错误怎么捕获

前面讲 `async/await` 时提过：异步函数里的错误，要用 `try/catch` 包住 `await`：

```js
async function load() {
  try {
    const res = await fetch('https://api.example.com/data');
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('请求或解析失败：', err);
    return null;   // 给个兜底，别让上层拿到 undefined 又崩
  }
}
```

如果用 Promise 的 `.then` 写法，错误用 `.catch` 接：

```js
fetch(url)
  .then(res => res.json())
  .catch(err => console.error('出错', err));
```

⚠️ 注意：`try/catch` **只能接住同步错误和 `await` 的异步错误**，接不住"完全没 `await` 的裸 Promise"里的错。统一用 `async/await + try/catch` 最省心。

## 实战：给用户输入加保护

```js
function parseUserInput(raw) {
  try {
    const obj = JSON.parse(raw);     // 用户可能输入非法 JSON
    if (!obj.name) throw new Error('缺少 name');
    return obj;
  } catch (err) {
    console.warn('输入有误：' + err.message);
    return { name: '匿名' };   // 兜底默认值
  }
}
```

即使输入是乱码，函数也不会崩，而是返回一个安全的默认值。这就是错误处理的价值：**让程序在意外输入/网络抖动下依然优雅。**

## 常见新手坑

- **只在 `try` 里写、忘 `catch`**：错误还是会冒泡到外层甚至崩溃，`try` 必须配 `catch`（或 `finally`）。
- **`catch` 里不处理也不记录**：`catch (e) {}` 空着，错误被"吞掉"，调试时完全没线索。至少 `console.error`。
- **异步错误没 `await`/`.catch`**：Promise 里的错没接，静默丢失。
- **`TypeError` 来自 `null`**：多半是前面 `getElementById` 没选到元素，或接口返回了 `null`，访问属性前先判空。

## 这一篇你该记住的

- JS 遇到没处理的错误会**中断当前执行**；用 `try/catch` 接住，程序不崩。
- `try` 出错跳 `catch`（err 是错误对象，有 `message`），`finally` 无论对错都执行（适合清理）。
- `throw new Error('信息')` 主动抛错，用于校验非法输入。
- 常见类型：`ReferenceError`(变量未定义)、`TypeError`(对 null/undefined 取属性)、`SyntaxError`(语法错)。
- 异步错误：`async/await` 用 `try/catch` 包 `await`；Promise 用 `.catch`。错误别空吞，至少记录。

下一篇（JS 收官）我们讲**模块**——用 ES Module 把代码拆成多个文件互相引用，让大项目不再是一锅粥。
