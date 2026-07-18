---
title: 反序列化漏洞：把数据变回对象时的陷阱
description: 讲清反序列化的原理与危害，结合代码分析反序列化漏洞成因与场景复现，并给出白名单、签名校验、最小类等防御。
category: security
subcategory: pentest
tags: ['反序列化', '序列化', 'Web安全', '对象注入']
pubDate: 2026-07-18
order: 12
---

**反序列化漏洞** 是近年高频、危害极大的漏洞（想想 2015–2020 年 Java 生态的 CommonsCollections、PHP 的 Phar、Python 的 pickle 事故）。它藏在"把字符串恢复成对象"这一步——如果应用反序列化了**攻击者构造的恶意数据**，对象重建过程中就可能自动触发危险代码。

> 以下仅在授权靶场（如 PHP 反序列化练习、Java 反序列化靶场）练习；对他人系统构造恶意序列化数据属违法。

## 先懂序列化：对象 ↔ 字符串

程序里的对象（带属性、方法的复杂结构）不能直接存文件/传网络，于是先"序列化"成字符串：

- PHP：`serialize()` / `unserialize()`；
- Java：`ObjectOutputStream` / `ObjectInputStream`（或 JSON 库）；
- Python：`pickle`；
- 通用：JSON（但 JSON 只存数据，不含类信息，通常更安全）。

```php
// PHP 序列化
$data = ['user'=>'admin', 'isAdmin'=>true];
$str = serialize($data);  // a:2:{s:4:"user";s:5:"admin";s:7:"isAdmin";b:1;}
```

反序列化就是把这串字符还原成对象。

## 漏洞根因：魔法方法自动执行

问题出在：很多语言的对象有"生命周期魔法方法"，反序列化时会**自动调用**。比如 PHP 的 `__destruct()`（对象销毁时）、`__wakeup()`（反序列化后），Java 的 `readObject()`。

如果某个类的这些方法里写了危险逻辑（如写文件、执行命令），攻击者只需构造一个该类的恶意对象，让应用反序列化它——**魔法方法自动触发，代码就跑了**，无需应用主动调用任何功能。

```php
class User {
  public $file;
  function __destruct() {
    file_put_contents($this->file, "<?php phpinfo();?>"); // 危险！
  }
}
// 攻击者构造：O:4:"User":1:{s:4:"file";s:9:"shell.php";}
// 反序列化后对象销毁 → 写出 shell.php
```

## 经典案例：POP 链（Property-Oriented Programming）

真实代码里，单个类的魔法方法可能不直接 RCE，但攻击者可以**串起多个类的方法**，像多米诺骨牌：A 的析构调用 B 的方法，B 又调用 C……最终触发命令执行。这条调用链叫 **POP 链**。Java 的 CommonsCollections 就是著名 POP 链，曾影响无数使用了该库的应用。

## 各语言要点

- **PHP**：`unserialize()` 用户可控最危险；还有 **Phar 反序列化**——上传 phar 文件被 `phar://` 协议访问时触发，即使不直接调 unserialize 也可能中招；
- **Java**：`ObjectInputStream.readObject()` 反序列化不可信数据；`ysoserial` 工具能生成常见库的利用 payload；
- **Python**：`pickle.loads()` 反序列化不可信数据会直接执行任意代码（极危险），务必只 pickle 可信数据；
- **Node/JSON**：普通 `JSON.parse` 安全（只还原数据），但若用 `vm` 或自定义 reviver 执行代码则另说。

## 发现思路

- 找 `unserialize` / `readObject` / `pickle.loads` / `phar://` 的调用，看数据源是否用户可控；
- 看 Cookie、Token、表单里有没有序列化字符串（如 PHP 的 `O:` 开头、Java 的 `aced 0005` 魔数）；
- 翻依赖库版本，查是否有已知反序列化 CVE（如 Fastjson、Jackson、Log4j 相关）。

## 防御：别反序列化不可信数据

**1. 不反序列化用户输入（最重要）**

能用 JSON 就别用原生序列化传不可信数据。JSON 不含类/方法信息，天然安全得多。

**2. 白名单允许的类**

Java 可重写 `resolveClass` 只放行白名单类；PHP 用 `allowed_classes` 参数限制 `unserialize` 能还原的类。

**3. 签名校验**

序列化数据加 HMAC 签名，反序列化前校验签名，篡改的数据直接拒绝（但签名密钥不能泄露）。

**4. 最小类 / 关闭危险魔法方法**

避免在可被反序列化的类里写危险逻辑；及时升级有 POP 链的依赖库。

**5. 隔离运行**

反序列化不可信数据放在受限沙箱，限制其能力。


## 更多实战案例：魔术方法成突破口

以 PHP 为例，`unserialize($_GET['d'])` 时，如果类里定义了 `__destruct` 或 `__wakeup`，对象销毁/唤醒时会自动调用。攻击者在本地构造一个含恶意类的对象序列化串，让 `__destruct` 里执行 `system($this->cmd)`。著名漏洞如 `CVE-2016-7124`（`__wakeup` 绕过）。

**Java 反序列化**：`ObjectInputStream.readObject()` 反序列化不可信数据时，会调用对象的 `readObject`，若类链里存在 `CommonsCollections` 等 gadget，可拼出执行 `Runtime.getRuntime().exec()` 的利用链，直接 RCE。这就是 WebLogic、JBoss 等多次中招的原因。

**Python（pickle）**：`pickle.loads` 不可信数据会执行 `__reduce__` 返回的命令，等价于 RCE。

## 常见坑

1. **以为"只是读数据"无害**：反序列化会触发代码执行，远不止读数据。
2. **用黑名单拦类名**：gadget 链太多，黑名单拦不完。
3. **JSON 当万能替代**：JSON 确实安全（不触发代码），但业务要对象时别硬套。
4. **忽略依赖库版本**：CommonsCollections 等老版本就是 gadget 来源，升级能挡掉大片利用。

## 进阶：修复

原则：**绝不反序列化不可信数据**。PHP 用 JSON（`json_encode/decode`）替代；Java 用白名单 `ObjectInputFilter` 限制可反序列化的类；Python 别用 `pickle` 处理外部输入。必须反序列化时，做类白名单 + 签名校验。

## 小测验

- 问题1：PHP 反序列化哪个魔术方法常被利用执行代码？答案：`__destruct` 或 `__wakeup`。
- 问题2：Java 反序列化 RCE 常见 gadget？答案：CommonsCollections 等危险类链。
- 问题3：最稳修复原则？答案：不反序列化不可信数据，改用 JSON + 白名单。



## 更多实战案例：PHP 反序列化触发点

PHP 中 `unserialize($_GET['d'])` 是典型危险点。当传入的字符串描述的类里定义了 `__destruct`、`__wakeup`、`__toString` 等魔术方法，且这些方法里调用了危险函数（如 `system`、`eval`、文件读写），反序列化时会自动执行。攻击者在自己机器上构造一个含恶意属性的对象，序列化后发给目标，目标一 `unserialize` 就触发。经典如把 `$this->cmd` 设成系统命令，析构函数里 `system($this->cmd)`。

## 更多实战案例：Java 与 Python 的对应风险

Java 的 `ObjectInputStream.readObject()` 反序列化不可信数据，会调用对象的 `readObject`，若类路径里存在 `CommonsCollections`、`Spring` 等含危险 `Transformer` 链（gadget）的类，就能拼出执行 `Runtime.getRuntime().exec()` 的利用链，直接 RCE。Python 的 `pickle.loads` 不可信数据会执行对象的 `__reduce__` 返回的命令，等价于 RCE。所以"反序列化"在三种主流语言里都是高危操作。

## 更多实战案例：怎么发现与利用

黑盒发现难，通常要结合源码（白盒）或已知组件版本。思路：找到反序列化入口 → 确认目标使用的类库版本 → 查该版本是否有已知 gadget 链（如 ysoserial 工具生成 Java payload） → 发送构造好的序列化数据。若没有现成 gadget，就要找应用自身类里"析构/唤醒时做了危险操作"的点，自己拼链。

## 常见坑（补充）

1. **以为 JSON 也是反序列化**：JSON 不触发代码，危险的是语言原生序列化。
2. **黑名单拦类名拦不完**：gadget 链太多，白名单才稳。
3. **忽略依赖库版本**：老版本库自带危险 gadget。
4. **认为"只读了数据"无害**：反序列化会执行代码，远超读数据。

## 进阶（补充）：修复要点

原则：**绝不反序列化不可信数据**。PHP 用 `json_encode/decode` 替代；Java 用 `ObjectInputFilter` 白名单限制可反序列化的类，并升级危险依赖；Python 别用 `pickle` 处理外部输入，改用 `json`。必须反序列化时，做类白名单 + 签名校验（HMAC），确保数据没被篡改且来源可信。

## 小测验（补充）

- 问题1：PHP 反序列化常用哪个魔术方法触发？答案：__destruct 或 __wakeup。
- 问题2：Java 反序列化常见 gadget？答案：CommonsCollections 等危险类链。
- 问题3：最稳修复原则？答案：不反序列化不可信数据，改用 JSON + 白名单。



## 更多实战案例：PHP 反序列化 POP 链构造

当应用自身类里没有现成危险方法时，攻击者会"拼链"：找一个类 A 的 `__toString` 调用了某个属性当对象的方法，再找类 B 的某方法把输入写文件，把 A 的属性指向 B 的实例，形成"触发 A → 调 B → 写文件"的利用链（POP chain）。这需要对目标代码了如指掌（白盒），所以反序列化漏洞常与代码审计绑定。工具如 PHPGGC 内置常见框架的 gadget 链，可快速生成 payload。

## 更多实战案例：Java 反序列化工具化利用

Java 反序列化几乎都靠现成 gadget 链。工具 `ysoserial` 内置 CommonsCollections、CommonsCollections2-4、Spring、JRMP 等链，选对目标环境和链名即可生成 payload。利用方式：把 payload 发给存在 `readObject` 反序列化点的接口（如 Java RMI、JMX、某些中间件协议、Shiro 的 rememberMe 字段）。Shiro 早期版本用硬编码密钥，反序列化 rememberMe 直接 RCE，是经典案例。

## 常见坑（再补充）

1. **以为 JSON 也是反序列化**：JSON 不触发代码，危险的是语言原生序列化。
2. **黑名单拦类名拦不完**：gadget 链太多，白名单才稳。
3. **忽略依赖库版本**：老版本库自带危险 gadget，升级能挡掉大片利用。
4. **认为只读了数据无害**：反序列化会执行代码，远超读数据。

## 进阶（再补充）：修复清单

原则：**绝不反序列化不可信数据**。PHP 用 `json_encode/decode` 替代；Java 用 `ObjectInputFilter` 白名单限制可反序列化的类，并升级危险依赖（CommonsCollections 等）；Python 别用 `pickle` 处理外部输入，改用 `json`。必须反序列化时，做类白名单 + HMAC 签名校验，确保数据没被篡改且来源可信。

## 小测验（再补充）

- 问题1：PHP POP 链是什么？答案：把多个类的方法串起来形成触发到执行的利用链。
- 问题2：Shiro 反序列化经典点？答案：rememberMe 字段用硬编码密钥，反序列化直接 RCE。
- 问题3：最稳修复原则？答案：不反序列化不可信数据，改用 JSON + 白名单。


## 这一篇你该记住的

反序列化漏洞根因是"对象重建时魔法方法（__destruct/__wakeup/readObject）自动执行"，攻击者构造恶意对象串成 POP 链触发 RCE。PHP 的 unserialize/phar、Java 的 readObject（ysoserial）、Python 的 pickle 都是高危点。防御：优先用 JSON 而非原生序列化、类白名单、签名校验、升级有 CVE 的依赖、沙箱隔离。

反序列化是"对象重建的陷阱"。下一篇 **变量覆盖** 是另一种"程序内部被悄悄篡改"——攻击者改掉你以为用户改不了的关键变量。
