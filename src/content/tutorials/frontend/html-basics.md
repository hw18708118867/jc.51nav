---
title: HTML 基础入门：从零构建你的第一个网页
description: 用一篇教程带你看懂 HTML 的结构、常用标签与语义化写法，并动手写出第一个可运行的网页。
category: frontend
subcategory: html-css
tags: ['HTML', '前端', '入门']
pubDate: 2026-07-01
order: 1
---

## 什么是 HTML

HTML（HyperText Markup Language，超文本标记语言）是构建网页的基石。它用"标签"描述页面的结构与内容，浏览器再将标签渲染成我们看到的文字、图片和按钮。

> 记住：HTML 只负责"结构与内容"，样式交给 CSS，交互交给 JavaScript。

## 一个最小的 HTML 文档

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>我的第一个网页</title>
  </head>
  <body>
    <h1>你好，世界</h1>
    <p>这是我的第一个网页。</p>
  </body>
</html>
```

把上面的内容保存为 `index.html`，双击用浏览器打开即可看到效果。

## 常用标签速览

- `<h1>`~`<h6>`：标题，数字越小级别越高
- `<p>`：段落
- `<a href="...">`：超链接
- `<img src="..." alt="...">`：图片
- `<ul>` / `<ol>` / `<li>`：列表
- `<div>` / `<span>`：通用容器

## 语义化标签

相比一堆 `<div>`，语义化标签能让结构和含义更清晰，也更利于 SEO 与无障碍访问：

```html
<header>页眉</header>
<nav>导航</nav>
<main>
  <article>文章</article>
  <aside>侧边栏</aside>
</main>
<footer>页脚</footer>
```

## 小结

你已经了解了 HTML 的基本结构、常用标签与语义化写法。下一步可以学习 CSS，为网页添加样式。
