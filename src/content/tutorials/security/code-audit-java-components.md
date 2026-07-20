---
title: Java 反序列化与组件漏洞：Fastjson、Log4j2、Shiro 那些名场面
description: Java 安全圈最出圈的漏洞几乎都和反序列化、组件有关。这篇系统梳理原生反序列化与 CommonsCollections 利用链、Fastjson 的 autotype 绕过、Jackson 多态反序列化、Log4j2 的 JNDI 注入（Log4Shell），以及 Shiro 的 rememberMe 反序列化，讲清原理、审计点和修复。
category: security
subcategory: code-audit
tags: ['Java', '反序列化', 'Fastjson', 'Log4j2', 'Shiro']
pubDate: 2026-07-19
updatedDate: 2026-07-19
order: 8
---

Java 安全圈里"名场面"级别的漏洞，几乎都围着**反序列化**和**组件**打转：2015 年的 CommonsCollections、2017 年的 Fastjson、2021 年的 Log4Shell、还有常年不断的 Shiro 反序列化。它们影响面极广，因为出问题的不是你的业务代码，而是你引入的那个依赖。这一篇把它们一个个拆开。

> 本文所有手法仅用于你对**自有或已授权**的代码做安全评估。

## 原生反序列化与 CommonsCollections 链

前面说过，`ObjectInputStream.readObject()` 反序列化用户可控数据时，会自动调用对象的恢复方法。攻击者要做的，是找到 classpath 上一系列"串起来就能执行命令"的类，构造一个恶意对象图——这就是 **gadget chain（利用链）**。

`commons-collections` 3.1 版本的 `InvokerTransformer` 能调用任意方法，配合 `ChainedTransformer`、`LazyMap`，可在反序列化时触发 `Runtime.getRuntime().exec()`。这就是著名的 **CommonsCollections 反序列化链（CC 链）**。后来 `commons-collections` 修了，但各种变体（CC1~CC11，以及配合不同组件的链）层出不穷。

**审计点**：全局搜 `readObject(`、`ObjectInputStream`、`XMLDecoder`、`JSON 反序列化入口`，确认反序列化的数据源是否用户可控；同时看 `commons-collections` 等组件的版本是否过旧。

## Fastjson：autotype 的那场持久战

Fastjson 是阿里的高性能 JSON 库，它的 `@type` 机制允许在 JSON 里指定"反序列化成哪个类"。问题就出在：如果开启了 `autoType`（或某些版本默认行为），攻击者可以在 JSON 里写 `"@type":"com.sun.rowset.JdbcRowSetImpl"`，让 Fastjson 去实例化这个类并触发它的危险逻辑——比如连一个攻击者控制的 LDAP/RMI 地址，加载远程恶意类，实现 **RCE**。

Fastjson 和官方为此打了多年的"猫鼠游戏"：关了 `autoType` 又出白名单绕过，加了校验又出新的可利用类。审计 Fastjson：

- 看依赖版本（大量 CVE 集中在 1.2.24 ~ 1.2.83 区间），建议升级到 1.2.83+ 或干脆换 Jackson。
- 搜 `JSON.parse(`、`JSON.parseObject(`，看第二个参数是否传了 `Feature.SupportNonPublicField` 或 `autoType` 相关配置。
- 最佳实践：用 `JSON.parseObject(json, 指定Class)` 明确类型，不依赖 `@type` 自动推断。

## Jackson：多态反序列化

Jackson 是 Spring Boot 默认的 JSON 库。当它用 `@JsonTypeInfo` 开启**多态类型**（根据字段值决定反序列化成哪个子类）时，如果类型信息来自用户输入且没限制白名单，攻击者同样能指定危险类触发 gadget。审计 Jackson，看 `@JsonTypeInfo` 的使用、以及 `ObjectMapper` 是否 `enableDefaultTyping`（旧版默认危险），新版应改为 `activateDefaultTyping` 并配 `PolyTypeValidator` 白名单。

## Log4j2：Log4Shell (CVE-2021-44228)

这可能是近年来影响最大的漏洞。Log4j2 在记录日志时，如果日志内容里出现 `${jndi:ldap://...}` 这种**查找（Lookup）**语法，它会去解析并执行——攻击者只需让应用"记录"一段含恶意 JNDI 地址的日志（比如把 payload 放进 `User-Agent`、用户名等任何会被日志记录的输入），就能让服务器连到攻击者 LDAP 服务、加载并执行远程代码。

**审计点**：看 `log4j-core` 版本（2.x < 2.15.0 受影响），以及是否禁用了 `jndi` lookup（`log4j2.formatMsgNoLookups=true` 或升级到 2.17+）。根因很简单：永远不要相信"日志内容"无害——用户输入进了日志，就可能被当指令执行。

## Shiro：rememberMe 反序列化

Apache Shiro 是常用安全框架，它的"记住我"功能把用户身份序列化后加密存进 Cookie 的 `rememberMe` 字段。早期 Shiro 用了**硬编码的 AES 密钥**（网上流传着一份公开的默认密钥），攻击者拿到密钥就能构造恶意序列化对象、加密后塞进 Cookie，服务端反序列化时触发 gadget 链 → RCE。此外 Shiro 的 `antMatchers` 路径匹配对 `/`、后缀处理的差异，还曾导致**权限绕过**。

**审计点**：看 Shiro 版本（< 1.4.2 有已知密钥问题）、`AbstractRememberMeManager` 用的是不是默认密钥、以及 `antMatchers` 的放行规则是否可被畸形路径绕过（如 `/admin/..;/` 这类）。

## 组件审计的通用心法

- **先查依赖版本**：`pom.xml` / 依赖树里每个组件对照已知 CVE，工具（OWASP Dependency-Check、Snyk）能自动列。
- **再看用法是否危险**：即便组件本身修了，错误用法（开 autoType、enableDefaultTyping、记录未过滤的用户输入）仍会触发。
- **优先升级 + 最小权限**：把组件升到安全版本，关闭不必要的危险特性，对反序列化做类型白名单。

## 纵深防御：组件漏洞不是升个级就完事

很多人以为"组件漏洞嘛，升级到安全版本就完了"。升级当然是最关键的一步，但真正的安全要靠纵深防御，因为：第一，你不可能时刻盯着所有依赖的更新；第二，从曝出漏洞到你完成升级之间，存在被攻击的窗口期；第三，你永远不知道下一个爆雷的组件是哪个。所以除了升级，还要在架构上降低"组件出事"的杀伤面：

- **最小依赖**：只引入真正需要的库，依赖越少，攻击面越小，出问题时的排查范围也越小。
- **网络隔离**：数据库、内网服务不要对应用服务器全开，即使某个组件被远程加载类，也连不到真正的目标。
- **出网管控**：在主机或容器层面限制应用发起的出站连接（尤其是 LDAP、RMI、陌生域名），能在 Log4Shell 这类漏洞上直接掐断利用链。
- **运行时防护**：用 RASP（运行时应用自保护）或 WAF 规则拦截可疑的反序列化、JNDI 查询、表达式执行特征，作为最后一道防线。
- **持续监控**：把依赖扫描接进持续集成，新引入的带洞组件在合并前就被拦下，而不是等上线后才发现。

**如何快速判断一个组件是否真的影响你**：先看版本号是否在受影响区间；再看你的代码是否真的用到了那个危险特性（比如你根本没用 fastjson 的 `@type`，那风险就低很多）；最后看部署环境（比如日志根本不记录外部输入，Log4Shell 就难触发）。结合"版本 + 用法 + 环境"三者判断，既不漏报也不瞎慌。组件安全是场持久战，升级是矛，纵深防御是盾，两手都要硬。

## 组件漏洞怎么学才不累

组件漏洞更新快、链条长，死记利用载荷很快就会过时。高效学法是抓"共性原理"：commons-collections、fastjson、shiro 看似各不相同，底层都绕不开"不可信数据触发了本不该执行的代码"这一条。把每类漏洞抽象成"入口（数据从哪来）+ 危险特性（什么机制被执行）+ 利用链（怎么串起来）"三要素，你就能用同一套框架去理解新爆的组件。日常养成两个习惯：一是关注安全公告，新漏洞出来先看"影响版本 + 触发条件"，而不是只记编号；二是维护自己的"危险依赖清单"，项目里一旦引入就重点盯。这样组件审计就从"追着漏洞跑"变成"守着原理等"，轻松得多也扎实得多。

还有一点值得提醒：组件漏洞的**修复不只是升级版本号**。很多团队升级后没清理用法，比如把 fastjson 升到安全版却仍开着兼容性的危险配置，风险只是变小没消失。真正闭环是"升级加关闭危险特性加加上类型白名单"三件套一起做。审计交付时，如果只写"升级到某版本"，开发很可能只改了版本号，所以报告里要把"关闭危险配置"也明确写出来，才算给到位。

## 这一篇你该记住的

- **原生反序列化**：`readObject` 可控输入 + classpath 上的 gadget 链（如 CommonsCollections）即可 RCE，要追反序列化入口与组件版本。
- **Fastjson**：`@type` + `autoType` 可指定危险类触发 JNDI/RCE；升级到 1.2.83+ 或用 `parseObject(json, 指定Class)` 明确类型。
- **Jackson**：`@JsonTypeInfo` 多态反序列化要配类型白名单，别用危险的 `enableDefaultTyping`。
- **Log4Shell**：日志里 `${jndi:...}` 会被执行；升级 log4j-core 到 2.17+ 并禁用 jndi lookup。
- **Shiro**：默认 AES 密钥导致 rememberMe 反序列化 RCE；注意 `antMatchers` 路径绕过。
- 组件审计 = **查版本 CVE + 查危险用法 + 升级并最小权限**。

Java 的体系、框架和组件漏洞都讲透了，但复杂的调用链和 gadget 链靠肉眼追太累。下一篇我们专门讲 Java 代码审计工具——IDEA、CodeQL、Tabby、Dependency-Check 这套工具矩阵怎么搭，把追链、挖链、查组件的体力活自动化。
