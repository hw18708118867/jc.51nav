---
title: PHP 操作 MySQL：把数据存起来再读出来
description: 用 mysqli 连接数据库，执行增删改查，遍历结果集，并把查到的数据渲染成网页表格，完成"前端表单 → PHP → MySQL"的完整闭环。
category: backend
subcategory: php
tags: ['PHP', 'MySQL', 'mysqli', '结果集']
pubDate: 2026-07-17
updatedDate: 2026-07-17
order: 3
---

上一篇我们用 `file_put_contents` 把留言写进文本文件。文本文件能存东西，但它有个大问题：你想"查所有姓张的用户""按时间排序""统计一共有多少条"，都得自己写代码去解析文本，又慢又容易错。一旦数据多了、要多人同时读写，就彻底扛不住。

**数据库**就是干这个的。这一篇我们让 PHP 连上 MySQL，把数据存进真正的表，再查出来渲染成网页。这是"前端表单 → PHP → 数据库"的企业级标准闭环，几乎所有网站都这么干。

## 先准备好数据库和表

假设你的 MySQL 里已经有个库叫 `study`（没有就用 `CREATE DATABASE study CHARACTER SET utf8mb4;` 建一个）。在里面建一张留言表：

```sql
USE study;

CREATE TABLE messages (
  id    INT PRIMARY KEY AUTO_INCREMENT,
  nick  VARCHAR(50)  NOT NULL,
  msg   TEXT         NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

逐行解释：
- `id` 是主键（`PRIMARY KEY`），`AUTO_INCREMENT` 表示每插一条自动 +1，不用你管。
- `nick` 昵称，`VARCHAR(50)` 最长 50 字符，`NOT NULL` 表示不能为空。
- `msg` 留言内容，用 `TEXT` 存长文本。
- `created_at` 创建时间，`DEFAULT CURRENT_TIMESTAMP` 表示不填就自动用当前时间。

## 用 mysqli 连数据库

PHP 操作 MySQL 有两种扩展：`mysqli` 和 `PDO`。`mysqli` 面向 MySQL、上手简单，本篇用它。`PDO` 支持多种数据库，更通用，进阶再学。

连接数据库：

```php
<?php
$host = 'localhost';
$user = 'root';
$pass = '';          // 你的 MySQL 密码，XAMPP 默认空
$db   = 'study';

$conn = new mysqli($host, $user, $pass, $db);

// 检查连接是否成功
if ($conn->connect_error) {
  die("连接失败：" . $conn->connect_error);
}
echo "连接成功！";
?>
```

- `new mysqli(...)` 创建一个连接对象 `$conn`。
- `connect_error` 里如果有内容，说明连不上（密码错、库不存在等），`die()` 直接终止并输出原因。
- 连接成功后，后面所有"执行 SQL"都通过 `$conn` 这个对象。

> 小提示：真实项目里密码不能硬编码在文件里，应该放到配置文件或环境变量。这里为了演示先写死。

## 插入数据（增）

接收上篇留言表单的 POST 数据，插进表：

```php
<?php
$conn = new mysqli('localhost', 'root', '', 'study');
$nick = $_POST['nick'];
$msg  = $_POST['msg'];

$sql = "INSERT INTO messages (nick, msg) VALUES ('$nick', '$msg')";
if ($conn->query($sql) === TRUE) {
  echo "留言已保存，新记录 id 是 " . $conn->insert_id;
} else {
  echo "出错：" . $conn->error;
}
$conn->close();
?>
```

- `$conn->query($sql)` 执行一条 SQL，返回 `TRUE`（成功）或结果对象/失败。
- `$conn->insert_id` 是刚插入记录的自增 id。
- 最后 `$conn->close()` 关闭连接，释放资源（虽然脚本结束会自动关，但养成手动关的习惯更好）。

⚠️ **严重安全警告**：上面把 `$_POST` 直接拼进 SQL，是经典的 **SQL 注入漏洞**！如果用户提交 `nick = '; DROP TABLE messages; --`，数据库就可能被删。正式项目绝不能用字符串拼接，必须用"预处理"（见文末）。这里先让你跑通流程，安全意识必须同步建立。

## 查询数据并渲染成表格（查）

把表里所有留言查出来，用 HTML 表格展示：

```php
<?php
$conn = new mysqli('localhost', 'root', '', 'study');
$sql = "SELECT id, nick, msg, created_at FROM messages ORDER BY created_at DESC";
$result = $conn->query($sql);
?>
<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>留言列表</title></head>
<body>
<table border="1" cellpadding="8">
  <tr><th>ID</th><th>昵称</th><th>留言</th><th>时间</th></tr>
  <?php if ($result && $result->num_rows > 0): ?>
    <?php while ($row = $result->fetch_assoc()): ?>
      <tr>
        <td><?php echo $row['id']; ?></td>
        <td><?php echo $row['nick']; ?></td>
        <td><?php echo $row['msg']; ?></td>
        <td><?php echo $row['created_at']; ?></td>
      </tr>
    <?php endwhile; ?>
  <?php else: ?>
    <tr><td colspan="4">还没有留言</td></tr>
  <?php endif; ?>
</table>
</body></html>
<?php $conn->close(); ?>
```

关键 API：
- `$conn->query($sql)` 查询返回**结果集对象** `$result`。
- `$result->num_rows` 是结果行数。
- `$result->fetch_assoc()` 每次取"一行"并转成关联数组（`键=列名`），配合 `while` 循环一行行遍历，取完返回 `NULL` 循环结束。
- 这里用了 PHP 的"替代语法" `if (...) : ... endif;` 配合 HTML 更清爽。

## 更新与删除（改、删）

```php
// 改：把 id=3 的留言内容更新
$sql = "UPDATE messages SET msg='已审核' WHERE id=3";
$conn->query($sql);

// 删：删除 id=5 的留言
$sql = "DELETE FROM messages WHERE id=5";
$conn->query($sql);
```

`UPDATE` 和 `DELETE` 都靠 `WHERE` 锁定要动哪些行。**千万别忘了 `WHERE`**——没有 `WHERE` 的 `UPDATE`/`DELETE` 会作用于全表，后果不堪设想（生产环境尤其要命）。

## 预处理：彻底防 SQL 注入（必须掌握）

前面说直接拼接用户输入有注入风险，正确做法是用**预处理语句（prepared statement）**。它分两步：先发"带问号的 SQL 模板"给数据库编译，再单独把数据传过去，数据库严格区分"指令"和"数据"，用户输入再怎么写也只会被当成纯数据，无法篡改 SQL 结构。

```php
<?php
$conn = new mysqli('localhost', 'root', '', 'study');
$nick = $_POST['nick'];
$msg  = $_POST['msg'];

// 1. 准备带 ? 占位符的模板
$stmt = $conn->prepare("INSERT INTO messages (nick, msg) VALUES (?, ?)");

// 2. 绑定参数：s=字符串, i=整数, d=小数, b=二进制
$stmt->bind_param("ss", $nick, $msg);

// 3. 执行
$stmt->execute();

echo "留言已安全保存，id=" . $stmt->insert_id;
$stmt->close();
$conn->close();
?>
```

查询也同理：

```php
$stmt = $conn->prepare("SELECT id, nick, msg FROM messages WHERE nick = ?");
$stmt->bind_param("s", $name);
$stmt->execute();
$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
  echo $row['nick'] . "：" . $row['msg'] . "<br>";
}
```

记住一句话：**凡是带用户输入的 SQL，一律用预处理，不要拼字符串。** 这是后端安全的基本功。

## 常见新手坑

- **连不上数据库**：检查 MySQL 服务是否启动、用户名密码对不对、库名有没有拼错。
- **中文乱码**：连接后执行 `$conn->set_charset('utf8mb4');` 确保 PHP 与数据库用同一字符集。
- **SQL 报错看 `$conn->error`**：出错时把 `$conn->error` 打印出来，能直接看到 MySQL 报的什么错。
- **忘记 `WHERE` 误删全表**：执行 `UPDATE`/`DELETE` 前，先用 `SELECT` 确认 `WHERE` 条件对不对。

## 这一篇你该记住的

- 文本文件不适合存结构化数据，MySQL 表能高效增删改查；`mysqli` 是 PHP 操作 MySQL 的常用扩展。
- `new mysqli(...)` 建立连接，失败看 `connect_error`；`$conn->query($sql)` 执行 SQL。
- 查出的结果集用 `$result->fetch_assoc()` 配合 `while` 循环逐行遍历，渲染成表格。
- `UPDATE`/`DELETE` 必须带 `WHERE`，否则影响全表。
- **所有带用户输入的 SQL 都用预处理（`prepare` + `bind_param` + `execute`）防注入**，绝不用字符串拼接。

下一篇是 PHP 实战收尾：文件上传、用 Session 记住"你是谁"、以及面向对象的基本写法。
