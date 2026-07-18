---
title: CSS 响应式设计：一套样式适配手机到宽屏
description: 为什么页面在电脑上好看、手机上就崩？viewport 和媒体查询是关键。这篇讲清移动优先思路、断点选择、相对单位与响应式图片，让你的一套样式通吃各种屏幕。
category: frontend
subcategory: css
tags: ['CSS', '响应式', '媒体查询', '移动端']
pubDate: 2026-07-15
order: 7
---

你精心调好的页面，在自家宽屏显示器上美美的，发到手机上一看：字小得要用放大镜，布局挤成一团，图片溢出屏幕——这种"只在我屏幕上好看"的惨剧，几乎每个前端都经历过。

**响应式设计**就是解决这个问题的：让同一套代码，在手机、平板、电脑上都能自动调整布局，好看又好用。这一篇我们讲清为什么手机会"崩"、viewport 是什么、媒体查询怎么写，以及移动优先、相对单位、响应式图片这些核心实践。

## 为什么手机会崩

根本原因是：**手机浏览器默认不按"设备真实宽度"渲染，而是假想成一个宽约 980px 的"桌面视口"，再把画面整体缩小塞进手机屏幕**。于是你写的 `width: 980px` 的页面被硬塞进 375px 的手机，字和图都被缩得巨小，用户得双指放大才能看——体验灾难。

解决这个假想视口的，就是 **viewport**（视口）元标签。

## viewport：响应式的总开关

在 HTML 的 `<head>` 里加这一行，是响应式的第一步，也是必须的一步：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

含义：
- `width=device-width`：让页面宽度等于**设备真实宽度**（手机就是 375px 左右），不再假想成 980px。
- `initial-scale=1.0`：初始缩放 1 倍，不缩小。

加了这行，手机才会"用真实宽度渲染"，你后面写的媒体查询才能正确生效。**漏了它，响应式全白搭。**

## 媒体查询：按屏幕宽度切换样式

媒体查询（media query）让你"在特定条件下"套用不同 CSS。最常用的是按**宽度**断点：

```css
/* 默认（手机优先，窄屏样式） */
.container { width: 100%; padding: 10px; }

/* 屏幕宽度 ≥ 768px（平板及以上）时生效 */
@media (min-width: 768px) {
  .container { max-width: 720px; margin: 0 auto; padding: 20px; }
}

/* 屏幕宽度 ≥ 1024px（桌面）时生效 */
@media (min-width: 1024px) {
  .container { max-width: 960px; }
}
```

意思是：手机上容器占满宽、小内边距；平板及以上限制最大宽度并居中；桌面更宽。一套样式，三种表现。

### max-width vs min-width

- `@media (max-width: 767px)`：宽度**小于等于** 767 时生效（"向下"适配）。
- `@media (min-width: 768px)`：宽度**大于等于** 768 时生效（"向上"适配）。

现代推荐 **移动优先（min-width）**：先写手机样式（最简单、最通用），再用 `min-width` 在大屏上"渐进增强"。这样代码更简洁，也符合"手机流量宝贵、先给最小集"的思路。

### 其他媒体特性

```css
@media (max-width: 600px) and (orientation: portrait) { }  /* 窄屏且竖屏 */
@media (prefers-color-scheme: dark) { }                    /* 用户偏好深色模式 */
@media (hover: hover) { }                                   /* 设备支持悬停（区分触屏） */
```

媒体查询不止看宽度，还能看方向、深色模式偏好、是否支持悬停等。

## 断点怎么选

断点（breakpoint）是"布局需要变化的宽度临界点"。常见经验值：

| 断点 | 设备 |
| --- | --- |
| `< 768px` | 手机 |
| `768px ~ 1024px` | 平板 |
| `> 1024px` | 桌面/笔记本 |
| `> 1440px` | 大屏 |

但**别死记断点**，更好的做法是：**用浏览器拖动窗口，在你"看着布局开始难看"的那个宽度设断点**。断点应该跟着"内容"走，不是跟着"设备"走。

## 相对单位：让尺寸跟着屏幕走

响应式里尽量用相对单位，少写死 `px`：

- `rem`：相对根字号，整体缩放友好（前面讲过）。
- `%`：相对父容器宽，做流式布局。
- `vw` / `vh`：相对**视口**宽/高。`100vw` = 视口全宽，`50vh` = 视口一半高。适合做全屏 Hero 区：`height: 100vh`。
- `max-width: 100%`：图片/容器最大不超父宽，防溢出。

```css
.hero { height: 100vh; }              /* 占满整屏高 */
.img  { max-width: 100%; height: auto; }  /* 图片永不溢出，保持比例 */
```

## 响应式图片

图片是手机上"溢出屏幕"的头号元凶。两招解决：

```css
img { max-width: 100%; height: auto; }   /* 基础：图片永不超宽，等比缩放 */
```

更进阶：用 `<picture>` 按屏幕给不同清晰度/尺寸的图（小屏给小图省流量）：

```html
<picture>
  <source media="(max-width: 600px)" srcset="small.jpg">
  <source media="(min-width: 601px)" srcset="large.jpg">
  <img src="large.jpg" alt="示例">
</picture>
```

## 响应式布局：Flexbox/Grid 天然友好

前面讲的 Flexbox 和 Grid，本身就是响应式的好搭档：

```css
/* Grid 自适应卡片墙，不用媒体查询就自动增减列 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
```

配合媒体查询，还能在手机上把"多列"变"单列"：

```css
.layout { display: grid; grid-template-columns: 1fr; }  /* 手机：单列 */
@media (min-width: 768px) {
  .layout { grid-template-columns: 200px 1fr; }         /* 平板+：侧栏+主区 */
}
```

## 实战：一个响应式卡片列表

```css
.cards {
  display: grid;
  grid-template-columns: 1fr;        /* 手机：一列 */
  gap: 16px;
}
@media (min-width: 600px) {
  .cards { grid-template-columns: repeat(2, 1fr); }   /* 平板：两列 */
}
@media (min-width: 900px) {
  .cards { grid-template-columns: repeat(3, 1fr); }   /* 桌面：三列 */
}
.card { padding: 16px; border: 1px solid #eee; border-radius: 8px; }
```

手机 1 列、平板 2 列、桌面 3 列，全靠这套媒体查询 + Grid 实现。

## 常见新手坑

- **漏写 viewport**：手机把页面缩小塞进屏，所有响应式失效。务必 `<meta name="viewport">`。
- **断点跟着设备而非内容**：在"布局开始难看"的宽度设断点，别硬套 768/1024。
- **图片没 `max-width:100%`**：大图溢出屏幕导致横向滚动条。
- **桌面优先写 `max-width`**：移动优先（`min-width`）代码更简洁、更现代。


## 更多实战案例：断点怎么设

常见断点：手机 `<768px`、平板 `768~1024px`、桌面 `>1024px`。但更现代的做法是**移动优先**：先写手机样式，再用 `min-width` 向上增强：

```css
.card { width: 100%; }
@media (min-width: 768px) { .card { width: 48%; } }
@media (min-width: 1024px) { .card { width: 31%; } }
```

这样小屏单列、中屏两列、大屏三列，天然适配。配合前面 flex/grid 的自动换行，很多场景甚至不用写媒体查询。

## 常见坑

1. **桌面优先再缩放**：老写法先写大屏再用 max-width 向下，维护麻烦，推荐移动优先。
2. **断点跟着设备跑**：别死磕"iPhone 宽度"，按"内容什么时候挤"来定断点。
3. **忘了 viewport**：没 `<meta viewport>` 媒体查询全失效。
4. **图片没自适应**：图片要 `max-width:100%` 否则撑破。

## 小测验

- 问题1：移动优先是先写大屏还是小屏？答案：先写小屏，再用 min-width 增强。
- 问题2：媒体查询失效最常见原因？答案：漏写 viewport meta。
- 问题3：让图片不撑破容器设什么？答案：`max-width:100%; height:auto`。


## 这一篇你该记住的

- 手机"崩"是因为默认假想 980px 视口再缩小；`<meta name="viewport" content="width=device-width, initial-scale=1.0">` 是响应式总开关。
- 媒体查询 `@media (min-width: 768px)` 按宽度切换样式；推荐**移动优先（min-width）**，先手机后增强。
- 断点跟着"内容难看处"走，不硬套设备尺寸。
- 用相对单位：`rem`（整体缩放）、`%`/`vw`/`vh`（流式）、`max-width:100%`（防溢出）。
- 图片 `max-width:100%;height:auto` 防溢出；Flexbox/Grid（尤其 `auto-fit`）天然响应式。

到此，CSS 这条线（基础→盒模型→Flexbox→Grid→定位→视觉美化→响应式）已完整打通。配合前面的 HTML 和 JS，你已经能做出结构清晰、布局现代、还能响应各种屏幕的网页了。
