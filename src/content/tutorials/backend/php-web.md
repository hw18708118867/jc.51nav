---
title: PHP 与 HTML 混写：接收表单与页面跳转
description: 把 PHP 嵌进 HTML 动态输出，理解 GET 与 POST 的区别，用 $_GET/$_POST 接收用户提交，并用 header() 实现页面跳转。
category: backend
subcategory: php
tags: ['PHP', '表单', 'GET', 'POST', '页面跳转']
pubDate: 2026-07-16
order: 2
---

上一篇我们让 PHP 输出了时间和文字，但那还只是"自说自话"。真正的网站，是用户在前端填表、点按钮，后端收下来处理再给回应。这一篇就讲这个"前后端握手"的过程。

读完你会明白两件最核心的事：第一，用户的输入怎么送到 PHP 手里（`$_GET` 和 `$_POST`）；第二，PHP 怎么把用户"带"到另一个页面（`header()` 跳转）。

## PHP 嵌进 HTML：动态输出

PHP 最大的便利，就是能直接写在 HTML 里，用 `<?php ... ?>` 随时插入动态内容。比如根据用户是否登录显示不同文字：

```php
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>欢迎</title></head>
<body>
  <h1>欢迎来到我的小站</h1>
  <p>现在时间是：<?php echo date('H:i:s'); ?></p>
  <p>今天是第 <?php echo date('z') + 1; ?> 天</p>
</body>
</html>
```

服务器执行这段 PHP，把 `date(...)` 的结果替换进 HTML，再发给浏览器。用户看到的永远是"算好的"内容。

你也可以在 PHP 里反过来"吐"出一整段 HTML：

```php
<?php
$score = 95;
if ($score >= 60) {
  echo "<p style='color:green'>及格啦！</p>";
} else {
  echo "<p style='color:red'>不及格，加油。</p>";
}
?>
```

注意：在双引号字符串里写 HTML 标签是可以的，但要小心引号嵌套。更清晰的做法是用 PHP 控制逻辑、HTML 留在外面，像上面第一个例子那样混写。

## GET 与 POST：两种提交方式

用户提交数据，主要有两种方式，理解它们的区别非常重要。

**GET**：把数据"挂在网址后面"传过去。比如你搜索"手机"，网址会变成 `?q=手机`。特点：
- 数据暴露在网址里，谁都能看见、能收藏、能分享。
- 适合"查询、筛选"这类不敏感、可重复的操作（搜索、翻页、点链接）。
- 长度有限（网址不能太长）。

**POST**：把数据"藏在请求体里"传过去，网址上看不到。特点：
- 数据不在网址里，相对私密。
- 适合"提交、修改"这类操作（登录、注册、发帖、下单）。
- 长度基本没限制，能传文件。

一句话记忆：**GET 像把纸条贴在公开信箱上（看得见），POST 像把信塞进信封里寄（看不见）。**

## 用 $_GET 接收网址参数

假设网址是 `info.php?name=小明&age=18`，PHP 里这样取：

```php
<?php
$name = $_GET['name'];   // "小明"
$age  = $_GET['age'];    // "18"（注意是字符串）
echo "你好，$name，你今年 $age 岁了。";
?>
```

`$_GET` 是一个"关联数组"，键就是网址里 `?` 后面 `键=值` 的键。访问 `info.php?name=小红&age=20` 就会显示不同内容。

⚠️ 安全提醒：`$_GET` 来的数据绝对不能直接信任！比如直接 `echo $_GET['name']` 会把用户传的任何 HTML/JS 原样输出，可能被用来做 XSS 攻击。正式项目里要先"转义"再输出（后面安全篇章会细讲）。本篇先学会接收，安全意识先种下。

## 用 $_POST 接收表单

最常见的是 HTML 表单。写一个登录表单 `login.html`：

```html
<form action="login.php" method="post">
  用户名：<input type="text" name="username"><br>
  密码：<input type="password" name="password"><br>
  <button type="submit">登录</button>
</form>
```

关键点：
- `action="login.php"` 表示表单提交后交给 `login.php` 处理。
- `method="post"` 表示用 POST 方式提交（数据不挂网址）。
- 每个输入框的 `name` 属性，就是 PHP 那边接收时的"键"。

`login.php` 这样接收：

```php
<?php
$username = $_POST['username'];
$password = $_POST['password'];

// 这里先只做演示，真实项目要查数据库并校验密码哈希
if ($username === 'admin' && $password === '123456') {
  echo "登录成功，欢迎 $username！";
} else {
  echo "用户名或密码错误。";
}
?>
```

提交后，PHP 从 `$_POST` 里按 `name` 取到用户输入。这就是"前端填表 → 后端收数据"的完整闭环。

## 一个完整的"留言板"小例子

把上面串起来，做一个最简留言板。前端 `guestbook.html`：

```html
<form action="save.php" method="post">
  昵称：<input type="text" name="nick"><br>
  留言：<textarea name="msg"></textarea><br>
  <button type="submit">提交</button>
</form>
```

后端 `save.php` 把留言追加存进文件：

```php
<?php
$nick = $_POST['nick'];
$msg  = $_POST['msg'];

$line = date('Y-m-d H:i:s') . " | $nick 说：$msg\n";
file_put_contents('messages.txt', $line, FILE_APPEND);

echo "谢谢你的留言，$nick！";
?>
```

刷新 `messages.txt`，能看到一条条留言被追加进去。这已经是一个"能存数据"的动态应用雏形了——虽然简陋，但原理和大型网站一致。

## 用 header() 实现页面跳转

处理完表单后，常常要让用户去另一个页面（比如登录成功跳到首页）。用 `header()` 发送一个"重定向"指令：

```php
<?php
// 登录校验通过后
header("Location: home.php");
exit;   // 跳转后务必 exit，避免后面代码继续执行
?>
```

注意两个坑：

1. **`header()` 前面不能有任何输出**（包括 `echo`、甚至 `<?php` 之前的空行/空格）。一旦浏览器收到了哪怕一个字符，HTTP 头就已经发出去了，再 `header()` 就会报 "Cannot modify header information" 错误。所以跳转逻辑尽量放在文件最前面。
2. **跳转后加 `exit;`**：否则 PHP 会继续往下执行后面的代码，可能泄露本不该执行的逻辑。

如果想"几秒后跳转"并带提示，可以输出一个 meta 刷新：

```php
echo "注册成功，2 秒后跳转到首页……";
echo '<meta http-equiv="refresh" content="2;url=home.php">';
```

## 常见新手坑

- **`Undefined array key` 错误**：用户没传某个参数时，`$_GET['xxx']` 会报未定义。稳妥写法是用 `$_GET['xxx'] ?? '默认值'` 提供兜底。
- **表单提交后空白**：检查 `form` 的 `method` 和 PHP 里用的是 `$_GET` 还是 `$_POST` 是否一致；`name` 属性有没有写。
- **`header()` 报错**：检查 `<?php` 之前有没有空格或空行，以及前面有没有 `echo`。
- **中文乱码**：前端表单页和后端处理页都要用 UTF-8，并在 `<head>` 声明 `charset`。

## 这一篇你该记住的

- PHP 可以直接嵌进 HTML 动态输出；也能在 PHP 里 `echo` 出 HTML。
- GET 把数据挂网址（适合查询、可分享），POST 把数据藏请求体（适合提交、私密）。
- `$_GET['键']` 和 `$_POST['键']` 按表单/网址里的 `name` 取用户数据；用户数据不可信，正式项目要先转义。
- 一个留言板例子串起了"前端表单 → 后端接收 → 存文件 → 回显"的完整闭环。
- `header("Location: 页面")` 做跳转，前面不能有输出，跳转后加 `exit;`。

下一篇我们让 PHP 真正连上 MySQL 数据库，把数据存进表、再查出来渲染成网页，完成"表单 → PHP → 数据库"的企业级闭环。
