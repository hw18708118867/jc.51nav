---
title: Web 安全基础：常见漏洞与防护入门
description: 了解 SQL 注入、XSS、CSRF 等最常见 Web 漏洞的原理与防护思路，建立安全编码的第一道防线。
category: security
subcategory: web
tags: ['Web 安全', '漏洞', '防护']
pubDate: 2026-07-12
order: 1
---

## 为什么要学 Web 安全

作为开发者，理解常见攻击手段是写出安全代码的前提。本篇带你认识三种最高频的 Web 漏洞，并给出可落地的防护建议。

## SQL 注入

攻击者把恶意 SQL 拼接进查询语句，绕过鉴权或窃取数据。

> 防护核心：**永远不要拼接 SQL 字符串**，使用参数化查询（预编译语句）。

```js
// 危险：字符串拼接
const sql = `SELECT * FROM users WHERE name = '${req.body.name}'`;

// 安全：参数化查询
const sql = 'SELECT * FROM users WHERE name = ?';
db.query(sql, [req.body.name]);
```

## XSS（跨站脚本）

攻击者把恶意脚本注入到页面中，在受害者浏览器执行。

防护要点：
- 对用户输入做转义（HTML 实体编码）
- 设置 `Content-Security-Policy` 响应头
- 尽量使用现代框架的自动转义机制

## CSRF（跨站请求伪造）

诱导用户在已登录状态下发起非本意请求。

防护要点：
- 使用 CSRF Token
- 关键操作要求二次确认
- 设置 `SameSite` Cookie 属性

## 小结

安全是一个持续过程。养成"不信任任何用户输入"的习惯，配合参数化查询、转义与 Token 机制，就能挡住绝大多数常见攻击。
