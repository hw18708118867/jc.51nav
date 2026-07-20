---
title: 证书校验与绕过：让 APP 的 HTTPS 流量现出原形
description: APP 抓包常被证书绑定（SSL Pinning）拦住。这篇讲证书校验是什么、在 Android 里怎么实现（Network Security Config、OkHttp、自定义 TrustManager），以及用 Frida、Objection、改配置三种思路绕过它。
category: security
subcategory: mobile-pentest
tags: ['APP安全', '证书绑定', 'SSL Pinning', 'Frida', 'Burp']
pubDate: 2026-07-19
updatedDate: 2026-07-19
order: 5
---

上一章我们收集完信息，下一步自然是抓包看 APP 到底和服务器聊了什么。可很多人兴冲冲配好 Burp 代理，打开 APP 却发现自己"网络异常""连接失败"——流量根本没过来。十有八九，是撞上了**证书绑定（SSL Pinning / 证书锁定）**。这一篇把它讲透，并给出绕过的思路。

> 本文仅用于你对**自有或已授权**的 APP 做安全测试。对第三方 APP 做逆向、绕过其安全机制可能违反其服务条款与相关法律。

## 为什么普通抓包会失败

先回忆 HTTPS 的原理：客户端要验证服务器证书是由可信 CA 签发的。系统里内置了一堆可信 CA，Burp 这类代理工具是用自己的 CA 给流量"签名"的，所以正常情况下，只要把 Burp 的 CA 装进手机系统信任区，就能中间人解密流量。

但证书绑定干了一件事：**APP 不信任系统的 CA 列表，而是只认某一张（或几张）特定的证书/公钥**。它把"正确的证书指纹"写死在代码或配置里，握手时比对，发现不是预期的那个，直接拒绝连接。于是 Burp 的自签证书对不上，连接被掐断，你啥也抓不到。

简单说：普通 MitM 攻的是"系统信任"，证书绑定攻的是"APP 自己信任"，它绕过了系统信任链。

## 证书绑定在 Android 里怎么实现

常见三种实现方式，从浅到深：

### 1. Network Security Config（最规整）

安卓 7 以上支持在 `res/xml/network_security_config.xml` 里声明：

```xml
<network-security-config>
  <domain-config>
    <domain includeSubdomains="true">api.xxx.com</domain>
    <pin-set expiration="2026-12-31">
      <pin digest="SHA-256">基名aQ==</pin>
    </pin-set>
  </domain-config>
</network-security-config>
```

`pin` 里就是服务器证书公钥的 SHA-256 指纹。这种写法在反编译后的资源里一目了然，也最好改。

### 2. OkHttp 的 CertificatePinner（最常见）

很多 APP 用 Square 的 OkHttp 网络库，它自带绑定：

```java
OkHttpClient client = new OkHttpClient.Builder()
    .certificatePinner(new CertificatePinner.Builder()
        .add("api.xxx.com", "sha256/基名aQ==")
        .build())
    .build();
```

这种写在代码逻辑里，要改得动 smali 或运行时 Hook。

### 3. 自定义 TrustManager（最顽固）

开发者自己实现 `X509TrustManager`，在 `checkServerTrusted` 里写死比对逻辑，甚至直接信任所有证书（调试残留）。这种最灵活也最隐蔽，只能靠运行时 Hook 或读代码定位。

## 绕过思路一：改配置（针对 Network Security Config）

如果绑定是用配置文件声明的，且 APP 没做完整性校验，最省事的办法是反编译后改配置、重打包：

1. 用 apktool 反编译，找到 `res/xml/network_security_config.xml`；
2. 把 `pin-set` 整段删掉，或把 `domain` 的绑定去掉；
3. 顺便在 `base-config` 里加 `cleartextTrafficPermitted="true"` 允许明文，方便调试；
4. `apktool b` 重打包，再 `jarsigner`/`apksigner` 重签名；
5. 卸载原 APP，装修改后的版本。

重签名后 APP 的"身份"变了，如果它做了签名校验（很多有），会闪退——这时候得再 Hook 掉签名校验逻辑。可见绕过是一条链，往往要组合拳。

## 绕过思路二：运行时 Hook（Frida / Objection）

不想重打包、不怕麻烦的话，运行时 Hook 更优雅。核心思想：在 APP 运行起来之后，动态地"把校验函数改成放行"。最常用的是 **Frida** 这个注入框架。

```javascript
// 用 Frida 让 OkHttp 的 CertificatePinner 放行
Java.perform(function () {
  var CertificatePinner = Java.use("okhttp3.CertificatePinner");
  CertificatePinner.check.overloads.forEach(function (m) {
    m.implementation = function () {
      console.log("[*] CertificatePinner.check 被调用，直接放行");
    };
  });
});
```

把校验函数（不管它比对什么）的实现替换成"什么都不做"，证书绑定就形同虚设。更省心的是 **Objection**（基于 Frida 的封装），一条命令尝试干掉常见绑定：

```bash
# 手机上跑 frida-server，电脑端执行
objection -g com.xxx.app explore
# 进入后执行：
android sslpinning disable
```

Objection 内置了针对 OkHttp、WebView、TrustManager 等常见绑定的绕过脚本，对新手很友好。但遇到开发者自己写的 `checkServerTrusted`，Objection 认不出，还得自己写 Frida 脚本定位那个函数。

## 绕过思路三：Hook 系统校验入口

如果上面都搞不定，可以往更底层走——Hook 系统级的证书校验 API，比如 `TrustManagerImpl` 的 `checkTrusted`、或者 `java.security.cert` 相关方法，让系统在"最源头"就放行。这类脚本社区里现成的很多（如 `frida-multipinning-bypass`），拿来改改包名就能用。

这里有个经验：绕证书绑定本质是"让校验函数不干活"。从 APP 层（OkHttp）到系统层（TrustManager）逐层往上堵，总有一层能拦住它。

## 抓到之后：Burp 怎么配

绕开绑定只是前提，真正抓包还要把流量引到 Burp：

1. 手机和电脑同一网段，手机 WLAN 里设代理指向电脑 IP:8080；
2. 手机浏览器打开 `http://burp` 下载并安装 Burp CA 证书，装进系统信任区（安卓 7+ 需装到系统分区，或用 Magisk 模块）；
3. 启动 Frida/Objection 绕过绑定，打开 APP，Burp 里就能看到 HTTPS 明文请求了。

看到明文那一刻，你就拿到了 APP 和服务器之间的"对话记录"，后面找逻辑漏洞、越权、敏感信息泄露全靠它。

## 常见坑与注意

- **只绕过不重签**：有些 APP 做了签名校验，重打包后会闪退，别忘了同时处理签名校验（Hook `getPackageInfo` 的签名比对）。
- **Frida 连不上**：手机要装对应架构的 `frida-server` 并 root/越狱，且版本要和电脑端 Frida 匹配。
- **绕过不是漏洞**：证书绑定被绕过本身通常不算高危漏洞，它只是"增加了攻击成本"。真正的价值在于绕过之后你看到的流量里有没有问题。
- **法律红线**：再次强调，这些技术只用于你有权测试的目标。

## 从防御视角看：为什么绑定值得做

讲完绕过，换个立场想想：既然能被绕，证书绑定还有意义吗？有意义，而且该做。它的价值不在于"绝对防住"，而在于"大幅提高攻击成本、过滤掉绝大多数自动化工具和低水平嗅探"。一个普通公共 WiFi 下的流量窃听者，遇到绑定就直接被挡在门外，这已经挡掉了大部分真实风险。安全本来就是成本对抗，不是非黑即白。

对测试者来说，也要知道防御方会反制：很多 APP 会检测自己是否运行在 Root/越狱环境、是否加载了 Frida 这类注入框架（比如扫描 `/data/local/tmp/frida-server` 或特定端口），一旦检测到就闪退或降级。所以绕过证书绑定常常不是"一步到位"，而是要和这些反制手段打游击：隐藏 Frida 进程名、过反 root 检测、过反调试。这提醒我们，移动端攻防是层层对抗，别指望一个脚本通吃。

最后落到实践建议：如果你自己是开发者，证书绑定要配，但别把它当成"加密就够了"的错觉——绑定保护的是传输不被窃听，保护不了客户端里写死的密钥、保护不了服务端该做的鉴权。传输安全、客户端安全、服务端安全是三件不同的事，绑定只是其中一块拼图。

补充一点实战细节:绕证书绑定时,很多人卡在"Frida 连不上"。常见原因是手机上的 `frida-server` 没起来,或者电脑端 Frida 版本和手机端不一致。务必保证两端版本号相同,并且 `frida-server` 以足够权限运行。另一个高频坑是只绕了 OkHttp 却忘了 WebView——很多 APP 内嵌的 H5 页面走的是 WebView 的网络栈,它有自己的证书校验逻辑,得用针对 WebView 的 Hook 脚本再处理一遍,否则 H5 部分的流量照样抓不到。把这两处都覆盖,抓包才算完整。绕过证书绑定这件事,本质是和安全机制的一次正面交锋,耐心和细致比工具更重要。

## 这一篇你该记住的

- 证书绑定让 APP 只信任特定证书，导致 Burp 自签 CA 抓不到包。
- 三种实现：Network Security Config、OkHttp CertificatePinner、自定义 TrustManager。
- 三种绕过：改配置重打包、Frida/Objection 运行时 Hook、Hook 系统校验入口。
- 绕过常要配合处理签名校验，是一条组合拳。
- 抓到明文流量后，真正的漏洞挖掘才开始。

流量能抓了，下一步自然是看 APP 到底在跑什么逻辑。可很多 APP 会把代码加密加壳，直接反编译是一团乱码——下一篇我们讲反编译与脱壳。
