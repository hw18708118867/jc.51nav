---
title: Spring 框架审计：注解路由、SpEL 与那些配置翻车
description: Spring Boot / Spring MVC 是国内 Java Web 的绝对主流。这篇讲清它的注解式路由、参数绑定、SpEL 表达式、模板渲染（SSTI）、鉴权注解（@PreAuthorize）、Actuator 端点等审计要点，并复盘 Spring4Shell、SPEL 注入、权限注解绕过等经典漏洞，给出 Spring 审计的落地路线。
category: security
subcategory: code-audit
tags: ['Spring', 'Java', '框架审计', 'SpEL', 'SSTI']
pubDate: 2026-07-19
updatedDate: 2026-07-19
order: 7
---

Spring 生态（Spring Boot + Spring MVC + Spring Security）占据了国内 Java Web 的半壁江山，审 Java 项目基本绕不开它。Spring 用注解把路由、参数、鉴权都声明式地写在了代码里，这既方便了开发，也给审计提供了清晰的"找点"线索。这一篇带你审 Spring。

> 本文所有手法仅用于你对**自有或已授权**的 Spring 代码做安全评估。

## 注解路由：请求落在哪

Spring 用 `@Controller` / `@RestController` + `@RequestMapping` / `@GetMapping` 等注解把 HTTP 路径绑定到方法。审计时直接搜这些注解，就能列出全部对外接口：

```java
@RestController
@RequestMapping("/api/user")
public class UserController {
    @GetMapping("/{id}")
    public User get(@PathVariable Long id) { ... }
}
```

注意 `@PathVariable`、`@RequestParam`、`@RequestBody` 是参数来源；`@RequestMapping` 的 `method` 限定了允许的 HTTP 方法。漏配 `method` 或方法校验不全，可能让本该 POST 的接口被 GET 调用，绕过 CSRF 或某些前置校验。

## SpEL 注入：表达式里混进用户输入

Spring 大量使用 **SpEL（Spring Expression Language）**。当 SpEL 的表达式字符串里混入了用户可控内容，就可能出现 **SpEL 注入**，进而 RCE：

```java
String expr = "#{user." + request.getParameter("field") + "}";
ExpressionParser parser = new SpelExpressionParser();
parser.parseExpression(expr).getValue();   // field 可控 → 注入
```

历史上 Spring 的某些功能（如定时任务、缓存注解的 key、错误页面）曾因把用户输入拼进 SpEL 而爆出 RCE。审计 SpEL，全局搜 `SpelExpressionParser`、`parseExpression`、`@Value("${...}")` 中是否含用户输入，以及任何把外部数据拼进表达式的地方。

## SSTI：模板引擎里的代码执行

Spring 常用 `Thymeleaf`、`FreeMarker`、`Velocity` 做视图渲染。如果模板名或模板内容拼接了用户输入，就可能出现 **服务端模板注入（SSTI）**：

- Thymeleaf 的视图名若来自请求参数（`return request.getParameter("page")`），攻击者可构造 `thymeleaf::${T(java.lang.Runtime).getRuntime().exec('...')}` 这类 payload 触发 RCE。
- FreeMarker 的 `<#assign>`、Velocity 的 `#set` 若渲染了用户内容，同样危险。

审计 SSTI，重点看视图名、模板片段名是否用户可控，以及是否把用户输入直接塞进模板执行。

## 鉴权注解：@PreAuthorize 与 Spring Security

Spring Security 用 `@PreAuthorize("hasRole('ADMIN')")` 这类注解做方法级鉴权，用 `securityFilterChain` 配置 URL 级别的访问控制。常见翻车点：

- **注解没生效**：类没被 Spring 代理（比如用了 `final` 类、或方法为 `private`），`@PreAuthorize` 不生效，权限形同虚设。
- **配置放行过多**：`permitAll()` 配错了路径，或 `antMatchers` 顺序写反（Spring Security 是**先匹配先生效**，宽泛规则写在前面会把后面的覆盖）。
- **SpEL 在注解里被注入**：`@PreAuthorize` 的表达式若拼了用户输入，反而可被用来绕过鉴权。

审计鉴权，要把 `securityFilterChain` 的 URL 规则顺序、各 Controller 方法的 `@PreAuthorize`/`@Secured` 注解、以及它们是否真的被代理生效，逐一核对。

## Actuator：信息泄露与后门端点

Spring Boot 的 **Actuator**（`/actuator/...`）暴露了健康检查、环境变量、配置、线程、甚至 `heapdump`。如果没做访问控制，攻击者可借此：

- 读 `/actuator/env` 拿到数据库密码、密钥等配置。
- 读 `/actuator/heapdump` 下载堆转储，离线分析出明文密码。
- 老版本里 `/actuator/env` + 特定端点可动态改配置，导致 RCE（如 Spring4Shell 相关利用链）。

审计 Actuator，看 `application.yml` 里 `management.endpoints.web.exposure.include` 暴露了哪些端点，以及是否配了 `management.endpoint.env.show-values` 等敏感项，是否对 `/actuator/**` 做了认证。

## 经典复盘：Spring4Shell (CVE-2022-22965)

这是 Spring 框架级的 RCE：在特定部署条件下（如 Tomcat 作为 WAR 部署），攻击者通过**数据绑定**把请求参数绑到 `class.module.classLoader` 这样的嵌套属性，进而修改 Tomcat 的日志配置，把恶意 JSP 写进 Web 目录实现 RCE。它的根因是 Spring 的**宽松数据绑定**允许绑定到任意嵌套 JavaBean 属性。审计时关注 `@ModelAttribute`、表单绑定是否对可绑定属性做了**白名单限制**（`setDisallowedFields` / `@InitBinder`）。

## Spring 审计落地路线

1. 搜 `@Controller`/`@RestController`/`@RequestMapping`，列出全部接口。
2. 看 `securityFilterChain` 与 `@PreAuthorize` 的鉴权是否完整、顺序是否正确。
3. 搜 `SpelExpressionParser`、`parseExpression`、模板名拼接、视图名可控处 → 查 SpEL/SSTi。
4. 看 `Runtime.exec` 等危险 API 的参数是否用户可控。
5. 查 Actuator 暴露与认证配置。
6. 核对数据绑定是否限制可绑定属性，防 Spring4Shell 类利用。

## Spring 安全配置上线清单

代码审完，再对照一份 Spring 安全配置清单，确认框架层面的防护有没有到位：

- **关闭调试与暴露**：生产关掉 `spring.profiles.active=dev` 的调试特性；Actuator 只暴露 `health`、`info`，其余一律不暴露且加认证。
- **鉴权规则顺序正确**：`securityFilterChain` 里具体路径写在前、宽泛路径写在后，避免先匹配到 `permitAll` 把后面的受限规则吃掉。
- **方法级鉴权生效**：`@PreAuthorize` / `@Secured` 所在类必须被 Spring 代理（非 final、非 private 方法），否则注解形同虚设。
- **禁用危险表达式**：SpEL、模板名、视图名不拼接用户输入；Thymeleaf 视图名来自请求参数时必须白名单。
- **数据绑定白名单**：用 `@InitBinder` 的 `setDisallowedFields` 限制可绑定属性，防类 Spring4Shell 的嵌套绑定利用。
- **依赖安全**：log4j-core 升到安全版、fastjson 升级或替换、shiro 升到修复版本。
- **安全响应头**：开启 HSTS、X-Content-Type-Options、CSP 等，减少配套风险。

把这份清单和前面的代码审计结合：代码里发现的每个可疑点，再回到配置看"在当前设置下能否真正利用"。配置到位能让不少中危问题直接降级，配置缺失则会让低危写法被放大成严重事件。

## Spring 审计的练习与靶场

Spring 生态庞大，最好的学习方式是"边打边学"。你可以本地起一个 Spring Boot 项目，故意制造几个典型问题：用 `@Value` 拼入请求参数做 SpEL、把 Thymeleaf 视图名设为用户可控、在 `securityFilterChain` 把某个路径错误地 `permitAll`、把 Actuator 全量暴露且不加认证。然后切换到审计者视角，用前面讲的方法把这些点一个个找出来，并给出修复。还可以找专门练 Spring 的漏洞靶场，把 Spring4Shell、SpEL 注入、权限注解绕过等逐个复现。练习的关键不是"记住某个漏洞的利用载荷"，而是理解"框架的哪个设计点导致了这个风险"——比如数据绑定为什么能绑到 classLoader、SpEL 为什么不该拼用户输入。理解了设计点，哪怕明年出了新漏洞，你也能凭同一套思路快速定位。把靶场里打穿的每个漏洞都写一句"根因是什么"，积累下来就是你的 Spring 审计 checklist。

再补一个高频坑：**CORS 配置过宽**。很多 Spring 项目为了方便前后端联调，把跨域设成允许任意源且允许携带凭证，这等于允许任意网站带用户的身份发起请求，配合其他漏洞危害翻倍。审计时看跨域配置和 `@CrossOrigin` 注解，确认生产环境没有把源设成通配且允许凭证。跨域本身不是漏洞，但"任意源加带凭证"就是典型的配置翻车，和前面讲的鉴权、Actuator 一样，都属于"框架给了方便，开发者用错了"的坑。另外，Spring 的全局异常处理如果配置不当，可能把内部异常（含数据库语句、路径）直接返回给前端，造成信息泄露，审计时也要留意异常是否被原样外抛。

收尾提醒一句：Spring 审计不要脱离"业务"空谈框架。再安全的框架配置，落到具体业务代码里也可能被绕过——比如框架做了全局鉴权，但某个接口漏了注解；或者全局过滤了注入，但某段原生语句仍拼了参数。框架是地基，业务代码才是最终的战场。审 Spring 项目，永远把"框架防护"和"业务实现"对照着看，缺口往往就在两者衔接处。

## 这一篇你该记住的

- Spring 路由靠注解，全局搜 `@Controller`/`@RequestMapping` 即可列出全部接口，注意 `@PathVariable/@RequestParam/@RequestBody` 是参数来源。
- **SpEL 注入**：`SpelExpressionParser`/`parseExpression` 的表达式混了用户输入 → RCE，要追表达式来源。
- **SSTI**：视图名/模板片段名用户可控（Thymeleaf/FreeMarker）可升级为代码执行。
- **鉴权注解**：`@PreAuthorize` 需被代理才生效；`securityFilterChain` 规则**先匹配先生效**，顺序写反会放行。
- **Actuator**：暴露过多且无认证会泄露密码、堆转储；数据绑定要白名单限制，防 Spring4Shell。

下一篇我们深入 Java 最著名的"重灾区"——反序列化与各种组件漏洞，Fastjson、Log4j2、Shiro 这些名字你一定听过。
