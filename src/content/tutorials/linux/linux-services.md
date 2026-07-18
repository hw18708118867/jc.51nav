---
title: Linux 网络服务搭建：HTTP 协议、HTTPD 与 LAMP 平台
description: 服务器最终要对外提供服务。这篇讲清 HTTP 协议基础、用 HTTPD(Apache) 搭建网站，以及 LAMP 平台的概念与搭建。
category: linux
subcategory: linux
tags: ['Linux', 'HTTP', 'Apache', 'LAMP', 'Web服务']
pubDate: 2026-07-18
order: 7
---

学 Linux 多半是为了搭服务——网站、接口、数据库。本篇从 HTTP 协议讲起，用 Apache(HTTPD) 把第一个网站跑起来，再认识 LAMP 全家桶。

服务器本质上是一台"7×24 小时开着的、专门对外提供服务的电脑"。你访问一个网站，背后就是某台 Linux 上的 Web 服务软件在响应。这一篇我们就亲手把这套"对外服务"的链路搭出来。

## HTTP 协议简介

HTTP 是浏览器和服务器"对话"的规则，基于**请求-响应**模型：

1. 你在浏览器输入 `http://ip/`，浏览器向服务器发一个**请求（Request）**："请把首页给我"。
2. 服务器的 Web 服务软件（如 Apache）收到请求，找到对应文件（或交给后端程序生成），返回一个**响应（Response）**：状态码 + 网页内容。
3. 浏览器拿到响应，渲染成你看到的页面。

### 状态码（看一眼就知道成败）

| 状态码 | 含义 |
| --- | --- |
| `200` | 成功，正常返回 |
| `301/302` | 重定向（跳转到别处） |
| `403` | 禁止访问（权限/配置问题） |
| `404` | 找不到页面（路径错） |
| `500` | 服务器内部错误（程序崩了） |
| `502/504` | 网关/超时（常见于反向代理后面） |

排查网站问题，先看状态码，能直接缩小范围。

### 请求方法

- `GET`：取资源（看页面）
- `POST`：提交数据（登录、发帖）
- `PUT/DELETE`：更新/删除（REST 风格 API 用）

## 用 Apache(HTTPD) 搭网站

Apache 的进程名叫 `httpd`（或 `apache2`），是最老牌的 Web 服务软件之一。下面以 CentOS 系为例（Ubuntu 把包名换成 `apache2` 即可）。

### 安装与启动

```bash
sudo yum install httpd           # CentOS 装 Apache
sudo systemctl start httpd       # 启动
sudo systemctl enable httpd      # 开机自启
sudo systemctl status httpd      # 看状态（running 就成功了）
```

Ubuntu 系：
```bash
sudo apt install apache2
sudo systemctl start apache2
```

### 测试访问

启动后，浏览器访问服务器的 IP（如 `http://192.168.1.100`），看到 Apache 的默认欢迎页，说明 Web 服务起来了。如果访问不了，回想上篇：检查防火墙是否放行 80 端口、IP 是否通。

### 放自己的网页

Apache 默认网站根目录：
- CentOS：`/var/www/html/`
- Ubuntu：`/var/www/html/`

在里面建一个 `index.html`：

```bash
sudo vim /var/www/html/index.html
```

写入：
```html
<h1>我的第一个 Linux 网站</h1>
<p>这是跑在 Apache 上的页面。</p>
```

刷新浏览器，就能看到你写的内容了。这就是"网站"最简单的形式——Web 服务软件把目录里的文件发给浏览器。

### 关键配置文件

Apache 主配置：`/etc/httpd/conf/httpd.conf`（CentOS）或 `/etc/apache2/apache2.conf`（Ubuntu）。几个常用指令：
- `DocumentRoot`：网站根目录在哪。
- `Listen 80`：监听哪个端口。
- 虚拟主机（一个服务器跑多个网站）用 `<VirtualHost>` 配置。

改完配置要 `sudo systemctl reload httpd` 重载才生效。

## LAMP 平台：网站全家桶

真实网站几乎都是"组合拳"：**LAMP** = **L**inux + **A**pache + **M**ySQL + **P**HP。各司其职：

| 组件 | 角色 |
| --- | --- |
| Linux | 操作系统（地基） |
| Apache | Web 服务（接收请求、返回页面） |
| MySQL | 数据库（存数据） |
| PHP | 服务端语言（动态生成页面、操作数据库） |

搭好 LAMP，你就能跑 WordPress、Discuz 这类 PHP 网站。搭建步骤（CentOS 示例）：

```bash
sudo yum install httpd mariadb-server php php-mysqlnd
sudo systemctl start httpd mariadb
sudo systemctl enable httpd mariadb
```

初始化 MySQL 安全设置：
```bash
sudo mysql_secure_installation    # 设 root 密码、删匿名用户等
```

放一个 PHP 测试页验证 PHP 是否工作：
```bash
echo "<?php phpinfo(); ?>" | sudo tee /var/www/html/info.php
```
浏览器访问 `http://IP/info.php`，看到 PHP 信息页就说明 LAMP 通了。

> MariaDB 是 MySQL 的开源分支，CentOS 默认用 MariaDB 替代 MySQL，用法几乎一样，连接命令都是 `mysql`。

## 常见新手坑

- **访问 IP 是空页/拒绝**：防火墙没放行 80；或 Apache 没启动（`systemctl status` 看）。
- **403 Forbidden**：网站目录权限不对，Apache 用户（apache/www-data）读不到文件；或 `SELinux` 拦截（CentOS 常见，可临时 `setenforce 0` 测试）。
- **改了配置不生效**：忘了 `reload`/`restart` 服务。
- **PHP 页面被当文本下载**：PHP 模块没装或没加载，确认 `php` 包和 `php-mysqlnd` 已装。

## 这一篇你该记住的

- HTTP 是请求-响应模型；状态码 `200` 成功、`404` 找不到、`403` 禁止、`500` 服务器错、`502/504` 网关问题。
- Apache(HTTPD) 搭站：`yum install httpd` → `systemctl start/enable httpd` → 把网页放 `/var/www/html/` → 浏览器访问 IP。
- 主配置在 `/etc/httpd/conf/httpd.conf`，改完 `reload` 生效。
- LAMP = Linux+Apache+MySQL+PHP，是 PHP 网站的标准全家桶；MariaDB 是 MySQL 的开源分支。
- 访问异常先查：服务起没起、防火墙放没放端口、目录权限对不对。

下一篇我们给暴露在公网的服务器装上"门卫"——iptables 防火墙，讲清表/链概念和常用规则。
