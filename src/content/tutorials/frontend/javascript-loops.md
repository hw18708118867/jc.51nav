---
title: JavaScript 循环：把"重复的事"交给程序
description: for / while / do-while 怎么写，for...of 遍历数组、for...in 遍历对象，以及 break 和 continue 怎么控制循环节奏。
category: frontend
subcategory: javascript
tags: ['JavaScript', '循环', 'for', 'while']
pubDate: 2026-07-18
order: 5
---

很多活儿本质是重复的：把购物车 10 件商品分别算小计、把列表 100 条数据分别渲染成 HTML、从 1 数到 100。让程序一遍遍做同一件事，靠的就是**循环**。

如果没有循环，你得把同一段代码抄 100 遍，改个数就崩溃。循环的意义就是"用一段代码，重复 N 次，每次处理不同的数据"。这一篇我们把 `for`、`while`、`for...of` 等常用循环讲透，并学会用 `break`/`continue` 控制节奏。

## for 循环：最经典的计数循环

当你"知道要重复多少次"时，用 `for`：

```js
for (let i = 1; i <= 5; i++) {
  console.log('第 ' + i + ' 次');
}
```

`for` 后面的括号里有三部分，用分号隔开：

1. **初始化**：`let i = 1`，循环开始前执行一次，定义计数器。
2. **条件**：`i <= 5`，每次循环前检查，为 `true` 才继续，为 `false` 就结束。
3. **更新**：`i++`，每次循环结束后执行，通常让计数器 +1。

执行流程：`i=1` → 检查 `1<=5`(真) → 执行循环体 → `i` 变 2 → 检查 `2<=5`(真) → …… → `i=6` 时 `6<=5`(假) → 结束。所以打印"第 1~5 次"。

### 用 for 遍历数组

```js
const fruits = ['苹果', '香蕉', '橘子'];
for (let i = 0; i < fruits.length; i++) {
  console.log(i + ':' + fruits[i]);   // 0:苹果  1:香蕉  2:橘子
}
```

这里 `i` 从 0 开始（数组下标从 0 起），条件 `i < fruits.length`（长度是 3，所以 i 到 2 为止）。这是遍历数组最原始也最通用的写法。

## while 循环：条件满足就一直做

当你"不知道要重复多少次，只知道停的条件"时，用 `while`：

```js
let n = 1;
while (n <= 5) {
  console.log(n);
  n++;
}
```

`while (条件)`：条件为 `true` 就执行循环体，执行完再看条件。和 `for` 的区别是：计数器 `n` 的初始化和更新都要你自己写在别处，循环本身只管条件。

⚠️ **死循环警告**：如果 `while` 的条件永远为 `true`（比如忘了 `n++`），循环永远不会停，浏览器会卡死。写 `while` 一定要确保循环体里**有让条件最终变假的语句**。

## do-while：至少做一次的 while

`do-while` 和 `while` 几乎一样，但**先执行一次，再判断条件**。也就是说，循环体**至少跑一次**：

```js
let n = 1;
do {
  console.log(n);
  n++;
} while (n <= 5);
```

大多数场景 `while` 就够了，`do-while` 用得少，知道"它至少执行一次"这个特点即可。

## for...of：优雅遍历数组（推荐）

`for` 下标遍历有点啰嗦。ES6 的 `for...of` 直接拿"每个元素的值"，更清爽：

```js
const fruits = ['苹果', '香蕉', '橘子'];
for (const fruit of fruits) {
  console.log(fruit);   // 苹果 香蕉 橘子
}
```

不用管下标、不用管 `length`，直接拿到值。遍历数组**首选 `for...of`**。

## for...in：遍历对象的键

数组用 `for...of`，**对象**则用 `for...in` 遍历它的"键（属性名）"：

```js
const user = { name: '小明', age: 18 };
for (const key in user) {
  console.log(key + ':' + user[key]);   // name:小明  age:18
}
```

`for...in` 拿到的是键名（`'name'`、`'age'`），再用 `user[key]` 取对应值。注意：`for...in` 也会遍历到原型链上的可枚举属性，遍历普通对象够用，遍历数组不推荐（用 `for...of`）。

## break 和 continue：控制节奏

有时候不想"从头跑到尾"，要中途干预：

- **`break`**：立刻**结束整个循环**，跳出去。
- **`continue`**：跳过**本次**循环剩下的代码，直接进入下一轮。

```js
// break：找到第一个偶数就停
for (let i = 1; i <= 10; i++) {
  if (i % 2 === 0) {
    console.log('第一个偶数是 ' + i);
    break;     // 找到就跳出，不再继续
  }
}

// continue：只打印奇数（偶数跳过）
for (let i = 1; i <= 5; i++) {
  if (i % 2 === 0) {
    continue;  // 偶数直接跳过本次
  }
  console.log(i);   // 1 3 5
}
```

## 实战：循环生成 HTML 列表

前端最常干的事之一：把一组数据变成页面上的列表。用循环拼字符串：

```js
const users = ['小明', '小红', '小刚'];
let html = '<ul>';
for (const u of users) {
  html += `<li>${u}</li>`;   // 模板字符串拼接
}
html += '</ul>';
console.log(html);
// <ul><li>小明</li><li>小红</li><li>小刚</li></ul>
```

这段拼出来的 HTML 字符串，可以直接塞进页面的某个容器里（DOM 操作下篇讲）。这就是"数据驱动视图"的雏形。

## 常见新手坑

- **死循环**：`while` 忘了写让条件变假的语句，页面卡死。写 `while` 前先想清楚"什么时候停"。
- **for 下标从 0 还是 1**：数组下标从 0 起，条件常用 `i < length`；用 `i <= length` 会越界拿到 `undefined`。
- **`for...in` 遍历数组**：会拿到下标（字符串）还可能带上原型属性，数组请用 `for...of`。
- **`break`/`continue` 混淆**：`break` 是彻底停，`continue` 是跳过这一次。

## 这一篇你该记住的

- `for (初始化; 条件; 更新)` 适合"知道次数"；`while (条件)` 适合"知道停的条件"，但要防死循环。
- `do-while` 至少执行一次；遍历数组首选 `for...of`（直接拿值），遍历对象用 `for...in`（拿键）。
- `break` 结束整个循环，`continue` 跳过本次进下一轮。
- 实战：用循环把数据拼成 HTML 列表，是"数据驱动视图"的基础。

下一篇我们讲**函数**——把一段逻辑"打包"成可复用的块，以及函数声明、箭头函数、作用域这些核心概念。
