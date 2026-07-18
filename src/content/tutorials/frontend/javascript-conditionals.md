---
title: JavaScript 条件判断：让程序"看情况办事"
description: if / else if / else 怎么写，switch 适合什么场景，三元运算符和短路写法怎么偷懒，以及真假值（falsy）这个隐藏规则。
category: frontend
subcategory: javascript
tags: ['JavaScript', '条件判断', 'if', 'switch']
pubDate: 2026-07-18
order: 4
---

程序不能永远一条直线走到黑。登录成功跳首页、分数够线算及格、库存为 0 就禁用按钮——这些都是"看情况办事"。让程序做选择的，就是**条件判断**。

如果说变量是"记忆"、运算符是"计算"，那条件判断就是"决策"。它让同一段代码在不同情况下走不同分支。这一篇我们把 `if/else`、`switch`、三元、短路这些分支写法一次讲清，并揭露一个隐藏规则：**在 JS 里，哪些值会被当成"假"**。

## if / else：最基础的分支

语法很简单：

```js
if (条件) {
  // 条件为 true 时执行
} else {
  // 条件为 false 时执行
}
```

看个例子——根据分数给评价：

```js
const score = 85;

if (score >= 90) {
  console.log('优秀');
} else if (score >= 60) {
  console.log('及格');
} else {
  console.log('不及格');
}
```

执行顺序：先看 `score >= 90` 成不成立，不成立就跳到 `else if` 看 `score >= 60`，成立就执行"及格"并**跳过后面的分支**。所以 85 会输出"及格"。

几个要点：

- `if` 后面的**条件必须放在圆括号里**，且结果会被当成真/假。
- 大括号 `{}` 里只有一行时，大括号可以省略，但**强烈建议永远写上**——以后加第二行代码时不会出错。
- `else if` 可以写很多个，`else` 是"以上都不满足"的兜底，可选。

## 嵌套：分支里再分支

分支可以套分支，比如"先判断是否登录，登录了再判断是否管理员"：

```js
if (isLogin) {
  if (isAdmin) {
    console.log('显示管理后台入口');
  } else {
    console.log('显示普通用户菜单');
  }
} else {
  console.log('请先登录');
}
```

嵌套别超过两三层，否则可读性差。复杂逻辑可以拆成函数或提前 `return`。

## switch：多个"等于"分支时更清爽

当一个值要跟很多个固定值比较，用 `if/else if` 会很长，`switch` 更合适：

```js
const day = '周一';

switch (day) {
  case '周一':
    console.log('开会');
    break;
  case '周三':
    console.log('交周报');
    break;
  case '周五':
    console.log('摸鱼');
    break;
  default:
    console.log('正常工作');
}
```

注意两个关键点：

1. **每个 `case` 末尾要写 `break`**，否则会"穿透"——执行完这个 case 不跳出，继续往下执行下一个 case 的代码，通常不是你想要的。忘了 `break` 是经典 bug。
2. **`default`** 相当于 `else`，以上都不匹配时执行。

`switch` 适合"一个变量等于多个固定值"的场景；如果是"范围判断"（如 `score >= 90`），还是 `if/else` 更自然。

## 三元运算符：一行二选一

上篇讲过，`条件 ? A : B` 在"二选一赋值"时比 `if/else` 简洁：

```js
const tip = age >= 18 ? '成年' : '未成年';
```

但别滥用——如果分支里要执行多条语句，老老实实写 `if/else`，硬塞进三元反而难读。

## 短路写法：偷懒的布尔分支

利用 `&&` 的短路特性，可以替代"如果 A 为真就做 B"：

```js
// 等价于：if (user) { showProfile(user); }
user && showProfile(user);

// 等价于：if (!config.silent) { log('done'); }
config.silent || log('done');
```

这种写法在函数式风格里很常见，但初学阶段如果觉得绕，用 `if` 更清楚。**可读性优先**。

## 隐藏规则：真假值（falsy）

JS 里并非只有 `true`/`false` 能当条件。任何值放在 `if (...)` 里，都会被"隐式转换"成布尔。大部分值是"真"，但有 **7 个值会被当成"假"（falsy）**：

- `false`
- `0` 和 `-0`
- `''`（空字符串）
- `null`
- `undefined`
- `NaN`（不是数字）
- `0n`（BigInt 的 0）

其余一切（包括 `'0'`、`'false'`、空数组 `[]`、空对象 `{}`）都是"真"（truthy）。

这个规则很好用，比如：

```js
const name = '';
if (name) {
  console.log('有名字');
} else {
  console.log('没填名字');   // 会走这里，因为 '' 是 falsy
}
```

但也容易坑人：`if ([]) { }` 会执行，因为空数组是 truthy；`if ('0')` 也会执行，因为字符串 `'0'` 是 truthy（不是数字 0）。所以判断"是否为空数组"不能简单 `if (arr)`，要用 `arr.length === 0`。

## 常见新手坑

- **条件不加括号**：`if score > 60` 会报错，必须是 `if (score > 60)`。
- **用 `=` 代替 `===`**：`if (x = 5)` 是"把 5 赋给 x 再判断 x 的真假"，不是比较！比较一定要 `===`。
- **`switch` 忘写 `break`**：导致 case 穿透，多执行了不该执行的代码。
- **混淆 falsy 和假值**：以为 `[]`、`'0'` 是假，结果分支走错。记住只有那 7 个 falsy。

## 这一篇你该记住的

- `if / else if / else` 是最通用的分支；`else if` 可多个，`else` 是兜底。
- `switch` 适合"一个变量等于多个固定值"，记得每个 `case` 写 `break` 防穿透，`default` 兜底。
- 三元 `条件 ? A : B` 写一行二选一；短路 `A && B` / `A || B` 可替代简单分支（可读性优先）。
- **7 个 falsy 值**：`false`、`0`、`''`、`null`、`undefined`、`NaN`、`0n`；其余皆真（包括 `'0'`、`[]`、`{}`）。
- 判断条件必须用 `()` 包起来；比较用 `===`，千万别把 `=` 当 `==`。

下一篇我们讲**循环**——`for / while` 怎么把重复的事交给程序，以及 `break`/`continue` 怎么控制节奏。
