---
title: Prometheus + Grafana：把服务指标画成实时曲线
description: 理解 Prometheus 的拉取模型与 PromQL，用 Node Exporter 采集主机指标，再在 Grafana 上画出 CPU、内存、请求的实时仪表盘。
category: devops
subcategory: monitoring
tags: ['Prometheus', 'Grafana', '监控', '指标']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 2
---

上篇我们知道了"指标"是可观测性的第一支柱。这一篇落地它：用 **Prometheus** 采集指标，用 **Grafana** 把指标画成好看的实时仪表盘。这是当今最主流的开源监控组合，学会它你就能给任何服务装上"体温计"。

读完这篇，你能理解 Prometheus 是怎么"拉"数据的，能写出最简单的查询语句，并知道 Grafana 仪表盘长什么样。

## Prometheus 的核心思想：主动来"拉"

很多监控系统是"被监控的程序主动把数据推过来"（push 模型）。Prometheus 反其道而行，用的是 **Pull（拉取）模型**：

- 被监控的程序（或 exporter）暴露一个 HTTP 接口，比如 `http://服务:9100/metrics`，上面是一行行文本格式的指标。
- Prometheus 每隔固定时间（默认 15 秒）**主动去访问这个接口，把数据拉回来存起来**。

这种模型的好处：被监控方只要"暴露指标"即可，不用关心 Prometheus 在哪；Prometheus 挂了重启也能继续拉，数据不丢在源头。

一个 `/metrics` 接口长这样（文本格式）：

```
# HELP http_requests_total 总请求数
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 12345
node_cpu_seconds_total{mode="idle"} 982341.2
```

每行是一个指标，花括号里是 **标签（label）**，用来区分维度（比如哪个方法、什么状态码）。

## 关键概念：四种指标类型

Prometheus 里常见的指标类型，记住两种就够入门：

- **Counter（计数器）**：只增不减的数，比如"总请求数""总错误数"。它不会自己减少，通常配合"求速率"来看趋势（如每秒请求数）。
- **Gauge（仪表盘）**：可增可减的瞬时值，比如"当前 CPU 使用率""当前在线人数""内存占用"。
- 另外还有 Histogram（直方图，看耗时分布）和 Summary，进阶再学。

## PromQL：查询指标的语法

Prometheus 自己有一套查询语言 **PromQL**。几个最常用、最好懂的：

```promql
# 查询名为 http_requests_total 的所有序列
http_requests_total

# 加筛选条件（label 过滤）
http_requests_total{status="500"}

# 求每秒请求速率（最近 1 分钟的平均增速）
rate(http_requests_total[1m])

# 多个序列求和
sum(rate(http_requests_total[1m]))

# 按状态码分组求和
sum by (status) (rate(http_requests_total[1m]))
```

- `rate(指标[1m])` 是最常用的：把 Counter 转成"每分钟/每秒增长多少"，也就是我们最关心的"QPS"。
- `sum by (xxx)` 是按某个标签聚合，避免图上几百条线。

## 实战：监控一台服务器的 CPU/内存

假设你想监控某台 Linux 主机的资源。步骤：

1. 在被监控机上跑 **Node Exporter**（官方提供的主机指标采集器），它监听 `9100` 端口，暴露 `/metrics`。
2. 配置 Prometheus 去拉它。Prometheus 的配置文件 `prometheus.yml` 关键部分：

```yaml
scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['192.168.1.10:9100']
```

意思是：定义一个叫 `node` 的采集任务，目标地址是那台机器的 `9100` 端口，Prometheus 会周期性去拉。

3. 启动 Prometheus，打开它的 Web 界面（默认 `9090` 端口），在查询框输入：

```promql
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)
```

这条稍微复杂：它用"100% 减去空闲 CPU 占比"，得到**实际 CPU 使用率**。你能看到一条随时间波动的曲线——这就是指标的价值。

## Grafana：把数字变成仪表盘

Prometheus 自带的界面偏"原始"，真正好看的仪表盘靠 **Grafana**。它是专门做可视化展示的工具，能连多种数据源（Prometheus 是其中之一）。

典型流程：

1. 启动 Grafana（默认 `3000` 端口），登录后添加 **Data Source**，选 Prometheus，填它的地址。
2. 新建 **Dashboard**，加一个 **Panel（面板）**，写 PromQL 查询，比如 `rate(http_requests_total[1m])`，选择折线图。
3. 保存。以后打开这个 Dashboard，就能实时看到请求速率、错误率、CPU、内存等曲线，还能设时间范围（最近 1 小时/24 小时）。

社区里有大量现成的 Dashboard 模板（比如 Node Exporter 官方面板），导入即可用，不用从零画。这是 Grafana 生态最香的地方。

## 常见坑位提醒

- **拉取地址不通**：Prometheus 报 `target down`，先确认 exporter 在跑、防火墙放行了端口、地址没写错（是 `ip:port`，不是 `http://...` 也行但别带路径）。
- **Counter 直接画绝对值**：Counter 一直涨，画出来是斜线没意义。一定要用 `rate()` 转成速率。
- **查询时间范围太短**：`rate(指标[1m])` 里的 `[1m]` 要小于你选的看板时间窗，否则图是空的。一般 `[1m]`~`[5m]` 配 24 小时窗口没问题。
- **标签基数爆炸**：给指标加了一个"每请求都不同"的标签（比如 user_id），会产生海量时间序列，把 Prometheus 内存撑爆。标签只放"有限取值"的维度（状态码、方法）。
- **Grafana 连不上 Prometheus**：检查 Data Source 地址和端口，以及两者网络是否互通（容器部署时尤其注意）。

## 小测验：看看你掌握了没

- 问题一：Pull 模型和 Push 模型区别？答案：Pull 是 Prometheus 主动去目标拉 `/metrics`，Push 是被监控方主动推数据。
- 问题二：为什么 Counter 要配合 `rate()`？答案：Counter 只增不减，直接看是斜线；`rate()` 算出单位时间增量，才有"QPS"意义。
- 问题三：标签能不能用 user_id 这种无限取值？答案：不能，会导致时间序列爆炸、内存耗尽，标签只放有限取值维度。

## 这一篇你该记住的

- Prometheus 用 **Pull 模型**：周期性去目标的 `/metrics` 接口拉数据。
- 指标类型重点记 **Counter（只增，配 rate 看速率）** 和 **Gauge（瞬时值）**。
- PromQL 入门：`指标{label=值}` 过滤，`rate(指标[1m])` 求速率，`sum by (标签)` 聚合。
- Node Exporter 采主机指标，Grafana 连 Prometheus 画 Dashboard，社区模板可导入复用。
- 坑：Counter 要 rate、标签别用无限取值、拉取地址与端口要通。

指标能告诉你"出问题了"，但出了具体问题还得靠日志和告警。下一篇我们讲日志采集与告警体系，把"看见问题"升级成"问题主动找你"。
