---
title: HTML 表单实战：做出能和用户"对话"的登录注册框
description: form、input 的十几种 type、label、textarea、select、button，以及 required、pattern 等原生校验怎么写。这篇带你从零拼出一个能用的注册表单。
category: frontend
subcategory: html
tags: ['HTML', '表单', 'form', 'input']
pubDate: 2026-07-05
order: 5
---

页面上的文字、图片都是"网站单方面告诉你"的东西。真正让网站"听你说"的，是表单——登录框、搜索栏、下单页、留言板，全都是表单。它是网页和用户之间双向沟通的窗口。

这一篇我们把表单这套零件拆开，最后拼成一个能用的注册表单。

## 表单的容器：`<form>`

所有表单控件都要包在 `<form>` 里：

```html
<form action="/submit" method="post">
  <!-- 各种输入框放这里 -->
</form>
```

两个关键属性：

- `action`：表单提交到哪个地址（后端接口）。初学做静态页可以留空或写 `#`；
- `method`：提交方式，`get`（数据拼在网址后，适合搜索）或 `post`（数据藏在请求体里，适合登录注册等敏感信息）。

> 注意：HTML 表单本身**不会真的把数据存到数据库**，它只负责"收集数据并发送出去"。真正处理数据要靠后端（比如你后面会学的 Node、PHP）。但先把前端的"收集"做对，是第一步。

## 输入框之王：`<input>`

`<input>` 是最常用的控件，靠 `type` 属性变出十几种形态：

```html
<!-- 单行文本 -->
<input type="text" />

<!-- 密码（输入时显示圆点） -->
<input type="password" />

<!-- 邮箱（手机会弹对应键盘，提交时校验格式） -->
<input type="email" />

<!-- 数字 -->
<input type="number" />

<!-- 电话 -->
<input type="tel" />

<!-- 日期选择器 -->
<input type="date" />

<!-- 颜色选择器 -->
<input type="color" />

<!-- 文件上传 -->
<input type="file" />

<!-- 单选框 -->
<input type="radio" name="gender" /> 男
<input type="radio" name="gender" /> 女

<!-- 复选框 -->
<input type="checkbox" /> 我已阅读协议

<!-- 提交按钮 -->
<input type="submit" value="注册" />
```

记住：**单选框要让 `name` 相同**才能"多选一"；复选框 `name` 相同表示一组可多选。不同 type 在手机上还会唤起不同键盘（如 `tel` 弹数字键盘），体验差异很大。

## 别忘了 `<label>`：可访问性的关键

每个输入框都应该配一个 `<label>`，它有两个写法：

**写法一：label 包住 input**

```html
<label>
  用户名：
  <input type="text" name="username" />
</label>
```

**写法二：用 for 关联（更推荐，结构清晰）**

```html
<label for="username">用户名：</label>
<input type="text" id="username" name="username" />
```

`for` 的值要和 `id` 一致。好处是：点击文字"用户名"时，光标会自动跳进输入框；屏幕阅读器也能正确念出"这是用户名的输入框"。**永远给 input 配 label**，这是专业和业余的分水岭。

## 多行文本：`<textarea>`

单行用 `input`，多行用 `textarea`：

```html
<label for="bio">个人简介：</label>
<textarea id="bio" name="bio" rows="4" cols="30" placeholder="介绍一下自己吧"></textarea>
```

`rows` 和 `cols` 控制初始行数和列数，`placeholder` 是灰色的提示文字（没输入时显示）。textarea 的默认值写在标签中间，不是 value 属性。

## 下拉选择：`<select>` 与 `<option>`

```html
<label for="city">城市：</label>
<select id="city" name="city">
  <option value="bj">北京</option>
  <option value="sh">上海</option>
  <option value="gz">广州</option>
</select>
```

`<select>` 是下拉框，`<option>` 是每个选项。`value` 是提交给后端的值（比如 `bj`），标签里写的是用户看到的中文。想默认选中某项，加 `selected`：`<option value="sh" selected>上海</option>`。多选加 `multiple` 属性（配合 Ctrl 多选）。

## 按钮：`<button>`

```html
<button type="submit">提交</button>
<button type="reset">重置</button>
<button type="button">普通按钮（需 JS 配合）</button>
```

`button` 比 `input type="submit"` 更灵活（里面能放图标文字）。`type="submit"` 会触发表单提交，`type="reset"` 清空表单，`type="button"` 默认不做事（留给 JavaScript）。

## 原生校验：不写 JS 也能拦错

HTML5 自带一套校验，超好用：

```html
<form>
  <input type="text" required />            <!-- 必填 -->
  <input type="email" required />           <!-- 必须是邮箱格式 -->
  <input type="number" min="1" max="100" /> <!-- 数字范围 -->
  <input type="text" pattern="[0-9]{6}" title="请输入6位数字" /> <!-- 正则 -->
  <button type="submit">提交</button>
</form>
```

- `required`：不填不能提交，浏览器自动弹提示；
- `min` / `max` / `step`：数值范围和步长；
- `pattern`：用正则表达式限定格式，比如"6 位数字"；
- `title`：校验失败时给用户的说明；
- `minlength` / `maxlength`：文本长度限制。

这些校验是**前端友好提示**，但**不能替代后端校验**——恶意用户能绕过前端直接发请求。所以安全原则永远是：前端校验提升体验，后端校验保证安全。

## 实战：拼一个注册表单

把上面学的全用上：

```html
<form action="/register" method="post">
  <p>
    <label for="username">用户名：</label>
    <input type="text" id="username" name="username" required />
  </p>

  <p>
    <label for="email">邮箱：</label>
    <input type="email" id="email" name="email" required />
  </p>

  <p>
    <label for="pwd">密码：</label>
    <input type="password" id="pwd" name="pwd" minlength="6" required />
  </p>

  <p>
    <label for="city">城市：</label>
    <select id="city" name="city">
      <option value="bj">北京</option>
      <option value="sh">上海</option>
      <option value="gz">广州</option>
    </select>
  </p>

  <p>
    <label for="bio">自我介绍：</label>
    <textarea id="bio" name="bio" rows="3"></textarea>
  </p>

  <p>
    <input type="checkbox" id="agree" name="agree" required />
    <label for="agree">我已阅读并同意用户协议</label>
  </p>

  <p>
    <button type="submit">立即注册</button>
    <button type="reset">清空重填</button>
  </p>
</form>
```

这就是一个功能完整、带原生校验的注册表单。复制就能用，再配上 CSS 就能变得好看。

## 常见错误与排查

1. **input 没有闭合标签问题**：`<input>` 是自闭合的，别写 `</input>`；
2. **name 属性漏了**：后端靠 `name` 取值，没写 `name` 的字段提交时会被忽略；
3. **radio 要同 name**：否则变单选失效；
4. **label 的 for 没对上 id**：点击文字不聚焦；
5. **只靠前端校验**：后端必须再次校验，否则能被绕过；
6. **method 用错**：密码等敏感数据用 get 会明文出现在 URL 里。

## 动手小练习

1. 做一个登录表单：用户名（text）、密码（password）、"记住我"复选框、登录按钮；
2. 给密码加 `minlength="8"` 和 `pattern` 要求含字母数字；
3. 做一个"意见反馈"表单：昵称、邮箱、下拉选"问题类型"、多行文本框、提交/重置；
4. 故意不写某个 input 的 name，提交后用开发者工具的 Network 面板看数据里是不是少了它；
5. 给表单加 `required`，试试点提交空表单看浏览器提示。


## 把它串起来：做一个完整的注册表单

用纯 HTML 做一个注册表单，包含：用户名（text，required）、邮箱（email，required）、密码（password，minlength=8，pattern 要求含字母和数字）、城市（select 下拉，三个 option）、个人简介（textarea）、"我已同意协议"复选框（required）、提交和重置两个 button。每个 input 都配 `<label for>`。提交后用开发者工具 Network 面板看发送的数据里有没有你漏写 `name` 的字段。这个表单加上 CSS 就能直接用，加上后端就能真注册。

## 新手常问（FAQ）

**Q1：为什么后端收不到我的某个输入框的值？**
多半是忘了写 `name` 属性。后端靠 `name` 取值，`name` 缺失的字段提交时会被忽略。

**Q2：前端加了 `required` 是不是就安全了？**
不是。`required` 只是浏览器友好提示，恶意用户可以绕过前端直接发请求。真正的安全校验必须在后端再做一次。

**Q3：单选框为什么能多选？**
因为 `name` 没写成一样。同一组单选框必须 `name` 相同才能"多选一"；复选框 `name` 相同表示一组可多选。


## 这一篇你该记住的

表单用 `<form>` 包起来，`action` 是提交地址、`method` 是 get/post；`<input>` 靠 `type` 变出文本/密码/邮箱/文件/单选/复选等形态，每个 input 都要配 `<label>`；多行用 `<textarea>`、下拉用 `<select>`、按钮用 `<button>`；`required`/`pattern` 等原生校验能不写 JS 就拦错，但只是体验层，安全还得靠后端。

表单让网站能"听用户说"了。但满屏 `div` 的做法既不专业也不友好——下一篇我们讲 **HTML 语义化标签**，学会用 `header`、`nav`、`main` 这些"带名字的容器"，同时讨好搜索引擎和屏幕阅读器。
