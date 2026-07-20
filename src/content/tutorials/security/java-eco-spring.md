---
title: Spring 生态漏洞：SpEL 注入与 Spring4Shell
description: 拆解 Spring 两大代表漏洞——Spring4Shell（CVE-2022-22965）靠数据绑定越权改 Tomcat 写 JSP 马，以及 SpEL 表达式注入（CVE-2022-22963 等）。给出升级、disallowedFields、不拼用户输入等防御。
category: security
subcategory: java-eco
tags: ['Spring', 'Spring4Shell', 'SpEL', 'CVE-2022-22965', 'RCE']
pubDate: 2026-07-19
updatedDate: 2026-07-19
order: 6
---

如果说 Struts2 是"上一代"的高危框架，那 Spring 就是"这一代"的事实标准。它安全吗？整体比 Struts2 稳，但 Spring 也有两个标志性的 RCE：**Spring4Shell**（数据绑定越权）和 **SpEL 表达式注入**。因为 Spring 无处不在，这两个漏洞的实际影响面极大。

> 本文仅用于授权靶场与防御研究。对他人系统利用下述漏洞属违法。

## Spring4Shell：数据绑定越权（CVE-2022-22965）

**背景**：Spring MVC / WebFlux 用 `DataBinder` 把请求参数绑定到 JavaBean。正常情况下你只能改 bean 自己的字段，比如 `?name=xxx` 改 `user.name`。但 Spring 的绑定支持"点路径"深入嵌套属性。

**漏洞点**：JavaBean 有个特殊属性 `class`（来自 `getClass()`）。攻击者利用 `class.module.classLoader` 这条路径，一路摸到 **Tomcat 的 `WebappClassLoader`**，进而修改 Tomcat 的 `AccessLogValve`（访问日志阀）——把它指向一个 `.jsp` 文件，并把日志格式设成 JSP 一句话木马的内容。

```text
# 关键请求参数（示意）
class.module.classLoader.resources.context.parent.pipeline.first.pattern=%{c2}i ... 木马 ...
class.module.classLoader.resources.context.parent.pipeline.first.directory=webapps/ROOT
class.module.classLoader.resources.context.parent.pipeline.first.suffix=.jsp
class.module.classLoader.resources.context.parent.pipeline.first.fileDateFormat=
```

效果：下一次任意请求被记录时，AccessLog 就把"请求里的恶意 JSP 代码"写进了 `webapps/ROOT/<某>.jsp`，攻击者再访问这个 JSP 文件就拿到 RCE。

**触发条件**（都满足才中招）：
- JDK 9+（`class.module` 路径在 Java 9 模块系统下才通）。
- 应用以 **WAR 包部署在 Tomcat**（用 Spring Boot 内嵌 Tomcat 的 jar 部署通常不受影响，因为 classLoader 类型不同）。
- 使用了 `Spring MVC` / `WebFlux` 的 `DataBinder` 且**未限制绑定字段**。

所以不是所有 Spring 应用都中招，但满足上述条件的金融/政企老系统极多，危害巨大。

## SpEL 注入：表达式拼了用户输入（CVE-2022-22963 等）

**SpEL**（Spring Expression Language）是 Spring 的表达式引擎，用于配置、注解、`@Value` 等场景。危险写法是：把**用户可控字符串拼进 SpEL 表达式再求值**。

```java
// 危险写法：用户输入直接进表达式
String expr = "欢迎你, " + userInput;          // userInput 来自请求
Expression parsed = parser.parseExpression(expr);
parsed.getValue(context);                       // 若 userInput 是 T(java.lang.Runtime)... 就执行了
```

`CVE-2022-22963`（Spring Cloud Function）正是这类：当 `spring.cloud.function.routing-expression` 由外部请求头 `Spring-Cloud-Function-Routing-Expression` 提供，且被当 SpEL 求值，攻击者在 Header 里写表达式即可 RCE。类似地，`Spring Cloud Gateway` 的 CVE-2022-22947 也是 SpEL 注入（在路由配置里拼了用户输入）。

```http
# CVE-2022-22963 思路（示意 Header）
Spring-Cloud-Function-Routing-Expression: T(java.lang.Runtime).getRuntime().exec("id")
```

## 防御：分两层堵

**Spring4Shell 方向：**
- **升级**：Spring 5.3.18+ / 5.2.20+ 已修复；Spring Boot 对应升级。这是根治。
- **限制数据绑定字段**：在 `@Controller` / `@InitBinder` 里加 `disallowedFields`，禁止绑定 `class.*`、`module.*`、`classLoader.*`：

```java
@InitBinder
public void initBinder(WebDataBinder binder) {
    binder.setDisallowedFields("class.*", "module.*", "classLoader.*");
}
```

- **部署形态**：优先用 Spring Boot 可执行 jar（内嵌 Tomcat 的 classLoader 类型不同，难以触发该链）。

**SpEL 注入方向：**
- **绝不拼接用户输入到表达式**：`parseExpression` 的内容必须是常量或由白名单拼接，用户数据只作为参数值传入，而非表达式本身。
- **用 `SimpleEvaluationContext` 而非 `StandardEvaluationContext`**：前者禁用了类型引用（`T(...)`）、构造函数等危险能力，适合只做"取值"的场景。

```java
// 安全：只读上下文，禁类型引用/构造
EvaluationContext ctx = SimpleEvaluationContext.forReadOnlyDataBinding().build();
parser.parseExpression("user.name").getValue(ctx, user);   // 用户只能提供值，不能写表达式
```

- **升级 Spring Cloud** 到修复版本（Gateway 3.1.1+/3.0.7+ 等）。

## 更多 Spring 相关风险

除了前面两个 RCE，Spring 生态还有几类高频风险值得一并记住：

- **SpEL 拒绝服务（CVE-2022-22950）**：SpEL 解析超长/嵌套表达式时可能抛 `StackOverflowError`，导致服务不可用；和注入同源——别让用户输入进表达式。
- **Spring Boot Actuator 暴露**：`/actuator/env`、`/actuator/heapdump`、`/actuator/metrics` 等端点若未鉴权暴露公网，会泄露配置、环境变量（含密钥）、甚至可通过 `env` 端点配合刷新机制改配置。生产务必关掉或加鉴权。
- **CVE-2022-22947（Spring Cloud Gateway）**：路由定义里 `filters` 的 `RewritePath` 等配置若拼接用户输入并当 SpEL 求值，导致 RCE——和 Function 那次同源。
- **不安全的视图/模板**：`Thymeleaf`、`FreeMarker` 若把用户输入拼进模板名或表达式，也可能 SSTI（服务端模板注入），思路与 SpEL/OGNL 一脉相承。

## 审计要点：在你的代码里找风险

- 搜 `SpEL`：`parseExpression(`、`SpelExpressionParser`、`@Value("${...}")` 里有没有拼外部变量。重点看 `StandardEvaluationContext` 是否处理用户数据——应换 `SimpleEvaluationContext`。
- 搜数据绑定：`@InitBinder`、`WebDataBinder`、`setDisallowedFields`，确认有没有禁止 `class.*`/`module.*`/`classLoader.*`。
- 搜 Actuator 配置：`management.endpoints.web.exposure.include` 是否暴露了 `env`/`heapdump` 且无 `spring.security` 保护。
- 看部署形态：`pom.xml` 里是 `spring-boot-maven-plugin` 打可执行 jar，还是 `war` 包部署外部 Tomcat——后者才满足 Spring4Shell 触发条件。

## Spring 漏洞时间线与影响面

把几个代表性 Spring 漏洞按时间排一下，能看出它的风险演化：

- **CVE-2018-1270 / 1273**：Spring MVC 的 `SpEL` 在绑定/消息里被注入，早期 SpEL 注入苗头。
- **CVE-2022-22950**：SpEL 解析拒绝服务，提醒"表达式"不止 RCE 一种危害。
- **CVE-2022-22963**：Spring Cloud Function 的 `routing-expression` 头被当 SpEL 求值，RCE。
- **CVE-2022-22947**：Spring Cloud Gateway 路由配置 SpEL 注入，RCE。
- **CVE-2022-22965**：Spring4Shell，数据绑定越权写 JSP 马，影响面极广。

共同线索：**Spring 生态的"表达式"和"数据绑定"两处能力，一旦碰上用户可控输入，就是高危面**。这和 Struts2 的 OGNL、Fastjson 的 `@type` 是同一个底层命题——"别让用户的数据变成可执行的指令"。

## 安全配置清单：Spring Boot 生产该关什么

一份可直接抄的生产加固清单：

- **Actuator**：`management.endpoints.web.exposure.include=health,info`，绝不暴露 `env`/`heapdump`；若需更多，加 `spring-security` 鉴权。
- **SpEL**：业务代码里 `parseExpression` 只用 `SimpleEvaluationContext`；`@Value` 里不拼外部变量。
- **数据绑定**：全局 `@ControllerAdvice` + `@InitBinder` 设置 `setDisallowedFields("class.*","module.*","classLoader.*")`。
- **部署**：优先可执行 jar（内嵌 Tomcat 的 classLoader 类型不同，难触发 Spring4Shell 链）。
- **依赖**：SCA 工具常态化扫 `spring-*`、`tomcat-*`、`jackson`，跟官方修复版。
- **版本**：锁定 Spring Boot 到受支持的次新版，别用已 EOL 的老版本。

## 手工找 SpEL 注入点的步骤

代码审计时按这个顺序搜：

1. 全仓搜 `SpelExpressionParser`、`parseExpression`、`EvaluationContext`，列出所有 SpEL 求值点。
2. 看每个点的表达式字符串是否含外部变量（请求参数、Header、数据库字段、配置文件里读来的值）。
3. 看用的是 `StandardEvaluationContext`（危险，可执行任意方法）还是 `SimpleEvaluationContext`（安全，只读）。
4. 对 `StandardEvaluationContext` 且表达式含外部输入的，标记为高优先修复：改为 `SimpleEvaluationContext` 或把输入当值传入而非拼进表达式。
5. 顺带搜 `@Value("#{...}")` 里有没有 `${}` 嵌套外部输入——同样危险。

## Spring4Shell 与 SpEL 的根本共同点

把这一篇的两个主角放在一起看，会发现它们是**同一个底层命题的两种表现**：

- **Spring4Shell**：用户的请求参数（数据）一路穿透 `DataBinder`，最终碰到了 `class.module.classLoader` 这个"能改 Tomcat 配置"的指令通道。
- **SpEL 注入**：用户的字符串（数据）被拼进表达式（指令），由 `parseExpression` 当成代码执行。

共同点一句话：**用户可控的数据，到达了一个"能实例化对象 / 调用方法"的引擎（数据绑定引擎或表达式引擎）**。凡是这种"数据碰到指令引擎"的地方，都是 RCE 候选。

由此得到一条通用的审计铁律：**找到每一个"用户输入可能变成指令"的入口**——无论是类名（`@type`/`@class`）、表达式（`SpEL`/`OGNL`）、还是绑定路径（`class.module...`），一律做严格隔离：数据归数据，指令归指令，绝不混用。这条铁律不仅适用于 Spring，也适用于前面讲的 Fastjson、Struts2、反序列化——它们是同一个家族。

## 一句话记住 Spring 安全的三个动作

把本篇的防御浓缩成三句话，方便贴在团队 wiki 上：

- **表达式不拼用户输入**：`parseExpression` 用 `SimpleEvaluationContext`，`@Value` 不接外部变量。
- **绑定禁越权路径**：`@InitBinder` 设 `disallowedFields("class.*","module.*","classLoader.*")`，优先 jar 部署。
- **端点与依赖常体检**：Actuator 不暴露 `env`/`heapdump`，`spring-*`/`jackson` 纳入 SCA 跟版本。

这三句对应了本篇两个 RCE（SpEL 注入、Spring4Shell）加一类高频泄露（Actuator），覆盖到位就不容易出大事。

## 同源风险提醒：模板引擎也要防

"数据碰指令引擎"这条铁律，不止适用于 SpEL 和 Spring 绑定，还适用于**模板引擎**。比如 `Thymeleaf`、`FreeMarker`、`Velocity` 若把用户输入拼进模板名或模板内容再渲染，就会出现 **SSTI（服务端模板注入）**，严重时同样 RCE。所以审计 Spring 应用时，除了搜 `parseExpression` 和 `DataBinder`，也顺手搜模板渲染点（`TemplateEngine.process`、`th:` 表达式里有没有拼外部变量）。它们和 SpEL 注入是同一个家族，防御思路完全一致：**用户输入只当数据，绝不当模板/表达式/类名**。

## 常见误区

- **"Spring 比 Struts2 安全，不用管"**：Spring 也有 SpEL 注入、Spring4Shell、Actuator 泄露，只是触发条件更具体。
- **"用 jar 部署就绝对不怕 Spring4Shell"**：jar 内嵌 Tomcat 的 classLoader 类型不同，确实难触发该链，但别因此忽略 SpEL 注入等其他面。
- **"@Value 里用 ${} 很正常"**：`${}` 是属性占位、`#{}` 才是 SpEL；但若把用户输入拼进 `#{}` 或拼进 `parseExpression` 的字符串，就危险了。

## 自测题

1. 在你项目里搜 `parseExpression`，确认有没有把用户数据拼进表达式？用的是 `Standard` 还是 `Simple` EvaluationContext？
2. Spring4Shell 的三个触发条件，你的部署满足几个？
3. 你的 Spring Boot Actuator 端点公网能直接访问吗？`env`/`heapdump` 暴露了吗？
4. 为什么 `SimpleEvaluationContext` 比 `StandardEvaluationContext` 更适合处理用户数据？

## 这一篇你该记住的

- **Spring4Shell（CVE-2022-22965）**靠 `DataBinder` 的 `class.module.classLoader` 路径越权，改 Tomcat `AccessLogValve` 写出 JSP 马；需 JDK9+ + WAR 部署 Tomcat 才触发。
- **SpEL 注入**（CVE-2022-22963 / 22947）来自"用户输入被拼进表达式并求值"，典型在 Spring Cloud Function / Gateway。
- Spring4Shell 防御：升级 + `setDisallowedFields("class.*","module.*","classLoader.*")` + 优先 jar 部署。
- SpEL 防御：**绝不拼用户输入进表达式**；只读场景用 `SimpleEvaluationContext`；升级 Spring Cloud。

下一篇我们收尾整个 Java 生态漏洞系列，看**中间件与组件层**——Shiro 的 rememberMe 反序列化、WebLogic 的 T3/IIOP、Tomcat 的 Ghostcat，以及如何用依赖供应链扫描把前面所有漏洞一次性"体检"出来。