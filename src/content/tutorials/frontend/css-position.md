---
title: CSS 定位与浮动：把元素"钉"在想要的地方
description: position 的 static/relative/absolute/fixed/sticky 各管什么，z-index 怎么决定谁压谁，以及 float 这个"上古布局术"为什么还值得了解。一篇补齐定位这块拼图。
category: frontend
subcategory: css
tags: ['CSS', '定位', 'position', 'float']
pubDate: 2026-07-13
updatedDate: 2026-07-13
order: 5
---

Flexbox 和 Grid 解决了"一排一排、一格一格"的布局，但有些场景它们不擅长：比如让一个"回到顶部"按钮永远贴在右下角、让表头滚动时吸在顶部、或者做个半透明遮罩盖住全屏。这些"脱离常规流、钉在特殊位置"的需求，要靠 `position` 定位来实现。

这一篇我们把 `position` 的五种值（static / relative / absolute / fixed / sticky）逐个讲清，搞懂 `z-index` 的层叠规则，并补上 `float` 这个历史遗留但偶尔还能见到的老技术。

## 文档流：一切的起点

先理解一个前提：**默认情况下，块级元素从上到下堆叠，行内元素从左到右排，这就是"普通文档流"**。`position` 的作用，本质上是决定一个元素"如何脱离或参照文档流来摆放"。

## position 的五种值

### static（默认）

```css
.box { position: static; }   /* 不写 position 时就是它 */
```

按普通文档流摆放，设了 `top/left` 等偏移量也**无效**。这是所有元素的默认值。

### relative（相对定位）

```css
.box { position: relative; top: 10px; left: 20px; }
```

元素**先按正常流占好位**，然后**相对自己原本的位置**偏移（`top/left` 等）。关键特点：
- 它**仍然占据原来的文档流空间**（后面的元素不会挤上来补位）。
- 常用来做"微调位置"，或**当 absolute 的参照物**（见下）。

### absolute（绝对定位）

```css
.box { position: absolute; top: 0; right: 0; }
```

元素**完全脱离文档流**（不占空间，后面的元素会当它不存在、往上补），并**相对于"最近的、非 static 定位的祖先"** 定位。如果祖先都没设定位，就相对于 `<html>`（视口）定位。

```html
<div class="parent">        <!-- 设 position: relative -->
  <div class="child"></div> <!-- 设 position: absolute; top:10px; right:10px -->
</div>
```
```css
.parent { position: relative; width: 300px; height: 200px; }
.child  { position: absolute; top: 10px; right: 10px; }
```

`.child` 会钉在 `.parent` 的右上角（距上 10、距右 10），而且不占空间。这是做"角标、关闭按钮、下拉菜单"的标准手法——**父相子绝**（父 relative、子 absolute）。

### fixed（固定定位）

```css
.back-top {
  position: fixed;
  bottom: 30px;
  right: 30px;
}
```

元素脱离文档流，**相对于浏览器视口（viewport）定位**，滚动页面时它**纹丝不动**——永远钉在屏幕的同一位置。适合"回到顶部"按钮、悬浮客服、固定导航栏。

⚠️ 注意：`fixed` 相对于视口，不是父元素。想让它相对某个滚动容器定位，要用 `absolute` + 那个容器 `relative`。

### sticky（粘性定位）

```css
.header {
  position: sticky;
  top: 0;
}
```

`sticky` 是 `relative` 和 `fixed` 的结合：**正常滚动时它像 relative 跟着流走，但当它滚到设定的位置（如 top:0）时，就"粘"在那里像 fixed 一样不动**，直到父容器滚出去才松开。最适合做"滚动时吸顶的表头/导航栏"，纯 CSS 实现，不用 JS。

## z-index：谁压在谁上面

定位元素（relative/absolute/fixed/sticky）可能重叠。`z-index` 决定谁在上层（像叠罗汉，z 越大越靠上）：

```css
.modal { position: fixed; z-index: 1000; }
.mask  { position: fixed; z-index: 999; }
```

`z-index` 只在**定位元素**之间比较；没定位的元素 `z-index` 无效。默认后写的元素压在先写的上面。值可以是负数（压到更底层）。

> 小技巧：做弹窗遮罩时，遮罩 `z-index` 设个中等值，弹窗内容设更高值，保证弹窗浮在遮罩之上、遮罩浮在页面之上。

## float：上古布局术（了解）

在 Flexbox/Grid 出现前，做"文字环绕图片""多列布局"全靠 `float`（浮动）。它会让元素"浮"到左边或右边，后面的内容绕开它：

```css
.img { float: left; margin-right: 10px; }
```

```html
<img class="img" src="a.png">
<p>这段文字会环绕在图片右侧……</p>
```

`float` 的著名坑是**父元素会"高度塌陷"**（因为浮动元素脱离文档流，父容器量不到它的高）。老办法是"清除浮动"：

```css
.clearfix::after {
  content: '';
  display: block;
  clear: both;   /* 清除左右浮动 */
}
```

**现代建议**：布局优先用 Flexbox/Grid，它们没有浮动塌陷问题。`float` 现在主要只剩"文字环绕图片"这一个还合适的场景。了解它，是为了能看懂老代码、老教程。

## 实战一：悬浮"回到顶部"按钮

```css
.back-top {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 44px; height: 44px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

配合 JS（监听滚动显示/隐藏）就是常见悬浮按钮。

## 实战二：吸顶导航

```css
.nav {
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 100;
}
```

页面滚动时导航栏吸在顶部，体验极佳。

## 常见新手坑

- **absolute 找不到参照**：忘了给父元素设 `relative`，导致 `absolute` 相对视口定位、跑偏。记住"父相子绝"。
- **fixed 相对视口**：想相对某容器固定却用了 `fixed`，结果相对屏幕。改用 `absolute`+容器 `relative`。
- **z-index 不生效**：元素没设 `position`（非 static）时 `z-index` 无效。
- **float 高度塌陷**：老代码里父容器没高，记得 `clearfix` 清除浮动。


## 更多实战案例：固定顶栏与遮罩

做"滚动时始终在顶部的导航"：

```css
.header { position: fixed; top: 0; left: 0; right: 0; }
```

`fixed` 相对视口，页面滚它也不动。但注意 fixed 元素脱离文档流，会盖住内容，通常要给 body 加 `padding-top` 留出空间。

做弹窗遮罩：一个 `position:fixed` 铺满全屏的半透明层 + 中间 `absolute` 定位的对话框，是经典用法。

## 常见坑

1. **absolute 找不到参照**：它的定位祖先是"最近的非 static 祖先"，如果父级没设 position，会一直找到 body，位置错乱。需要参照时就给父级 `position:relative`。
2. **fixed 盖住内容**：记得留 padding。
3. **z-index 不生效**：只对定位元素（非 static）有效。
4. **relative 位移后仍占位**：relative 只是视觉移动，原位置还留着，不会让出空间。

## 小测验

- 问题1：让弹窗相对"弹窗容器"定位，容器该设什么 position？答案：`relative`。
- 问题2：滚动时不动的顶栏用哪个？答案：`fixed`。
- 问题3：z-index 对普通 static 元素生效吗？答案：不生效，要先定位。


## 这一篇你该记住的

- 默认 `static` 按文档流；`relative` 相对自己原位偏移且占空间；`absolute` 脱离流、相对"最近非 static 祖先"定位（父相子绝）。
- `fixed` 相对视口钉死（滚动不动），适合悬浮按钮/固定栏；`sticky` 滚到位置才"粘住"，适合吸顶导航。
- `z-index` 决定定位元素的层叠顺序（越大越上），只对定位元素有效。
- `float` 是老布局术，现仅适合"文字环绕图片"；有高度塌陷坑（用 `clearfix` 清除）。现代布局优先 Flexbox/Grid。

下一篇我们讲 **文字、颜色与背景**——字体栈、字号单位、配色与渐变，把"视觉美化"最常用的样式讲清。
