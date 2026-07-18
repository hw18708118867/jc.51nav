---
title: CSS Grid 布局：用二维网格搭出整页骨架
description: Flexbox 擅长"一排或一列"，遇到"既要管行又要管列"的整体布局，Grid 更合适。这篇讲清行列定义、fr 单位、网格区域和跨格，配一个卡片墙示例。
category: frontend
subcategory: css
tags: ['CSS', 'Grid', '布局']
pubDate: 2026-07-12
order: 4
---

Flexbox 很好用，但它本质是"一维"的——要么排一行，要么排一列。当你要做"整页布局"：顶部一条、左边一栏、右边主内容、底部一脚，这种既要分行又要分列的事，Flexbox 也能凑，但会比较拧巴。

**CSS Grid（网格布局）** 就是为"二维布局"而生的：它同时管**行和列**，像一张表格那样精确摆放元素。这一篇我们讲清怎么定义网格、用 `fr` 分配空间、用网格区域命名布局，最后用一个卡片墙示例巩固。

## Grid 的核心思想

Grid 把容器分成"行"和"列"交错的格子，子元素可以精确放进某个格子、或跨多个格子。两个角色：

- **网格容器（grid container）**：设 `display: grid` 的元素。
- **网格项目（grid item）**：容器的直接子元素，自动进入格子。

```html
<div class="grid">
  <div class="a">A</div>
  <div class="b">B</div>
  <div class="c">C</div>
  <div class="d">D</div>
</div>
```

## 定义列和行

用 `grid-template-columns` 定义"有几列、每列多宽"，`grid-template-rows` 定义行高：

```css
.grid {
  display: grid;
  grid-template-columns: 100px 100px 100px;  /* 三列，各 100px */
  grid-template-rows: 80px 80px;             /* 两行，各 80px */
  gap: 10px;                                  /* 格子间距 */
}
```

四个子元素会按"从左到右、从上到下"依次填满格子：A(第1行第1列)、B(1,2)、C(1,3)、D(2,1)……

## fr 单位：按比例分空间

写死 `100px` 不够灵活。`fr`（fraction，分数）表示"剩余空间的一份"，让列自动按比例分配：

```css
.grid {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;  /* 三列按 1:2:1 分总宽 */
  gap: 10px;
}
```

`1fr 2fr 1fr` 意思是把可用宽度分成 4 份，三列分别占 1、2、1 份。中间列是两边的两倍宽。这比算百分比方便太多，而且会自动响应容器宽度变化。

也可以混用固定和弹性：

```css
grid-template-columns: 200px 1fr;   /* 左边固定 200px，右边占满剩余 */
```

这是"固定侧边栏 + 自适应主内容"的经典写法。

## repeat() 与 auto-fit：批量与自适应

列多时写 `1fr 1fr 1fr 1fr` 太啰嗦，用 `repeat`：

```css
grid-template-columns: repeat(4, 1fr);   /* 等价于 1fr 1fr 1fr 1fr */
```

更妙的是 `auto-fit` + `minmax`，做"自适应卡片墙"——屏幕宽就多列、窄就少列，全自动：

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
```

`minmax(200px, 1fr)` 表示"每列最小 200px、最大占 1 份"；`auto-fit` 让容器尽可能多塞列。效果：宽屏一行 5 个、窄屏自动变 2 个、手机变 1 个——完全不用媒体查询。这是 Grid 最惊艳的能力之一。

## 网格区域：用名字摆布局

复杂布局可以用 `grid-template-areas` 给格子"画地图"，直观又好改：

```css
.layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-rows: 60px 1fr 40px;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  gap: 10px;
}
.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main   { grid-area: main; }
.footer { grid-area: footer; }
```

`grid-template-areas` 里用字符串画出"哪块占哪几个格子"，子元素用 `grid-area` 认领自己的名字。改布局时只改这张"地图"就行，不用动每个元素的位置属性。注意：地图里同一名字要连成矩形区域（不能 L 形断开）。

## 跨格：项目占多行多列

单个项目想占多个格子，用 `grid-column` / `grid-row`：

```css
.big {
  grid-column: 1 / 3;   /* 从第 1 根列线到第 3 根（即占第 1、2 列） */
  grid-row: 1 / 2;
}
```

Grid 的"线"编号从 1 开始：3 列有 4 根列线（1、2、3、4）。`grid-column: 1 / 3` 表示从线 1 到线 3，跨 2 列。也能用 `span`：`grid-column: span 2`（占 2 列）。

## 项目对齐

Grid 里也有对齐控制，和 Flexbox 类似但作用在格子里：

```css
.grid {
  display: grid;
  justify-items: center;   /* 项目在各自格子内水平居中 */
  align-items: center;     /* 垂直居中 */
}
```

## 实战：响应式卡片墙

```html
<div class="wall">
  <div class="card">卡片1</div>
  <div class="card">卡片2</div>
  <div class="card">卡片3</div>
  <div class="card">卡片4</div>
</div>
```
```css
.wall {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
.card {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
}
```

不用写任何媒体查询，卡片数随屏幕宽度自动增减列数。这是商品列表、图片墙、仪表盘最常用的布局。

## Grid vs Flexbox：怎么选

| 场景 | 用谁 |
| --- | --- |
| 整页大骨架（页头/侧栏/主区/页脚） | Grid |
| 一排导航、一组按钮、卡片行 | Flexbox |
| 既要分行又要分列、精确占位 | Grid |
| 一行或一列内的对齐/伸缩 | Flexbox |

经验：**大结构用 Grid，小组件用 Flexbox**。两者经常配合：Grid 搭整页，里面某个区域再用 Flexbox 排内部元素。

## 常见新手坑

- **`fr` 和 `px` 混用顺序无影响，但 `minmax` 更稳**：纯 `fr` 在内容溢出时可能压缩，配合 `minmax` 设最小宽更稳。
- **`grid-template-areas` 名字不连成矩形**：地图里同一名字必须连成方块，否则报错。
- **忘了 `gap`**：格子贴在一起没间距，记得设 `gap`。
- **线编号从 1 开始**：`grid-column: 1 / 3` 跨的是第 1~2 列（到第 3 根线），别数错。


## 更多实战案例：两行三列布局

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto 200px;
  gap: 12px;
}
```

`repeat(3,1fr)` 表示三列等宽各占 1 份；`1fr` 是"剩余空间的一份"，自动平分。这比 flex 做二维网格直观得多。再比如经典"圣杯布局"（头、尾通栏，中间左中右），用 grid 区域命名几行就能排好，远比 float 时代简单。

## 常见坑

1. **grid 和 flex 选错**：一维用 flex，二维用 grid，别都用 grid 也别都用 flex。
2. **fr 和 px 混用**：`1fr 200px` 是先给 200px 再分剩余，理解清楚再写。
3. **忘记 gap**：子项会贴在一起，记得设 `gap`。
4. **隐式行**：内容超出定义行数会生成隐式行，可用 `grid-auto-rows` 控制高度。

## 小测验

- 问题1：一维排列（如导航）用什么？答案：flex。
- 问题2：`repeat(3,1fr)` 是什么意思？答案：三列等宽平分剩余空间。
- 问题3：二维网格（如相册）用什么？答案：grid。


## 这一篇你该记住的

- Grid 是二维布局（同时管行列），适合整页骨架；设 `display: grid` 的是容器，子元素是项目。
- `grid-template-columns/rows` 定义行列；`fr` 按比例分空间；`repeat(4,1fr)` 批量；`repeat(auto-fit, minmax(200px,1fr))` 做自适应卡片墙（免媒体查询）。
- `grid-template-areas` 用"地图"摆布局，直观易改；`grid-column: 1/3` / `span 2` 让项目跨格。
- `justify-items`/`align-items` 控制项目在格子内对齐。
- 选谁：大结构用 Grid，小组件用 Flexbox，常配合用。

下一篇我们讲 **定位与浮动**——`position` 的几种值怎么把元素"钉"在特殊位置，以及老牌 `float` 为什么还值得了解。
