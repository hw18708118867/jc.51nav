---
title: 子查询与多表关联：让多张表"对话"
description: 真实业务的数据从不在一张表里。这篇讲清子查询的三种用法，以及 INNER/LEFT/RIGHT JOIN 怎么把多张表拼起来，并配一张 JOIN 原理图帮你建立空间感。
category: database
subcategory: relational
tags: ['SQL', '子查询', 'JOIN', '多表关联']
pubDate: 2026-07-14
order: 3
---

上一篇我们所有操作都在一张 `users` 表里。但真实业务的数据，从来不会挤在一张表里。比如一个电商系统：用户在一张表、商品在一张表、订单又是一张表。你想查"小明买了哪些商品"，单看任何一张表都答不上来——必须让多张表"对话"。

这一篇就解决"多表协作"的两大武器：**子查询**（把一个查询塞进另一个查询里）和 **JOIN**（把多张表横向拼成一张大表再查）。最后配一张 JOIN 原理图，帮你把"左连接、内连接"这种抽象概念变成画面。

我们先准备两张有关联的表来练手。

```sql
-- 用户表
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL
);

-- 订单表：user_id 指向 users.id，这就是"关系"
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  product VARCHAR(50),
  amount DECIMAL(10,2),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

`orders.user_id` 是**外键**，它指向 `users.id`，意思是"这笔订单属于哪个用户"。正是这个外键，把两张表连了起来。

## 子查询：查询里套查询

子查询就是"把一个 `SELECT` 的结果，当作另一个查询的条件或数据源"。最常见三种用法。

### 1. 用在 WHERE 里当条件

想知道"消费金额大于平均值的订单"：

```sql
SELECT * FROM orders
WHERE amount > (SELECT AVG(amount) FROM orders);
```

括号里的 `(SELECT AVG(amount) FROM orders)` 先算出一个平均值，外层再拿它当比较条件。这就是"先查一个数，再用它过滤"。

### 2. 用在 IN 里筛一批

想查"下过单的用户信息"——先查出"有哪些 user_id 出现在 orders 里"，再去 users 里找这些人：

```sql
SELECT * FROM users
WHERE id IN (SELECT DISTINCT user_id FROM orders);
```

`IN (子查询)` 表示"只要 id 在子查询结果集合里就选中"。比手写一堆 `id = 1 OR id = 2 OR ...` 优雅得多。

### 3. 用在 FROM 里当临时表

子查询的结果可以当一张"临时表"来用：

```sql
SELECT t.user_id, t.total
FROM (
  SELECT user_id, SUM(amount) AS total
  FROM orders
  GROUP BY user_id
) AS t
WHERE t.total > 500;
```

内层先算出"每个用户的消费总额"当作临时表 `t`，外层再从 `t` 里筛出总额大于 500 的。这种"把子查询结果当表"的写法，在复杂统计里极常用。

> 子查询不是越多越好。嵌套太深可读性差、有时性能也不如 JOIN。简单场景能用 JOIN 就优先 JOIN。

## JOIN：把多张表拼起来

`JOIN` 才是多表查询的主角。它做的事情是：**按某个关联字段，把两张表的行"横向拼"成一行**，拼完之后你就能在一个结果里同时看到两表的列。

我们用 `users` 和 `orders` 来演示。假设数据如下：
- users：`(1,小明) (2,小红) (3,小刚)`
- orders：`(101,1,手机,3000) (102,1,耳机,500) (103,2,键盘,200)`

### INNER JOIN：只保留"两边都有"的行

```sql
SELECT users.name, orders.product, orders.amount
FROM users
INNER JOIN orders ON users.id = orders.user_id;
```

`INNER JOIN ... ON 条件` 的意思是：把 users 和 orders 拼起来，只保留"users.id 能匹配到 orders.user_id"的组合。结果：

| name | product | amount |
|------|---------|--------|
| 小明 | 手机 | 3000 |
| 小明 | 耳机 | 500 |
| 小红 | 键盘 | 200 |

注意：小刚（id=3）在 orders 里没有订单，所以 INNER JOIN 的结果里**不会出现小刚**——因为他"另一边没有匹配行"。这就是内连接"只保留交集"的特性。

### LEFT JOIN：左表全保留，右表没匹配就填空

```sql
SELECT users.name, orders.product
FROM users
LEFT JOIN orders ON users.id = orders.user_id;
```

`LEFT JOIN` 保证**左表（users）的每一行都出现**，即使右边没匹配到，右表的列也用 `NULL` 填充。结果会多出一行：

| name | product |
|------|---------|
| 小明 | 手机 |
| 小明 | 耳机 |
| 小红 | 键盘 |
| 小刚 | NULL |

这一行"小刚 / NULL"很关键：它让你一眼看出"小刚从来没下过单"。所以**想查"哪些用户没有订单"，用 LEFT JOIN 再筛 `NULL` 就行**：

```sql
SELECT users.name
FROM users
LEFT JOIN orders ON users.id = orders.user_id
WHERE orders.id IS NULL;   -- 右表没匹配上的
```

### RIGHT JOIN：和 LEFT 反过来

`RIGHT JOIN` 保证**右表全保留**，左表没匹配填空。它和"把 LEFT JOIN 的表顺序调换"效果一样，所以实际用得少——需要右连接时，通常改写成左连接（把表顺序换一下）更直观。了解即可。

### 多表 JOIN

不止两张表能连。比如再加一张 `products` 商品表，可以连三张：

```sql
SELECT u.name, p.name AS product, o.amount
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN products p ON o.product_id = p.id;
```

给表起别名（`o`、`u`、`p`）能让 SQL 更短更清晰。

## 一张图看懂 JOIN

文字描述容易飘，下面这张图把关系画了出来，对照着看更踏实：

![SQL JOIN 原理图：INNER 取交集，LEFT 保留左表全部](/diagrams/sql-joins.svg)

> 记住顺序：先想清楚你要"交集"还是"左表全要"——只要左表全出现（包括没匹配的）就用 `LEFT JOIN`，只要两边都有匹配才出现就用 `INNER JOIN`。这是选 JOIN 类型唯一的判断标准。

## JOIN 与子查询怎么选

- 要"把两表的列并排展示"（比如同时看用户名和订单商品），用 **JOIN**。
- 要"用另一个查询的结果当过滤条件"（比如"消费大于平均的订单"），用 **子查询** 或 `JOIN` + 临时表。
- 经验：大多数"关联展示"场景 JOIN 更直观、性能更好；"存在性判断"（有没有、在不在）用 `IN (子查询)` 或 `EXISTS` 更自然。

## 常见新手坑

- **忘了 ON 条件**：`JOIN` 不写 `ON` 会变成"笛卡尔积"（两表每行两两组合），数据量爆炸。务必写 `ON` 关联字段。
- **分不清 INNER 和 LEFT**：想要"没下单的用户也列出来"却用了 INNER，结果这些人消失了。记住 LEFT 保左表。
- **列名冲突**：两表都有 `id` 时，`SELECT id` 会报错，要写成 `users.id` 明确指定。
- **外键约束导致插不进**：往 orders 插 `user_id=999` 但 users 里没有 999，外键会拒绝。先保证关联的主表数据存在。

## 这一篇你该记住的

- 真实数据分散在多张表，靠"外键"（如 `orders.user_id` 指向 `users.id`）建立关系。
- 子查询：把一条 `SELECT` 的结果嵌进另一条，常用于 `WHERE` 条件、`IN (...)` 筛选、`FROM` 临时表。
- `INNER JOIN` 只保留两表都匹配的行（交集）；`LEFT JOIN` 保留左表全部，右表无匹配填空 `NULL`，适合查"没有XXX的"。
- 选 JOIN 的判断标准：要"左表全要"用 LEFT，要"两边都有"用 INNER。
- `JOIN` 必须写 `ON` 关联条件，否则产生笛卡尔积；两表同名列要用 `表名.列名` 区分。

下一篇我们回到前端这条线，从"HTML 文档到底由哪些零件组成"讲起，把网页的骨架彻底拆明白。
