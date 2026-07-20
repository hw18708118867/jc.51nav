---
title: JavaScript 字符串与正则：把文字处理得服服帖帖
description: 模板字符串、常用字符串方法（slice/trim/includes/replace）、怎么判断开头结尾，以及正则 RegExp 这个"批量匹配模式"的入门用法。
category: frontend
subcategory: javascript
tags: ['JavaScript', '字符串', '正则', '模板字符串']
pubDate: 2026-07-18
updatedDate: 2026-07-18
order: 9
---

网页里最多的数据其实是文字：用户名、标题、留言、URL 参数。处理这些文字——截取一段、去掉空格、判断是不是邮箱格式——靠的就是**字符串方法**和**正则**。

字符串是 JS 里最常用、也最容易出细节问题的类型。这一篇我们把模板字符串、一批高频字符串方法讲透，再带你入门**正则表达式（RegExp）**——那个看起来像乱码、却能"批量描述匹配规则"的神器。

## 字符串的创建

```js
const s1 = '单引号';
const s2 = "双引号";
const s3 = `反引号（模板字符串）`;
```

三种引号都能创建字符串。单双引号基本等价；**反引号 `` ` `` 是模板字符串**，能在里面用 `${}` 嵌入变量和表达式，是拼接文字的首选：

```js
const name = '小明';
const age = 18;
const intro = `我叫 ${name}，明年 ${age + 1} 岁`;
console.log(intro);   // 我叫 小明，明年 19 岁
```

> 注意：字符串是**不可变**的。所有"看起来改了字符串"的方法，其实都返回了一个**新字符串**，原字符串没变。比如 `s.toUpperCase()` 之后，`s` 本身还是小写。

## 常用字符串方法

### 查与判断

```js
const s = 'Hello World';

s.length;            // 11（长度）
s.includes('World'); // true（是否包含子串）
s.startsWith('Hello'); // true（是否以...开头）
s.endsWith('World');   // true（是否以...结尾）
s.indexOf('o');      // 4（子串首次出现的下标，没有返回 -1）
s.charAt(0);         // 'H'（取某个位置的字符）
```

### 提取

```js
const s = 'Hello World';
s.slice(0, 5);       // 'Hello'（从 0 取到 5 之前）
s.slice(6);          // 'World'（从 6 取到末尾）
s.slice(-5);         // 'World'（负数表示从末尾倒数）
s.substring(0, 5);   // 'Hello'（类似 slice，但不支持负数）
```

`slice(start, end)` 是最常用的提取方式：`[start, end)`，左闭右开。**字符串下标从 0 开始**。

### 改

```js
const s = '  hello  ';
s.trim();            // 'hello'（去掉首尾空格）
s.trimStart();       // 'hello  '（只去开头）
s.trimEnd();         // '  hello'（只去结尾）

const t = 'a-b-c';
t.split('-');        // ['a','b','c']（按分隔符拆成数组）
t.replace('a', 'A'); // 'A-b-c'（替换第一个匹配）
t.replaceAll('l', 'L'); // 替换所有（ES2021）
```

`trim()` 特别实用：用户表单输入常常首尾带空格，`trim` 一下再校验。`split()` 把字符串拆成数组，配合数组方法处理，很常见。

### 大小写与拼

```js
'Hello'.toUpperCase();   // 'HELLO'
'HELLO'.toLowerCase();   // 'hello'
['a', 'b'].join('-');    // 'a-b'（数组变字符串，join 是 split 的反操作）
```

## 实战：表单校验里的字符串处理

```js
function validateUsername(input) {
  const name = input.trim();              // 去空格
  if (name.length < 3) {
    return '用户名至少 3 个字符';
  }
  if (!name.includes(' ')) {
    // 这里只是举例，includes 用来判断包含关系
  }
  return 'ok';
}
```

## 正则表达式：批量描述"匹配规则"

有时候判断"是不是邮箱""是不是手机号""是不是 6 位纯数字"，用 `includes`/`startsWith` 不够用了。这时候 **正则（RegExp）** 出场——它用一套特殊语法，描述"字符串要长什么样"。

### 创建正则

```js
const re1 = /abc/;              // 字面量写法
const re2 = new RegExp('abc');  // 构造函数写法
```

### 最常用的方法

```js
const re = /\d+/;   // \d 表示数字，+ 表示一个或多个

re.test('abc123');     // true（包含数字）
re.test('abcdef');     // false

'价格123元'.match(/\d+/);   // ['123']（提取匹配到的内容）
'1,2,3'.replace(/\d/g, '#'); // '#,#,#'（g=全局，替换所有数字）
```

- `test(str)`：返回布尔，判断"是否匹配"。
- `match(re)`：返回匹配到的内容（数组）。
- `replace(re, 新值)`：替换匹配部分，`g` 标志表示全局替换。

### 几个常用元字符

| 符号 | 含义 |
| --- | --- |
| `\d` | 数字（0-9） |
| `\w` | 字母数字下划线 |
| `\s` | 空白字符（空格/制表符） |
| `.` | 任意单个字符（除换行） |
| `*` | 前一个字符出现 0 次或多次 |
| `+` | 前一个字符出现 1 次或多次 |
| `?` | 前一个字符出现 0 次或 1 次 |
| `^` | 开头 |
| `$` | 结尾 |
| `{n,m}` | 出现 n 到 m 次 |

### 实战：校验邮箱和手机号

```js
const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
emailRe.test('xm@qq.com');     // true
emailRe.test('xm@qq');         // false（没有域名后缀）

const phoneRe = /^1[3-9]\d{9}$/;   // 1 开头，第二位是 3-9，后面 9 个数字
phoneRe.test('13800138000');   // true
phoneRe.test('12345');         // false
```

⚠️ 正则初看像天书，但它是"模式描述语言"，拆开每个符号都有明确含义。不需要背下来，用到时查表、搜现成的正则模板即可。日常够用就行，不必追求精通。

## 字符串 vs 数字的小坑

```js
'5' + 1        // '51'（拼接）
Number('5') + 1 // 6（先转数字）
'5' == 5       // true（== 偷偷转类型）
'5' === 5      // false（类型不同）
```

处理用户输入（表单、URL 参数）拿到的都是字符串，做数学运算前记得 `Number()` 转换。

## 常见新手坑

- **字符串不可变**：`s.toUpperCase()` 后 `s` 不变，要 `s = s.toUpperCase()` 才生效。
- **`slice` 左闭右开**：`slice(0,5)` 取的是第 0~4 个，不是 0~5。
- **`replace` 默认只换第一个**：要全局替换用 `replaceAll` 或 `replace(/x/g, ...)`。
- **正则忘了 `^` 和 `$`**：`/1\d{10}/` 会匹配"包含 11 位手机号"的字符串，加上 `^...$` 才是"整个字符串就是手机号"。

## 这一篇你该记住的

- 字符串用 `''`/`""`/` `` ` 创建；模板字符串 `` `...${x}...` `` 拼接最方便。
- 字符串不可变：方法都返回新字符串，原串不变。
- 高频方法：`includes/startsWith/endsWith`（判断）、`slice`（提取）、`trim`（去空格）、`split`（拆数组）、`replace`（替换）、`toUpperCase/toLowerCase`。
- 正则用 `/规则/` 描述匹配模式：`test` 判断是否匹配、`match` 提取、`replace` 替换；常用 `\d`(数字) `^`(开头) `$`(结尾) `+`(多个)。
- 表单输入是字符串，运算前用 `Number()` 转换；比较用 `===`。

下一篇我们讲 **DOM 操作**——怎么用 JS 选中网页元素、改文字改样式，把"算出来的结果"真正显示到页面上。
