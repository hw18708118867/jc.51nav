---
title: 文件上传、Session 与会向对象：PHP 实战收尾
description: 用 $_FILES 实现文件上传，用 Session 记住"你是谁"，并认识 PHP 面向对象的基本写法，给二阶段 PHP 画上句号。
category: backend
subcategory: php
tags: ['PHP', '文件上传', 'Session', '面向对象']
pubDate: 2026-07-18
order: 4
---

前面三篇我们已经能让 PHP 收表单、连数据库、做跳转。这一篇补上三个"实战必备"的能力，给 PHP 这条线收个尾：**文件上传**（让用户传头像/附件）、**Session**（记住"你已经登录"）、以及**面向对象**（把代码组织得更像"真实项目"）。

## 一、文件上传

网站让用户传图片、传附件是刚需。HTML 表单必须加 `enctype="multipart/form-data"` 才能传文件：

```html
<form action="upload.php" method="post" enctype="multipart/form-data">
  选择文件：<input type="file" name="avatar">
  <button type="submit">上传</button>
</form>
```

PHP 通过超全局变量 `$_FILES` 接收上传的文件。它不是一个普通值，而是一组信息：

```php
<?php
$file = $_FILES['avatar'];
echo "原始文件名：" . $file['name'];      // 用户本地的文件名
echo "临时存放路径：" . $file['tmp_name']; // 上传后服务器上的临时位置
echo "文件大小(字节)：" . $file['size'];
echo "错误码：" . $file['error'];          // 0 表示没出错
?>
```

上传的文件先被存在服务器的"临时目录"，你需要用 `move_uploaded_file()` 把它搬到真正想存的地方：

```php
<?php
if ($_FILES['avatar']['error'] === 0) {
  $tmp  = $_FILES['avatar']['tmp_name'];
  $dest = 'uploads/' . $_FILES['avatar']['name'];
  if (move_uploaded_file($tmp, $dest)) {
    echo "上传成功，保存在 $dest";
  } else {
    echo "移动文件失败";
  }
}
?>
```

⚠️ **文件上传是高危功能**，必须做安全校验，否则攻击者可以传一个 `.php` 木马文件然后直接访问执行，拿下服务器。至少要做到：
1. **限制类型**：只放行允许的扩展名（如 jpg/png），并检查真实 MIME 类型，不能只看后缀。
2. **限制大小**：检查 `$_FILES['avatar']['size']` 不超过阈值。
3. **重命名**：不要用用户原始文件名（可能含特殊字符或覆盖已有文件），用随机名 + 正确后缀。
4. **存到禁止执行的目录**：上传目录不要有脚本执行权限。

一个更安全的写法示例：

```php
<?php
$allowExt = ['jpg', 'png', 'gif'];
$name = $_FILES['avatar']['name'];
$ext  = strtolower(pathinfo($name, PATHINFO_EXTENSION));
if (!in_array($ext, $allowExt)) {
  die("只允许上传 jpg/png/gif");
}
if ($_FILES['avatar']['size'] > 2 * 1024 * 1024) {
  die("文件不能超过 2MB");
}
$newName = uniqid() . '.' . $ext;          // 随机新名字
move_uploaded_file($_FILES['avatar']['tmp_name'], 'uploads/' . $newName);
echo "上传成功";
?>
```

## 二、Session：记住"你是谁"

HTTP 协议本身是无状态的——每次请求之间服务器都不记得你是谁。你刚登录了，刷新一下页面，服务器又把你当陌生人。怎么让服务器"记住"你登录了？靠 **Session**。

原理：你第一次访问时，服务器给你发一个"身份证号"（session_id，通常存在浏览器的 Cookie 里）。之后你每次请求都带着这个 id，服务器凭它在自己那边查到"这个 id 对应的人已经登录、叫小明"。

PHP 用 Session 很简单，开头加 `session_start()` 即可：

```php
<?php
session_start();   // 必须放在最前面，且前面不能有输出

// 登录成功后，把用户信息存进 Session
$_SESSION['user'] = '小明';
$_SESSION['uid']  = 1;

echo "已把小明记到 Session 里";
?>
```

在另一个页面，同样 `session_start()` 后就能读出来：

```php
<?php
session_start();
if (isset($_SESSION['user'])) {
  echo "欢迎回来，" . $_SESSION['user'] . "！";
} else {
  echo "你还没登录，请先登录。";
}
?>
```

退出登录时销毁 Session：

```php
<?php
session_start();
session_destroy();   // 清空当前会话
echo "已退出登录";
?>
```

典型登录流程就是：用户提交账号密码 → 校验通过 → 把用户 id 写进 `$_SESSION` → 之后每个需要登录的页面都先检查 `$_SESSION` 里有没有这个 id，没有就跳去登录页。

> 注意：`session_start()` 和前面讲的 `header()` 一样，前面不能有任何输出，否则会报错。

## 三、面向对象入门

前面我们写的都是"过程式"代码（一行行顺序执行）。当项目变大，把相关的数据和操作"打包成对象"会更清晰。PHP 支持面向对象（OOP）。

定义一个"用户类"：

```php
<?php
class User {
  public $name;          // 属性（成员变量）
  private $age;          // private 表示只能在类内部访问

  // 构造方法：创建对象时自动调用
  public function __construct($name, $age) {
    $this->name = $name;
    $this->age  = $age;
  }

  // 方法（成员函数）
  public function sayHi() {
    return "你好，我是 " . $this->name;
  }

  public function getAge() {
    return $this->age;
  }
}

// 使用
$u = new User("小明", 18);
echo $u->sayHi();        // 你好，我是 小明
echo $u->getAge();       // 18
?>
```

要点：
- `class` 定义类，`new` 创建对象（实例）。
- `$this` 指代"当前这个对象"，用来在方法里访问自己的属性。
- `public` 外部能访问，`private` 只有类内部能访问（封装，保护数据）。
- `__construct` 是构造方法，创建对象时自动运行，常用来初始化属性。

真实项目里，常把"对一张表的操作"封装成一个类，比如 `User` 类里有 `login()`、`save()`、`findById()` 等方法，代码更有结构、更好维护。

## 常见新手坑

- **`session_start()` 报错**：前面有输出（echo 或 `<?php` 前的空格）。把它放文件最顶、且前面无任何字符。
- **上传文件失败**：检查表单有没有 `enctype="multipart/form-data"`，以及目标目录（如 `uploads/`）是否存在、是否有写入权限。
- **`$_FILES` 为空**：多半是表单缺 `enctype` 或 `method` 不是 `post`。
- **面向对象调用报错**：方法/属性用 `->` 访问（不是 `.`），类内访问自己的属性用 `$this->`。

## 这一篇你该记住的

- 文件上传用 `$_FILES` 接收，`move_uploaded_file()` 从临时目录搬到目标位置；必须校验类型、大小、重命名，且上传目录禁执行，否则有木马风险。
- HTTP 无状态，Session 用 session_id（存 Cookie）让服务器"记住"用户；`session_start()` 后读写 `$_SESSION`，退出用 `session_destroy()`。
- 面向对象用 `class` 定义、`new` 创建对象、`$this` 指代自身、`public/private` 控制可见性，适合把"对一张表/一类事物的操作"打包。
- 二阶段的 PHP 线到此收尾：从"后端是什么"→语法→接收表单→连数据库→上传/Session/对象，一条完整学习链已打通。

下一篇我们进入数据库这条线，先把"为什么不能用 Excel 存数据、关系型数据库到底是什么"讲透，再动手建库建表。
