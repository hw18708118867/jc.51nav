---
title: CSS 文字、颜色与背景：让页面真正好看起来的细节
description: 字体栈怎么写才不翻车，字号单位 px/rem/em 怎么选，颜色用十六进制还是 hsl，背景渐变怎么写。这篇把"视觉美化"最常用的样式讲清。
category: frontend
subcategory: css
tags: ['CSS', '字体', '颜色', '背景']
pubDate: 2026-07-14
order: 6
---

骨架和布局搭好之后，页面能不能"好看"，很大程度落在文字、颜色和背景这些细节上。同样的布局，字体选对了、配色舒服了、留白恰当了，质感立刻不同。

这一篇我们不讲布局，专攻"视觉美化三件套"：文字（字体、字号、行高）、颜色（各种写法与配色）、背景（纯色、渐变、图片）。这些都是你每天都会写、也最影响观感的样式。

## 文字样式

### 字体栈：别只写一个字体

```css
body {
  font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
}
```

为什么写一串？因为**你不知道用户电脑装了什么字体**。字体栈从左到右尝试，用用户机器上第一个存在的字体。`sans-serif` 是"无衬线"的兜底分类（没前面那些就用系统默认无衬线字体）。中文站点一般把"苹方(PingFang SC)"、"微软雅黑"放前面，保证 Mac/Windows 都有好看的默认中文字体。

- `serif`：衬线字体（宋体类，有装饰角，正式）
- `sans-serif`：无衬线（黑体类，现代、屏幕友好）
- `monospace`：等宽字体（代码用，如 Consolas）

### 字号单位：px / em / rem 怎么选

```css
.title { font-size: 24px; }   /* 像素，绝对大小，最直观 */
.box   { font-size: 1.2em; }  /* 相对"父元素字号" */
html   { font-size: 16px; }
.root  { font-size: 1.5rem; }  /* 相对"根元素(html)字号" */
```

- `px`：固定像素，最可控，但用户调浏览器字号时不会跟着变（无障碍稍差）。
- `em`：相对父元素字号。嵌套时容易"倍数叠加"算晕（父 1.2em、子又 1.2em → 实际 1.44em）。
- `rem`：**相对根元素 `<html>` 的字号**，不受父级影响，最适合做"全站统一缩放"——改 `html` 的 `font-size` 就能整体调大调小，响应式常用。

> 经验：全局基础字号设 `html { font-size: 16px; }`，组件内用 `rem` 表达相对大小，兼顾可控与统一缩放。

### 行高、字重、对齐、间距

```css
p {
  line-height: 1.8;          /* 行高，无单位数字表示"字号的几倍"，1.6~1.8 阅读最舒服 */
  font-weight: 400;         /* 字重：400 正常，700 加粗（也可用 bold） */
  text-align: center;       /* 对齐：left/center/right/justify(两端对齐) */
  letter-spacing: 1px;      /* 字间距 */
  text-indent: 2em;         /* 首行缩进（中文段落常用 2em） */
}
```

`line-height` 用无单位数字（如 `1.8`）最稳，它会随字号自动缩放。

### 文本装饰与溢出处理

```css
a { text-decoration: none; }        /* 去掉链接下划线 */
.price { text-decoration: line-through; }  /* 删除线（原价） */
.title {
  white-space: nowrap;               /* 不换行 */
  overflow: hidden;
  text-overflow: ellipsis;           /* 超出显示省略号 …（单行截断） */
}
```

`text-overflow: ellipsis` 是列表/卡片标题"超出一行就显示…"的标配，但必须配合 `white-space: nowrap` + `overflow: hidden` 三件套才生效。

## 颜色

CSS 里颜色有几种写法：

```css
color: #2563eb;        /* 十六进制（最常用） */
color: #2563ebcc;      /* 八位十六进制，后两位 cc 是透明度 */
color: rgb(37, 99, 235);        /* RGB */
color: rgba(37, 99, 235, 0.8);   /* RGBA，最后一个是透明度 0~1 */
color: hsl(221, 83%, 53%);       /* HSL：色相 饱和度 亮度 */
color: hsla(221, 83%, 53%, 0.5);
color: red;            /* 颜色名（少用，可选少） */
```

**推荐 HSL**：`hsl(色相, 饱和度%, 亮度%)` 最符合人类直觉——调"色相"换颜色、调"饱和度"换鲜艳度、调"亮度"换明暗，做主题色、悬停变暗都很方便。比如主色 `hsl(221,83%,53%)`，悬停时把亮度调低成 `hsl(221,83%,43%)` 即可。

### 透明度

```css
.box { opacity: 0.5; }          /* 整个元素（含内容）半透明 */
.box { background: rgba(0,0,0,0.3); }  /* 只让背景半透明，文字仍清晰 */
```

`opacity` 会让元素整体（包括里面的字）变透明；只想背景透明用 `rgba` 的 alpha 通道。

## 背景

### 纯色与圆角

```css
.card {
  background: #fff;
  border-radius: 8px;     /* 圆角 */
}
```

### 渐变

渐变是"背景图像"的一种，写法：

```css
/* 线性渐变：从上到下，蓝到紫 */
.btn {
  background: linear-gradient(180deg, #2563eb, #7c3aed);
}
/* 角度控制方向：to right 从左到右；45deg 斜向 */
background: linear-gradient(to right, #f00, #00f);

/* 径向渐变：从中心向外 */
background: radial-gradient(circle, #fff, #ddd);
```

渐变做按钮、卡片高光、背景装饰都很出彩。

### 背景图片

```css
.hero {
  background-image: url('/img/banner.jpg');
  background-size: cover;       /* 覆盖容器，不变形 */
  background-position: center;  /* 居中 */
  background-repeat: no-repeat; /* 不重复平铺 */
}
```

`background-size: cover` 让图片"填满容器且不变形"（可能裁切边缘），`contain` 则"完整显示不裁切（可能留空白）"。

## 实战：一个好看的按钮

```css
.btn {
  display: inline-block;
  padding: 10px 24px;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(180deg, #3b82f6, #2563eb);
  border: none;
  border-radius: 6px;
  cursor: pointer;            /* 鼠标变手型，提示可点 */
  transition: background 0.2s; /* 悬停时平滑过渡 */
}
.btn:hover {
  background: linear-gradient(180deg, #2563eb, #1d4ed8);  /* 悬停变深 */
}
```

`cursor: pointer` 让按钮有"可点"的手型；`transition` 让颜色变化平滑（下篇响应式会细讲 transition/动画）；`:hover` 伪类做悬停反馈。

## 常见新手坑

- **字体只写一个**：用户没装就 fallback 到难看的默认字体，务必写字体栈。
- **`em` 嵌套倍数叠加**：多级 `em` 会相乘算晕，统一缩放用 `rem`。
- **省略号不生效**：`text-overflow: ellipsis` 必须配 `white-space: nowrap` + `overflow: hidden`。
- **`opacity` 把字也变透明**：只想背景透明用 `rgba()`。


## 更多实战案例：好看的排版细节

正文排版有几个经验值：行高 `line-height:1.6~1.8` 读着不累；段落间距用 `margin-bottom` 而非换行；中文字体栈要带中文兜底：`font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;`。颜色用 `hsl()` 比 hex 更好调：同色相调亮度即可，`hsl(210, 80%, 50%)` 改第三个值就变深浅。

链接配色：默认蓝+下划线，访问过变紫；想自定义用 `a { color:#0066cc; }` 和 `a:hover { color:#004499; }`，hover 给用户反馈。

## 常见坑

1. **字体栈没中文兜底**：英文好字体不含中文，中文会掉到难看的默认字体。
2. **行高太小**：密密麻麻难读，正文建议 1.6+。
3. **用纯黑 #000 做正文**：略刺眼，用 `#222` 更柔和。
4. **忘记 :hover/:focus 反馈**：交互元素没反馈体验差。

## 小测验

- 问题1：正文行高一般设多少合适？答案：1.6~1.8。
- 问题2：中文字体栈为什么要带中文名？答案：英文好字体不含中文字形，需兜底。
- 问题3：调颜色深浅改 hsl 的第几个值？答案：第三个（亮度）。


## 这一篇你该记住的

- 字体写"字体栈"（如 `"PingFang SC","Microsoft YaHei",sans-serif`），从左到右取第一个存在的，最后用分类兜底。
- 字号单位：`px` 固定、`em` 相对父（易叠加）、`rem` 相对根（适合统一缩放）；行高用无单位数字（如 1.8）。
- 颜色推荐 HSL（色相/饱和/亮度直观好调）；`rgba`/`hsla` 的 alpha 做半透明；`opacity` 会让整体（含文字）变透明。
- 背景：`linear-gradient` 做渐变、`background-size: cover` 铺满图片不变形；圆角 `border-radius`、悬停反馈 `:hover` + `transition`。

下一篇我们讲 **响应式设计**——为什么页面在电脑上好看、手机上就崩，viewport 和媒体查询是怎么解决这套适配问题的。
