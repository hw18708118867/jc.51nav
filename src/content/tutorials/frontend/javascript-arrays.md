---
title: JavaScript 数组与高阶方法：一口气处理一堆数据
description: 数组怎么创建和取值，push/pop 等增删方法，以及 map / filter / reduce 这套"数据处理三件套"怎么把循环写得又短又清楚。
category: frontend
subcategory: javascript
tags: ['JavaScript', '数组', 'map', 'filter', 'reduce']
pubDate: 2026-07-18
order: 7
---

列表、购物车、评论区、排行榜……程序里"一堆同类型数据"几乎无处不在。装这堆数据的容器，就是**数组（Array）**。它是有序的、用下标访问的集合。

JS 的数组非常灵活：里面可以放数字、字符串、对象，甚至混合类型；长度还能动态变化。这一篇先讲数组的基础操作，再重点讲 **map / filter / reduce** 这套"高阶方法"——它们能把"遍历 + 处理"写得又短又清楚，是前端日常最高频的武器。

## 创建与取值

```js
const fruits = ['苹果', '香蕉', '橘子'];   // 字面量创建
const empty = [];                          // 空数组

fruits[0];        // '苹果'（下标从 0 开始）
fruits[2];        // '橘子'
fruits.length;    // 3（数组长度）
fruits[fruits.length - 1];   // '橘子'（最后一个）
```

记住：**数组下标从 0 开始**。第 1 个元素是 `[0]`，第 n 个是 `[n-1]`。这是编程里最容易被忽略、却又最基础的一点。

## 增删改：改变数组

```js
const arr = ['a', 'b'];

arr.push('c');        // 末尾加 → ['a','b','c']
arr.pop();            // 删末尾 → ['a','b']
arr.unshift('x');     // 开头加 → ['x','a','b']
arr.shift();          // 删开头 → ['a','b']
arr[1] = 'B';         // 改指定位置 → ['a','B']
```

- `push` / `pop` 操作末尾，像"栈"；`unshift` / `shift` 操作开头（稍慢，因为要挪动后面所有元素）。
- 这些会**直接修改原数组**（叫"原地操作"）。

如果想"不改动原数组、返回一个新数组"，用 `concat`、`slice` 等：

```js
const a = [1, 2];
const b = a.concat([3, 4]);   // b = [1,2,3,4]，a 不变
const c = a.slice(0, 1);      // c = [1]，a 不变（从 0 取到 1 之前）
```

## 查：判断与查找

```js
const nums = [1, 2, 3, 4];

nums.includes(3);        // true（是否包含 3）
nums.indexOf(3);         // 2（3 的下标；没有则返回 -1）
nums.find(n => n > 2);   // 3（第一个满足条件的元素）
nums.findIndex(n => n > 2);  // 2（第一个满足条件的下标）
nums.some(n => n > 3);   // true（是否有任意一个满足）
nums.every(n => n > 0);  // true（是否全部满足）
```

`find` / `some` / `every` 接收一个"判断函数"，非常实用。

## 高阶方法三件套：map / filter / reduce

这是数组最强大的部分。它们都**接收一个函数作为参数**（这种"把函数当参数"的函数叫高阶函数），对数组每个元素做处理，返回新结果，**不改动原数组**。

### map：一对一变换

`map` 对"每个元素"执行函数，把返回值收集成**新数组**（长度和原数组一样）。适合"把一组数据转成另一种形式"。

```js
const prices = [10, 20, 30];
const doubled = prices.map(p => p * 2);
console.log(doubled);   // [20, 40, 60]
```

把一组商品名变成 `<li>` 标签也常用 `map`：

```js
const names = ['苹果', '香蕉'];
const lis = names.map(n => `<li>${n}</li>`);
console.log(lis.join(''));   // <li>苹果</li><li>香蕉</li>
```

### filter：按条件筛选

`filter` 对"每个元素"执行函数，只保留函数返回 `true` 的元素，组成**新数组**。适合"挑出符合条件的"。

```js
const nums = [1, 2, 3, 4, 5, 6];
const evens = nums.filter(n => n % 2 === 0);
console.log(evens);   // [2, 4, 6]
```

### reduce：汇总成一个值

`reduce` 最强大也最烧脑：它把数组"累积"成**一个值**（总和、拼接字符串、统计次数等）。它接收两个参数：累积函数 `(累计值, 当前元素) => 新的累计值`，和初始值。

```js
const nums = [1, 2, 3, 4];
const sum = nums.reduce((acc, n) => acc + n, 0);
console.log(sum);   // 10（0+1+2+3+4）
```

`acc` 是"累加器"（初始为 0），每次把当前元素 `n` 加进去，最终得到总和。

再比如统计每个词出现次数：

```js
const words = ['a', 'b', 'a', 'c', 'b', 'a'];
const count = words.reduce((acc, w) => {
  acc[w] = (acc[w] || 0) + 1;
  return acc;
}, {});
console.log(count);   // { a: 3, b: 2, c: 1 }
```

### 三件套串起来

真实场景常常组合：比如"从订单里筛出已支付的，算总价"：

```js
const orders = [
  { id: 1, paid: true,  amount: 100 },
  { id: 2, paid: false, amount: 50 },
  { id: 3, paid: true,  amount: 200 },
];

const total = orders
  .filter(o => o.paid)              // 只留已支付
  .map(o => o.amount)               // 取出金额
  .reduce((acc, n) => acc + n, 0);  // 求和
console.log(total);   // 300
```

这种"链式调用"把复杂的数据处理拆成清晰的步骤，比写一堆 `for` 循环可读性强太多。

## 排序与反转

```js
const nums = [3, 1, 2];
nums.sort((a, b) => a - b);   // 升序 → [1, 2, 3]
nums.sort((a, b) => b - a);   // 降序 → [3, 2, 1]
nums.reverse();               // 反转
```

⚠️ `sort()` 默认按"字符串"排序（`[10, 2, 1]` 会排成 `[1, 10, 2]`），所以**排序数字一定要传比较函数** `(a,b)=>a-b`。

## 常见新手坑

- **下标从 0 开始**：`arr[1]` 是第二个元素，不是第一个；越界访问返回 `undefined`。
- **`push/pop` 改原数组**：以为原数组没变，结果别处用到时已经变了。需要保留原数组用 `slice`/`concat`。
- **`sort` 不传函数**：数字排序会按字符串排，结果错乱。
- **`map` 忘了 `return`**：箭头函数省略 `{}` 才自带 return，写了 `{}` 就必须显式 `return`，否则得到一堆 `undefined`。

## 这一篇你该记住的

- 数组下标从 0 起；`push/pop` 改末尾、`unshift/shift` 改开头（原地修改）。
- 查：`includes`、`indexOf`、`find`、`some`、`every`。
- **高阶三件套**：`map` 一对一变换（返回同长新数组）、`filter` 按条件筛选、`reduce` 累积成单值（如求和、统计）。
- 三件套都不改原数组、可链式调用，把复杂处理拆成清晰步骤。
- `sort` 排序数字必须传 `(a,b)=>a-b`，否则按字符串排会错。

下一篇我们讲**对象**——用键值对描述一个具体事物，以及 `this`、解构、原型链这些核心概念。
