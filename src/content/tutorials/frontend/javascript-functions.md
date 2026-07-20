---
title: JavaScript 函数：把逻辑"打包"反复用
description: 函数声明、函数表达式、箭头函数有什么区别，参数和返回值怎么用，作用域与闭包是怎么回事，以及为什么函数能让代码不再复制粘贴。
category: frontend
subcategory: javascript
tags: ['JavaScript', '函数', '箭头函数', '作用域']
pubDate: 2026-07-18
updatedDate: 2026-07-18
order: 6
---

你肯定不想每算一次面积就把公式抄一遍。把"接收长宽、算出面积"这段逻辑**封装成一个函数**，以后只要喊一声函数名、把数字递进去，结果就回来了。函数就是"可复用的代码块"。

没有函数时，重复逻辑只能复制粘贴——改一处要改十处，漏一个就出 bug。函数把"做什么"定义一次，到处调用，是代码从"能跑"到"好维护"的关键一步。这一篇我们讲清函数的几种写法、参数与返回值、以及作用域和闭包这两个进阶但重要的概念。

## 函数声明：最经典的写法

```js
function add(a, b) {
  return a + b;
}

const result = add(3, 5);
console.log(result);   // 8
```

- `function add(a, b)`：`add` 是函数名，`a`、`b` 是**参数**（接收外部传进来的值）。
- `return a + b`：把计算结果"返回"给调用者。调用 `add(3, 5)` 时，`a` 拿到 3、`b` 拿到 5，执行后 `return 8`，于是 `result` 是 8。
- 没有 `return` 的函数，返回 `undefined`。

### 参数可以有默认值

```js
function greet(name = '朋友') {
  console.log('你好，' + name);
}
greet('小明');   // 你好，小明
greet();         // 你好，朋友（没传参时用默认值）
```

### 参数个数不固定：剩余参数

```js
function sum(...nums) {
  let total = 0;
  for (const n of nums) total += n;
  return total;
}
sum(1, 2,3);      // 6
sum(1, 2, 3, 4, 5); // 15
```

`...nums` 把传进来的所有参数收集成一个数组，适合"参数数量不定"的场景。

## 函数表达式：把函数存进变量

函数也可以像值一样赋给变量：

```js
const multiply = function (a, b) {
  return a * b;
};
console.log(multiply(4, 5));   // 20
```

和"函数声明"的区别在于：**函数声明会被提升**（可以在定义之前调用），而函数表达式不会（必须先定义再调用）。日常两者都能用，函数声明更直观。

## 箭头函数：ES6 的简洁写法

ES6 引入的箭头函数，写小函数特别省事：

```js
// 完整写法
const add = (a, b) => {
  return a + b;
};

// 只有一行 return 时，可以省略 {} 和 return
const add2 = (a, b) => a + b;

// 只有一个参数时，括号也能省
const double = n => n * 2;

console.log(add(3, 5));   // 8
console.log(double(4));   // 8
```

箭头函数常用来当"回调函数"（传给 `map`、`filter` 或事件监听的那种函数），写起来非常干净。它还有一个重要特性：**不绑定自己的 `this`**（沿用外层 `this`），这点在面向对象篇会体会到好处。初学先记住"箭头函数是更短的普通函数写法"。

## 返回值：函数的"产出"

`return` 是函数的出口：

- 遇到 `return`，函数立刻结束，并把后面的值交回去。
- 可以 `return` 任何类型（数字、字符串、对象、甚至另一个函数）。
- 没写 `return`，函数返回 `undefined`。

```js
function isAdult(age) {
  if (age >= 18) {
    return true;
  }
  return false;   // 这行其实可以简写成 return age >= 18;
}
```

> 小技巧：`return age >= 18` 本身就返回布尔值，不用写 `if`。

## 作用域：变量在哪能访问

**作用域**就是"变量起作用的范围"。JS 里最重要的是：

- **全局作用域**：在函数外声明的变量，哪里都能访问。
- **函数作用域**：在函数内用 `let/const/var` 声明的变量，只在函数内部能访问，外面访问不到。

```js
const globalVar = '全局';

function foo() {
  const localVar = '局部';
  console.log(globalVar);   // ✅ 能访问全局
  console.log(localVar);    // ✅ 能访问自己内部的
}
foo();
console.log(localVar);      // ❌ 报错：localVar 在函数外不存在
```

为什么重要？因为**作用域避免了命名冲突**——不同函数里可以用同名变量互不干扰。也避免了不小心改到别处的变量。

### 作用域链

函数内部访问一个变量时，JS 先在自己作用域找，找不到就往"外层作用域"找，一层层上去，直到全局。这就是作用域链。

```js
const x = '全局的 x';
function outer() {
  function inner() {
    console.log(x);   // 自己没 x，向上找到全局的 x
  }
  inner();
}
outer();   // 全局的 x
```

## 闭包：函数"记住"了它出生的环境

这是 JS 里有点绕但很有用的概念。**闭包**指的是：一个函数即使离开了它被创建的作用域，依然能"记住"并访问那个作用域里的变量。

```js
function makeCounter() {
  let count = 0;             // 这个变量被"包"在闭包里
  return function () {
    count++;
    return count;
  };
}

const counter = makeCounter();
console.log(counter());   // 1
console.log(counter());   // 2
console.log(counter());   // 3
```

`makeCounter` 返回的内部函数，即使 `makeCounter` 已经执行完、`count` 按理该消失，它依然"抓着" `count` 不放，每次调用都让 `count` 累加。这就是闭包——内部函数"封闭"了外部变量。闭包常用于"私有变量""函数工厂""防抖节流"等场景，理解它对你进阶很有帮助。

## 常见新手坑

- **函数声明 vs 表达式调用时机**：函数表达式必须先定义再调用，否则报"未定义"。
- **忘了 `return`**：函数体算出了结果却没 `return`，调用处拿到 `undefined`。
- **作用域误会**：在函数外访问函数内的局部变量会报错；需要外部用就 `return` 出来或用全局变量（谨慎）。
- **箭头函数当方法时 `this` 不对**：箭头函数不绑定自己的 `this`，用在对象方法上可能拿不到正确 `this`，这种场景用普通函数。

## 这一篇你该记住的

- 函数用 `function 名(参数) { ... return 值 }` 定义，是"可复用的代码块"，避免复制粘贴。
- 参数可设默认值 `=x`、可用 `...剩余参数` 收集不定个数。
- 箭头函数 `(a,b) => a+b` 更简洁，常用于回调；它不绑定自己的 `this`。
- 作用域：函数内 `let/const` 变量只在函数内可见；作用域链一层层向外找。
- 闭包：内部函数"记住"并访问外层变量，即使外层已执行完，常用于私有状态和函数工厂。

下一篇我们讲**数组与高阶方法**——`map`/`filter`/`reduce` 这套"数据处理三件套"，让循环写得又短又清楚。
