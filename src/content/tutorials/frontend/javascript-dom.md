---
title: JavaScript DOM 操作：用 JS 改网页上的元素
description: 什么是 DOM，怎么用 getElementById / querySelector 选中元素，怎么改文字、样式、属性，以及怎么动态创建和插入新节点。
category: frontend
subcategory: javascript
tags: ['JavaScript', 'DOM', 'querySelector']
pubDate: 2026-07-18
order: 10
---

前面学的变量、函数、数组，都是"在内存里算"。但用户看到的是网页上的标题、按钮、列表。把"算出来的结果"显示到页面上，靠的是 **DOM 操作**——JS 和网页元素之间的桥梁。

这一篇是"让 JS 真正改页面"的关键一步。学会选中元素、改它的内容/样式/属性、动态增删节点，你就拥有了"用代码装修网页"的能力。

## 什么是 DOM

浏览器拿到 HTML 后，会把它解析成一棵**节点树**，叫 **DOM（Document Object Model，文档对象模型）**。你写的每个标签，在 DOM 里都是一个"节点"：

```
document（文档根）
└── <html>
    ├── <head> ... </head>
    └── <body>
        ├── <h1>标题</h1>
        └── <p id="msg">文字</p>
```

JS 通过 `document` 这个全局对象，可以"爬"这棵树、选中任意节点、修改它。换句话说，**DOM 就是 JS 眼里的网页**。

> 回忆第一篇的比喻：HTML 是施工图纸，浏览器照图盖出 DOM 这栋"楼"，JS 拿到楼的钥匙（`document`），能进每个房间改东西。

## 选中元素：怎么"找到"它

### 按 id 选：getElementById

```html
<p id="msg">原始文字</p>
```
```js
const p = document.getElementById('msg');
console.log(p);   // 选中那个 <p>
```

`id` 在页面里应当唯一，所以 `getElementById` 返回单个元素。

### 按选择器选：querySelector（最灵活，推荐）

```html
<div class="box">A</div>
<div class="box">B</div>
```
```js
const first = document.querySelector('.box');     // 选第一个 .box → A
const all = document.querySelectorAll('.box');     // 选所有 .box → NodeList[A, B]
```

`querySelector` 用的是和 CSS **一模一样的选择器**：`#id`、`.class`、`标签名`、`div.box`、`ul li` 都能用。这是日常最推荐的选法，因为你会写 CSS 就会写它。`querySelectorAll` 返回所有匹配的元素（类似数组，可遍历）。

### 其他选法

```js
document.getElementsByTagName('p');   // 按标签名（返回集合）
document.getElementsByClassName('box'); // 按类名（返回集合）
```

这些也能用，但写法不如 `querySelector` 灵活，了解即可。

## 改内容：文字与 HTML

```js
const p = document.querySelector('#msg');

p.textContent = '新文字';        // 改纯文字（最安全，不会解析标签）
p.innerHTML = '<strong>加粗</strong>';  // 改 HTML（会解析标签，有风险见下）
```

- `textContent`：把内容当纯文本，最安全。用户输入千万别用 `innerHTML` 直接塞，否则用户能注入恶意标签（XSS，后面安全篇讲）。
- `innerHTML`：会把字符串当 HTML 解析。只有在你**完全信任**内容来源时才用。

## 改样式

```js
const box = document.querySelector('.box');
box.style.color = 'red';          // 改单个样式（驼峰写法：background-color → backgroundColor）
box.style.backgroundColor = '#f0f0f0';
box.style.width = '200px';
```

通过 `元素.style.属性名` 改的是"内联样式"（优先级最高）。注意 CSS 里的 `background-color` 在 JS 里要写成驼峰 `backgroundColor`。

如果样式很多，更推荐**加/减 class**，让样式留在 CSS 里管：

```js
box.classList.add('active');     // 加 class
box.classList.remove('active');  // 删 class
box.classList.toggle('active');  // 有就删、没有就加（切换）
```

`classList.toggle` 做"点击高亮/再点取消"特别方便。

## 改属性

```js
const img = document.querySelector('img');
img.src = 'new.png';          // 改图片地址
img.alt = '新描述';

const link = document.querySelector('a');
link.href = 'https://example.com';
link.setAttribute('target', '_blank');   // 通用改属性写法
link.getAttribute('href');               // 读属性
```

`src`、`href` 这些属性可以直接用 `.属性名` 改；更通用的 `setAttribute`/`getAttribute` 能改任意属性。

## 动态创建和插入节点

不仅能改现有元素，还能"凭空造"新元素插进页面——这是渲染列表、动态内容的基础。

```js
// 1. 造一个新 <li>
const li = document.createElement('li');
li.textContent = '新的一项';

// 2. 找到容器并插进去
const ul = document.querySelector('ul');
ul.appendChild(li);     // 插到末尾

// 3. 插到指定位置
const first = document.createElement('li');
first.textContent = '置顶项';
ul.insertBefore(first, ul.firstChild);   // 插到最前面
```

`createElement` 造元素、`appendChild` 加到末尾、`insertBefore` 插到某元素前面。配合循环，就能把一组数据渲染成整个列表（前面循环篇提过这个思路）。

### 删除节点

```js
const node = document.querySelector('.old');
node.remove();    // 直接删掉自己
```

## 实战：点击按钮，列表加一项

把前面学的串起来：

```html
<input id="todo" placeholder="写点什么">
<button id="add">添加</button>
<ul id="list"></ul>

<script>
  const input = document.getElementById('todo');
  const btn = document.getElementById('add');
  const list = document.getElementById('list');

  btn.addEventListener('click', () => {
    const text = input.value.trim();   // 取输入框的值
    if (!text) return;                 // 空的就不加
    const li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);
    input.value = '';                  // 清空输入框
  });
</script>
```

这就是一个最小可用的"待办清单"雏形：输入文字 → 点按钮 → 动态生成 `<li>` 插进列表。DOM 操作 + 事件（下篇讲）+ 数据，构成了前端交互的核心模式。

## 常见新手坑

- **脚本执行时元素还没加载**：`<script>` 放 `<head>` 里又没 `defer`，`getElementById` 拿到 `null`。解决：脚本放 `</body>` 前，或加 `defer`。
- **`querySelector` 返回 null**：选择器写错或元素不存在，后面 `.style` 就报错"Cannot read properties of null"。
- **用 `innerHTML` 塞用户输入**：有 XSS 风险，用户输入用 `textContent`。
- **`getElementsBy...` 返回的是"活的"集合**：它会随 DOM 变化自动更新，但没数组方法，遍历前最好转成数组或改用 `querySelectorAll`。

## 这一篇你该记住的

- DOM 是浏览器把 HTML 解析成的节点树，是"JS 眼里的网页"；`document` 是入口。
- 选中元素：`getElementById`（按 id）、`querySelector('#id'/'.class'/'标签')`（最灵活推荐）、`querySelectorAll`（全部）。
- 改内容：`textContent`（纯文本，安全）/ `innerHTML`（解析 HTML，慎用于用户输入）。
- 改样式：`元素.style.属性`（驼峰）或 `classList.add/remove/toggle`（推荐，样式留 CSS 管）。
- 改属性：`.src`/`.href` 或 `setAttribute`；动态造元素用 `createElement` + `appendChild`/`insertBefore`，删用 `remove()`。

下一篇我们讲**事件**——`addEventListener` 怎么监听点击/输入，事件冒泡是什么，以及事件委托这个实用技巧。
