---
title: JavaScript 事件：让页面"听"用户的操作
description: 怎么用 addEventListener 监听点击/输入，事件对象里有什么，事件冒泡是什么，以及用事件委托给一堆子元素统一绑定的技巧。
category: frontend
subcategory: javascript
tags: ['JavaScript', '事件', '事件委托', '冒泡']
pubDate: 2026-07-18
order: 11
---

页面不是录像带，用户会点、会输入、会滚动。JS 要知道"用户刚才干了啥"，靠的是**事件**。浏览器在用户操作时抛出事件，你用代码"订阅"它，事件发生就执行你的函数。

如果说 DOM 是"能改页面"，那事件就是"能听用户"。两者结合——监听到点击、改对应 DOM——页面才真正"活"起来。这一篇讲清事件的监听方式、事件对象、冒泡机制，以及一个超实用的**事件委托**技巧。

## 监听事件：addEventListener

最基本、最推荐的写法：

```html
<button id="btn">点我</button>
```
```js
const btn = document.getElementById('btn');
btn.addEventListener('click', () => {
  console.log('被点了！');
});
```

`addEventListener('事件名', 回调函数)`：第一个参数是事件类型（字符串），第二个是事件发生时要执行的函数。

常用事件类型：

| 事件 | 触发时机 |
| --- | --- |
| `click` | 点击（鼠标按下并抬起） |
| `dblclick` | 双击 |
| `mouseover` / `mouseout` | 鼠标移入 / 移出 |
| `input` | 输入框内容变化（每次按键） |
| `change` | 值改变并提交（如下拉框选择、输入框失焦） |
| `submit` | 表单提交 |
| `keydown` / `keyup` | 键盘按下 / 抬起 |
| `scroll` | 滚动 |
| `load` | 页面/资源加载完 |

## 事件对象：event

事件发生时会自动传给回调函数一个**事件对象**（通常叫 `e` 或 `event`），里面装着这次事件的详细信息：

```js
btn.addEventListener('click', (e) => {
  console.log(e.type);        // 'click'（事件类型）
  console.log(e.target);       // 真正被点的那个元素
  console.log(e.clientX, e.clientY);  // 鼠标点击的坐标
});
```

几个常用属性：

- `e.type`：事件类型。
- `e.target`：触发事件的**目标元素**（点按钮时就是按钮）。
- `e.preventDefault()`：阻止默认行为。比如点链接默认会跳转，`e.preventDefault()` 能拦下；表单 `submit` 默认会刷新页面，拦截后改用 JS 处理。
- `e.stopPropagation()`：阻止事件继续冒泡（下面讲）。

### 实战：阻止表单默认提交

```js
const form = document.querySelector('form');
form.addEventListener('submit', (e) => {
  e.preventDefault();   // 拦下"刷新页面"的默认行为
  const data = new FormData(form);
  console.log(data.get('username'));   // 用 JS 处理数据，而不是刷新
});
```

## 事件冒泡：从里到外传

这是事件里最容易被忽略、又最影响行为的机制。**冒泡**指的是：一个事件发生后，会从"被点的目标元素"开始，一层层**向上**传给它的父元素、祖父元素……直到 `document`。

```html
<div id="outer">
  <button id="inner">点我</button>
</div>
```
```js
outer.addEventListener('click', () => console.log('外层被触发'));
inner.addEventListener('click', () => console.log('内层被触发'));
```

点按钮时，控制台会先打印"内层被触发"，再打印"外层被触发"——因为事件先从 `inner` 冒泡到 `outer`。

理解冒泡很重要，因为**父元素能"听到"子元素的事件**。这引出了下面这个神技。

## 事件委托：给一堆子元素统一绑定

想象一个列表有 100 个 `<li>`，你想点哪个就在控制台打出它的文字。笨办法是给 100 个 `li` 各绑一个监听——又慢又费内存。

**事件委托**利用冒泡：只在父元素（`ul`）上绑一个监听，点任何一个 `li` 都会冒泡到 `ul`，在 `ul` 的回调里用 `e.target` 判断是哪个 `li`：

```html
<ul id="list">
  <li>苹果</li>
  <li>香蕉</li>
  <li>橘子</li>
</ul>
```
```js
const list = document.getElementById('list');
list.addEventListener('click', (e) => {
  // 确认点到的是 li（不是 ul 本身）
  if (e.target.tagName === 'LI') {
    console.log('你点了：' + e.target.textContent);
  }
});
```

好处：
1. **只绑一次**，省内存、性能好。
2. **动态新增的 `li` 也自动生效**——不用新增一个就重新绑一次（传统逐个绑定做不到这点）。

事件委托是前端面试和实战的高频考点，务必掌握。

## 移除监听与一次性监听

```js
function handler() { console.log('hi'); }
btn.addEventListener('click', handler);
btn.removeEventListener('click', handler);   // 移除（必须传同一个函数引用）

btn.addEventListener('click', () => {}, { once: true });  // 只触发一次，自动移除
```

`removeEventListener` 要移除，传入的函数必须和添加时是**同一个引用**（所以别用匿名函数直接写，先存成 `handler`）。`{ once: true }` 选项让监听只生效一次，很适合"提交按钮防重复点击"。

## 常见新手坑

- **事件没触发**：监听器绑在了 `null`（元素没选到），或脚本在元素加载前执行了。检查选择器、脚本位置/`defer`。
- **`this` 在箭头函数里不对**：箭头函数不绑定自己的 `this`，事件回调里想用 `this` 指代元素时，用普通函数或 `e.currentTarget`。
- **忘了 `preventDefault` 导致页面刷新**：表单/链接的默认行为要拦就加 `e.preventDefault()`。
- **逐个绑定子元素**：列表类场景用事件委托代替，性能更好、支持动态新增。

## 这一篇你该记住的

- `addEventListener('click', 函数)` 监听事件；常用 `click`/`input`/`submit`/`change`/`keydown` 等。
- 事件对象 `e` 里有 `type`、`target`、`preventDefault()`（拦默认行为）、`stopPropagation()`（拦冒泡）。
- **事件冒泡**：事件从目标元素向上传给父级；父元素能"听到"子元素事件。
- **事件委托**：在父元素上绑一个监听，用 `e.target` 判断具体子元素，适合列表，省内存且支持动态新增。
- 移除监听要传同一函数引用；`{ once: true }` 让监听只触发一次。

下一篇我们讲**异步与 Promise**——为什么 JS 单线程却不怕等待，以及 `async/await`、`fetch` 怎么请求接口。
