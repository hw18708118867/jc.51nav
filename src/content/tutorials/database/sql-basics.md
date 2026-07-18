---
title: SQL 基础：关系型数据库的增删改查
description: 用最直白的方式讲清 SQL 的核心语法，掌握 SELECT、INSERT、UPDATE、DELETE 与简单联表查询。
category: database
subcategory: relational
tags: ['SQL', 'MySQL', '数据库']
pubDate: 2026-07-10
order: 1
---

## 为什么学 SQL

几乎所有业务系统都离不开关系型数据库。SQL（Structured Query Language）是与数据库沟通的通用语言，掌握它就能自由地存取数据。

## 建表

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  age INT
);
```

## 增（INSERT）

```sql
INSERT INTO users (name, age) VALUES ('张三', 28);
INSERT INTO users (name, age) VALUES ('李四', 32);
```

## 查（SELECT）

```sql
-- 查询全部
SELECT * FROM users;

-- 带条件
SELECT name, age FROM users WHERE age > 30;

-- 排序与限制
SELECT * FROM users ORDER BY age DESC LIMIT 10;
```

## 改与删（UPDATE / DELETE）

```sql
UPDATE users SET age = 29 WHERE name = '张三';
DELETE FROM users WHERE name = '李四';
```

## 简单联表

```sql
SELECT u.name, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id;
```

## 小结

你已经掌握了 SQL 的增删改查与基础联表。下一步可学习索引、事务与性能优化。
