---
title: JavaScript 对象：用"属性"描述一个具体事物
description: 对象字面量怎么写，怎么增删改查属性，方法、this 是什么，解构赋值怎么偷懒，以及原型链如何让对象共享方法。
category: frontend
subcategory: javascript
tags: ['JavaScript', '对象', 'this', '原型链']
pubDate: 2026-07-18
updatedDate: 2026-07-18
order: 8
---

数组适合装"一排同类数据"，但现实里一个东西往往是"有名字的各种特征"拼起来的：一个用户有姓名、年龄、邮箱；一杯咖啡有大杯、热、加糖。用**键值对**描述事物的结构，就是**对象（Object）**。

如果说数组是"清单"，对象就是"档案卡"——每个信息都有名字（键），一眼就知道是什么。这一篇我们讲对象的基本操作、`this` 这个让人又爱又恨关键字、解构赋值偷懒技巧，以及原型链这个进阶概念。

## 对象字面量：最直观的写法

```js
const user = {
  name: '小明',
  age: 18,
  isStudent: true,
};
```

花括号 `{}` 里写"键: 值"，键值对之间用逗号隔开。键（如 `name`）是字符串（可省略引号），值可以是任何类型（甚至嵌套对象、数组、函数）。

## 增删改查属性

```js
const user = { name: '小明', age: 18 };

// 查（两种写法）
user.name;        // '小明'（点语法，键必须是合法标识符）
user['age'];      // 18（方括号语法，键可以是变量或带特殊字符）

// 改
user.age = 19;            // 直接赋值覆盖

// 增
user.email = 'xm@qq.com'; // 原来没有的键，直接赋值就加上

// 删
delete user.isStudent;    // 删除这个属性
```

**点语法 vs 方括号**：`user.name` 简洁，但键必须是字母数字下划线；`user['my-key']` 或 `user[keyVar]` 能处理带连字符的键、或用变量当键，更灵活。

## 对象里的方法：带函数的属性

对象的属性值可以是一个函数，这种"属于对象的函数"叫**方法（method）**，通常用来表示"这个对象能做什么"：

```js
const user = {
  name: '小明',
  age: 18,
  sayHi() {
    console.log('你好，我是 ' + this.name);
  },
};

user.sayHi();   // 你好，我是 小明
```

## this：方法里的"我"

注意上面 `sayHi` 里用了 `this.name`。`this` 在方法里指代"**调用这个方法的对象**"。谁调用的，`this` 就是谁：

```js
user.sayHi();   // this 是 user，所以 this.name = '小明'

const another = { name: '小红', sayHi: user.sayHi };
another.sayHi();  // this 是 another，打印 '你好，我是 小红'
```

`this` 的指向是 JS 里最容易让人迷糊的点，记住核心规则：**方法被谁调用，`this` 就是谁**（普通函数调用时 `this` 是 `undefined` 或全局对象，箭头函数则不绑定自己的 `this`）。初学阶段先掌握"方法里的 `this` 指回对象"这个最常见场景。

## 解构赋值：优雅地"拆"对象

当对象属性很多，每次 `user.name`、`user.age` 写起来啰嗦。ES6 的**解构赋值**可以一次性把属性"拆"成独立变量：

```js
const user = { name: '小明', age: 18, city: '北京' };

const { name, age } = user;     // 拆出 name 和 age
console.log(name, age);          // 小明 18

// 还能改名
const { name: userName } = user;
console.log(userName);           // 小明

// 函数参数也能解构，直接拿属性
function greet({ name, age }) {
  console.log(`${name} 今年 ${age} 岁`);
}
greet(user);   // 小明 今年 18 岁
```

解构在函数接收"配置对象"时特别香，代码瞬间清爽。

## 遍历对象的键

```js
const user = { name: '小明', age: 18 };
for (const key in user) {
  console.log(key + ':' + user[key]);
}
// 或用 Object.keys 拿到键数组再 for...of
Object.keys(user).forEach(key => console.log(key));
```

## 原型链：让对象共享方法

如果每个用户对象都自带一套 `sayHi` 方法，10 万个用户就存 10 万份相同代码，太浪费。JS 用**原型（prototype）** 解决这个问题：把共享的方法放在"原型"上，所有实例对象通过**原型链**向上找到它，共用一份。

```js
function Person(name) {
  this.name = name;
}
// 把共享方法放在原型上
Person.prototype.sayHi = function () {
  console.log('你好，我是 ' + this.name);
};

const a = new Person('小明');
const b = new Person('小红');
a.sayHi();   // 你好，我是 小明
b.sayHi();   // 你好，我是 小红
```

`a` 和 `b` 各自有 `name`，但 `sayHi` 都在 `Person.prototype` 上共享，不重复存储。这就是"构造函数 + 原型"的经典模式（现代更常用 `class` 语法，本质还是原型）。

> 初学不必深究原型链的每个细节，只要知道：**对象可以"继承"另一个对象上的属性和方法，JS 通过原型链一层层往上找**，所以方法可以共享、不浪费内存。

## 常见新手坑

- **`this` 指向错**：把对象方法单独抽出来当回调（如 `setTimeout(user.sayHi, 1000)`），`this` 会丢失。解决：用箭头函数包一层或 `bind` 固定 `this`。
- **点语法键名限制**：`user.my-name` 报错（连字符不行），要用 `user['my-name']`。
- **直接改常量对象的属性**：`const` 锁的是引用，对象内部属性随便改（`user.age=19` 合法），别误以为整个对象不能动。
- **遍历用错**：遍历对象用 `for...in` 或 `Object.keys`，别用 `for...of`（那是遍历可迭代对象如数组）。

## 这一篇你该记住的

- 对象用 `{ 键: 值 }` 描述事物；查用 `obj.key` 或 `obj['key']`（后者支持变量/特殊键），增删改用赋值 / `delete`。
- 对象里的函数叫方法；方法里的 `this` 指"调用它的对象"。
- 解构 `const { name, age } = obj` 优雅拆属性，函数参数也能直接解构。
- 原型链让对象共享方法（不重复存代码）；`this` 指向是 JS 重点难点，先掌握"方法里的 this 指回对象"。

下一篇我们讲**字符串与正则**——截取、去空格、判断格式，以及正则这个"批量匹配模式"怎么入门。
