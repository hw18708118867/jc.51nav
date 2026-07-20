---
title: 前端路由：单页应用如何切换"页面"
description: 从"传统多页 vs 单页应用"讲起，理解前端路由的原理、history 模式与 hash 模式，掌握 vue-router 与 react-router 的路由配置、动态参数与路由守卫。
category: frontend
subcategory: frameworks
tags: ['前端框架', '路由', 'SPA', 'vue-router', 'react-router']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 5
---

你点网页里的链接，浏览器通常会"整页刷新"去请求新页面——这是传统多页应用（MPA）。但现代框架做的多是**单页应用（SPA，Single Page Application）**：整个站点其实只有一个 HTML 文件，点导航时不刷新整页，而是**前端自己切换显示哪块内容**。负责这件事的，就是**前端路由**。

前端路由是"用框架做完整网站"的必备能力。这一篇我们讲清它是什么、hash 和 history 两种模式、动态路由参数，以及"路由守卫"怎么保护页面。

## 传统多页 vs 单页应用

- **多页（MPA）**：每个 URL 对应服务器上的一个 HTML 文件。点链接 → 浏览器请求新 HTML → 整页刷新。优点：SEO 友好、每个页面独立；缺点：切换慢、体验割裂。
- **单页（SPA）**：服务器只返回一个空壳 HTML + 一个 JS 包。之后所有"页面切换"都在前端完成——JS 根据 URL 决定渲染哪个组件，**不请求新 HTML、不刷新整页**。优点：切换快、体验流畅如 App；缺点：首屏要下载 JS、SEO 需额外处理（SSR）。

前端路由就是 SPA 的"URL → 显示哪个组件"的映射表。

## 路由的本质：监听 URL 变化

前端路由的核心机制：**拦截 URL 变化，不真的去服务器要新页面，而是切换显示的组件**。两种实现：

**1. Hash 模式（`#/xxx`）**

URL 里 `#` 后面的部分变化不会触发整页刷新，也不会发给服务器。路由库监听 `hashchange` 事件：

```
http://app.com/#/home
http://app.com/#/user/123
```

优点：纯前端、不用服务器配置，随便部署。缺点：URL 带丑陋的 `#`，且 `#` 后的内容不进服务器日志。

**2. History 模式（`/xxx`）**

用 HTML5 的 `history.pushState` API，URL 干净如 `http://app.com/user/123`。但**缺点**：用户直接访问 `/user/123` 或刷新时，浏览器会真的去服务器请求这个路径，服务器若没配置"兜底返回 index.html"，就 404。所以 history 模式**必须服务器配合**（所有路径都返回同一个 HTML 入口）。

新手建议：本地开发用 history 模式（URL 好看）；部署时让服务器/Nginx 把所有未知路径 rewrite 到 `index.html`。

## vue-router：配置即映射

Vue 用 `vue-router`，先定义"路径 → 组件"的路由表：

```js
// router.js
import { createRouter, createWebHistory } from 'vue-router';
import Home from './Home.vue';
import User from './User.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/user/:id', component: User }, // :id 是动态参数
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
```

在组件里用 `<router-link>` 跳转（代替 `<a>`），用 `<router-view>` 占位"当前路由对应的组件显示在这"：

```vue
<template>
  <nav>
    <router-link to="/">首页</router-link>
    <router-link to="/user/123">用户</router-link>
  </nav>
  <router-view />   <!-- 匹配的组件渲染到这里 -->
</template>
```

在 `User.vue` 里取动态参数：

```vue
<script setup>
import { useRoute } from 'vue-router';
const route = useRoute();
console.log(route.params.id); // "123"
</script>
```

## react-router：组件即路由

React 用 `react-router`，把"路由"也当成组件来写：

```jsx
import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">首页</Link>
        <Link to="/user/123">用户</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/user/:id" element={<User />} />
      </Routes>
    </BrowserRouter>
  );
}

function User() {
  const { id } = useParams(); // 取动态参数 "123"
  return <p>用户 {id}</p>;
}
```

`<Route path element>` 声明映射，`<Link>` 跳转，`useParams` 取参数。思路和 vue-router 一致，只是用 JSX 表达。

## 嵌套路由：页面的"骨架 + 内容"

真实后台常有"左侧菜单固定 + 右侧内容切换"的布局。这用**嵌套路由**实现：父路由渲染布局（含 `<router-view>`/`<Outlet>`），子路由渲染在它内部。

```js
// Vue 示意
{
  path: '/admin',
  component: AdminLayout,   // 含 <router-view/>
  children: [
    { path: 'users', component: UserList },
    { path: 'orders', component: OrderList },
  ]
}
```

访问 `/admin/users` 时，`AdminLayout` 显示（带菜单），`UserList` 显示在它内部的 `<router-view>`。React 对应用 `<Outlet />` 占位。嵌套让"布局复用 + 局部切换"变得自然。

## 路由守卫：没登录就拦住

很多页面要"登录才能看"。**路由守卫（navigation guard）** 就是在跳转发生前做检查：没登录就重定向到登录页。

**Vue 版**：

```js
router.beforeEach((to, from, next) => {
  const isLogin = checkLogin(); // 查 token
  if (to.meta.requiresAuth && !isLogin) {
    next('/login'); // 拦截，跳登录
  } else {
    next(); // 放行
  }
});
```

**React 版**：用一个"受保护路由"组件包裹：

```jsx
function RequireAuth({ children }) {
  const isLogin = checkLogin();
  if (!isLogin) return <Navigate to="/login" />;
  return children;
}

// 使用
<Route path="/admin" element={
  <RequireAuth><AdminLayout /></RequireAuth>
} />
```

守卫是"前端层面的提示"，**不能替代后端鉴权**——攻击者可以绕过前端直接调 API，所以后端每个接口仍要校验身份（呼应 API 设计篇）。前端守卫只是"用户体验"和"减少无效请求"。

## 常见新手坑

- **history 模式刷新 404**：部署时服务器没把未知路径 rewrite 到 index.html。这是 SPA 部署头号坑。
- **用 `<a href>` 做 SPA 跳转**：会整页刷新，破坏 SPA 体验。用 `<router-link>` / `<Link>`。
- **动态参数取不到**：路径没写 `:id`，或取的时候用了错的名字（path 是 `:userId` 却取 `params.id`）。
- **以为前端守卫 = 安全**：前端守卫能被绕过，敏感数据必须后端鉴权。
- **路由表顺序错**：如把 `{ path: '/:id' }` 放在 `{ path: '/users' }` 前面，会错误匹配。具体路由放前面。
- **嵌套路由忘了 `<router-view>`/`<Outlet>`**：父布局里没占位，子组件无处渲染。

## 实战：一个带登录守卫的小应用

路由表 + 守卫，串起"首页公开、后台需登录"：

```js
const routes = [
  { path: '/', component: Home },
  { path: '/login', component: Login },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: 'users', component: UserList },
    ],
  },
];

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !hasToken()) {
    return '/login'; // 未登录重定向
  }
});
```

访问 `/admin/users` 时，守卫发现没 token，自动弹回 `/login`；登录后有了 token，再次访问才放行，且 `AdminLayout` 的菜单常驻、`UserList` 在内部切换。这就是后台系统的标准骨架。

## 新手怎么把路由练熟

路由是"做完整网站"的门槛，不熟就只能写单页 demo。建议动手搭一个最小 SPA：三个页面（首页/列表/详情），用路由切换；详情页用动态参数 `:id` 显示不同内容；加一个"需登录"的页面并用守卫保护。重点是**亲手体验 history 模式刷新 404**，再配一次服务器 rewrite——这个坑踩过一次，以后部署再也不会懵。

另一个心法：**路由表就是网站的地图**。动手前先列"这个站有哪些页面、哪些要参数、哪些要登录"，写成路由表，结构立刻清晰。路由设计乱，整个应用就乱；路由清晰，组件怎么拆都有据可依。

还有，理解"路由参数 vs 查询参数"的分工：`:id` 这类是"资源标识"（如哪篇文章），放路径；`?page=2&sort=time` 这类是"视图状态"（怎么看），放查询字符串。两者配合，URL 既语义清晰又可分享（把带查询参数的 URL 发给同事，他看到的是同样的筛选结果）。

## 小测验：看看你掌握了没

- 问题一：hash 模式和 history 模式最大区别？答案：hash 用 `#` 不请求服务器、部署零配置但 URL 丑；history URL 干净但需服务器 rewrite 兜底，否则刷新 404。
- 问题二：路由守卫能当安全机制吗？答案：不能，只是前端体验层；攻击者绕过前端直接调 API，后端必须独立鉴权。
- 问题三：嵌套路由里父布局靠什么占位渲染子页面？答案：Vue 用 `<router-view>`，React 用 `<Outlet />`。

## 这一篇你该记住的

- SPA 不刷新整页，靠前端路由切换"显示哪个组件"。
- hash 模式（`#/x`）零配置但 URL 丑；history 模式（`/x`）需服务器 rewrite 防刷新 404。
- vue-router：`routes` 表 + `<router-link>` + `<router-view>` + `useRoute().params`。
- react-router：`<Routes>/<Route>` + `<Link>` + `useParams`，路由即组件。
- 嵌套路由用父布局 + `<router-view>/<Outlet>` 实现"骨架 + 局部切换"。
- 路由守卫做登录拦截（前端层），但安全必须后端鉴权兜底。

到这里，前端框架从"为什么用框架"到"Vue/React 基础""组件通信""路由"四条主线走完。下一步进入**工程化**大类：包管理、构建工具、TypeScript、规范与 CI，把"能写"变成"能高效、可靠地交付"。
