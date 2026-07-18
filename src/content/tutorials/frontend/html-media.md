---
title: HTML 多媒体：在页面里放得下声音、影像和外部内容
description: audio、video、source、iframe 这些标签怎么用，controls、autoplay、loop、muted 各管什么，嵌入视频和地图时又该注意哪些坑。一篇把 HTML 多媒体讲明白。
category: frontend
subcategory: html
tags: ['HTML', '多媒体', 'audio', 'video', 'iframe']
pubDate: 2026-07-07
order: 7
---

纯文字和图片的页面已经能讲不少事，但有些东西天生就该"动"或"出声"——一段课程录音、一个产品演示视频、一张实时地图。HTML 给了几样专门的多媒体标签，不用装插件、不用写复杂脚本，浏览器原生就能播。

这一篇把声音、影像、外部嵌入这三块讲清楚。

## 音频：`<audio>`

```html
<audio src="song.mp3" controls></audio>
```

`controls` 属性会显示自带的播放/暂停/进度条控件。常用属性还有：

- `autoplay`：自动播放（**注意：现代浏览器几乎都禁止带声音的视频/音频自动播放**，除非同时 `muted`）；
- `loop`：循环播放；
- `muted`：静音；
- `preload`：是否预加载（`auto`/`metadata`/`none`）。

**兼容不同格式：用 `<source>`**

不同浏览器支持的音频格式不一样（mp3、ogg、wav）。一个稳妥写法是提供多个源，浏览器挑第一个能播的：

```html
<audio controls>
  <source src="song.mp3" type="audio/mpeg" />
  <source src="song.ogg" type="audio/ogg" />
  <p>你的浏览器不支持音频，<a href="song.mp3">点此下载</a>。</p>
</audio>
```

`audio` 标签中间那段 `<p>` 是"兜底文字"——老浏览器不支持时显示，还能给个下载链接，体验不中断。这是"渐进增强"思想的体现：新浏览器用新特性，老浏览器有退路。

## 视频：`<video>`

```html
<video src="movie.mp4" controls width="640" height="360"></video>
```

和 audio 几乎一样，只是多了画面。常用属性：

- `controls`：显示控件；
- `width` / `height`：尺寸；
- `poster`：视频封面图（加载前/未播放时显示），体验细节拉满：

```html
<video src="movie.mp4" controls poster="cover.jpg" width="640"></video>
```

- `autoplay` + `muted`：想自动播放视频，必须静音（浏览器策略），否则会被拦：

```html
<video src="movie.mp4" autoplay muted loop playsinline></video>
```

`playsinline` 让视频在手机上**不强制全屏**播放，体验更好（iOS 默认会全屏，加它才内联播）。

**多格式兜底同样适用：**

```html
<video controls width="640" poster="cover.jpg">
  <source src="movie.webm" type="video/webm" />
  <source src="movie.mp4" type="video/mp4" />
  <p>你的浏览器不支持视频播放。</p>
</video>
```

webm 是开源格式（Chrome/Firefox 友好），mp4 是兼容之王，两者配合覆盖绝大多数浏览器。

## 嵌入外部内容：`<iframe>`

`iframe` 是"网页里的网页"——把另一个页面嵌进来。最常见的用途：

**嵌入 B 站 / YouTube 视频**

```html
<iframe
  width="640"
  height="360"
  src="https://player.bilibili.com/player.html?bvid=BV1xx411c7mD"
  allowfullscreen
></iframe>
```

视频网站通常提供"分享 → 嵌入代码"，直接复制 `<iframe>` 即可，不用自己写 `src`。

**嵌入地图**

```html
<iframe
  src="https://www.google.com/maps/embed?..."
  width="600"
  height="450"
  style="border:0"
  allowfullscreen
></iframe>
```

高德、Google 地图都有"分享嵌入"功能，复制即可。

**嵌入其他网页**

```html
<iframe src="https://example.com/widget" width="300" height="200"></iframe>
```

## iframe 的注意点

1. **不是所有网站都能嵌**：很多站点用 `X-Frame-Options` 或 CSP 禁止被 iframe 嵌入，会显示空白或报错，这是对方的安全策略，不是你写错了；
2. **性能与隐私**：每个 iframe 都是独立加载的页面，塞太多会拖慢速度；第三方内容还可能追踪用户；
3. **响应式 iframe**：固定宽高在手机上容易溢出。常见做法是用一个比例容器 + CSS：

```html
<div style="position: relative; padding-bottom: 56.25%; height: 0;">
  <iframe
    src="..."
    style="position: absolute; width: 100%; height: 100%;"
    allowfullscreen
  ></iframe>
</div>
```

`padding-bottom: 56.25%` 是 16:9 的比例（9÷16=0.5625），这样 iframe 会随容器宽度自适应，手机上也不变形。

## 多媒体文件放哪、怎么命名

- 建议建 `media/` 或 `assets/` 文件夹统一放音视频；
- 文件名别用中文和空格（容易出编码问题），用 `intro.mp4` 这种；
- 大视频注意体积，网页视频建议压缩、用 webm/mp4，别直接丢个几百 MB 的原片；
- 考虑用 CDN 或对象存储托管大文件，减轻自己服务器压力。

## 常见错误与排查

1. **音频/视频不自动播**：浏览器拦截带声音的自动播放，加 `muted` 才行；
2. **只有某些浏览器能播**：没提供多格式 source，补上 webm/mp4 或 ogg/mp3；
3. **iframe 空白**：对方禁止被嵌入（X-Frame-Options），换官方嵌入代码或放弃；
4. **手机上 iframe 溢出**：没做比例容器自适应；
5. **封面不显示**：poster 路径写错或图片未加载。

## 动手小练习

1. 放一段本地音频，加 `controls`，并尝试 `autoplay`（观察是否被拦，再试 `muted`）；
2. 放一个视频，加 `poster` 封面，提供 mp4 和 webm 两个 source；
3. 从 B 站复制一个视频的 iframe 嵌入代码，粘到页面里；
4. 把 iframe 包进 16:9 比例容器，缩窄窗口看是否自适应；
5. 故意写错视频 src，看浏览器是否显示你写的兜底文字。


## 把它串起来：做一个带媒体的教程页

做一个教程页：用 `<audio controls>` 放一段讲解录音（提供 mp3 和 ogg 两个 source 兜底）；用 `<video controls poster="cover.jpg">` 放演示视频（提供 webm 和 mp4 两个 source）；从 B 站复制一个视频的 iframe 嵌入代码粘进来；再把 iframe 包进 16:9 比例容器做响应式。做完故意把视频 `src` 写错，看是否显示你写的兜底文字；试给音频加 `autoplay` 观察是否被浏览器拦截，再加上 `muted` 看能否自动播。

## 新手常问（FAQ）

**Q1：为什么视频设了 `autoplay` 却不自动播？**
现代浏览器禁止带声音自动播放，避免打扰用户。想自动播必须同时 `muted`（静音）。

**Q2：iframe 嵌入别人的页面显示空白？**
很可能对方用 `X-Frame-Options` 或 CSP 禁止被嵌入，这是对方的安全策略，不是你写错。视频/地图请用官方提供的"嵌入代码"。

**Q3：手机上 iframe 撑破了页面？**
固定宽高在窄屏会溢出。用"比例容器 + position:absolute + width/height:100%"做响应式，或外层包 `overflow-x:auto`。


## 这一篇你该记住的

`audio`/`video` 用 `controls` 显示控件，`autoplay` 必须配 `muted` 才被允许，多格式用 `<source>` 兜底更兼容；`iframe` 是"页中页"，用来嵌视频/地图/第三方内容，注意对方可能禁止嵌入、且要做响应式（比例容器）。多媒体文件统一放文件夹、注意体积和命名。

声音影像都安排上了，但还有一类"用户看不见、却决定页面命运"的内容没讲——那些写在 `<head>` 里、影响搜索排名和可访问性的元信息。下一篇我们讲 **HTML 元信息与 SEO**，补齐 HTML 收尾知识。
