---
title: HTML 元信息与 SEO：用户看不见，却决定页面被怎么找到
description: head 里的 meta 标签大全（charset、viewport、description、og 等）、lang 属性的作用，以及 alt、label、标题层级、ARIA 这些可访问性基本功，一篇补齐 HTML 收尾知识。
category: frontend
subcategory: html
tags: ['HTML', 'SEO', '元信息', '可访问性', 'meta']
pubDate: 2026-07-08
updatedDate: 2026-07-08
order: 8
---

前面七篇讲的都是用户"看得到"的东西：文字、图片、表格、表单、结构、多媒体。这一篇翻到背面，聊那些写在 `<head>` 里、用户肉眼看不见，却实实在在影响"页面被不被搜到、被怎么展示、视障用户能不能用"的内容。

这部分做好了，是"润物细无声"；做差了，内容再好也可能石沉大海。

## 字符编码：别让中文变乱码

```html
<meta charset="UTF-8" />
```

放在 `<head>` 最前面。它告诉浏览器"这份文件用 UTF-8 解码"。**只要漏了或写错，中文极大概率变乱码（豆腐块）**。现在几乎全世界的网页都用 UTF-8，这是必写项。同时，保存文件时编辑器也要选 UTF-8 编码（可在编辑器设置里固定），两边一致才不乱码。

## 视口：移动端适配的开关

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

这行决定了手机上页面怎么显示：

- `width=device-width`：页面宽度等于设备屏幕宽度（而不是默认的 980px 缩略图）；
- `initial-scale=1.0`：初始不缩放。

**没有它，手机上看网页会缩成一小团、要双指放大才能看**。做响应式页面这行是标配。还可以加 `maximum-scale=1.0` 禁止缩放（但会损害无障碍，一般不推荐禁缩放）。

## 页面标题与描述：搜索结果的门面

```html
<title>HTML 元信息与 SEO - 51教程网</title>
<meta name="description" content="一篇讲透 head 里的 meta 标签、lang 属性和可访问性基本功。" />
```

- `<title>`：浏览器标签页文字，也是搜索结果里**最大的那行蓝字**。每个页面应该不同、且含核心关键词；
- `description`：搜索结果下面那行灰色简介。写得好能提升点击率（虽然不直接影响排名，但影响用户点不点）。

这两个是 SEO 最基础、最该认真对待的字段。title 建议格式："核心关键词 - 站点名"，长度控制在 30 字内避免被截断。

## 语言与作者信息

```html
<html lang="zh-CN">
<meta name="author" content="小明" />
<meta name="keywords" content="HTML, SEO, 前端" />
```

- `lang` 在 `<html>` 上，告诉浏览器/阅读器页面语言（前面提过，必写 `zh-CN`）；
- `author` 标作者；
- `keywords` 早年很重要，现在搜索引擎基本不看了，写不写都行，别指望它提排名。

## 社交分享卡片：Open Graph

当你把链接发到微信、QQ、微博、Facebook，对方展示的那张"带图带标题的卡片"，靠的是 OG 协议：

```html
<meta property="og:title" content="HTML 元信息与 SEO" />
<meta property="og:description" content="head 里的秘密全在这篇" />
<meta property="og:image" content="https://example.com/cover.jpg" />
<meta property="og:url" content="https://example.com/html-meta-seo" />
<meta property="og:type" content="article" />
```

没配 OG，分享出去可能只显示光秃秃的链接；配了，就是一张漂亮的预览卡，点击率天差地别。做内容站强烈建议加。还有 Twitter Card（`twitter:card` 等）是 Twitter 的同类协议，可一并加。

## 可访问性（a11y）基本功

"可访问性"指让**所有人**（包括视障、行动不便者）都能用你的网站。几个零成本的好习惯：

**1. 每张图写 alt**

```html
<img src="chart.png" alt="2026 年各语言占比柱状图" />
```

屏幕阅读器会念 alt，视障用户才知道图里是什么。装饰性图片可用 `alt=""`（空，表示"忽略"）。

**2. 每个输入框配 label**

前面表单篇讲过，`for` 关联 `id`，点击文字能聚焦、阅读器能正确播报。

**3. 标题层级不乱跳**

`h1 → h2 → h3` 顺序使用，别从 h1 直接跳 h4。阅读器用户常靠标题导航，"跳级"会让他们迷失。

**4. 用语义标签**

前面语义化篇讲的 `nav`/`main`/`article` 等，阅读器能识别并支持"跳到主内容"等快捷操作。

**5. 颜色对比度够**

别用浅灰字配白底，色弱用户看不清。这是 CSS 范畴，但属于 a11y 整体意识。WCAG 建议正文对比度至少 4.5:1。

**6. ARIA 属性（进阶）**

当原生语义不够时，用 ARIA 补语义：

```html
<button aria-label="关闭弹窗">×</button>
```

`aria-label` 给只有图标的按钮一个可读的名字。ARIA 是个大主题，先知道有它、需要时再深入。常用还有 `aria-hidden="true"`（对阅读器隐藏装饰）、`role` 属性。

## 一个标准 head 模板

把常用元信息收拢，你新建页面直接抄：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>页面标题 - 站点名</title>
    <meta name="description" content="一句话说清这页是干嘛的" />
    <meta name="author" content="作者名" />
    <!-- 社交分享卡片 -->
    <meta property="og:title" content="页面标题" />
    <meta property="og:description" content="分享描述" />
    <meta property="og:image" content="https://example.com/cover.jpg" />
    <meta property="og:url" content="https://example.com/page" />
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    ...
  </body>
</html>
```

## 常见错误与排查

1. **meta 能"控制排名"？** 不能。搜索引擎排名看内容质量、外链、体验等几百个因素，meta 只是基础信息，别神话它；
2. **keywords 堆关键词能提排名？** 早过时了，堆反而可能被判定作弊；
3. **description 不写也行？** 不写的话搜索引擎会自己截取正文，常常不理想，建议手写；
4. **charset 没放最前？** 浏览器可能已按错误编码解析，导致后续乱码；
5. **alt 全空？** 视障用户完全不知道图片内容。

## 动手小练习

1. 给自己的页面补全标准 head 模板（charset、viewport、title、description、OG）；
2. 把页面链接发到微信/QQ，观察预览卡是否漂亮（没配 OG 时 vs 配了后）；
3. 用浏览器插件（如 axe、Lighthouse）测一下你页面的可访问性得分，按建议修；
4. 故意删掉 viewport，用手机模拟器看页面是否缩成一团；
5. 给所有图片补 alt，给所有 input 补 label，再跑一次无障碍检查看分数变化。


## 把它串起来：给页面配齐"看不见的门面"

拿你任意一个页面，补齐这套 head：`<meta charset="UTF-8">`（最前）、`<meta name="viewport" ...>`、唯一的 `<title>`（含核心关键词）、`<meta name="description">`、作者、以及完整的 Open Graph（og:title/description/image/url/type）。配完后把链接发到微信或 QQ，看分享卡片是否漂亮。再用 Lighthouse 或 axe 跑一次可访问性检测，按建议给缺失 `alt` 的图片、缺失 `label` 的输入框补上，看分数变化。

## 新手常问（FAQ）

**Q1：meta 里的 keywords 堆满关键词能提升排名吗？**
不能，反而可能被判作弊。现代搜索引擎基本不看 keywords，内容质量才是关键。

**Q2：description 不写会怎样？**
搜索引擎会自己从正文截取一段当简介，往往不理想。手写一句准确的话能提升点击率。

**Q3：可访问性（a11y）对我有什么用？**
它让视障、行动不便的人也能用你的站，很多国家/平台还把它当合规要求；同时语义化、对比度等好习惯也会顺带提升 SEO 和通用体验。


## 这一篇你该记住的

看不见的 head 信息同样关键：`charset="UTF-8"` 防乱码、`viewport` 做移动适配、`title` 和 `description` 是搜索结果门面、OG 协议决定社交分享卡片；可访问性从 `alt`、`label`、标题层级、语义标签这些零成本习惯做起。meta 是基础信息，别神话它对排名的作用。

到这篇，HTML 的骨架、文字、链接图片、表格、表单、语义、多媒体、元信息就全部讲完了——你已经能写出结构完整、专业、可读、可被搜索的网页。接下来该给它"穿上衣服"了：下一篇进入 **CSS 入门**，我们聊聊怎么用样式把页面变好看。
