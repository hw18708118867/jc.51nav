---
title: SQL 增删改查：把数据写进去、查出来
description: DML 负责增删改，DQL 负责查。这篇把 INSERT、UPDATE、DELETE 和 SELECT 的投影、限制、模糊、排序、聚合、分组、HAVING 一次讲透，并说清 SQL 真正的执行顺序。
category: database
subcategory: relational
tags: ['SQL', 'DML', 'DQL', '查询']
pubDate: 2026-07-13
updatedDate: 2026-07-13
order: 2
---

上一篇我们把库和表建好了，但表里还是空的。这一篇就往里"塞数据、改数据、删数据、查数据"——这四件事对应 SQL 里的 **DML（数据操纵语言）** 和 **DQL（数据查询语言）**。

其中 `SELECT`（查）是你以后用得最多的，没有之一。可以说，一个后端工程师 80% 的 SQL 时间都花在写查询上。所以这篇会把 `SELECT` 的各种玩法——投影、过滤、模糊、排序、聚合、分组——一次性讲透，最后还会揭穿一个很多人写错多年的误区：SQL 真正的执行顺序。

我们沿用上一篇建的 `users` 表来练。先往里插几条数据。

## 插入数据：INSERT

```sql
INSERT INTO users (username, email, age, balance)
VALUES ('小明', 'xm@qq.com', 18, 100.00);

INSERT INTO users (username, email, age, balance)
VALUES ('小红', 'xh@qq.com', 20, 250.50),
       ('小刚', 'xg@qq.com', 22, 80.00),
       ('小美', 'xm2@qq.com', 19, 300.00);
```

要点：

- `INSERT INTO 表名 (列1, 列2, ...)` 指定往哪些列插；`VALUES` 后面跟对应的值，顺序要一一对应。
- 一次可以插多行，每行用括号包起来，逗号分隔（上面的第二条就是一次插 3 行）。
- `id`、`created_at` 我们设了自增和默认值，所以不用写，数据库自动填。
- 字符串和日期要用单引号包起来；数字不用。

如果省略列名，就得按表定义的全部列顺序给值，容易错，所以**建议永远显式写列名**。

## 查询数据：SELECT（核心）

最基础的查询，把整张表所有列、所有行都查出来：

```sql
SELECT * FROM users;
```

`*` 是"所有列"的简写。但生产环境里 `*` 不推荐——它可能查出你不需要的大字段、也可能在表结构变动后让你的程序拿到意外列。更规范是写明要哪些列，这叫**投影**：

```sql
SELECT username, age, balance FROM users;
```

这样只返回你指定的三列，干净又高效。

### 加条件：WHERE

只查"想要的行"，用 `WHERE` 过滤：

```sql
-- 查年龄大于等于 20 的用户
SELECT username, age FROM users WHERE age >= 20;

-- 查某个具体用户名
SELECT * FROM users WHERE username = '小红';

-- 多个条件：AND / OR
SELECT * FROM users WHERE age > 18 AND balance > 100;
SELECT * FROM users WHERE username = '小明' OR username = '小红';
```

比较运算符：`=`（等于）、`!=` 或 `<>`（不等于）、`>`、`<`、`>=`、`<=`。字符串比较用单引号。

### 限制数量：LIMIT

数据多时，先只看前几条：

```sql
SELECT * FROM users LIMIT 5;        -- 前 5 条
SELECT * FROM users LIMIT 10 OFFSET 20;  -- 跳过前 20 条，取接下来 10 条（分页用）
```

`LIMIT 10 OFFSET 20` 就是"第 21~30 条"，做分页（每页 10 条、翻到第 3 页）就是这么算的。

### 模糊匹配：LIKE

想"找名字里带'小'字的用户"，用 `LIKE` 加通配符：

```sql
SELECT * FROM users WHERE username LIKE '%小%';   -- 包含"小"
SELECT * FROM users WHERE username LIKE '小%';     -- 以"小"开头
SELECT * FROM users WHERE username LIKE '_明';      -- 任意一个字 + "明"
```

- `%` 代表"任意长度任意字符"（包括零个）。
- `_` 代表"恰好一个任意字符"。

⚠️ `LIKE '%小%'` 这种"两边加 %"的写法，数据库很难用索引加速，数据量大时会很慢。能用更精确的匹配就别滥用。

### 排序：ORDER BY

```sql
SELECT * FROM users ORDER BY age ASC;        -- 按年龄升序（小到大）
SELECT * FROM users ORDER BY balance DESC;   -- 按余额降序（大到小）
SELECT * FROM users ORDER BY age DESC, balance ASC;  -- 先按年龄降序，年龄相同再按余额升序
```

`ASC` 升序（默认，可省略），`DESC` 降序。可以多列排序，逗号分隔，前面的优先级高。

### 去重：DISTINCT

```sql
SELECT DISTINCT age FROM users;   -- 只列出出现过的不同年龄
```

### 聚合函数：算"总体"而不是"一行"

有时候你不关心每一行，只关心"一共多少、平均多少、最大多少"。用聚合函数：

```sql
SELECT COUNT(*) FROM users;            -- 一共多少行
SELECT COUNT(*) FROM users WHERE age >= 20;  -- 成年用户数
SELECT AVG(balance) FROM users;       -- 平均余额
SELECT MAX(age), MIN(age) FROM users; -- 最大/最小年龄
SELECT SUM(balance) FROM users;       -- 余额总和
```

聚合函数把多行"浓缩"成一个值。

### 分组：GROUP BY + HAVING

这是 `SELECT` 里最容易被初学者绕晕、也最强大的部分。**分组**就是"按某个列，把相同的归到一组，再对每组做聚合"。

假设我们再加一张 `orders` 订单表（先建着，后面关联篇细讲），里面有 `user_id` 和 `amount`。想看"每个用户一共花了多少钱"：

```sql
SELECT user_id, SUM(amount) AS total
FROM orders
GROUP BY user_id;
```

意思是：按 `user_id` 分组，每组算一次 `SUM(amount)`。结果会是"用户 1 花了 X、用户 2 花了 Y……"。

`HAVING` 用来"过滤分组后的结果"，和 `WHERE` 的区别是：`WHERE` 在分组**前**过滤行，`HAVING` 在分组**后**过滤组。

```sql
-- 找出"总消费超过 500 的用户"
SELECT user_id, SUM(amount) AS total
FROM orders
GROUP BY user_id
HAVING total > 500;
```

注意：不能在 `HAVING` 里用 `WHERE` 的字段过滤逻辑替代它——`WHERE` 里不能用聚合函数，而 `HAVING` 可以。一句话记忆：**`WHERE` 管行，`HAVING` 管组。**

## 更新数据：UPDATE

```sql
UPDATE users SET balance = 200.00 WHERE username = '小明';
UPDATE users SET age = age + 1 WHERE username = '小红';  -- 年龄 +1
```

- `SET 列 = 新值` 指定改哪些列。
- **一定要写 `WHERE`**，否则会更新全表每一行！

## 删除数据：DELETE

```sql
DELETE FROM users WHERE username = '小刚';
```

- 同样**必须写 `WHERE`**，否则整张表数据全删（只删数据留表结构；要连表一起删用 `DROP TABLE`）。

## SQL 真正的执行顺序（重要误区）

很多人以为 SQL 是"从上往下执行"，所以觉得 `WHERE` 里不能用 `SELECT` 里起的别名。其实 SQL 的**书写顺序**和**执行顺序**不一样：

**书写顺序**：`SELECT` → `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `ORDER BY` → `LIMIT`

**实际执行顺序**：`FROM`（先找表）→ `WHERE`（过滤行）→ `GROUP BY`（分组）→ `HAVING`（过滤组）→ `SELECT`（投影选列）→ `ORDER BY`（排序）→ `LIMIT`（截取）

这就是为什么：`WHERE` 在 `SELECT` 之前执行，所以 `WHERE` 里不能用 `SELECT` 里定义的别名（比如 `WHERE total > 500` 不行，得用 `HAVING total > 500`）；而 `ORDER BY` 在 `SELECT` 之后，所以它能用 `SELECT` 里的别名排序。

理解执行顺序，能帮你少写很多"明明看起来对却报错"的 SQL。

## 常见新手坑

- **UPDATE/DELETE 忘了 WHERE**：瞬间改/删全表。执行前先用 `SELECT` 确认 `WHERE` 条件命中了正确的行。
- **字符串没加单引号**：`WHERE username = 小明` 会报错，用户名是字符串必须 `'小明'`。数字可以不加。
- **`WHERE` 用聚合函数**：`WHERE COUNT(*) > 1` 报错，聚合过滤要用 `HAVING`。
- **`LIKE` 通配符用错**：`%` 是任意长度，`_` 是单个字符，别混。

## 这一篇你该记住的

- `INSERT` 插数据（显式写列名最稳）；`SELECT` 查数据，`*` 是全部列，写明列名是投影。
- `WHERE` 过滤行，`LIMIT` 限制条数（分页靠 `OFFSET`），`LIKE` 做模糊匹配（`%`/`_` 通配符）。
- `ORDER BY` 排序（`ASC`/`DESC`，可多列）；`DISTINCT` 去重。
- 聚合函数 `COUNT/SUM/AVG/MAX/MIN` 把多行浓缩成一个值；`GROUP BY` 分组，`HAVING` 过滤组。
- **`WHERE` 管行、`HAVING` 管组**；SQL 执行顺序是 FROM→WHERE→GROUP BY→HAVING→SELECT→ORDER BY→LIMIT，所以 `WHERE` 不能用 `SELECT` 别名。
- `UPDATE`/`DELETE` 务必带 `WHERE`，否则动全表。

下一篇我们讲进阶：子查询怎么嵌套、多张表怎么用 JOIN 拼起来，并配一张原理图帮你建立空间感。
