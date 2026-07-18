---
title: 数据库与 SQL 入门：先搞懂数据到底存在哪、怎么建
description: 从"为什么不能直接用 Excel 存数据"讲起，带你认识关系型数据库，装好 MySQL，并用 DDL 把库、表、字段、约束真正建出来。
category: database
subcategory: relational
tags: ['SQL', 'MySQL', '数据库入门', 'DDL']
pubDate: 2026-07-12
order: 1
---

很多人第一次听到"数据库"，脑子里浮现的是一张 Excel 表格。这不算错，但只说对了一半。真正的问题不是"数据能不能存成表格"，而是：当数据变成十万、一百万行，还要被几百个人同时读写、还要保证不出错，Excel 就彻底扛不住了。

想象一下：你开了家小卖部，用一张 Excel 记每天卖了多少货。刚开始你一个人记，没问题。后来生意好了，你雇了三个店员同时记，结果张三刚改了库存，李四又用旧数据改了一遍，库存直接对不上；再后来电脑蓝屏，Excel 没保存，一天白干。这就是"用文件/表格直接存数据"的真实痛点。

而**数据库**就是专门来解决这些麻烦的：它像一个"专门管数据的仓库管理员"，你不用关心数据文件存在磁盘哪个扇区，只要用一套统一的语言（SQL）告诉它"存一条""查一下"，它就去办。背后负责干活、保证安全和效率的那个软件，叫 **DBMS（数据库管理系统）**。我们常说的 MySQL、PostgreSQL、Oracle，都是这一类软件。

这一篇我们先把"数据库是什么、为什么要用它"说清楚，然后亲手把第一个库和第一张表建出来。后面的查询、关联，全都建立在这个底子上。请你跟着敲，别只看不练——数据库是练出来的，不是看出来的。

## 数据库到底解决了什么

其中**关系型数据库**是最主流的一种：它把数据组织成一张张"表"，表有行（一条条记录）和列（字段）。比如一个"用户表"里，每一行是一个人，列是 `id`、`用户名`、`邮箱`……这种结构清晰、能互相关联，所以 Web 后端几乎都用它。

我们拿小卖部再打个比方。小卖部里有"顾客表"（谁来了）、"商品表"（卖什么）、"订单表"（谁买了什么）。这三张表各自独立，但能互相指：订单表里只记"顾客编号 3 买了商品编号 5"，真正的顾客名字和商品名字，分别在顾客表和商品表里。这种"用编号互相指着、需要时才拼起来"的思路，就是关系型数据库的核心——它省空间、不容易乱、改一处不影响别处。

> 一句话：数据库 = 按表存数据 + 用 SQL 操作 + 软件帮你管并发、安全、崩溃恢复。

那为什么不用 Excel？三个关键差别你记住：

1. **并发**：Excel 同一时间基本只能一个人改；数据库能几百人同时读写还不打架（靠"锁"和"事务"）。
2. **安全**：Excel 谁都能复制走、改了也难追回；数据库有权限控制，谁能看、谁能改，分得清清楚楚。
3. **海量**：Excel 几万行就卡；数据库上千万行照样查得快（靠"索引"，后面会讲）。

## 把 MySQL 装起来

新手最省事的方式是用集成环境，一条命令都不用配。所谓"集成环境"，就是把数据库、Web 服务器、PHP 解释器打包好，点一下就全启动。

- **Windows / macOS**：装 [XAMPP](https://www.apachefriends.org/) 或 [phpStudy](https://www.xp.cn/)，勾选 MySQL，点启动就行。启动后面板里 MySQL 那一行变成绿色，就说明数据库在跑了。
- **Linux（Ubuntu/Debian）**：在终端敲 `sudo apt install mysql-server`，装完用 `sudo systemctl start mysql` 启动。
- **macOS（Homebrew）**：`brew install mysql && brew services start mysql`。

装好后，怎么确认真的能用了？打开终端（Windows 用 XAMPP 自带的 Shell 或命令提示符），输入：

```bash
mysql -u root -p
```

这里的 `-u root` 意思是"用 root 这个管理员账号登录"，`-p` 是"让我输入密码"。回车后如果让你输密码，输完出现 `mysql>` 这样的提示符，就说明环境通了，后面所有 SQL 我们都在这里敲。

> 小贴士：XAMPP 默认的 root 密码通常是空（直接回车），phpStudy 一般在面板里能看。第一次进不去别慌，搜一下"XAMPP MySQL 修改 root 密码"就有答案。

## DDL：定义结构的语言

SQL 里专门"建库建表"的那部分叫 **DDL（数据定义语言）**。记住一个类比，特别好懂：建库像盖一栋楼，建表像在楼里隔出房间，字段就是房间里的一个个柜子，约束就是"这个柜子只能放什么、能不能空着"的规矩。

DDL 主要就四个动作：`CREATE`（建）、`ALTER`（改）、`DROP`（删）、`TRUNCATE`（清空数据但留结构）。这一篇我们重点用 `CREATE`。

### 建库与删库

库（Database）是表的容器。先建一个练习用的库：

```sql
-- 创建一个叫 study 的数据库，字符集用 utf8mb4
CREATE DATABASE study CHARACTER SET utf8mb4;

-- 切到这个库（后面的建表都在这个库里进行）
USE study;

-- 不想留了就删掉（危险！会清空里面所有表）
DROP DATABASE study;
```

逐行解释：

- 第一行 `CREATE DATABASE study` 是"建一个名为 study 的库"；`CHARACTER SET utf8mb4` 指定字符集。
- 第二行 `USE study` 是"接下来我就在 study 这个库里干活了"，相当于进到这栋楼。
- 第三行 `DROP DATABASE study` 会把整栋楼连人带家具全拆了，所以平时别乱敲，尤其别在生产环境敲。

为什么字符集要写 `utf8mb4`？因为 MySQL 里老旧的 `utf8` 其实只支持 3 字节，存不了部分生僻字和 emoji 表情（比如 😀 要 4 字节）。现在统一用 `utf8mb4` 最稳妥，能完整存中文和 emoji，省得以后踩坑。

### 数据类型：给每个柜子定规格

建表时，每一列都得声明"装什么类型的数据"，这叫**数据类型**。就像柜子有"放衣服的""放书的""放钱的"，不能乱塞。常用的有下面这些：

| 类型 | 用途 | 例子 |
|------|------|------|
| `INT` | 整数 | 年龄、数量、编号 |
| `DECIMAL(10,2)` | 精确小数 | 价格（别用 `FLOAT` 存钱，会有误差） |
| `VARCHAR(50)` | 变长文本 | 用户名、邮箱（括号里是最大长度） |
| `TEXT` | 长文本 | 文章正文、留言 |
| `DATE` | 日期 | 生日 `2026-07-12` |
| `DATETIME` | 日期+时间 | 注册时间 `2026-07-12 10:30:00` |
| `BOOLEAN` | 真假 | 是否会员（真/假） |

几个容易踩的坑，我提前说清楚：

- **钱千万别用 `FLOAT` 或 `DOUBLE`**。因为它们是"二进制近似"存小数，`0.1 + 0.2` 可能等于 `0.30000000000000004`，算账会出大错。用 `DECIMAL(10,2)` 这种"定点数"，括号里 `10` 是总位数、`2` 是小数位，正好存"最多 8 位整数 + 2 位小数"的金额。
- **`VARCHAR` 的长度别乱写太大也别太小**。太大浪费、太小装不下。用户名一般 `VARCHAR(50)` 够用，邮箱 `VARCHAR(100)` 稳妥。
- **`TEXT` 和 `VARCHAR` 的区别**：`VARCHAR` 有长度上限（通常 65535 字节封顶，且要和其他列共享行大小），适合短中文本；`TEXT` 适合文章、留言这类可能很长的文本。

### 建第一张表

建一张"用户表"，把刚才讲的类型和约束都用上：

```sql
CREATE TABLE users (
  id        INT PRIMARY KEY AUTO_INCREMENT,
  username  VARCHAR(50)  NOT NULL UNIQUE,
  email     VARCHAR(100) NOT NULL,
  age       INT,
  balance   DECIMAL(10,2) DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

逐列解释：

- `id INT PRIMARY KEY AUTO_INCREMENT`：主键 + 自增。主键（`PRIMARY KEY`）是这张表的"身份证列"，用来唯一标识每一行，不能重复、不能为空；`AUTO_INCREMENT` 让每插一行 id 自动 +1，你不用手动填。
- `username VARCHAR(50) NOT NULL UNIQUE`：`NOT NULL` 表示这一列必填（插数据时不能空着）；`UNIQUE` 表示不能和已有行重复（保证用户名不撞车）。
- `email VARCHAR(100) NOT NULL`：邮箱必填。
- `age INT`：年龄，允许为空（不写就是 NULL）。
- `balance DECIMAL(10,2) DEFAULT 0.00`：余额，不填时默认 0.00。
- `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`：注册时间，不填就用当前时间。

建完可以用 `DESCRIBE users;`（简写 `DESC users;`）查看表结构，确认每列的类型和约束对不对。

### 约束：给数据立规矩

上面已经出现了几种最重要的**约束（constraint）**，它们是数据库"保证数据不乱"的防线：

- **PRIMARY KEY（主键）**：唯一标识一行，不能重复、不能为空。一张表必须有且只有一个主键（可以是多列组合）。
- **NOT NULL**：这一列必须有值，插空会报错。
- **UNIQUE**：这一列的值在表里不能重复（但可以有多个 NULL）。
- **DEFAULT**：没填时用默认值。
- **FOREIGN KEY（外键）**：保证"这一列的值必须存在于另一张表的主键里"，用来建立表与表之间的关系。比如订单表的 `user_id` 必须是 users 表里真实存在的 id。外键我们下一篇讲关联时再展开。

约束的价值：它们把"数据该长什么样"的规则直接写进数据库，即使你的程序有 bug，数据库也会在底层拦住脏数据。这是"让数据库替你把关"的思想。

### 改表与删表

表建好后想加一列、改类型，用 `ALTER`：

```sql
-- 加一列"手机号"
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- 改一列的类型
ALTER TABLE users MODIFY COLUMN username VARCHAR(60);

-- 删一列
ALTER TABLE users DROP COLUMN phone;
```

删表：

```sql
DROP TABLE users;     -- 连表带数据全删
TRUNCATE TABLE users; -- 只清空数据，保留表结构
```

`DROP` 和 `TRUNCATE` 都很危险，生产环境务必三思。

## 常见新手坑

- **忘了 `USE 库名`**：建表前没切到目标库，表建到了别处或报错。建表前先 `USE study;`。
- **字符集乱码**：建库没指定 `utf8mb4`，中文插进去变问号。建库时一定带上 `CHARACTER SET utf8mb4`。
- **主键重复**：手动给 `AUTO_INCREMENT` 的主键填了已存在的值，会报主键冲突。让它自增就别手填。
- **类型选错**：用 `VARCHAR` 存大段文章被截断，或 `FLOAT` 存金额算错。按上面的对照表选。

## 这一篇你该记住的

- 关系型数据库把数据存成"表"，表由行（记录）和列（字段）组成；SQL 是操作它的统一语言，MySQL 是其中一种 DBMS。
- 它解决了 Excel 搞不定的并发、安全、海量问题。
- DDL 负责建结构：`CREATE DATABASE` 建库、`CREATE TABLE` 建表、`ALTER` 改表、`DROP` 删表。
- 建库用 `utf8mb4` 字符集；建表时给每列选对数据类型（钱用 `DECIMAL`、长文本用 `TEXT`）。
- 约束（主键/NOT NULL/UNIQUE/DEFAULT/外键）是数据库替你把关数据质量的防线。

下一篇我们往表里"写数据、查数据"——INSERT、UPDATE、DELETE 和 SELECT 是日常用得最频繁的操作，也是 SQL 真正的精华所在。
