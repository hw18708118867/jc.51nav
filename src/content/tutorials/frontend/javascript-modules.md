---
title: JavaScript 模块：把代码拆开又能拼回来
description: 为什么需要模块，ES Module 的 export / import 怎么用，命名导出和默认导出的区别，以及前端怎么在浏览器里直接用模块。
category: frontend
subcategory: javascript
tags: ['JavaScript', '模块', 'ES Module', 'import', 'export']
pubDate: 2026-07-18
order: 14
---

一个文件写几百行还勉强能看，写上万行就成一锅粥了。把代码按功能拆成多个小文件、互相引用，就是**模块（Module）**。现代 JS 用统一的 **ES Module（ESM）** 语法来做这件事。

模块解决的是"代码组织"问题：把"算价格的"放一个文件、"管用户的"放一个文件，谁用谁 `import`，互不污染、好维护、能复用。这一篇讲清为什么需要模块、ESM 的 `export`/`import` 怎么用，以及浏览器里怎么直接跑模块。

## 为什么需要模块

没有模块时，所有代码堆在一起，会带来两个问题：

1. **命名冲突**：两个文件都写了 `function getUser(){}`，后加载的会覆盖前面的。
2. **全局污染**：变量挂得到处都是，谁都能改，调试时找不到是谁改的。

模块通过"**每个文件是一个独立作用域**"解决了这些：模块里的变量默认**不暴露到全局**，只有你主动 `export` 的才能被别的文件用。这就像每个文件是个"带门的房间"，门没开（`export`），外面的拿不到里面的东西。

## export：把东西"拿出去"

在一个模块文件里，用 `export` 把想共享的函数/变量/类暴露出去。有两种方式：

### 命名导出（named export）

```js
// math.js
export function add(a, b) { return a + b; }
export const PI = 3.14;
export const name = '我的数学工具';
```

一个文件可以有**多个**命名导出。

### 默认导出（default export）

```js
// user.js
export default function getUser() {
  return { name: '小明' };
}
```

一个文件**只能有一个**默认导出，通常用来导出"这个文件的主角"（比如主函数、主类）。

## import：把东西"拿进来"

在另一个文件里用 `import` 引入：

```js
// 引入命名导出：用 {} 且名字要一致
import { add, PI } from './math.js';
console.log(add(1, 2));   // 3
console.log(PI);          // 3.14

// 引入默认导出：不用 {}，名字自己起
import getUser from './user.js';
console.log(getUser());
```

规则对照：

| 导出方式 | 导入写法 | 特点 |
| --- | --- | --- |
| 命名导出 `export const x` | `import { x } from '...'` | 名字必须一致，可导入多个 |
| 默认导出 `export default` | `import x from '...'` | 名字随意，每文件仅一个 |

### 混合导入与起别名

```js
import getUser, { add, PI as 圆周率 } from './xxx.js';
// 默认导入和命名导入可同行；命名导入可用 as 起别名
```

### 整体导入

```js
import * as math from './math.js';
math.add(1, 2);   // 用命名空间访问
```

## 实战：拆一个"工具库"

把常用功能拆成模块：

```js
// utils/format.js
export function formatPrice(n) {
  return '¥' + n.toFixed(2);
}
export function formatDate(d) {
  return d.toISOString().slice(0, 10);
}
```

```js
// main.js
import { formatPrice, formatDate } from './utils/format.js';

console.log(formatPrice(19.9));     // ¥19.90
console.log(formatDate(new Date())); // 2026-07-18
```

`main.js` 只关心"用这两个函数"，不关心它们内部怎么实现。这就是模块带来的**关注点分离**。

## 浏览器里直接用模块

现代浏览器原生支持 ESM，不需要打包工具。但要注意两点：

1. **`<script>` 要加 `type="module"`**：

```html
<script type="module" src="main.js"></script>
```

2. **路径要写完整**（带 `.js` 后缀，且用相对路径 `./` 或 `/`）：

```js
import { add } from './math.js';   // ✅ 必须带 .js
```

`type="module"` 的脚本还有两个特性：
- 自动变成 **defer**（等 HTML 解析完才执行，不用手动放 `</body>` 前）。
- 模块作用域隔离，顶层变量**不会**变成全局变量（避免污染）。

> 注意：用 `file://` 直接双击打开带 `import` 的页面，浏览器会因"跨源限制"报错（CORS）。要起一个本地服务器再看，比如 `npx serve` 或 VS Code 的 Live Server 插件。这是新手最常踩的坑。

## 模块 vs 传统的"全局脚本"

| 维度 | 传统多 `<script>` | ES Module |
| --- | --- | --- |
| 作用域 | 共享全局，易冲突 | 每文件独立，不污染 |
| 依赖管理 | 靠 `<script>` 顺序手写 | `import` 显式声明，清晰 |
| 复用 | 复制粘贴 | 一处定义，处处引入 |
| 浏览器 | 直接可用 | 需 `type="module"` + 本地服务器 |

现代项目几乎都用模块；传统写法只在一些老教程里见到。

## 常见新手坑

- **路径没带 `.js`**：`import x from './math'` 在浏览器原生 ESM 里会失败，必须 `./math.js`。
- **`file://` 打开报错 CORS**：带模块的页面要用本地服务器打开，别双击。
- **命名导入名字拼错**：`import { add }` 必须和 `export` 的名字完全一致（默认导入可随意起名）。
- **一个文件多个 `export default`**：默认导出每文件只能有一个，多个需求用命名导出。

## 这一篇你该记住的

- 模块让"每个文件独立作用域"，避免命名冲突和全局污染；只 `export` 的才对外可见。
- 命名导出 `export const x`（可多个，导入用 `import { x }` 名字一致）；默认导出 `export default`（每文件一个，导入名随意）。
- 浏览器用模块：`<script type="module">` + 路径带 `.js`；且需用本地服务器打开（`file://` 会被 CORS 拦）。
- 模块自动 defer、作用域隔离；`import * as ns` 整体导入，`as` 起别名。

到此，JavaScript 这条线（基础→变量→运算符→条件→循环→函数→数组→对象→字符串→DOM→事件→异步→错误→模块）已经完整打通。你已经具备用 JS 做出真正能交互的网页的能力了。
