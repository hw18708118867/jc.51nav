---
title: JavaScript 异步与 Promise：不卡页面的"等一会儿"
description: 为什么 JS 是单线程却不怕等待，回调是什么，Promise 怎么表示"将来的值"，async/await 怎么把异步写得更像同步，以及用 fetch 请求接口。
category: frontend
subcategory: javascript
tags: ['JavaScript', '异步', 'Promise', 'async', 'fetch']
pubDate: 2026-07-18
order: 12
---

很多操作要"等"：定时器倒计时、向服务器请求数据、读文件。如果 JS 傻等，页面就会卡住、点啥都没反应。JS 的解法是**异步**——"你先去等着，好了叫我，我继续干别的"。

异步是 JS 最反直觉、也最关键的机制。新手常被"为什么我的代码顺序乱了"搞崩。这一篇我们用生活比喻讲清单线程、回调、Promise，最后用 `async/await` 把异步写得像同步一样直白，并实战用 `fetch` 请求接口。

## JS 是单线程，但能"异步"

"单线程"意思是 JS 同一时间只能做一件事（就像只有一个收银员）。那为什么它能在"等服务器返回数据"时，页面还不卡？

答案是：**JS 把"耗时操作"交给浏览器其他线程去干（网络请求、定时器由浏览器内核处理），自己先继续往下跑，等那边好了再回来执行"后续处理"**。这就是异步的本质——"发起等待，但不阻塞"。

打个比方：你（JS 主线程）在餐厅点单后，厨房（浏览器其他线程）去做饭，你不用杵在窗口干等，可以先找座位、看菜单。饭好了服务员（事件队列）喊你，你再去拿。

## 回调：最早的异步写法

"饭好了喊我"里的"喊我"，在代码里就是**回调函数**——你把一个函数交给异步操作，它完成时调用这个函数：

```js
console.log('A');

setTimeout(() => {
  console.log('B（2 秒后）');
}, 2000);

console.log('C');
```

输出顺序是 `A` → `C` → `B`。因为 `setTimeout` 是异步的：JS 发起"2 秒后执行"就立刻继续，先打印 `C`；2 秒后定时器到了，才执行回调打印 `B`。

这就是异步的"乱序"来源：**异步回调不在原地执行，而在"未来"执行**。

### 回调地狱（callback hell）

如果异步操作要嵌套（先请求用户、再用用户 id 请求订单、再用订单查详情），回调会一层套一层：

```js
getUser((user) => {
  getOrders(user.id, (orders) => {
    getDetail(orders[0].id, (detail) => {
      console.log(detail);   // 缩进越来越深，难以维护
    });
  });
});
```

这种"向右箭头"叫回调地狱，又丑又难改。Promise 就是为解决这个问题而生的。

## Promise：表示"将来的值"

**Promise** 是一个"代表未来结果"的对象。它有三种状态：

- `pending`：进行中（还没结果）
- `fulfilled`：成功（拿到结果）
- `rejected`：失败（出错了）

用 `then` 处理成功、`catch` 处理失败，而且**可以链式调用**，告别嵌套：

```js
fetch('/api/user')
  .then(res => res.json())     // 成功：解析 JSON
  .then(data => console.log(data))  // 拿到数据
  .catch(err => console.error('出错了', err));  // 任何一步失败都到这里
```

比起回调地狱，Promise 把"下一步"平铺成 `.then().then()`，清晰多了。

## async / await：把异步写得更像同步

`async/await` 是 Promise 的语法糖，让异步代码**看起来像同步顺序执行**，可读性最好，是现代首选写法：

```js
async function loadData() {
  try {
    const res = await fetch('/api/user');   // 等请求完成
    const data = await res.json();           // 等解析完成
    console.log(data);                        // 像同步一样拿到结果
  } catch (err) {
    console.error('出错了', err);
  }
}
```

- `async` 用在函数前，声明"这是个异步函数"，里面可以用 `await`。
- `await` 放在 Promise 前面，意思是"**等这个 Promise 完成，拿到结果再继续**"——但注意，它只"暂停"这个函数内部，不会卡住整个页面。
- 用 `try/catch` 捕获异步中的错误（替代 `.catch`）。

对比回调地狱，同样的逻辑用 `async/await`：

```js
async function loadAll() {
  const user = await getUser();
  const orders = await getOrders(user.id);
  const detail = await getDetail(orders[0].id);
  console.log(detail);   // 从上到下，一目了然
}
```

## 实战：用 fetch 请求接口

`fetch` 是现代浏览器自带的请求 API，返回一个 Promise，常配合 `async/await` 用：

```js
async function getUsers() {
  const res = await fetch('https://api.example.com/users');
  if (!res.ok) {
    throw new Error('请求失败：' + res.status);
  }
  const users = await res.json();
  console.log(users);
}
getUsers();
```

`fetch(url)` 发起 GET 请求；`res.ok` 判断 HTTP 状态码是否成功（2xx）；`res.json()` 把响应体解析成 JS 对象（也是异步，要 `await`）。

发 POST 请求要加 `method` 和 `body`：

```js
async function createUser() {
  const res = await fetch('https://api.example.com/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '小明', age: 18 }),
  });
  const data = await res.json();
  console.log('创建成功', data);
}
```

## 微任务与宏任务（了解即可）

进阶一点：异步任务分两类排队——`setTimeout` 等是"宏任务"，`Promise` 的回调是"微任务"。微任务优先级更高，会在当前宏任务结束后、下一个宏任务前**全部清空**。这解释了为什么 `Promise.then` 的回调会比 `setTimeout` 先执行。初学不必深究，知道"异步不是随机乱序，而是有排队规则"即可。

## 常见新手坑

- **以为 `await` 会卡住整个页面**：`await` 只暂停当前 `async` 函数内部，页面其他代码照跑。
- **`async` 函数忘了 `await`**：`const res = fetch(...)` 拿到的是 Promise 而不是结果，要 `await`。
- **忘了 `try/catch` 或 `.catch`**：异步出错会"静默"丢失，调试时一头雾水。
- **`fetch` 不抛 HTTP 错误**：`res.ok` 为 false（如 404）时 `fetch` 不会 reject，要手动判断。

## 这一篇你该记住的

- JS 单线程但能异步：耗时操作交给浏览器其他线程，自己不阻塞，好了再回调。
- 回调是早期写法，嵌套多了成"回调地狱"；Promise 用 `.then().catch()` 链式平铺。
- `async/await` 是 Promise 的语法糖，让异步**像同步一样顺序写**，现代首选；`await` 只暂停函数内部不卡页面，错误用 `try/catch`。
- `fetch(url)` 发请求返回 Promise；`res.ok` 判成功、`res.json()` 解析；POST 要带 `method`/`headers`/`body`(JSON.stringify)。

下一篇我们讲**错误处理**——`try/catch/finally` 怎么接住异常，常见错误类型，以及异步里错误怎么捕获。
