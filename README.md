# 51教程网

一个基于 **Astro** 的纯前端中文 IT 技术教程站，部署到 GitHub Pages（自定义域名 `jc.51nav.com`），后期可接入 Google AdSense 变现。

## 技术栈

- [Astro](https://astro.build) 5 —— 静态站点生成器
- Tailwind CSS v4 —— 样式
- @astrojs/rss / @astrojs/sitemap —— RSS 与站点地图
- Pagefind —— 构建期全文搜索索引
- Giscus / 不蒜子(busuanzi) —— 评论与阅读量（纯前端第三方）

## 本地开发

```bash
npm install
npm run dev        # 本地预览 http://localhost:4321
npm run build      # 构建（含 Pagefind 索引）输出到 dist/
npm run preview    # 预览构建产物
```

> 搜索功能依赖构建后的 Pagefind 索引，本地开发时搜索页需先执行一次 `npm run build`。

## 目录结构

```
src/
├── components/   组件（Header/Footer/Sidebar/ArticleCard/AdSlot/Comments/ViewCounter...）
├── layouts/      布局（BaseLayout / DocLayout）
├── pages/        页面路由（首页 / 分类 / 文档 / 搜索 / about / rss.xml）
├── content/
│   ├── config.ts 内容集合 schema
│   └── tutorials/ 教程 Markdown（按分类分子目录）
├── styles/       全局样式
└── utils/site.ts 站点与分类配置
```

## 撰写教程

在 `src/content/tutorials/<分类>/` 下新建 `.md` 文件，填写 frontmatter：

```md
---
title: 标题
description: 一句话摘要
category: frontend   # 对应 src/utils/site.ts 中的分类 slug
tags: ['HTML', '入门']
pubDate: 2026-07-01
order: 1             # 同分类内的排序，越小越靠前
---
```

## 环境变量（第三方功能）

复制 `.env.example` 为 `.env`（本地）或在仓库 **Settings → Secrets and variables → Actions → Variables** 中配置：

| 变量 | 作用 | 未配置时 |
| --- | --- | --- |
| `PUBLIC_GA_ID` | Google Analytics 流量统计 | 不加载 |
| `PUBLIC_ADSENSE_CLIENT` | AdSense 发布商 ID，启用广告位 | 完全隐藏（不渲染） |
| `PUBLIC_GISCUS_REPO` 等 | Giscus 评论（见 giscus.app） | 显示占位提示 |

> 所有变量以 `PUBLIC_` 前缀暴露到客户端，构建时注入，不写死在代码中。

## 部署

1. 将代码推送到 GitHub 仓库的 `main` 分支。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 在 **Settings → Pages → Custom domain** 填写 `jc.51nav.com`（仓库内 `public/CNAME` 已包含该域名）。
4. 工作流 `.github/workflows/deploy.yml` 会在推送后自动构建并发布。

## 广告变现

待流量达标后，申请 Google AdSense，将发布商 ID 填入 `PUBLIC_ADSENSE_CLIENT`，站内预留的文首/文中/侧栏/页脚广告位即自动启用。
