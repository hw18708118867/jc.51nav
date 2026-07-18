---
title: CSS 盒模型：搞懂一个元素到底占多大地方
description: 每个 HTML 元素在浏览器眼里都是个盒子。这篇把 content、padding、border、margin 四层讲清，顺便解决"为什么我设了宽度却对不上"的盒模型之坑。
category: frontend
subcategory: css
tags: ['CSS', '盒模型', '布局基础']
pubDate: 2026-07-10
order: 2
---

新手排布局时最常被一件事搞懵：明明给 div 设了 `width: 200px`，实际量出来却比 200 宽；或者两个盒子之间莫名其妙多出空隙。这些"对不上"的根源，几乎都出在盒模型上。

在 CSS 眼里，**每个 HTML 元素都是一个"盒子"**。你写的 `width`、`padding`、`border`、`margin` 都是在描述这个盒子的四层结构。不理解盒模型，布局就永远在"猜"。这一篇我们把这四层拆开，并解决那个经典的"宽度对不上"的坑。

## 盒子的四层结构

从内到外，一个盒子有四层：

```
┌─────────────────────────────┐  ← margin（外边距，盒子外面的空隙）
│  ┌───────────────────────┐  │
│  │  ┌─────────────────┐  │  │  ← border（边框）
│  │  │  ┌───────────┐  │  │  │
│  │  │  │  content  │  │  │  │  ← padding（内边距，内容和边框之间）
│  │  │  │  (内容区) │  │  │  │
│  │  │  └───────────┘  │  │  │
│  │  └─────────────────┘  │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

- **content（内容区）**：你写的文字、图片真正待的地方。`width` 和 `height` 默认指的是**内容区**的大小。
- **padding（内边距）**：内容区到边框之间的"软垫"，背景色会铺到 padding（padding 区域显示的是元素的背景色）。
- **border（边框）**：盒子的"墙"，有粗细和颜色。
- **margin（外边距）**：盒子**外面**和其他盒子之间的空隙，**不显示背景色**，纯粹是间距。

打个比方：content 是你人，padding 是衣服和身体的空隙，border 是外套，margin 是你和别人之间站的距离。

## 默认情况下宽度怎么算（标准盒模型）

在默认 `box-sizing: content-box` 下，你设的 `width` **只算 content**，真正的"占地宽度"是：

```
总宽度 = width + 左右 padding + 左右 border + 左右 margin
```

这就是"对不上"的元凶！比如：

```css
.box {
  width: 200px;
  padding: 20px;
  border: 5px solid #000;
}
```

你以为盒子宽 200px，实际**内容区** 200px，但盒子从 border 外缘量起是 `200 + 20*2 + 5*2 = 250px`。如果再加 `margin: 10px`，它占的外部空间还要再加 20px。做布局时这种"算错"极其常见。

## 救星：box-sizing: border-box

为了不让 `width` 和实际占地"打架"，现代开发几乎一律加一句全局重置：

```css
* {
  box-sizing: border-box;
}
```

`border-box` 模式下的规则变成：**你设的 `width` 已经包含了 content + padding + border**。也就是说，上面那个例子设 `width: 200px` 后，盒子从外缘量就是 200px，padding 和 border 从里面"扣"，content 自动变窄。这让"我设了多少宽，它就占多少宽"变成现实，布局心智负担骤降。

> 经验：项目开头就写 `* { box-sizing: border-box; }`，这是几乎所有现代 CSS 重置（reset）都会包含的一句。

## padding / border / margin 的写法

### padding（内边距）

```css
padding: 10px;            /* 上下左右都是 10 */
padding: 10px 20px;       /* 上下 10，左右 20 */
padding: 10px 20px 30px 40px;  /* 上 右 下 左（顺时针） */
padding-top: 10px;        /* 单独设某一侧 */
```

四值顺序是"上 右 下 左"（顺时针，记"上右下左"或"TRBL"），这是 CSS 里很多简写属性的通用顺序。

### border（边框）

```css
border: 1px solid #333;    /* 宽度 样式 颜色，三合一 */
border-width: 1px;
border-style: solid;       /* solid 实线 / dashed 虚线 / dotted 点线 */
border-color: #333;
border-radius: 8px;        /* 圆角！让方盒子变圆润 */
border-top: 2px solid red; /* 只设上边框 */
```

`border-radius` 是现代 UI 圆角的标配，设成 `50%` 还能把正方形变成圆形头像。

### margin（外边距）

```css
margin: 10px;
margin: 0 auto;            /* 上下 0，左右 auto → 块级元素水平居中！ */
margin-top: 20px;
```

`margin: 0 auto` 是让**固定宽度的块级元素水平居中**的经典写法（前提元素有宽度、是块级）。

## margin 的两个坑

### 坑 1：margin 合并（外边距折叠）

两个**垂直相邻**的块级元素的 margin 会"合并"——不是相加，而是取**较大值**。比如上面元素 `margin-bottom: 20px`，下面元素 `margin-top: 30px`，它们之间的实际间距是 30px（不是 50px）。这是 CSS 的默认行为，做垂直间距时要心里有数。

### 坑 2：margin 塌陷（父子）

如果一个父元素里第一个子元素有 `margin-top`，这个 margin 有时会"跑"到父元素外面（而不是把父子撑开）。解决办法：给父元素加 `overflow: hidden` 或 `border`/`padding` 隔开。新手遇到"子元素 margin 把父元素顶下去"就是这原因。

## 背景色铺到哪一层

`background-color` 会铺满 **content + padding**，但**不**铺 border 和 margin（border 有自己的 `border-color`，margin 永远透明）。所以你给盒子设了 padding，背景色会"溢出"到 padding 区域——这往往是你要的效果（内容周围留同色软垫）。

## 实战：一个卡片的盒子拆解

```css
.card {
  box-sizing: border-box;
  width: 300px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin: 0 auto 20px;   /* 水平居中，下方留 20 间距 */
  background: #fff;
}
```

这个 `.card` 从外缘量就是 300px（border-box），内部有 16px 软垫，1px 灰边，8px 圆角，下方和兄弟卡片间隔 20px。这就是电商卡片、文章卡片的标准盒子写法。

## 常见新手坑

- **宽度对不上**：忘了默认 `content-box`，`width` 不含 padding/border。解决：全局 `box-sizing: border-box`。
- **`margin: 0 auto` 不居中**：元素必须是块级且有明确宽度；行内元素（如 `span`）这样设无效。
- **垂直 margin 合并**：相邻块级上下 margin 取大值不相加，别奇怪间距"少了"。
- **背景色没铺到 padding**：其实是铺了的，误以为没铺；确认 background 作用在 content+padding。


## 更多实战案例：用 box-sizing 省心

默认 `content-box` 下，你设 `width:200px; padding:20px; border:2px`，元素实际占 `200+40+4=244px` 宽。做两列各 50% 宽度时，加上 padding 就溢出。解决办法是全局加：

```css
* { box-sizing: border-box; }
```

这样 `width:200px` 就**包含**了 padding 和 border，元素总宽就是 200px，布局好算太多。这是现代项目几乎必写的一行。

再比如，想让两张图并排且中间有间距，给每张 `width:48%; margin:1%`，在 `border-box` 下不会算错；若用 `content-box` 很容易加起来超过 100% 换行。

## 常见坑

1. **设了宽度还溢出**：忘了 padding/border 会撑大（content-box 下），用 border-box 解决。
2. **margin 塌陷**：上下两个块，margin 会取最大值而不是相加，这是正常行为，别以为是 bug。
3. **inline 元素设宽高无效**：`<span>` 默认 inline，给 width/height 不生效，要改成 `display:inline-block` 或 `block`。
4. **padding 用负数**：padding 不能负，想往里缩要用负 margin（谨慎）。

## 小测验

- 问题1：`border-box` 下 `width:200px; padding:20px` 实际占多宽？答案：200px（padding 算在里面）。
- 问题2：两个上下块 margin 都是 20px，间距是多少？答案：20px（取大值，不相加）。
- 问题3：想让 `<span>` 有固定宽高该设什么 display？答案：`inline-block`。


## 这一篇你该记住的

- 每个元素是盒子，四层：content（内容）→ padding（内边距）→ border（边框）→ margin（外边距）。
- 默认 `content-box`：`width` 只算内容，总占地 = width + padding + border + margin（这就是"对不上"的坑）。
- 全局 `* { box-sizing: border-box; }` 让 `width` 包含 padding+border，布局不再打架。
- padding/border/margin 简写顺序"上右下左"；`border-radius` 做圆角；`margin: 0 auto` 让定宽块级水平居中。
- 注意 margin 合并（垂直相邻取大值）和 margin 塌陷（父子）两个坑。

下一篇我们讲 **Flexbox**——一行代码搞定"水平垂直居中"这个曾经折磨无数人的难题。
