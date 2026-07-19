---
title: Java 代码审计基础：先搞懂它的"请求是怎么走到代码里的"
description: Java 审计和 PHP 最大的不同，是它有一套漫长的调用链和复杂的生态。这篇讲清 Java Web 的请求生命周期、Servlet/Filter/Interceptor 的职责、Spring 的注解路由，以及 Java 里那些危险 API 和反序列化基础，帮你在审计前建立"请求从哪进、到哪出"的全局地图。
category: security
subcategory: code-audit
tags: ['Java', '代码审计', 'Servlet', '调用链', '反序列化']
pubDate: 2026-07-19
order: 6
---

如果说 PHP 审计像看一篇顺下来的脚本，那 Java 审计更像顺着一张复杂的地铁线路图找站。Java Web 有 Servlet 规范、有各种框架、有长长的调用链，一个请求从进来到落到业务代码，中间要过好几道关卡。不懂这套体系，你连"用户参数在哪被接收"都找不到。这一篇先把 Java 审计的地基打好。

> 本文所有手法仅用于你对**自有或已授权**的 Java 代码做安全评估。

## Java Web 的请求生命周期

一个 HTTP 请求进到 Java Web 应用，典型路径是：

1. **容器接收**：Tomcat/Jetty/Undertow 这类 Servlet 容器先接住请求。
2. **Filter（过滤器）**：容器按配置顺序调用一串 `Filter`，常在这里做编码、鉴权、日志、CORS。
3. **Servlet / 前端控制器**：传统 Servlet 或 Spring 的 `DispatcherServlet` 把请求分发。
4. **Interceptor（拦截器）**：Spring 的拦截器在 Controller 前后做预处理（如登录校验）。
5. **Controller（控制器）**：业务方法拿到参数，调用 Service，再调 DAO 访问数据库。
6. **返回**：数据经 View 或 `@ResponseBody` 序列化后返回。

审计时这张图就是你的地图：你想找"鉴权在哪里做"，就去翻 `Filter` 和 `Interceptor`；想找"参数从哪来"，就进 `Controller` 的方法签名。

## Filter、Interceptor、Controller 各自的坑

- **Filter 顺序配错**：鉴权 Filter 排在了某些接口之后，或 `url-pattern` 没覆盖到某路径，导致绕过。
- **Interceptor 只拦 GET**：`preHandle` 里只对部分方法做校验，POST 请求直接放行。
- **Controller 直接信任参数**：方法参数直接拿 `request.getParameter` 或 `@RequestParam` 后没校验就进 SQL/命令。

一个高频套路：系统把鉴权写在某个 Interceptor，但又有几个"特殊接口"被 `exclude` 出去了（比如为了给前端健康检查用），结果攻击者正好从那几个口子打进去。

## 危险 API：Java 里的"exec 家族"

Java 没有 PHP 那么多动态函数，但危险点一样不少：

- **命令执行**：`Runtime.getRuntime().exec(...)`、`ProcessBuilder(...).start()`、`GroovyShell.evaluate(...)`。参数若含用户输入且无白名单，就是命令注入。注意 Java 的 `exec` 不走 shell，拼接要小心空格与重定向。
- **表达式执行**：`SpEL`（Spring Expression Language）的 `getValue`、OGNL（Struts2）的 `getValue`、`ScriptEngine.eval`，若表达式含用户输入，可导致 RCE。
- **反序列化**：`ObjectInputStream.readObject()`，这是 Java 反序列化漏洞的总入口（下一篇细讲）。
- **文件与路径**：`new File(...)`、`Files.newInputStream`、`FileInputStream` 配合用户可控路径 → 任意文件读取；`File.delete` 配合可控路径 → 任意文件删除。
- **XXE**：`DocumentBuilder`、`SAXParser`、`XMLReader` 解析外部 XML 且未禁用 DTD/外部实体 → XXE。

```java
String cmd = request.getParameter("cmd");
Runtime.getRuntime().exec(cmd);   // 用户可控 → 命令执行
```

## 调用链：为什么 Java 审计要会"追"

Java 的方法调用一层套一层，一个用户输入可能经过 Controller → Service → Util → DAO 才落地。审计不能只看入口，要顺着调用链往下追，直到确认"最终落点是否危险、中间有无过滤"。IDEA 的 `Ctrl+B`（跳定义）、`Ctrl+Alt+B`（找实现）、`Find Usages`（找调用处）是追链的核心武器。

反过来，**危险函数回溯**也成立：全局搜 `exec(`、`readObject(`、`getValue(`、`evaluate(`，对每个命中点往回追参数来源。Java 审计基本就是"正向追链 + 反向回溯"交替进行。

## 反序列化基础：为什么它这么可怕

Java 原生反序列化：`ObjectInputStream` 把字节流还原成对象时，会自动调用对象的 `readObject`、`readExternal` 等方法来恢复状态。如果应用反序列化了**用户可控的数据**，攻击者就能构造一个特殊对象，让它在"恢复"过程中执行恶意代码（比如某个类的 `readObject` 里调了危险方法，而该类正好在 classpath 上）。

这和 PHP 反序列化思路一致，但 Java 更依赖"gadget chain"（利用链）：把多个本来无害的类串起来，最终触发 `Runtime.exec`。下一篇我们展开讲 Fastjson、Log4j2、Shiro 这些经典链。

## 依赖与组件：别只盯业务代码

Java 项目漏洞一大半在**依赖库**里。一个 `pom.xml` / `build.gradle` 里引用的旧版本组件，可能就带已知 CVE。审计 Java 项目，除了看业务代码，还要：

- 看 `pom.xml` 里组件的版本，对照已知漏洞库（如较老的 `commons-collections`、`fastjson`、`log4j-core 2.x < 2.15`、`shiro < 1.4.2`）。
- 用依赖扫描工具（OWASP Dependency-Check、Snyk）自动列出带 CVE 的组件。
- 注意**间接依赖**（A 依赖 B 依赖 C，C 有洞），IDEA 的依赖树能展开看。

## Java 项目结构速读：先认目录再动手

拿到一个陌生的 Java 工程，别急着搜危险函数，先花十分钟把目录结构认一遍，能省下后面大量返工：

- `pom.xml` / `build.gradle`：依赖清单，先扫一遍有没有老版本危险组件（fastjson、log4j-core、shiro、commons-collections）。
- `src/main/java`：源码根，按包名找入口，通常 `controller` / `web` 包是请求入口，`service` 是业务逻辑，`dao` / `mapper` 是数据库操作，`config` 是配置与拦截器。
- `src/main/resources`：`application.yml` / `*.xml` 里藏着路由、数据库连接、Actuator 暴露、Shiro 配置等关键信息。
- `src/main/webapp` / `WEB-INF`：传统 WAR 项目的页面与部署描述符（`web.xml` 里配置了 Filter、Servlet 映射）。
- 启动类：带 `@SpringBootApplication` 的主类，从这里能顺藤摸到自动配置。

认完结构，再决定从哪进：审鉴权就看 `config` 和 `Filter`；审注入就看 `controller` 到 `dao` 的链路；审组件就看依赖版本。带着地图找路，比盲搜高效得多。

**审计常见误区**也要先想清楚，免得白忙：一是"只搜业务代码忽略依赖"，结果漏洞全在第三方库里；二是"看到过滤就放心"，Java 的过滤常常只在某一层做了，另一层入口没覆盖；三是"只在本地跑通就下结论"，没考虑生产环境的配置差异（比如测试关了鉴权）；四是"忽略调用链的终点"，只看了入口参数干净，却没追到最终落点的危险函数。避开这四个坑，审计质量会明显提升。

## Java 审计的练习路径

和 PHP 一样，Java 审计也要在授权环境里练。推荐几条路径：第一，自己写个故意留洞的 Spring Boot 小项目（比如故意在控制器里拼 SQL、放开一个未授权接口），再自己审自己改，闭环最快。第二，参加 Java 安全方向的 CTF，那些题目本就是设计来被分析的，能逼你追完整的调用链。第三，用官方或社区提供的漏洞靶场（如包含 Fastjson、Log4j 的练习环境），把经典组件漏洞亲手打穿再修好。第四，读优秀开源项目的修复提交，看高手是怎么定位并修补的。练习时坚持"先追链、再定论"，别急着下"这里有洞"的结论，先把参数从入口到落点完整走一遍，你会发现自己对 Java 调用链的理解肉眼可见地变快。

补充一点：Java 审计里**注解**是重要线索。Spring 用 `@RequestMapping` 标路由、`@PreAuthorize` 标权限、`@Valid` 标校验，这些注解本身就是"声明"。审计时善用 IDEA 的注解搜索，能快速列出所有对外接口和所有带权限注解的方法，再对比"有接口但没权限注解"的缺口。同时，`@RequestParam(required=false)`、`@RequestBody` 的类型约束也决定了参数能不能是数组、能不能绕过类型校验。把注解当成地图标记，审计效率会高很多。

最后强调：Java 审计最忌"只看不动"。很多人盯着代码想半天，不如起好环境、下个断点、发个请求看得真切。动态调试能告诉你参数到底走了哪条分支、变量最终是什么值，比纯静态猜高效太多。把集成开发环境的调试器用熟，是你从"会看"到"会审"的关键一步。

## 这一篇你该记住的

- Java 审计先画请求地图：**容器 → Filter → Servlet/Dispatcher → Interceptor → Controller → Service → DAO**，鉴权多在 Filter/Interceptor。
- 危险 API 重点盯：`Runtime.exec`/`ProcessBuilder`（命令执行）、`SpEL`/`OGNL`/`ScriptEngine`（表达式执行）、`readObject`（反序列化）、XML 解析（XXE）、文件 API（任意读写删）。
- Java 审计是**正向追链 + 反向回溯**交替：用 IDEA 的跳定义、找实现、找调用处追调用链。
- 反序列化靠 **gadget chain** 串类触发 `Runtime.exec`，下一篇细讲。
- Java 漏洞一大半在**依赖库**，务必审 `pom.xml`/依赖树，对照组件 CVE。

下一篇我们聚焦最主流的 Java 框架 Spring，看它的注解路由、SpEL、鉴权注解、Actuator 里，埋了哪些常见漏洞。
