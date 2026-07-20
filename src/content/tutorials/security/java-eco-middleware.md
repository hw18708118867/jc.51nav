---
title: 中间件与组件漏洞 + 依赖供应链：Shiro、WebLogic、Tomcat 与 SCA 体检
description: 收尾 Java 生态漏洞系列——拆解 Shiro rememberMe 反序列化（硬编码密钥）、WebLogic T3/IIOP 与后台 RCE、Tomcat Ghostcat(AJP)，并讲清如何用 Dependency-Check/Snyk 做依赖供应链体检与常态化防御。
category: security
subcategory: java-eco
tags: ['Shiro', 'WebLogic', 'Tomcat', 'Ghostcat', '依赖供应链', 'SCA']
pubDate: 2026-07-19
updatedDate: 2026-07-19
order: 7
---

前面六章从入口框架（Struts2/Spring）、数据层（Fastjson/反序列化）、基础设施（Log4j）一路打下来。最后这篇看**中间件与组件层**——它们往往直接暴露在网络上，是攻击者最先碰到的"大门"。同时，我们把前面的漏洞统一收进"依赖供应链体检"的框架里，给你一套能常态化的自查方法。

> 本文仅用于授权靶场与防御研究。对他人系统利用下述漏洞属违法。

## Shiro 的 rememberMe 反序列化

Apache Shiro 是常用的 Java 安全框架（登录、权限）。它有个"记住我"功能：把用户身份信息序列化后，用 **AES 加密**写进 Cookie 的 `rememberMe` 字段，下次请求再解密、反序列化。

**根因是硬编码密钥**：Shiro 早期版本的默认 AES 密钥是写死在代码里的：

```text
kPH+bIxk5D2deZiIxcaaaA==   # 全网都知道的默认 key
```

攻击者只要：

1. 用这个公开密钥，把一段**恶意序列化对象**（配合 CommonsCollections 等 gadget 链）AES 加密；
2. 塞进 `rememberMe` Cookie 发给目标；
3. 目标解密后**反序列化**这段可控数据 → gadget 链触发 → RCE。

等于"密钥公开 + 反序列化入口"直接送你一个 RCE。后续 Shiro 还爆出 **Padding Oracle 攻击（CVE-2019-12422）**：即使你换了密钥，攻击者也能通过密文填充的响应差异，逐步**爆破出密钥**，再走上面的链。

**防御：**
- **必须换掉默认密钥**，且密钥足够随机（用 `org.apache.shiro.crypto.AesCipherService` 生成强随机 key 并配置到 `shiro.ini` / 配置类）。
- 升级 Shiro 到修复版（CVE-2019-12422 后改用 GCM 模式，缓解 Padding Oracle）。
- 对 `rememberMe` 解密失败做统一模糊响应，避免泄露填充校验差异。

## WebLogic 的 T3 / IIOP 与后台 RCE

Oracle WebLogic 是老牌 Java EE 应用服务器，常直接暴露。它的 **T3**（私有协议）和 **IIOP**（CORBA）协议在反序列化请求时缺乏校验，成了经典入口：

- **CVE-2018-2628 / CVE-2020-2555**：T3 协议反序列化，结合 Coherence 组件的 `ReflectionExtractor`/`LimitFilter` gadget 触发 RCE。
- **CVE-2020-14882**：未授权访问管理控制台，配合 `CVE-2020-14883` 在后台执行任意命令（URL 里 `console.portal` + 特殊参数即可 RCE，无需登录）。

**防御：**
- 若不用 T3/IIOP，**在防火墙层禁掉对应端口**（7001 上的 T3、IIOP 端口），或配置 WebLogic 只走 HTTP。
- 打 Oracle 官方补丁（CPU 季度更新）；升级到受支持版本。
- 管理控制台不暴露公网，加强认证与 IP 白名单。

## Tomcat 的 Ghostcat（CVE-2020-1938）

Tomcat 默认开启 **AJP 协议**（8009 端口）用于和前端（如 Apache httpd）通信。Ghostcat 利用 AJP 的 `request.setAttribute` 能控制 `Servlet` 读取的文件路径，从而**读取/包含 Web 目录下的任意文件**（如 `WEB-INF/web.xml`、源码），在特定条件下还能配合文件上传写入 JSP 马造成 RCE。

**防御：**
- 不用 AJP 就在 `server.xml` 里**注释掉 AJP Connector**；要用就绑定内网、加 `secret`/`requiredSecret` 校验。
- 升级 Tomcat 到修复版（9.0.31+/8.5.51+/7.0.100+）。
- 公网不要暴露 8009。

## 依赖供应链：把前面所有漏洞一次性"体检"

你现在已经知道 Log4j、Fastjson、Shiro、CommonsCollections 这些雷。但一个真实项目有上百依赖，**靠记忆和肉眼不可能守住**。正确做法是把"组件漏洞扫描"做成流水线的一环——这就是 **SCA（软件成分分析）**。

**核心思路**：把项目依赖（含传递依赖）列成清单，逐一比对 CVE 数据库，输出"组件:版本:CVE:严重级:修复建议"。

**OWASP Dependency-Check（开源）：**

```bash
# 扫描整个项目，生成 HTML/JSON 报告
dependency-check.sh \
  --project my-java-app \
  --scan ./target \
  --format HTML --format JSON \
  --out ./security-reports
```

报告会标红每个带 CVE 的 jar，并给出安全版本号，是做合规自检的刚需。

**其他可选：**
- **Snyk**：`snyk test` 本地扫，`snyk monitor` 持续监控新披露 CVE。
- **GitHub Dependabot**：在仓库里自动开"升级依赖以修复漏洞"的 PR。
- **Gradle**：`./gradlew dependencyCheckAnalyze`（接 Dependency-Check 插件）。

**常态化防御清单：**
- 维护**组件版本清单（SBOM）**，新引入依赖先过 SCA。
- 建立**季度升级机制**，关键组件（Log4j、Spring、Shiro、Fastjson）设专项监控。
- **最小化依赖**：用不上的包、`exclude` 掉多余传递依赖，攻击面越小越好。
- **私有仓库 + 签名校验**：内部 Nexus/Artifactory 只放行已审组件，防投毒。
- **纵深防御**：WAF/RASP/最小权限运行，即使单点失守也不至直接拿机器。

## 真实入侵链示例

把前面几章串起来，看看攻击者实际怎么组合利用。一条典型的 Java 应用入侵链：

1. **踩点**：扫描发现目标开放 `7001`（WebLogic）和 `8080`（Tomcat AJP 8009 也开着）。
2. **打中间件**：先用 WebLogic T3 反序列化（CVE-2020-2555）拿下一台内网机；或用 Tomcat Ghostcat 读 `WEB-INF/web.xml` 拿到数据库账号。
3. **进应用**：目标应用用了老版本 Shiro，`rememberMe` 默认密钥未改，发个加密 gadget 拿到 RCE。
4. **横向**：在内网用 Log4Shell 的 JNDI 链打其他 Java 服务，或用 Fastjson `autoType` 打内部接口。
5. **持久化**：写计划任务、留内存马、窃凭证。

你会发现：**单个漏洞未必能直达核心，但多个组件漏洞组合起来就是完整入侵**。所以"每个组件都修一点"比"只盯一个重点"重要得多。

## 中间件加固清单（可直接抄）

把前面三个中间件的加固动作汇总成一份清单，部署评审时逐条核对：

**Shiro：**
- 生成强随机 AES 密钥（≥128 位，推荐 256），配置到 `shiro.ini` / 配置类，**绝不**用默认 `kPH+bIxk5D2deZiIxcaaaA==`。
- 升级到修复 CVE-2019-12422 的版本（用 GCM 模式，缓解 Padding Oracle）。
- `rememberMe` 解密失败返回统一模糊响应，不泄露填充校验差异。
- 不用 `rememberMe` 的场景直接关掉该功能。

**WebLogic：**
- 防火墙层禁 T3/IIOP 端口（或仅限内网可信 IP）；`weblogic.security.disableIIOP`、`weblogic.protocol.disabled` 配置禁用协议。
- 打 Oracle 官方 CPU 季度补丁，升级到受支持版本。
- 管理控制台（`/console`）不暴露公网，加 IP 白名单与强认证。

**Tomcat：**
- `server.xml` 里注释掉 AJP Connector（8009）；要用则设 `secret`/`requiredSecret` 并绑内网。
- 升级到修复 Ghostcat 的版本（9.0.31+/8.5.51+/7.0.100+）。
- 公网不暴露 8009，manager 应用设强密码或移除。

**通用：**
- 所有中间件版本纳入 SCA 监控；季度做依赖/组件体检；出网策略限制应用服务器对 LDAP/RMI 的出站。

## 组件 EOL 清单：该换就换

最后给一条"一眼判断"的经验法则：**一个组件若已停止安全更新（EOL），默认就该当成风险源，尽早替换**。Java 生态里常见的 EOL/高危老组件：

- **Log4j 1.x**：2015 年 EOL，不再收任何补丁，直接迁 2.x 或 Logback。
- **Struts 1**：早已 EOL，且和 Struts2 共用部分代码，老系统应尽快迁。
- **老版本 WebLogic**（如 10.3.x / 12.1.x 部分）：Oracle 只对受支持大版本发 CPU 补丁，过期版本等于裸奔。
- **Shiro < 1.4.2**：存在已知 rememberMe 相关 CVE，低于此版本的都应升级。
- **CommonsCollections 3.2.1 及之前**：默认允许危险 `InvokerTransformer`，升级到 3.2.2+。

判断标准很简单：去官网看"是否还在安全维护"。不在维护 = 新漏洞永远没人修 = 你迟早要自己扛。把"组件生命周期"纳入引入依赖的评审，比事后救火省心得多。

## 常见误区

- **"中间件在防火墙后就没事"**：内网横向移动、供应链、被拿下的边界机都能当跳板打内网中间件。
- **"Shiro 换了默认密钥就安全"**：若版本仍老（CVE-2019-12422 前），Padding Oracle 还能爆破出新密钥；必须升级 + 换密钥双管齐下。
- **"SCA 工具报一堆 CVE 太吵，关掉算了"**：噪音要靠"只看可达/高危"来降，而不是关工具；忽视 SCA 等于蒙眼开车。
- **"依赖供应链只是运维的事"**：它是开发、安全、运维共同的责任，越早介入（引入依赖时）成本越低。

## 自测题

1. 你的 Shiro `rememberMe` 用的是默认密钥还是自定义强随机密钥？版本是否修复了 Padding Oracle（CVE-2019-12422）？
2. 你的 WebLogic / Tomcat 是否暴露了 T3 / AJP 端口到公网或不可信网络？
3. 你跑过一次 Dependency-Check / Snyk 吗？报告里高危 CVE 有几个、分别怎么修？
4. 用一句话描述"为什么单点修复不够、要全组件体检"。

## 这一篇你该记住的

- **Shiro rememberMe** 因默认 AES 密钥公开 + 反序列化入口直接 RCE；CVE-2019-12422 还能 Padding Oracle 爆破密钥。防御：换强随机密钥、升级、模糊化解密失败响应。
- **WebLogic** 的 T3/IIOP 反序列化、CVE-2020-14882 后台 RCE 是经典入口。防御：禁端口/打补丁/控制台不暴露公网。
- **Tomcat Ghostcat（CVE-2020-1938）** 借 AJP 读/包含文件。防御：关 AJP 或加 secret、升级、不暴露 8009。
- 组件漏洞靠 **SCA 工具**（Dependency-Check/Snyk/Dependabot）常态化体检，而非肉眼。
- 供应链防御总纲：SBOM 清单、季度升级、最小化依赖、私有仓库签名校验、纵深防御。

到这里，**七阶段「Java 生态漏洞」七章**就讲完了。从生态全景、Log4Shell、反序列化 gadget 链、Fastjson/Jackson、Struts2/OGNL、Spring4Shell/SpEL，到 Shiro/WebLogic/Tomcat 与依赖供应链——你已经能把 Java 应用从"组件版本"一路追到"利用链"。建议把本系列和「代码审计（PHP + Java）」十章配合使用：这一套帮你**认出危险组件、判断利用条件**，那一套帮你**从源码里找到漏洞根因与修复点**，两相结合才是完整的 Java 安全能力。