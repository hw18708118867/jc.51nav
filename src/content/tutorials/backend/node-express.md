---
title: Node.js + Express 快速搭建后端接口
description: 从环境准备到写出第一个 REST API，手把手用 Express 搭建一个可运行的后端服务。
category: backend
subcategory: nodejs
tags: ['Node.js', 'Express', 'API']
pubDate: 2026-07-05
order: 1
---

## 环境准备

确保已安装 Node.js（建议 18+），在终端检查版本：

```bash
node -v
npm -v
```

## 初始化项目

```bash
mkdir my-api && cd my-api
npm init -y
npm install express
```

## 写出第一个接口

创建 `app.js`：

```js
import express from 'express';

const app = express();
app.use(express.json());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express!' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`服务已启动: http://localhost:${PORT}`);
});
```

启动：`node app.js`，访问 `http://localhost:3000/api/hello` 即可看到返回的 JSON。

## 处理 POST 请求

```js
let todos = [];

app.post('/api/todos', (req, res) => {
  const { title } = req.body;
  const item = { id: todos.length + 1, title };
  todos.push(item);
  res.status(201).json(item);
});
```

## 小结

你已经用 Express 写出了 GET 与 POST 接口。后续可以引入数据库、路由拆分与中间件，逐步完善后端架构。
