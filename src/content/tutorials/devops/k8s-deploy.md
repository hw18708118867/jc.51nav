---
title: Kubernetes 部署实战：把一个应用跑上集群
description: 动手写一个完整的 Deployment + Service YAML，用 kubectl 把应用部署到 K8s，理解滚动更新、扩缩容、查看状态与排错的基本命令。
category: devops
subcategory: cloudnative
tags: ['Kubernetes', 'kubectl', '部署', '云原生', 'YAML']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 3
---

上篇我们讲清了 Pod、Deployment、Service 的概念。这一篇动手：写一个完整的 YAML，用 **kubectl**（K8s 的命令行工具）把一个应用真正部署到集群里，并学会滚动更新、扩缩容和排错。

读完这篇，你能跑通"写清单 → 部署 → 访问 → 更新 → 排错"的完整闭环。

## 准备工作

开始前你需要两样东西：

1. **一个 K8s 集群**：本地可以用 `minikube` 或 `Docker Desktop` 自带的 K8s 一键起一个单节点集群；生产用云厂商的托管 K8s（如 ACK、EKS、GKE）。
2. **kubectl 命令行**：装好后执行 `kubectl version --client` 能看到版本，说明就绪。再 `kubectl get nodes` 能看到集群节点，说明连上了集群。

我们假设已经有一个镜像 `my-app:1.0` 推到了镜像仓库（可以是 Docker Hub 或私有仓库）。

## 第一步：写一个完整的部署清单

把 Deployment 和 Service 写进同一个 `app.yaml` 文件（用 `---` 分隔两个对象）：

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
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
---
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
  type: ClusterIP
```

比上篇多了两点值得注意：

- `resources.requests/limits`：给容器设**资源请求和上限**。requests 是调度时承诺的最小资源，limits 是最高能用的上限。不设的话，一个贪婪的容器可能吃光节点资源，拖垮邻居。
- `type: ClusterIP`：Service 默认只在**集群内部**可访问。想让外部互联网访问，要用 `NodePort`（随机开个节点端口）或 `LoadBalancer`（云厂商给个外部 IP），进阶再学。

## 第二步：部署并查看状态

执行：

```bash
kubectl apply -f app.yaml
```

`apply` 是 K8s 的"声明式提交"：它对比清单和现状，该创建创建、该更新更新。输出会显示 `deployment.apps/my-app created` 和 `service/my-app-svc created`。

然后看状态：

```bash
kubectl get pods
kubectl get deployment
kubectl get service
```

`kubectl get pods` 会列出 3 个 Pod，状态从 `ContainerCreating` 变成 `Running` 就说明跑起来了。`kubectl get svc` 能看到 `my-app-svc` 和它的集群内 IP。

## 第三步：访问与验证

集群内部可以直接用 Service 的 IP 或名字访问。本地测试可以这样把服务"端口转发"到本机：

```bash
kubectl port-forward svc/my-app-svc 8080:80
```

然后浏览器开 `http://localhost:8080`，就能访问到 Pod 里的应用了。`port-forward` 是调试利器，把集群内服务临时映射到本地。

## 第四步：滚动更新（零停机发布）

你改了代码，打了新镜像 `my-app:2.0`，要上线。改 `app.yaml` 里的 `image: my-app:2.0`，再：

```bash
kubectl apply -f app.yaml
```

K8s 会执行**滚动更新**：先起一个新版本 Pod，就绪后停掉一个旧的，再起下一个……直到全部换成 2.0。期间始终有 Pod 在对外服务，**用户无感知**。用 `kubectl rollout status deployment/my-app` 能看到进度。

如果新版本有问题，一键回滚：

```bash
kubectl rollout undo deployment/my-app
```

瞬间回到上一个稳定版本。这就是"声明式 + 不可变基础设施"带来的安全感。

## 第五步：扩缩容

流量涨了，3 个副本不够，扩到 10 个：

```bash
kubectl scale deployment/my-app --replicas=10
```

K8s 立刻调度起 7 个新 Pod。流量低谷再缩回 3 个。更进一步，可以配 **HPA（Horizontal Pod Autoscaler）**，让它根据 CPU 使用率**自动**扩缩，你完全不用管。

## 排错：Pod 起不来的时候看什么

部署最常遇到 Pod 一直 `Pending` 或 `CrashLoopBackOff`。排查顺序：

```bash
kubectl describe pod <pod名>     # 看事件(Event)，常能发现"镜像拉取失败""资源不足"
kubectl logs <pod名>             # 看容器日志，定位应用报错
kubectl get events               # 看集群级事件，调度失败等信息
```

典型原因：

- **ImagePullBackOff**：镜像名写错、或私有仓库没配拉取密钥。
- **Pending 一直不跑**：节点资源不够（requests 太大），或节点有污点（taint）不接受调度。
- **CrashLoopBackOff**：容器启动后立刻退出，看 `logs` 找应用报错（比如配置缺失）。

## 常见坑位提醒

- **镜像没指定标签或用 `latest`**：`image: my-app` 默认拉 `latest`，不可控且不利于回滚。务必用明确版本号。
- **忘了配 resources**：不限资源，一个容器可能拖垮整节点；设 requests/limits 是生产常识。
- **Service 的 selector 和 Pod 标签对不上**：Service 找不到后端 Pod，访问一直不通。标签是 Service 和 Pod 的"接头暗号"，必须一致。
- **想从外部直接访问 ClusterIP**：ClusterIP 只在集群内有效，外部访问要用 NodePort/LoadBalancer 或 Ingress。
- **改了 YAML 却忘了 apply**：你本地改了文件，但没 `kubectl apply`，集群还是旧状态。改完务必提交。

## 小测验：看看你掌握了没

- 问题一：`kubectl apply` 和 `kubectl create` 区别？答案：apply 是声明式、可重复执行（存在则更新），create 只创建、已存在会报错。
- 问题二：滚动更新期间服务会中断吗？答案：不会，K8s 先起新 Pod 再下旧 Pod，始终有实例在跑。
- 问题三：Pod 一直 Pending 可能什么原因？答案：节点资源不足、调度约束（污点/亲和）不满足、或镜像拉不下来。

## 这一篇你该记住的

- 部署闭环：`kubectl apply -f app.yaml` 提交 Deployment+Service，`get` 看状态，`port-forward` 调试。
- 务必给容器设 `resources.requests/limits`，镜像用明确版本号而非 `latest`。
- 滚动更新零停机：`apply` 新镜像即可；`rollout undo` 一键回滚。
- 扩缩容：`kubectl scale` 手动，或配 HPA 自动按负载伸缩。
- 排错三板斧：`describe`（看事件）、`logs`（看应用）、`get events`（看调度）；Service 的 selector 必须匹配 Pod 标签。

至此，DevOps 三件套——**CI/CD（自动发布）、监控（看清健康）、云原生（弹性运行）**——你都建立了从认知到实战的骨架。它们彼此咬合：CI/CD 把代码送上 K8s，监控盯着 K8s 里的服务，云原生让这一切弹性自愈。继续深入任一方向，你都会发现它们早已连成一张网。
