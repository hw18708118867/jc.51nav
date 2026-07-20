---
title: CSRF 跨站请求伪造：借你的身份干坏事
description: 讲清 CSRF 的原理与危害，覆盖钓鱼、篡改数据、Burp 被动扫描等利用方式，并给出 CSRF Token、SameSite、二次验证等防御。
category: security
subcategory: pentest
tags: ['CSRF', '跨站请求伪造', 'Web安全', 'Token']
pubDate: 2026-07-18
updatedDate: 2026-07-18
order: 6
---

**CSRF（跨站请求伪造）** 的诡异之处在于：攻击者**不需要拿到你的密码或 cookie**，只要"骗你已经登录的浏览器，替你发一个请求"就行。比如你刚登录网银，点开一个恶意页面，它悄悄用你的身份转了账。

> 以下仅在授权靶场（如 DVWA、pikachu）练习；对他人站点构造 CSRF 利用属违法。

## 原理：浏览器"自动带 cookie"被利用了

HTTP 是无状态的，网站靠 cookie 记住"你是谁"。浏览器有个机制：**访问某域名时，会自动带上该域名的 cookie**。这正是 CSRF 的土壤。

攻击流程：

1. 你登录了 `bank.com`，浏览器存了你的身份 cookie；
2. 你没退出，又打开了恶意页面 `evil.com`；
3. `evil.com` 里藏着一段自动发请求的代码，指向 `bank.com/transfer`；
4. 浏览器发这个请求时，**自动带上 bank.com 的 cookie**；
5. `bank.com` 看到合法 cookie，以为是本人操作，转账成功。

关键在于：请求是**浏览器代你发的**，攻击者从没碰过你的 cookie。

## 一个最朴素的利用页面

```html
<!-- evil.com 上的页面 -->
<form action="https://bank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker" />
  <input type="hidden" name="amount" value="10000" />
</form>
<script>document.forms[0].submit();</script>
```

页面一打开，表单就自动提交，用户毫无察觉。GET 型更简单，一张图片就能触发：

```html
<img src="https://bank.com/transfer?to=attacker&amount=10000" />
```

只要图片"加载"，请求就发出去了。

## 危害场景

- **改密码/改邮箱**：用你身份改掉账户，把你踢出；
- **发消息/发帖**：用你身份 spam 好友；
- **转账/下单**：直接造成财产损失；
- **关注/授权**：关注攻击者、授权恶意应用。

只要"发一个请求就能干的事"，都可能被 CSRF。

## 为什么 GET 请求尤其危险

很多网站把"改数据"的接口也设计成 GET（这是错误设计），于是 CSRF 只需一个链接/图片。正确做法是：**任何会改状态的操作，都必须用 POST（且带防护）**。GET 只用于"读取"。

## Burp 被动发现 CSRF

测试时，Burp 的"CSRF token 检测"等被动扫描能提示：哪些请求**没有**防 CSRF 的 token、且会改状态。你也可手动看：请求里有没有 token 字段？没有就疑似可 CSRF。

## 防御：核心是"证明这是本人意愿"

CSRF 之所以能成，是因为服务器**分不清**请求是用户自愿点的，还是被恶意页逼着发的。防御就是补上"证明"。

**1. CSRF Token（最经典）**

服务器给每个表单发一个**随机、一次性**的隐藏 token，提交时必须带回：

```html
<form action="/transfer" method="POST">
  <input type="hidden" name="csrf_token" value="随机串abc123" />
  ...
</form>
```

服务器校验 token 对了才处理。恶意页**拿不到**这个 token（同源策略禁止它读 bank.com 的页面），所以构造不出合法请求。

**2. SameSite Cookie**

```http
Set-Cookie: sessionid=xxx; SameSite=Lax
```

`SameSite` 限制 cookie 在"跨站请求"时是否携带：

- `Strict`：跨站完全不带；
- `Lax`：跨站 GET 导航（如点链接）带，跨站 POST/图片不带（默认推荐）；
- `None`：总是带（需配 Secure）。

设成 `Lax` 或 `Strict`，上面那个 `<img>`/自动表单的 CSRF 就带不上 cookie，直接失效。这是现代最省心的防御。

**3. 二次验证 / 关键操作确认**

转账、改密码等敏感操作，要求再输一次密码、短信验证码、生物识别。即使被 CSRF，攻击者也没有第二步凭证。

**4. 校验 Referer / Origin 头**

服务器检查请求来源是不是自己的域名。简单但可被绕过（某些情况 Referer 不发送），只作辅助。

**5. 重要接口用自定义请求头**

如要求 AJAX 带 `X-Requested-With`。跨站普通请求（form/img）加不上自定义头，能拦一批。配合同源策略有效。

## 防御组合建议

现代站点通常 **SameSite=Lax + CSRF Token + 敏感操作二次验证** 三件套，基本封死 CSRF。框架（Django、Laravel、Rails、Spring Security）大多内置 CSRF 防护，记得**开启并正确使用**，别手贱关掉。


## 更多实战案例：一次转账是怎么被伪造的

受害者登录了银行 `bank.com`，浏览器保存了会话 cookie。攻击者诱导受害者访问自己做的恶意页面，页面里藏了一段自动提交的表单：`<form action="https://bank.com/transfer" method="POST"><input name="to" value="attacker"><input name="amount" value="10000"></form><script>document.forms[0].submit()</script>`。受害者浏览器带着 bank.com 的 cookie 自动发出这笔转账，服务器以为是本人操作，钱就被转走。这就是 CSRF：利用"浏览器自动带 cookie"的特性，在受害者不知情时以他身份发请求。

## 更多实战案例：GET 型与 JSON 型

早期很多操作走 GET（如 `?action=delete&id=1`），攻击者用一个 `<img src="...">` 就能触发，连表单都不用。现代接口多用 JSON + 自定义头，看似能防（因为简单表单发不了 JSON 带头请求），但若服务器没严格校验 Content-Type，攻击者可利用 Flash 或某些跨域技巧构造，仍有可能。

## 常见坑

1. **以为加验证码就万事大吉**：验证码能挡 CSRF，但每个操作都加验证码体验太差，且只保护了有验证码的接口。
2. **Referer 校验被绕过**：有些请求不带 Referer（如从 HTTPS 跳 HTTP），校验逻辑若"无 Referer 就放行"就被钻空。
3. **token 放在 cookie 里**：CSRF token 必须放请求体或自定义头，放 cookie 会被自动带上，等于没防。
4. **只防 POST 不防 GET**：GET 型同样危险。

## 进阶：修复

首选 **SameSite Cookie**：设为 `Strict` 或 `Lax` 可让浏览器在跨站请求时不带 cookie，从根上挡住多数 CSRF。再叠加 **CSRF Token**：服务端生成随机 token 放进表单/请求头，提交时校验，攻击者无法预知。关键操作再加二次确认（如短信/密码）。

## 小测验

- 问题1：CSRF 利用了浏览器的什么机制？答案：跨站请求会自动带上目标站点的 cookie。
- 问题2：SameSite=Strict 防 CSRF 原理？答案：跨站请求不带 cookie，服务器收不到会话。
- 问题3：CSRF token 能放 cookie 吗？答案：不能，必须放请求体或自定义头，否则被自动携带。



## 更多实战案例：用自动提交表单实战

构造恶意页面：一个隐藏的表单指向目标接口，参数预先填好（如转账对象是你、金额一大笔），页面加载时 JavaScript 自动 `submit()`。受害者若已登录目标站，浏览器带着他的会话 cookie 发出请求，服务器以为是本人操作。为了让受害者访问，攻击者可能把它藏在诱导点击的链接、图片论坛签名、或借 XSS 在目标站内注入这段表单（XSS+CSRF 组合更致命）。注意现代浏览器对跨站 POST 仍带 cookie（除非 SameSite 限制），所以 CSRF 依然有效。

## 更多实战案例：JSON 接口与 CORS 的微妙关系

现代接口多用 JSON + 自定义头（如 `X-CSRF-Token`）。简单跨站表单发不了 JSON 和自定义头，看似安全；但若服务器 CORS 配置成 `Access-Control-Allow-Origin: *` 且允许凭据，或没严格校验 Origin，攻击者可用 `fetch` 跨站带 cookie 发请求，CSRF 依然成立。所以 CSRF 防护不能只靠"表单发不了 JSON"的侥幸，要配合 token 与 SameSite。

## 更多实战案例：防御的层层加码

第一层 SameSite Cookie：设为 `Lax`（默认多数浏览器）能挡住大部分跨站 POST 携带 cookie 的场景，`Strict` 更严但可能影响用户体验（如从邮件链接进站不算同站）。第二层 CSRF Token：服务端生成随机不可预测的值，放进表单隐藏字段或请求头，提交时校验，攻击者无法预知也就无法伪造。第三层关键操作二次确认：转账、改密码等再加短信/密码验证。三层叠加最稳。

## 常见坑（补充）

1. **以为加验证码就万事大吉**：体验差且只保护有验证码的接口。
2. **Referer 校验被绕过**：无 Referer 就放行的逻辑可被钻空。
3. **token 放在 cookie 里**：会被自动携带，等于没防，必须放请求体或自定义头。
4. **只防 POST 不防 GET**：GET 型同样危险，别用 GET 做状态变更。

## 进阶（补充）：修复要点

首选 SameSite Cookie（Strict/Lax）；叠加 CSRF Token（服务端生成、请求体或头校验、一次性或绑定会话）；关键操作二次确认；不要用 GET 做敏感操作；校验 Origin/Referer 作为辅助；token 绝不能放 cookie。

## 小测验（补充）

- 问题1：CSRF 利用了浏览器的什么机制？答案：跨站请求自动带目标站点 cookie。
- 问题2：SameSite=Strict 防 CSRF 原理？答案：跨站请求不带 cookie，服务器收不到会话。
- 问题3：CSRF token 能放 cookie 吗？答案：不能，必须放请求体或自定义头。



## 更多实战案例：SameSite 的 Lax 与 Strict 区别

`SameSite=Strict` 最严：只要请求是跨站的（哪怕用户点了指向本站的链接），都不带 cookie，安全性最高但体验上"从外部进来首次访问像没登录"。`SameSite=Lax` 是多数浏览器默认值：顶部导航的 GET 跨站请求带 cookie，但跨站的 POST、子资源（如 img、iframe 发起的）不带，能挡住大多数 CSRF 又不怎么影响体验。设置时权衡安全与体验，关键接口再叠加 token。

## 常见坑（终补）

1. **以为加验证码就万事大吉**：体验差且只保护有验证码接口。
2. **Referer 校验被绕过**：无 Referer 就放行的逻辑可被钻空。
3. **token 放在 cookie 里**：会被自动携带，等于没防。
4. **只防 POST 不防 GET**：GET 型同样危险。

## 进阶（终补）：修复要点

首选 SameSite Cookie（Strict/Lax）；叠加 CSRF Token（服务端生成、请求体或头校验）；关键操作二次确认；不用 GET 做敏感操作；校验 Origin/Referer 辅助；token 绝不能放 cookie。多层防御最稳。

## 小测验（终补）

- 问题1：CSRF 利用浏览器什么机制？答案：跨站请求自动带目标站点 cookie。
- 问题2：SameSite=Strict 原理？答案：跨站请求不带 cookie，服务器收不到会话。
- 问题3：CSRF token 能放 cookie 吗？答案：不能，必须放请求体或自定义头。



## 实战要点：CSRF 防御落地清单

落地三件套：一、给所有涉及状态变更的接口加 CSRF Token（服务端生成、绑定会话、请求体或自定义头校验、一次性或短时有效）；二、关键 Cookie 设 SameSite=Lax 或 Strict；三、关键操作（转账、改密、改绑定）再加二次确认（短信/密码）。三者叠加，几乎无死角。注意 GET 请求绝不做状态变更，否则 token 也难防。

## 易错提醒

常见错误：token 放 cookie（被自动带，等于没防）、只在登录页校验 token（其他接口忘加）、用 Referer 做唯一防线（无 Referer 时放行被钻空）、以为加了图形验证码就高枕无忧（只护了有码接口）。防御要"默认拒绝未带 token 的状态变更请求"，而不是"某些接口加一下"。

## 自测

- CSRF 利用浏览器什么机制？答：跨站请求自动带目标站点 cookie。
- SameSite=Strict 原理？答：跨站请求不带 cookie，服务器收不到会话。
- CSRF token 能放 cookie 吗？答：不能，必须放请求体或自定义头。



## 延伸思考：CSRF 与 XSS 的关系

CSRF 利用的是"已登录的会话"，XSS 利用的是"页面被执行恶意脚本"，二者常结合：用 XSS 注入自动提交表单的脚本，就能在同源内发起 CSRF（绕过 SameSite 对跨站的限制，因为脚本就在站内执行）。所以修 XSS 也能间接缓解部分 CSRF。防御要双管齐下：输出编码防 XSS，token+SameSite 防 CSRF。

## 一句话自测

- 为什么 XSS 能助长 CSRF？答：站内脚本发起的请求不算跨站，可绕过 SameSite。
- 防御 CSRF 为什么不能只靠验证码？答：只护了有码接口，且体验差。


## 这一篇你该记住的

CSRF 利用"浏览器自动带 cookie"的机制，骗已登录的浏览器替攻击者发请求，无需窃取密码。利用靠自动提交表单或图片触发 GET。危害从改密码到转账。防御核心是"证明本人意愿"：CSRF Token（服务器发随机串、跨站读不到）、SameSite Cookie（跨站不带）、敏感操作二次验证、校验 Referer、自定义请求头。

CSRF 借的是"用户身份"。下一篇 **SSRF** 名字像、方向反：它是借**服务器身份**——让目标服务器去访问它内网里的东西，比如 127.0.0.1 的后台、云元数据。
