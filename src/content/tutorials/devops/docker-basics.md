---
title: Docker 容器入门：把应用装进集装箱
description: 理解容器是什么，并用 Docker 把一个小应用打包、运行起来，掌握最常用的镜像与容器命令。
category: devops
subcategory: container
tags: ['Docker', '容器', 'DevOps']
pubDate: 2026-07-08
order: 1
---

## 容器是什么

容器是一种轻量级的虚拟化技术，它把应用及其依赖打包在一起，保证"在我电脑上能跑，在你电脑上也能跑"。相比虚拟机，容器共享宿主机内核，启动更快、占用更少。

## 第一个 Dockerfile

以 Node.js 应用为例：

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "app.js"]
```

## 构建与运行

```bash
# 构建镜像
docker build -t my-app .

# 运行容器
docker run -p 3000:3000 my-app
```

## 常用命令

```bash
docker ps            # 查看运行中的容器
docker images        # 查看本地镜像
docker logs <id>     # 查看容器日志
docker stop <id>     # 停止容器
```

## 小结

你已经用 Docker 把应用打包成镜像并运行。继续可以学习 `docker-compose` 编排多容器，以及镜像推送到仓库。
