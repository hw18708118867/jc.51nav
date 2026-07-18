---
title: Node.js + Express 快速搭建后端接口
description: 从环境准备到写出第一个 REST API，手把手用 Express 搭建一个可运行的后端服务。
category: backend
subcategory: nodejs
tags: ['Node.js', 'Express', 'API']
pubDate: 2026-07-05
order: 1
---

你有没有想过，当你打开一个手机 App、点开一个网页，那些"动态"的内容——比如你的微信好友列表、淘宝的商品价格、B 站的弹幕——是从哪来的？它们并不是写死在页面里的文字，而是来自一台"后台服务器"。这台服务器一直开着，听你发来的请求，然后回你一段数据。

这篇教程就带你亲手搭一个这样的后台服务器，用的就是 **Node.js + Express** 这对黄金组合。

打个比方：你的浏览器（或 App）就像去餐厅点餐的顾客，而我们用 Express 写的程序就是"后厨 + 服务员"。顾客说"我要一份菜单"（发请求），服务员把菜单递回去（返回数据）。我们这一篇，就是教你从零开这家"餐厅"，并且能真正跑起来、能被前端调用。

读完你会写出第一个真正能跑的后端接口（API），并理解每一行在干什么。

## 先搞清楚几个名词

动手前，把几个容易晕的词捋顺：

- **Node.js**：不是一门语言，而是一个"让 JavaScript 能跑在服务器上的运行环境"。平时 JS 只能在浏览器里跑，有了 Node.js，你用终端命令就能直接运行 `.js` 文件。
- **Express**：一个基于 Node.js 的"Web 框架"。框架可以理解为"别人帮你搭好的半成品房子"，你只需往里填家具（写业务逻辑）。Express 帮你处理了"接收请求、路由分发、返回响应"这些脏活累活。
- **接口 / API**：程序之间沟通的"约定"。比如约定好"你访问 `/api/hello` 这个地址，我就回你一句问候"。前端和后端就是靠一个个接口连起来的。
- **REST API**：一种流行的接口设计风格，用不同的 HTTP 方法（GET 查、POST 增、PUT 改、DELETE 删）对应"增删改查"四种操作，简单清晰。

一句话记忆：**Node.js 是发动机，Express 是车架，接口是你对外公布的"服务窗口"。**

## 环境准备：把发动机装好

写代码前，先确认电脑装了 Node.js。打开终端（Windows 用 PowerShell 或命令提示符，macOS 用"终端" App），输入：

```bash
node -v
npm -v
```

- `node -v` 会打印 Node.js 的版本号，比如 `v20.11.0`。能看到版本号说明装好了。
- `npm -v` 打印 npm 的版本。npm 是 Node 自带的"软件包管理器"，相当于应用商店，我们用它装 Express。

如果提示"command not found"，说明没装。去 [nodejs.org](https://nodejs.org) 下载"LTS（长期支持版）"安装包，一路下一步即可。建议版本 18 以上。

> 小知识：LTS = 稳定版，适合学习和生产；Current = 尝鲜版，有新特性但不一定稳。新手无脑选 LTS。

## 初始化项目：开一个空文件夹当工地

新建一个文件夹当作项目工地。在终端里：

```bash
mkdir my-api && cd my-api
npm init -y
npm install express
```

逐行解释：

1. `mkdir my-api` 创建名为 `my-api` 的文件夹；`&&` 表示"前一条成功才执行后一条"；`cd my-api` 进入这个文件夹。
2. `npm init -y` 快速生成 `package.json` 文件。这个文件相当于项目的"身份证"，记录了项目名字、版本，以及装了哪些依赖（比如 Express）。`-y` 是"全部用默认值，别问我"。
3. `npm install express` 从 npm 商店下载 Express 装进项目里的 `node_modules` 文件夹。装完后 `package.json` 里会多出 `dependencies` 字段，记录 `express` 这个依赖。

> 如果看到终端出现 `added 50 packages` 之类的提示，并多出了 `node_modules` 和 `package-lock.json`，说明安装成功。别慌，`node_modules` 里那一大堆文件都是 Express 自己依赖的零件，你不用管。

## 写出第一个接口：让服务器说"你好"

现在写第一行真正的后端代码。在项目根目录新建文件 `app.js`，内容如下：

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

别被这一小段吓到，我们逐行拆开讲：

- `import express from 'express';` 把 Express 这个框架引进来，起名叫 `express`。
- `const app = express();` 创建一个 Express 应用实例 `app`。后面所有的接口都挂在这个 `app` 上。可以把 `app` 理解成"我们的餐厅"。
- `app.use(express.json());` 这句很重要——它让服务器能"看懂"前端发来的 JSON 格式数据（比如 `{"title":"买菜"}`）。不写这句，后面收 POST 数据会拿到空对象。
- `app.get('/api/hello', (req, res) => { ... });` 这是核心：**当有人用 GET 方式访问 `/api/hello` 这个地址时，执行后面的函数**。`req` 是"请求对象"（顾客说了啥），`res` 是"响应对象"（我们要回啥）。
- `res.json({ message: 'Hello from Express!' });` 用 JSON 格式把一段数据回给请求方。这就是"接口返回数据"。
- `app.listen(PORT, ...)` 让服务器在 `3000` 端口"开张营业"。`console.log` 只是打印一行提示，让你知道启动成功。

### 启动并验证

回到终端，运行：

```bash
node app.js
```

如果看到 `服务已启动: http://localhost:3000`，恭喜，服务器跑起来了！

怎么验证它真的能干活？打开浏览器，访问：

```
http://localhost:3000/api/hello
```

你会看到页面上显示：

```json
{"message":"Hello from Express!"}
```

这就说明：浏览器发起 GET 请求 → Express 接收 → 执行了我们的函数 → 返回了 JSON。一条完整的"请求-响应"链路跑通了！

> 进阶玩法：你也可以用命令行工具 `curl` 测试：`curl http://localhost:3000/api/hello`，它直接在终端打印返回内容。前端工程师常用 curl 或 Postman 来调试接口。

## 处理 POST 请求：让服务器"存东西"

GET 是"查"，POST 是"提交"。真实项目里，用户要提交数据（比如发一条留言），就用 POST。我们来扩展示例，加一个能接收并回显数据的接口：

```js
app.post('/api/echo', (req, res) => {
  const body = req.body;          // 前端发来的 JSON 数据
  console.log('收到:', body);
  res.json({ youSent: body });
});
```

这里 `req.body` 就是前端传来的数据。因为前面写了 `app.use(express.json())`，Express 已经帮我们把 JSON 解析好了，直接拿来用就行。

用 curl 测试 POST（注意 `-H` 声明内容类型，`-d` 是发送的数据）：

```bash
curl -H "Content-Type: application/json" -d '{"name":"小明"}' http://localhost:3000/api/echo
```

会返回：

```json
{"youSent":{"name":"小明"}}
```

## 路由参数：从网址里取动态值

有时网址里带着具体 id，比如 `/api/users/3` 表示"第 3 个用户"。Express 用 `:` 定义这种动态片段：

```js
app.get('/api/users/:id', (req, res) => {
  const id = req.params.id;       // 拿到网址里的 3
  res.json({ userId: id, tip: '这是从网址里取出来的' });
});
```

访问 `http://localhost:3000/api/users/3`，返回：

```json
{"userId":"3","tip":"这是从网址里取出来的"}
```

`req.params` 里装的就是所有 `:xxx` 动态片段的值。这种写法在做"查看某篇文章""删除某个订单"这类接口时天天用。

## 一个能跑的小项目结构

真实项目不会把所有接口堆在一个文件里。稍微规范一点的结构长这样：

```
my-api/
├── package.json
├── app.js            # 入口：创建 app、挂路由、监听端口
├── routes/           # 路由：按业务拆分成多个文件
│   └── user.js
└── node_modules/     # 依赖（自动生成，别手改）
```

`routes/user.js` 里可以这样写：

```js
import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json([{ id: 1, name: '小明' }, { id: 2, name: '小红' }]);
});

export default router;
```

`app.js` 里引入并挂载：

```js
import userRouter from './routes/user.js';
app.use('/api/users', userRouter);
```

这样访问 `/api/users` 就会走到 `user.js` 里的逻辑。把路由按业务拆开，项目一大也不乱。

## 常见新手坑

- **端口被占用**：如果启动时报 `EADDRINUSE`，说明 3000 端口已经被别的程序占了。换个端口（比如 4000），或关掉占用端口的程序。
- **改了代码不生效**：Node 不会自动重载。改完代码要停掉（`Ctrl+C`）再 `node app.js` 重启。想热重载可以装 `nodemon`（`npm install -D nodemon`，用 `npx nodemon app.js` 启动）。
- **收不到 POST 数据**：九成是因为忘了写 `app.use(express.json())`。
- **`import` 报错**：较新的 Node 用 `import/export` 需要 `package.json` 里有 `"type": "module"`。如果报错，要么加上这个字段，要么改用老式的 `require()`。

## 这一篇你该记住的

- Node.js 让 JS 能跑在服务器上；Express 是帮你处理请求/响应的框架；API 是前后端沟通的约定。
- `npm init -y` 建项目，`npm install express` 装依赖。
- `app.get('/路径', 处理函数)` 定义接口，`req` 是请求、`res` 是响应，`res.json()` 返回数据。
- `app.use(express.json())` 必写，否则收不到 JSON 格式的 POST 数据。
- 动态网址用 `:参数名`，从 `req.params` 里取。
- 改代码后记得重启服务（或用 nodemon 热重载）。

下一篇我们回到 PHP 这条线，从"后端到底是干什么的"讲起，带你在本地把 PHP 环境跑起来，再写第一个 PHP 页面。
