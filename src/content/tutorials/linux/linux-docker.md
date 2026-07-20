---
title: Linux 容器化服务：容器概念与 Docker 实战
description: 容器让"在我机器上能跑"成为历史。这篇讲清容器是什么、与虚拟机的区别，以及 docker 的安装、常用命令和基于 docker 构建网络服务。
category: linux
subcategory: linux
tags: ['Linux', 'Docker', '容器', '镜像']
pubDate: 2026-07-18
updatedDate: 2026-07-18
order: 9
---

"在我电脑上明明能跑！"——这句话害惨了多少部署。容器（Docker）的出现就是为了解决这个问题：把应用和它依赖的环境一起打包，到哪都能原样运行。

上一篇我们讲了怎么在 Linux 上"裸装"服务和配防火墙。但裸装有个麻烦：环境配置散落各处，换台机器又要重来一遍。容器则把"应用 + 环境"打包成一个标准化盒子，部署时只需"搬盒子"。这一篇就在 Linux 上把 Docker 真正跑起来，并用它搭一个网络服务。

## 容器的概念

容器和虚拟机都做"隔离"，但层级不同：

| 对比 | 虚拟机（VM） | 容器（Container） |
| --- | --- | --- |
| 隔离什么 | 虚拟整套硬件+系统 | 只隔离应用进程 |
| 启动 | 慢（分钟级） | 快（秒级） |
| 体积 | GB 级 | MB 级 |
| 共享 | 各跑各的完整系统 | 共享宿主机内核 |

打个比方：VM 是在房子里再盖一栋独立房子；容器是在同一个大通间里用隔板隔出小房间。容器更轻、更快、更省资源，特别适合"把服务打包分发"。

## 在 Linux 上安装 Docker

### CentOS / Rocky 系

```bash
sudo dnf remove docker*        # 先卸掉可能冲突的旧版本
sudo dnf install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker
```

### Ubuntu 系

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
```

### 验证安装

```bash
sudo docker version        # 看客户端和服务端版本
sudo docker run hello-world  # 跑官方测试镜像，能出欢迎语就成功
```

> 每次 `docker` 都要 `sudo` 很烦？把当前用户加进 docker 组：`sudo usermod -aG docker $USER`，注销重登即可免 sudo。（注意：docker 组用户等同 root 权限，生产环境谨慎。）

## Docker 常用命令

容器生命周期：镜像（模板）→ `docker run`（创建并启动容器）→ 运行中 → `stop`/`start` → `rm` 删除。

```bash
docker images                 # 列出本地镜像
docker pull nginx             # 从仓库拉取 nginx 镜像
docker run -d -p 80:80 --name web nginx   # 后台跑 nginx，映射 80 端口
docker ps                     # 看运行中的容器
docker ps -a                  # 看所有容器（含已停）
docker logs web               # 看容器日志
docker exec -it web bash      # 进容器里开个 shell
docker stop web               # 停止
docker start web              # 启动
docker rm web                 # 删除已停的容器
docker rmi nginx             # 删除镜像
```

`-d` 后台运行，`-p 80:80` 把宿主机 80 映射到容器 80，`--name web` 起名。跑起来后浏览器访问服务器 IP，就能看到 nginx 默认页——一个 Web 服务就这样用容器跑起来了，比裸装 Apache 简单太多。

## 用 Docker 搭一个网络服务（实战）

我们来跑一个真正的"网站 + 数据库"组合。用 `docker run` 起两个容器：

```bash
# 1. 起一个 MySQL 容器
docker run -d --name mysql \
  -e MYSQL_ROOT_PASSWORD=123456 \
  -p 3306:3306 \
  mysql:8

# 2. 起一个 nginx 容器当 Web 服务
docker run -d --name web -p 80:80 nginx
```

`-e` 是给容器传环境变量（MySQL 用它设 root 密码）。两个容器各自独立运行，互不干扰。

### 用 docker-compose 管理多容器（推荐）

一条条 `docker run` 参数太多、不好记。更规范的做法是用 `docker-compose.yml` 描述所有服务，一条命令全起来：

```yaml
version: '3'
services:
  web:
    image: nginx
    ports:
      - "80:80"
  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: "123456"
    ports:
      - "3306:3306"
```

```bash
docker compose up -d     # 按文件启动所有服务
docker compose down      # 全部停止并删除
```

这就是"用一份配置描述整个应用栈"的威力，比手动敲 `docker run` 清晰、可版本化管理。

## 容器网络与数据持久化（重点）

两个容易踩的坑：

1. **容器间怎么通信**：默认同一台宿主机上的容器能通过一个"桥接网络"互通。用 `docker network create mynet` 建个自定义网络，把容器都连上去，就能用"容器名"互相访问（如 web 容器连 `mysql:3306`）。
2. **数据别丢**：容器删了，里面产生的数据（如 MySQL 的库）也没了。要用**数据卷（volume）**把数据存到宿主机：`docker run -v /mydata:/var/lib/mysql mysql`，把容器里的 `/var/lib/mysql` 挂到宿主机的 `/mydata`，这样容器删了数据还在。

```bash
docker volume create mysqldata
docker run -d --name mysql -v mysqldata:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=123456 mysql:8
```

## 容器 vs 直接在 Linux 裸装

| 维度 | 裸装 | Docker |
| --- | --- | --- |
| 部署 | 手动配环境，易出错 | 一条命令起，环境打包好 |
| 隔离 | 进程混在一起 | 每个服务独立容器 |
| 迁移 | 换机器重配 | 镜像搬哪都能跑 |
| 资源 | 直接跑，略省 | 轻微开销，换来极大便利 |

结论：学习阶段裸装能帮你理解 Linux 本身；实际部署服务，容器是更现代、更高效的选择。

## 常见新手坑

- **权限不足**：`permission denied` 多半没加 `sudo` 或没加 docker 组。
- **端口冲突**：`docker run -p 80:80` 报"端口已被占用"，说明宿主机 80 已被别的程序（如裸装 nginx）占了，停掉或换端口。
- **容器删了数据没了**：没挂 volume，记得用 `-v` 持久化重要数据。
- **容器间连不上**：没在同一自定义网络，建 `docker network` 并连上。

## 这一篇你该记住的

- 容器比虚拟机更轻更快，共享宿主机内核，适合打包分发服务。
- 安装：CentOS 用 `dnf` 加 Docker 源，Ubuntu 加 GPG 源后 `apt install docker-ce`；`systemctl start/enable docker` 启动。
- 常用：`docker run -d -p 宿:容 --name xxx 镜像`、`docker ps/logs/exec/stop/rm`。
- 多容器用 `docker-compose.yml` 描述，`docker compose up -d` 一键起。
- 重点：容器间通信用自定义网络；重要数据用 `-v` 卷持久化，否则容器删了数据丢。

到此，Linux 这条线（环境→命令→权限→网络→装软件→进程→服务→防火墙→容器）已经完整打通，你已具备独立运维一台 Linux 服务器的基础能力。
