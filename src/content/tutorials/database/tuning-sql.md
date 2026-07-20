---
title: 慢查询定位与 SQL 改写
description: 用慢查询日志和 EXPLAIN 找到性能杀手，掌握避免 SELECT *、优化 JOIN、控制分页、减少临时表的实战改写技巧。
category: database
subcategory: tuning
tags: ['慢查询', 'SQL 调优', '执行计划', '数据库优化']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 2
---

上篇讲了索引这个"单条 SQL 加速器"。但真实世界的慢，常常不是缺索引，而是 **SQL 本身写得烂**。这一篇我们学怎么"抓"出慢查询，再把它们改写成快查询。

读完这篇，你能用慢查询日志定位问题 SQL，并掌握几条立竿见影的改写原则。

## 第一步：让慢查询"现形"

数据库一般都有**慢查询日志**，记录执行超过阈值的 SQL。MySQL 开启：

```sql
-- 超过 1 秒的查询记入慢日志
SET long_query_time = 1;
SET slow_query_log = ON;
```

开启后，所有超过 1 秒的 SQL 会被记下来，你就能精准锁定"罪魁祸首"，而不是瞎猜。配合 `EXPLAIN`（上篇）看它为什么慢——是没走索引、还是扫了太多行、还是用了临时表。

## 改写原则一：别用 SELECT *

```sql
-- 慢且浪费
SELECT * FROM users WHERE age > 18;

-- 快且明确
SELECT id, name, age FROM users WHERE age > 18;
```

`SELECT *` 的坏处：1）返回无用字段，浪费 IO 和带宽；2）无法走"覆盖索引"（索引里没包含所有 `*` 字段，得回表）；3）表加字段后可能破坏依赖"列顺序"的代码。只取需要的列，是成本最低的提升。

## 改写原则二：JOIN 要小表驱动大表、关联列建索引

```sql
-- 假设 orders 大、users 小
SELECT * FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.city = '北京';
```

要点：1）关联列 `o.user_id` 必须建索引（上篇讲过）；2）让**小表做驱动表**，数据库通常自己优化，但写 SQL 时尽量让过滤后行数少的表在前；3）避免 `SELECT *` 让 JOIN 结果集膨胀。

如果 JOIN 三张以上大表还慢，考虑：能否拆成多次查询在应用层组装？能否冗余字段避免 JOIN？是否该上 ES 做检索？

## 改写原则三：深分页是大坑

```sql
-- 越往后越慢：要先扫过前 100000 行再丢弃
SELECT * FROM orders ORDER BY id LIMIT 100000, 20;

-- 改成"游标分页"：用上一页最后一条的 id 做起点
SELECT * FROM orders WHERE id > 100000 ORDER BY id LIMIT 20;
```

`LIMIT 100000, 20` 的意思是"先读出 100020 行，丢掉前 100000，返回 20"——前面全白读。改成"记录上一页最大 id，从它之后取 20"，利用索引直接定位，速度恒定。这是列表页性能的关键技巧。

## 改写原则四：避免函数在列上、避免隐式转换

上篇讲过索引失效。这里再强调：任何在**索引列上做运算/函数/类型转换**的写法，都会让索引失效、退化为全表扫。把运算挪到等号右边常量上。

## 改写原则五：IN 优于大量 OR，但别太长

```sql
-- 好
SELECT * FROM users WHERE id IN (1,2,3,4,5);
-- 差（等价但优化器有时处理更差）
SELECT * FROM users WHERE id=1 OR id=2 OR id=3 OR id=4 OR id=5;
```

但 `IN` 列表也别几千个值，会撑爆 SQL 或让执行计划变差。超大量用临时表 JOIN 或分批查。

## 子查询 vs JOIN

老习惯爱写子查询，但很多情况下 JOIN 更快：

```sql
-- 可能慢
SELECT * FROM orders
WHERE user_id IN (SELECT id FROM users WHERE city='北京');

-- 通常更快
SELECT o.* FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.city = '北京';
```

现代优化器有时能把子查询转成 JOIN，但不保证。涉及大表时优先用 JOIN 并验证执行计划。

## 常见坑位提醒

- **只加索引不改写 SQL**：索引解决不了 `SELECT *`、深分页、笛卡尔积这类结构性问题。索引+改写双管齐下。
- **在应用层循环查（N+1 问题）**：先查 100 个用户，再循环 100 次查每个用户的订单，共 101 次查询。改成一次 JOIN 或 `IN`，性能天差地别。
- **用 DISTINCT / GROUP BY 不当**：它们可能触发临时表和排序，数据量大时极慢。确认是否真需要去重。
- **忽略执行计划里的 Using temporary / filesort**：这两个是明确的性能信号，出现就该想办法消除（加索引、减少排序字段）。
- **在生产直接 EXPLAIN 大查询**：EXPLAIN 不真正执行，相对安全；但别直接跑未优化的原 SQL 在生产，可能拖垮库。先在从库/测试库验证。

## 深度读执行计划：更多关键字段

`EXPLAIN` 还有几个字段常被忽略却很关键：

- **possible_keys / key**：数据库"考虑用"和"实际用"的索引。若 `possible_keys` 有值但 `key` 是 NULL，说明优化器认为全表扫更快（可能统计信息过时或区分度低）。
- **filtered**：过滤比例，越大越好，反映 WHERE 条件筛掉了多少行。
- **ref**：显示索引的哪列被使用（如 `const` 表示常量匹配）。
- **Extra 的 `Using index`**：走了覆盖索引，极佳；`Using where`：光靠索引还不够、还要在服务器层过滤；`Select tables optimized away`：优化器已把聚合优化掉（如 `MIN/MAX` 直接走索引），最理想。

养成习惯：任何慢查询先 `EXPLAIN`，把 `type`、`key`、`rows`、`Extra` 四件套读明白，再决定加索引还是改写。

## 统计信息：优化器的"地图"

数据库靠**统计信息**（各列的数据分布、基数）来选执行计划。如果统计过时，优化器可能"误判"选了烂计划——比如以为某字段区分度高，实际全是重复值，结果走索引回表反而更慢。所以：

- 大表大量写入/删除后，记得 `ANALYZE TABLE` 更新统计。
- 别在业务高峰跑 `ANALYZE`，它可能锁表或消耗资源。
- 若优化器顽固选错，可用**强制索引**（`FORCE INDEX`）临时纠偏，但优先修统计信息和索引设计，强制索引是"最后手段"。

## 实战：一个 N+1 查询的改造前后

反例（应用层循环查，共 101 次 SQL）：

```python
users = db.query("SELECT * FROM users LIMIT 100")
for u in users:
    orders = db.query(f"SELECT * FROM orders WHERE user_id={u.id}")  # 循环 100 次！
```

正解（一次 JOIN 或 `IN`，1~2 次 SQL）：

```sql
SELECT o.*, u.name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.id IN (SELECT id FROM users LIMIT 100);
```

性能从"101 次往返"降到"1~2 次"，尤其跨网络时差距巨大。ORM（如 Hibernate、MyBatis）默认容易写出 N+1，务必开启"批量抓取/预加载"（`JOIN FETCH` / `fetchJoin`）。

## 进阶改写：用汇总表/物化思路破聚合慢

报表类查询（`COUNT/GROUP BY` 跨亿级数据）再怎么加索引也慢，因为要扫大量行聚合。解法：

- **汇总表（物化）**：定时（如每分钟）把聚合结果算好存进一张小表，查询直接读汇总，毫秒级返回。
- **冗余计数**：如"文章阅读数"用 Redis `INCR` 实时计数，落库时再汇总，避免每次 `COUNT`。
- **分区表**：按时间分区，查"本月数据"只扫对应分区，跳过历史。

核心思路：**把"实时重算"变成"预计算+增量更新"**，这是调优的高阶心法。

## 用窗口函数替代"自连接"

很多报表要"取每个用户最近一笔订单""按组排名"，老写法用自连接或子查询，又慢又绕。现代 SQL 有**窗口函数（Window Function）** 一行搞定：

```sql
-- 取每个用户金额最高的订单（不用自连接）
SELECT * FROM (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY total DESC) AS rn
  FROM orders
) t WHERE rn = 1;
```

`PARTITION BY` 分组、`ORDER BY` 组内排序、`ROW_NUMBER` 给行编号，再取编号 1 的就是各组第一。比"先聚合出最大金额再 JOIN 回原表"简洁且往往更快。MySQL 8 / PostgreSQL 都支持，是写报表的利器。

## 避免"隐形的 JOIN"：视图与 ORM 陷阱

慢查询有时不是你写的 SQL 慢，而是**隐形 JOIN**：

- **视图（View）嵌套视图**：一个视图里 JOIN 了另一个视图，另一个又 JOIN 别的，层层展开后实际扫了十几张表。排查时要 `EXPLAIN` 展开后的真实计划，别被视图名迷惑。
- **ORM 自动关联**：框架"方便"地帮你 `JOIN` 了一堆关联表（如查用户顺带把地址、订单、资料全 LEFT JOIN 出来），哪怕你只用其中一两个字段。用"延迟加载/指定字段"关掉不必要的关联。
- **SELECT * 触发多余关联**：某些 ORM 对 `*` 会带出所有关联实体，放大结果集。

调优要"看见"最终发给数据库的 SQL——开启 SQL 日志，把 ORM 生成的语句贴进 `EXPLAIN`，很多"玄学慢"立刻现形。

## 小测验：看看你掌握了没

- 问题一：深分页 `LIMIT 100000,20` 为什么慢？答案：要先扫过前 10 万行再丢弃，前面全白读。
- 问题二：SELECT * 有什么问题？答案：浪费 IO、无法覆盖索引、表结构变动易出错。
- 问题三：N+1 查询问题指什么？答案：先查主表 N 条，再循环 N 次查关联，共 N+1 次查询，应改 JOIN/IN。

## 这一篇你该记住的

- 先靠慢查询日志 + EXPLAIN 定位"罪魁"，再动手改，别瞎猜。
- 改写五原则：拒 SELECT *、JOIN 建索引且小表驱动、深分页改游标(id>last)、列上不做运算、IN 优于长 OR。
- 深分页用 `WHERE id > 上一页最大id LIMIT n` 替代 `LIMIT offset, n`。
- 警惕 N+1 查询、不必要的 DISTINCT/GROUP BY、Using temporary/filesort。
- 索引与改写互补，生产验证要去从库/测试库。

索引和 SQL 改写针对"单库单表"。但当数据量到了亿级、并发极高，就得从**架构层面**调优——下一篇讲读写分离、分库分表与配置调优。
