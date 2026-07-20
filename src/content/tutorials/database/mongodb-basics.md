---
title: MongoDB 基础：像操作 JSON 一样存数据
description: 用文档模型理解 MongoDB 的库/集合/文档，掌握增删改查与常用查询操作符，并对比它和关系型表结构的本质差异。
category: database
subcategory: nosql
tags: ['MongoDB', 'NoSQL', '文档数据库', 'CRUD']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 2
---

上篇我们知道文档型 NoSQL 适合"结构多变"的数据，代表就是 **MongoDB**。这一篇动手：理解它的数据模型，并用类 JSON 的方式做增删改查。你会发现，没有建表语句、没有固定列，数据库也能很好用。

读完这篇，你能用 MongoDB Shell（或驱动）完成基本的 CRUD，并理解"文档"和"行"的根本不同。

## MongoDB 的层级模型

关系型是 `数据库 → 表 → 行`，MongoDB 对应：

- **数据库（Database）**：和关系型一样，逻辑容器。
- **集合（Collection）**：相当于"表"，但**不需要预先定义结构**。
- **文档（Document）**：相当于"行"，是一个 BSON（JSON 的二进制扩展）对象。

关键差异：**同一个集合里的文档，字段可以完全不同**。比如一个存用户、一个存商品，也能放同一集合（但不推荐）。文档用 `{}` 包裹，字段名和值用 `:` 分隔：

```json
{
  "_id": 1,
  "name": "小明",
  "age": 18,
  "tags": ["vip", "new"],
  "address": { "city": "北京", "zip": "100000" }
}
```

注意 `_id` 是 MongoDB 自动生成的主键（也可自己指定）；字段值可以是字符串、数字、数组、甚至嵌套对象——这就是文档型"灵活"的来源。

## 增：插入文档

```javascript
// 插入一条
db.users.insertOne({ name: "小红", age: 20, tags: ["vip"] });

// 插入多条
db.users.insertMany([
  { name: "小刚", age: 22 },
  { name: "小丽", age: 19 }
]);
```

不用先 `CREATE TABLE`，往 `users` 集合插数据，集合自动创建。字段随便加，比如小刚没 `tags` 字段也没事。

## 查：查询与操作符

查询用 `find`，条件写成文档形式：

```javascript
// 查 age 等于 20
db.users.find({ age: 20 });

// 查 age 大于 18（用操作符 $gt）
db.users.find({ age: { $gt: 18 } });

// 多条件：age>18 且 name 是小红
db.users.find({ age: { $gt: 18 }, name: "小红" });

// 查数组包含 "vip"
db.users.find({ tags: "vip" });

// 只返回 name 字段（投影）
db.users.find({}, { name: 1, _id: 0 });
```

常用操作符：`$gt`(>)、`$gte`(>=)、`$lt`(<)、`$in`(在列表中)、`$and`/`$or`、`$regex`(正则模糊)。它们替代了 SQL 的 `WHERE`、`>`、`IN`、`AND/OR`。

## 改：更新文档

```javascript
// 把小红的年龄改成 21（$set 只改指定字段）
db.users.updateOne(
  { name: "小红" },
  { $set: { age: 21 } }
);

// 给小刚加一个字段
db.users.updateOne(
  { name: "小刚" },
  { $push: { tags: "active" } }
);
```

`$set` 是"改这些字段"，没提到的字段保留——这正是文档库相比 `ALTER TABLE` 的灵活之处。`$push` 往数组追加元素。

## 删：删除文档

```javascript
// 删一个
db.users.deleteOne({ name: "小丽" });

// 删多个（age<18）
db.users.deleteMany({ age: { $lt: 18 } });
```

## 索引：没有索引再快也白搭

和关系型一样，MongoDB 也靠索引加速查询。给 `name` 建索引：

```javascript
db.users.createIndex({ name: 1 });
```

`1` 表示升序索引。不加索引的查询会"全集合扫描"，数据量大时极慢。嵌套字段也能建索引：`db.users.createIndex({ "address.city": 1 })`。

## 常见坑位提醒

- **字段名拼写不一致**：文档库没 schema，今天写 `name`、明天写 `userName`，查询就查不到。团队要约定字段命名规范。
- **滥用嵌套导致查询难**：嵌套太深（如 5 层）既难查又难建索引。一般嵌套 1–2 层为宜。
- **把 MongoDB 当关系型用**：疯狂做"应用层 JOIN"（先查 A 再循环查 B），性能灾难。要么冗余字段、要么用 `$lookup`（MongoDB 的关联），但别滥用。
- **忘了建索引**：默认只有 `_id` 有索引，其他字段查询全表扫。上线前务必给高频查询字段建索引。
- **`_id` 用自增整数替代**：MongoDB 默认 `_id` 是 ObjectId，分布式下天然唯一；强行用自增整数反而失去分布式优势且易冲突。

## 进阶一：聚合管道（Aggregation Pipeline）

单条 `find` 只能做简单过滤。要做"分组统计、联表、排序"这类分析，用**聚合管道**——把数据像流水线一样，经过多个阶段（`$match` 过滤、`$group` 分组、`$sort` 排序、`$project` 投影）逐步处理：

```javascript
// 统计每个城市的用户数，按数量降序取前 3
db.users.aggregate([
  { $match: { age: { $gte: 18 } } },          // 先过滤
  { $group: { _id: "$address.city", count: { $sum: 1 } } }, // 按城市分组计数
  { $sort: { count: -1 } },                   // 降序
  { $limit: 3 }                               // 取前 3
]);
```

管道是 MongoDB 做报表、看板的利器，相当于 SQL 的 `GROUP BY` + `HAVING` + `ORDER BY` 组合。

## 进阶二：关联查询 $lookup

文档库不鼓励 JOIN，但偶尔确实需要关联。MongoDB 提供 `$lookup`（类似左外连接）：

```javascript
// 查订单时，把对应的用户文档带出来
db.orders.aggregate([
  { $match: { status: "paid" } },
  { $lookup: {
      from: "users",            // 关联集合
      localField: "user_id",    // 本集合字段
      foreignField: "_id",      // 对方集合字段
      as: "user_info"           // 结果放进这个数组字段
  }}
]);
```

注意 `$lookup` 有性能成本，只在必要时用，且关联字段要建索引。频繁 `$lookup` 往往是"该用关系型"或"该冗余字段"的信号。

## 进阶三：多文档事务

MongoDB 4.0+ 支持**多文档 ACID 事务**，适合必须原子性的场景（如转账）：

```javascript
const session = db.getMongo().startSession();
session.startTransaction();
try {
  db.accounts.updateOne({ _id: "A" }, { $inc: { balance: -100 } }, { session });
  db.accounts.updateOne({ _id: "B" }, { $inc: { balance: 100 } }, { session });
  session.commitTransaction();   // 全成功才提交
} catch (e) {
  session.abortTransaction();    // 任一步失败则整体回滚
}
```

但要清醒：事务会让分布式下的性能与复杂度上升。能靠"冗余字段+单文档原子操作"解决的，就别上事务。单文档内的写操作本身已是原子的。

## 唯一索引与复合索引

除了普通索引，常用还有：

```javascript
// 唯一索引：保证字段不重复（如用户名）
db.users.createIndex({ username: 1 }, { unique: true });

// 复合索引：多个字段组合，遵循最左前缀（和关系型联合索引同理）
db.orders.createIndex({ user_id: 1, status: 1, created_at: -1 });
```

唯一索引还能顺带做"去重约束"，避免脏数据；复合索引要把高区分度、常用过滤字段放前面。

## Mongo 内的建模小贴士

文档库虽然灵活，但也有"好习惯"：

- **`_id` 用默认 ObjectId**：分布式下天然全局唯一，自带时间戳（可排序、可粗略当创建时间）。别用自增整数替代，会丧失分布式优势且易冲突。
- **嵌套 1~2 层为宜**：嵌套太深（如 4、5 层）既难查又难建索引，也拖慢读取。超过两层考虑拆引用。
- **数组别无限增长**：评论、消息这类可能膨胀的，用引用独立成集合，别全塞进一个文档（有 16MB 单文档上限）。
- **字段命名团队统一**：文档库无 schema 约束，今天 `name` 明天 `userName` 就会查不到，约定大于强制。
- **大文本用 GridFS**：超过 16MB 的文件（如视频），用 GridFS 分块存储，而非硬塞文档。

## 备份与运维常识

生产用 Mongo 还要懂基本运维：

- **副本集（Replica Set）**：一主多从，主挂自动选新主，数据多副本防丢，读还能分流到从节点。
- **备份**：用 `mongodump` 逻辑备份或文件系统快照，定期恢复演练（备份不等于能恢复）。
- **慢查询**：开 `profiler` 记录慢操作，结合 `explain()` 定位（和关系型思路一致）。
- **版本与驱动**：保持驱动版本兼容，避免新特性在老驱动下行为异常。

这些和前面"读写分离、高可用"的架构思想一脉相承，只是换到了文档库语境。

## 查询模式与索引怎么配合

光会建索引不够，要按"怎么查"来设计。几个常见模式：

- **按字段等值查**（如 `find({ username: "小红" })`）：在 `username` 上建普通索引即可。若要求唯一，加 `{ unique: true }`，顺带约束脏数据。
- **范围+排序**（如"某用户最近订单"）：建复合索引 `(user_id, created_at:-1)`，等值条件 `user_id` 在前、排序 `created_at` 在后，查询既能快速定位用户、又能直接按时间倒序取，避免 filesort。
- **数组查询**：对数组字段（如 `tags`）建索引，查询"包含某标签"能命中；但要注意数组索引会让索引变大，标签基数过高时权衡。
- **文本搜索**：简单模糊可用正则，但大数据量慢；真要做搜索，用 MongoDB 的 **文本索引**（`createIndex({content:"text"})`）或干脆接 Elasticsearch。

记住：索引要跟着"最高频、最慢"的查询走，用 `explain()` 验证是否命中，别凭感觉建一堆用不上的索引拖累写入。

## 小测验：看看你掌握了没

- 问题一：MongoDB 的"集合"对应关系型的什么？答案：表，但集合无需预定义结构。
- 问题二：`$set` 和直接覆盖文档区别？答案：`$set` 只改指定字段、保留其他；覆盖会丢掉未提及字段。
- 问题三：为什么 MongoDB 也要建索引？答案：默认仅 `_id` 有索引，无索引查询全集合扫描，大数据量极慢。

## 这一篇你该记住的

- 层级：数据库 → 集合（无 schema） → 文档（BSON/JSON 对象），`_id` 是主键。
- CRUD：`insertOne/Many`、`find`（配 `$gt`/`$in`/`$or` 等操作符）、`updateOne`+`$set`、`deleteOne/Many`。
- 文档灵活：字段可不同、可嵌套、可含数组；但需团队约定命名避免混乱。
- 索引不可或缺：`createIndex({字段:1})`，高频查询字段务必建。
- 误区：别把 Mongo 当关系型疯狂应用层 JOIN，嵌套别过深，别滥用自增 `_id`。

下一篇我们看另一种截然不同的 NoSQL——**Redis**，它快到能当缓存、排行榜、分布式锁，是后端必备利器。
