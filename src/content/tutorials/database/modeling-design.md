---
title: 实战建模：从电商需求到表结构
description: 以电商下单为案例，把"用户-商品-订单"需求拆成规范化表，演示主键/外键/关系映射，并讨论冗余与索引字段的设计权衡。
category: database
subcategory: modeling
tags: ['数据建模', '表设计', '外键', '电商数据库']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 2
---

上篇我们学了范式和 ER 图。这一篇动手：拿一个真实场景——**电商下单**，从需求一路推导到具体的建表 SQL，把抽象的方法论用起来。

读完这篇，你能把"一句话需求"拆成一套彼此关联、符合范式、好查好扩的表结构。

## 第一步：梳理需求与实体

需求："用户能浏览商品、把商品加入购物车、下单支付。一个订单可以包含多个商品，每个商品有名称、价格、库存。"

从中抽出**实体（名词）**：用户（User）、商品（Product）、订单（Order）、订单项（OrderItem，即订单里的商品明细）、购物车（Cart，可选）。

抽出**关系**：

- 用户 1 : N 订单（一个用户多个订单）。
- 订单 N : M 商品（一个订单多商品，一个商品在多订单）——需要中间表。
- 商品 1 : N 订单项（每个订单项对应一个商品）。

## 第二步：设计表结构（SQL）

我们用 MySQL 语法，体现主键、外键、类型选择：

```sql
-- 用户表
CREATE TABLE users (
  id        BIGINT PRIMARY KEY AUTO_INCREMENT,
  username  VARCHAR(50) NOT NULL UNIQUE,
  email     VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 商品表
CREATE TABLE products (
  id      BIGINT PRIMARY KEY AUTO_INCREMENT,
  name    VARCHAR(100) NOT NULL,
  price   DECIMAL(10,2) NOT NULL,
  stock   INT NOT NULL DEFAULT 0
);

-- 订单表（归属哪个用户、总金额、状态）
CREATE TABLE orders (
  id        BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id   BIGINT NOT NULL,
  total     DECIMAL(10,2) NOT NULL,
  status    VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 订单项表（中间表，拆 N:M）
CREATE TABLE order_items (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id   BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity   INT NOT NULL,
  price      DECIMAL(10,2) NOT NULL,   -- 冗余快照：下单时的价格
  FOREIGN KEY (order_id)   REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

注意几个设计点：

- **主键用无业务含义的 `id`**（上篇强调过），`username` 加 `UNIQUE` 保证不重。
- **外键（FOREIGN KEY）**显式声明关系，数据库帮你保证"不能插入不存在的 user_id"，避免脏数据。也方便级联删除。
- **`order_items.price` 是冗余快照**：下单时商品价，避免订单历史因商品改价而错乱——这正是上篇说的"有意反范式"。

## 第三步：关系如何映射

关系型用**外键**表达关系，三种基数对应不同建法：

- **1 : N**（用户:订单）：在"多"的一方（orders）加 `user_id` 外键指向"一"方。
- **1 : 1**：两表共享主键，或一方加唯一外键（少见，多用于把大字段拆表）。
- **M : N**（订单:商品）：**必须建中间表**（order_items），它带自己的属性（quantity、price），转成两个 1:N。

## 第四步：字段类型的选择

类型选错既浪费空间又埋坑：

- **金额用 `DECIMAL` 不用 `FLOAT`**：浮点有精度误差，0.1+0.2 不等于 0.3，钱必须精确。`DECIMAL(10,2)` 表示总长 10、小数 2 位。
- **ID 用 `BIGINT`**：`INT` 上限约 21 亿，大业务会超；用 BIGINT 留余量。
- **状态/枚举用 `VARCHAR` 或 `TINYINT`**：少量固定值时，VARCHAR 可读性好，TINYINT 省空间，看团队约定。
- **时间用 `DATETIME`/`TIMESTAMP`**：记录创建、更新时间几乎是标配。
- **别用 `TEXT` 当普通字段**：TEXT 难索引、查询慢，只用于真正长文本（备注、内容）。

## 第五步：哪些字段要建索引

结合调优篇：外键列（user_id、product_id、order_id）必建索引，否则 JOIN 和按用户查订单都全表扫。高频过滤列（status、created_at）也考虑建。

## 常见坑位提醒

- **M:N 不拆中间表**：硬在订单里用数组/逗号存商品 ID，违背 1NF，查"买过某商品的用户"几乎不可能高效。
- **金额用 FLOAT/DOUBLE**：精度误差导致对账差一分钱，财务找上门。务必 DECIMAL。
- **过度依赖外键约束**：外键保证一致性但有写入开销，且分库分表后外键难跨库。很多大厂在应用层保证一致性、不建物理外键。小项目用外键更省心。
- **字段类型贪大**：全用 VARCHAR(255) 甚至 TEXT，浪费且不利索引。按需选长度。
- **忘了 created_at/updated_at**：没有时间字段，后期排查、审计、按时间统计都抓瞎。建议每张表都带。
- **NULL 滥用**：该 NOT NULL 的字段不设，查询时 `NULL` 比较容易出 bug（`NULL != 'x'` 结果是未知）。明确必填的字段加 NOT NULL。

## 继续补全：购物车、库存与地址

电商不止"用户-商品-订单"，还有几个关键实体，设计上有讲究：

- **购物车（cart）**：可放用户表（未登录用 `session_id` 关联），结构类似 `user_id, product_id, quantity, selected`。注意购物车是"临时态"，可放 Redis（过期清理）或独立表。
- **库存（stock）**：商品表里的 `stock` 字段要支持**并发扣减**。直接用 `UPDATE products SET stock=stock-1 WHERE id=? AND stock>0`，靠数据库原子操作避免超卖，再用 `affected_rows` 判断扣减是否成功。
- **地址（address）**：用户可有多个收货地址，单独建 `user_address` 表（`user_id, receiver, phone, detail, is_default`），不应塞进用户表（1:N 关系）。

这些实体一起，才构成完整的电商数据模型。

## 库存并发：超卖是怎么发生的

经典 bug：两个请求同时读到 `stock=1`，都判断"够"，都执行 `stock-1`，结果 `stock=-1`，超卖。正确做法**永远在数据库层做原子扣减**：

```sql
-- 条件更新，stock>0 才减，且一步完成"判断+扣减"
UPDATE products SET stock = stock - 1 WHERE id = 100 AND stock > 0;
-- 若影响行数=0，说明已无库存，回滚下单
```

绝不要用"先 `SELECT stock` 再 `UPDATE`"的应用层判断，那在并发下必然超卖。高并发大促还要配合 Redis 预扣库存 + 异步落库，进一步扛压。

## 索引设计：把"怎么查"翻译成索引

建表后，索引要跟着"查询模式"走。以上面电商为例：

- `orders.user_id`：用户查"我的订单"高频，必建。
- `orders(status, created_at)`：后台按状态+时间筛选订单，复合索引。
- `order_items.product_id`：查"某商品被买了多少次"，必建。
- `products(name)` 前缀索引：商品搜索按名称，长文本用前缀索引省空间。
- 避免给 `status` 单独建索引（低区分度），放进复合索引当辅助列。

索引设计是"建模的延续"——表结构定了，怎么查得快还得靠索引兜底。

## 分库分表对建模的反作用

前面调优篇说过分库分表。它反过来影响建模：**分片后跨片 JOIN 极难**，所以分布式下的表设计要更"自治"——能在一个分片内查完的，就别跨分片关联。常见手段：

- 把"常一起查的数据"用**相同分片键**放到同一分片（如订单和订单项都用 `user_id` 分片，查某用户订单不必跨片）。
- 用"冗余+最终一致"替代跨片事务。
- 全局唯一 ID 用雪花算法（Snowflake）等，避免分片间主键冲突。

所以建模不是孤立的"画 ER 图"，要提前想清楚"数据会多大、怎么分布"。

## 状态机与枚举的设计

订单、支付这类业务有"状态流转"（待支付→已支付→已发货→已完成/已退款），建模时：

- **状态用枚举而非自由字符串**：用 `VARCHAR` 或 `TINYINT` 存有限状态值（如 `pending/paid/shipped/done/refunded`），并在应用层用状态机约束"哪些跳转合法"（如不能直接 `paid→done` 跳过发货）。
- **关键流转留痕**：重要状态变更要记流水表（谁、何时、从什么到什么），方便对账和纠纷处理，也满足审计。
- **别用布尔硬凑多状态**：用 `is_paid`、`is_shipped` 多个布尔看似灵活，实则会出现"既已支付又未支付"的矛盾态，不如单一状态字段清晰。

状态机思维能让"业务流程"在数据库里看得见、管得住。

## 历史订单与归档

订单表会随时间无限增长（千万→亿级），全堆在主表会拖慢查询和备份。做法：

- **冷热分离**：超过一定期限（如 1 年）的已完成订单，迁移到 `orders_history` 归档表或独立库，主表只留近期热数据，查询和备份都轻。
- **归档表同样建索引**：归档不是扔进冷宫，审计/统计仍要查，索引和约束不能省。
- **配合分表**：超大规模的，按时间或 user_id 分表（呼应调优篇的分库分表）。

建模时就要想"数据会一直涨"，提前规划归档与分片，比表涨爆了再救火从容得多。

## 小测验：看看你掌握了没

- 问题一：订单和商品 M:N 怎么落地？答案：建中间表 order_items，带 quantity/price 等属性，转成两个 1:N。
- 问题二：为什么金额用 DECIMAL？答案：FLOAT/DOUBLE 有二进制精度误差，钱必须精确，DECIMAL(10,2) 可控。
- 问题三：order_items 为什么冗余 price？答案：快照下单时价格，避免商品改价后历史订单金额错乱（有意反范式）。

## 这一篇你该记住的

- 建模流程：抽实体 → 定关系（1:N / M:N）→ 建表（主键/外键/类型）→ 建索引。
- 关系映射：1:N 多在"多"方加外键；M:N 必建中间表带属性。
- 类型要点：金额 DECIMAL、ID 用 BIGINT、长文本才用 TEXT、时间必带。
- 有意冗余：订单项快照价格，保历史一致；外键小项目用、大项目可应用层保一致。
- 坑：M:N 不拆表、金额用浮点、类型贪大、NULL 滥用、缺时间字段。

关系型建模讲究"范式与约束"，但 NoSQL 的建模思路恰恰相反——下一篇我们对比**文档型/图数据的建模差异**，理解不同数据库的建模哲学。
