---
title: Kubernetes 核心概念：Pod、Deployment、Service 到底管什么
description: 用"餐厅"比喻讲清 Kubernetes 最核心的四个对象——Pod、Deployment、Service、Namespace，理解声明式编排到底在帮你维持什么状态。
category: devops
subcategory: cloudnative
tags: ['Kubernetes', 'K8s', '容器编排', '云原生']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 2
---

上篇我们建立了云原生的世界观，提到 **Kubernetes（常缩写为 K8s）** 是云原生的"发动机"。这一篇我们钻进 K8s，把最常被提到的几个核心概念——**Pod、Deployment、Service、Namespace**——讲清楚。它们不是孤立的名词，而是一套"分层管理"的体系。

读完这篇，你不用会敲命令，但要能回答："K8s 到底在帮我管什么？"

## 先建立整体印象：K8s 是个"集群管家"

假设你有 10 台机器（节点），上面要跑几十个容器化应用。你自己管会疯：哪个容器放哪台机器？挂了谁重启？流量怎么分发？

**K8s 就是干这个的"管家"**：你告诉它"我要什么"，它负责调度到合适的机器、保持运行、处理故障。你用一份 **YAML 清单**描述期望状态，K8s 的"控制器"不断对比"实际状态"和"期望状态"，不一致就自动修正——这正是上篇说的**声明式 + 自愈**。

## 第一层：Pod——K8s 最小调度单位

**Pod** 是 K8s 里最小、最基本的运行单元。一个 Pod 里可以跑**一个或多个容器**，它们共享网络和数据卷，像"住在同一间宿舍的室友"，亲密协作。

为什么不直接调度容器，而要包一层 Pod？因为有些容器必须"绑在一起"：比如"主应用"和"负责收集它日志的sidecar容器"，它们要共享网络和存储，必须一起调度到同一台机器。Pod 就是这个"必须在一起的容器组"。

一个 Pod 的 YAML 长这样（节选）：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: app
      image: my-app:1.0
      ports:
        - containerPort: 3000
```

`kind: Pod` 表示这是个 Pod 对象，`spec.containers` 里列出要跑的容器和用的镜像。但实际中你**很少直接创建 Pod**，而是交给下一层的 Deployment。

## 第二层：Deployment——管理 Pod 的"副本与更新"

直接管 Pod 太原始：Pod 挂了不会自动重建，想扩 3 个副本得手动建 3 个。于是有了 **Deployment**，它专门管理 Pod 的"生命周期"：

- **维持副本数**：你说"要 3 个 Pod"，K8s 保证随时有 3 个在跑；任何一个挂了，它立刻补一个新的（自愈）。
- **滚动更新**：你改镜像版本，Deployment 会"先起新 Pod、再下旧 Pod"，逐步替换，做到**零停机发布**；出问题一键回滚。
- **扩缩容**：一条命令把副本从 3 改到 10，K8s 自动调度新增的 Pod。

Deployment 的 YAML 核心：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:1.0
          ports:
            - containerPort: 3000
```

`replicas: 3` 就是"我要 3 个副本"。`template` 里是"每个 Pod 长什么样"（也就是上一段的 Pod 定义）。注意 `labels` 和 `selector` 要对应，Deployment 靠标签找到它该管的 Pod。

## 第三层：Service——给 Pod 一个稳定的"门牌号"

Pod 是会变的：扩缩容、重启、漂移到不同机器，它的 IP 一直在变。其他服务想访问它，总不能硬编码一个随时变的 IP 吧？

**Service** 就是来解决这个问题的：它给一组 Pod 一个**稳定的虚拟 IP 和域名**，并自动做**负载均衡**——把请求分发给后端的多个 Pod。Pod 怎么变，Service 的地址不变，调用方只认 Service。

打个比方：Pod 是"流动的外卖骑手"，Service 是"固定的餐厅总机电话"，顾客（其他服务）永远打总机，总机自动转给当前在班的骑手。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-svc
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 3000
```

`selector` 选中的是带 `app: my-app` 标签的 Pod，`port: 80` 是 Service 对外端口，`targetPort: 3000` 是 Pod 实际监听的端口。外部访问 Service 的 80，流量被转到 Pod 的 3000。

## 第四层：Namespace——逻辑上的"分区"

当集群里项目多了，容易名字冲突、权限混乱。**Namespace** 提供一层逻辑隔离，像"把集群切成多个命名空间"。比如 `dev`、`test`、`prod` 三个 Namespace，互不影响。

多数情况下你用默认的 `default` 就够了，但理解它有助于看懂 `kubectl -n 名字` 这种命令（指定在某个命名空间操作）。

## 四者关系一张图

```
Namespace（分区）
  └─ Deployment（管副本/更新）
       └─ Pod × N（最小运行单元，含容器）
            ↑ 被访问
  └─ Service（稳定地址 + 负载均衡 → 指向 Pod 组）
```

记忆顺序：**Deployment 生 Pod，Service 找 Pod，Namespace 装这一切**。你日常 80% 的操作都围绕这四个对象。

## 常见认知误区

- **"Pod 是常驻不变的"**：错，Pod 是易逝的，IP 会变、会重启；稳定访问靠 Service。
- **"直接创建 Pod 就行"**：生产几乎都用 Deployment 管理 Pod，享受自愈和滚动更新。
- **"Service 是负载均衡器本身"**：Service 提供集群内稳定寻址和负载均衡，但对外暴露通常还要 Ingress（入口网关），别混。
- **"副本数越多越好"**：副本多能抗量，但也吃资源；按实际负载和 HPA（自动扩缩）来定，而非拍脑袋。

## 小测验：看看你掌握了没

- 问题一：为什么需要 Pod 这一层？答案：有些容器必须共享网络/存储一起调度，Pod 是"必须同住的容器组"，是最小调度单元。
- 问题二：Deployment 解决了什么？答案：维持副本数（自愈）、滚动更新零停机、一键回滚、扩缩容。
- 问题三：Service 存在的意义？答案：给易变的 Pod 提供稳定地址和负载均衡，调用方只认 Service。

## 这一篇你该记住的

- K8s 是"集群管家"：你声明期望状态，控制器自动维持（声明式 + 自愈）。
- **Pod** 最小运行单元（容器组，IP 易变）；**Deployment** 管 Pod 副本/更新/自愈/回滚。
- **Service** 给 Pod 组稳定地址 + 负载均衡，解决 Pod IP 漂移；**Namespace** 做逻辑分区。
- 关系：Deployment 生 Pod，Service 找 Pod，Namespace 装一切。
- 别直接裸建 Pod，稳定访问靠 Service，副本数按负载定。

概念清楚了，下一篇我们动手写 YAML，真正把一个应用部署到 K8s 上跑起来，串起 Deployment + Service 的完整流程。
