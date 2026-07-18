---
title: CSS Flexbox 布局：一行代码搞定"水平垂直居中"
description: 被"怎么让元素居中""怎么让一排自适应"折磨过的人，Flexbox 就是来解救的。这篇把容器和项目的常用属性讲透，并给出几个天天用得上的实战套路。
category: frontend
subcategory: css
tags: ['CSS', 'Flexbox', '布局']
pubDate: 2026-07-11
order: 3
---

在 Flexbox 出现之前，想让一个元素在页面里水平垂直居中，得靠各种 hack：绝对定位加负 margin、或者用 `display: table` 作弊。又丑又难记。Flexbox（弹性盒子）就是为"一维布局"而生的现代方案——一排或一列元素的排列、对齐、伸缩，它都能优雅解决。

如果你曾被"怎么让几个盒子排成一行还自动均分""怎么让一个按钮在容器里垂直居中"折磨过，那 Flexbox 就是来解救你的。这一篇我们把"容器属性"和"项目属性"讲透，并给出几个天天用得上的实战套路。

## 两个角色：容器和项目

Flexbox 的核心是两个层级的概念：

- **容器（flex container）**：你给某个元素设 `display: flex`，它就变成 flex 容器。
- **项目（flex item）**：容器里**直接子元素**自动变成 flex 项目，受 flex 规则支配。

```html
<div class="container">      <!-- 容器 -->
  <div class="item">A</div>  <!-- 项目 -->
  <div class="item">B</div>
  <div class="item">C</div>
</div>
```
```css
.container { display: flex; }
```

只要 `.container` 设了 `display: flex`，里面三个 `.item` 就自动从"上下堆叠"变成"横排一行"。这就是 Flexbox 的魔法起点。

> 关键认知：**Flexbox 只影响"直接子元素"**。孙子辈不受影响，除非你给孙子也设 `display: flex`。

## 容器的属性（控制整体排列）

### flex-direction：主轴方向

```css
.container { display: flex; flex-direction: row; }     /* 默认，横排（左→右） */
.container { flex-direction: column; }                  /* 竖排（上→下） */
.container { flex-direction: row-reverse; }             /* 横排但反向 */
```

Flexbox 有个"主轴"概念：`row` 时主轴是水平方向，`column` 时主轴是垂直方向。很多对齐属性都是"沿主轴"或"沿交叉轴"作用的。

### justify-content：主轴对齐

控制项目在**主轴**上的对齐/分布：

```css
justify-content: flex-start;   /* 靠主轴起点（默认，左/上） */
justify-content: flex-end;     /* 靠主轴终点（右/下） */
justify-content: center;       /* 居中 */
justify-content: space-between;/* 两端贴边，中间均分空隙 */
justify-content: space-around; /* 每个项目两侧空隙相等 */
justify-content: space-evenly; /* 所有空隙完全相等 */
```

`space-between` 做"导航栏：logo 在左、菜单在右"特别好用；`center` 做居中。

### align-items：交叉轴对齐

控制项目在**交叉轴**（和主轴垂直的方向）上的对齐：

```css
align-items: stretch;    /* 默认，项目拉伸填满交叉轴 */
align-items: flex-start; /* 靠交叉轴起点 */
align-items: flex-end;   /* 靠交叉轴终点 */
align-items: center;     /* 交叉轴居中 */
```

### 实战：水平垂直居中（经典）

让一个元素在容器里**完全居中**，Flexbox 一行搞定：

```css
.container {
  display: flex;
  justify-content: center;   /* 主轴（水平）居中 */
  align-items: center;       /* 交叉轴（垂直）居中 */
  height: 300px;             /* 容器要有高度，垂直居中才看得出 */
}
```

对比没有 Flexbox 时的各种 hack，这行代码简直是解放。

### flex-wrap：换行

默认项目都挤在一行（`nowrap`），空间不够会压缩。允许换行：

```css
flex-wrap: wrap;    /* 空间不够就换到下一行 */
```

## 项目的属性（控制单个元素）

### flex：伸缩比例（最常用）

`flex` 是 `flex-grow`（放大）、`flex-shrink`（缩小）、`flex-basis`（基准宽）的简写，最常用 `flex: 数字` 表示"占几份"：

```css
.item-a { flex: 1; }   /* 占 1 份 */
.item-b { flex: 2; }   /* 占 2 份（宽度是 a 的两倍） */
.item-c { flex: 1; }   /* 占 1 份 */
```

三个项目按 `1:2:1` 分配容器宽度，自动撑满、自适应。做"侧边栏固定+主内容自适应"或"等分布局"极方便。

### align-self：单个项目单独对齐

覆盖容器的 `align-items`，让某个项目自己对齐方式不同：

```css
.item-special { align-self: flex-end; }
```

### order：改变显示顺序

不用改 HTML，用 `order` 调整项目排列先后（数字小的在前，默认 0）：

```css
.item { order: 2; }
.item-first { order: 1; }   /* 排到更前面 */
```

## 实战套路一：导航栏

```html
<nav class="nav">
  <span class="logo">LOGO</span>
  <ul class="menu">
    <li>首页</li><li>文章</li><li>关于</li>
  </ul>
</nav>
```
```css
.nav {
  display: flex;
  justify-content: space-between;  /* logo 和菜单分列两端 */
  align-items: center;
  padding: 0 20px;
  height: 60px;
  background: #fff;
}
.menu { display: flex; gap: 20px; list-style: none; }
```

`gap: 20px` 是 Flexbox/Grid 里设置"项目间距"的现代写法（比用 margin 干净）。

## 实战套路二：等分卡片行

```css
.cards { display: flex; gap: 16px; }
.card { flex: 1; }   /* 三张卡片自动 1:1:1 均分 */
```

## 实战套路三：底部对齐的图文

```css
.media { display: flex; align-items: flex-start; gap: 12px; }
.media img { width: 80px; }
```

图片和文字顶部对齐，文字多高都不影响图片位置。

## 常见新手坑

- **忘了容器要 `display: flex`**：项目属性（如 `flex:1`）不生效，因为父级根本不是 flex 容器。
- **垂直居中没高度**：`align-items: center` 看不出效果，因为容器没设高度，交叉轴没有"多余空间"可居中。
- **`flex: 1` 作用在容器上**：`flex` 是给**项目**设的，不是容器。
- **`gap` 兼容性**：现代浏览器都支持 `gap`，但很老的浏览器不支持，必要时用 margin 兜底。


## 更多实战案例：一行代码垂直居中

传统垂直居中很麻烦，flex 一行搞定：

```css
.parent { display: flex; align-items: center; justify-content: center; height: 300px; }
```

`align-items:center` 管交叉轴（默认垂直），`justify-content:center` 管主轴（默认水平），子元素瞬间居中。这是 flex 最常用场景。

再比如做导航栏：`.nav { display:flex; gap:16px; }` 让链接横向排列且有间距；做卡片列表：`.list { display:flex; flex-wrap:wrap; gap:12px; }` 卡片自动换行。

## 常见坑

1. **flex 子元素宽度被压缩**：默认 `flex-shrink:1` 会收缩，不想被压就设 `flex-shrink:0` 或 `flex:none`。
2. **主轴方向搞反**：`flex-direction:column` 时，justify 变垂直、align 变水平，别弄混。
3. **忘记 flex-wrap 导致溢出**：子项太多不换行会挤在一行，加 `flex-wrap:wrap`。
4. **gap 兼容性**：老浏览器不支持 gap，可用 margin 兜底。

## 小测验

- 问题1：让子元素在主轴均匀分布且首尾贴边，用哪个值？答案：`justify-content: space-between`。
- 问题2：`align-items:center` 在默认方向下控制什么方向？答案：垂直（交叉轴）。
- 问题3：想让某个子项不被压缩，设什么？答案：`flex-shrink:0` 或 `flex:none`。


## 这一篇你该记住的

- Flexbox 解决"一维布局"（一排或一列）；设 `display: flex` 的元素是容器，直接子元素是项目。
- 容器属性：`flex-direction`(主轴方向)、`justify-content`(主轴对齐，如 `center`/`space-between`)、`align-items`(交叉轴对齐)、`flex-wrap`(换行)。
- **水平垂直居中**：容器 `display:flex` + `justify-content:center` + `align-items:center`（容器需有高度）。
- 项目属性：`flex: 数字` 占几份（自适应均分）、`align-self` 单独对齐、`order` 调顺序。
- `gap` 设项目间距，比 margin 干净；导航栏/卡片行/图文混排是三大实战套路。

下一篇我们讲 **CSS Grid**——Flexbox 管"一排或一列"，遇到"既要分行又要分列"的整页布局，Grid 更合适。
