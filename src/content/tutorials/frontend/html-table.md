---
title: HTML 表格完全手册：从课程表到价目表都能排
description: table、thead、tbody、tfoot、tr、th、td 各司其职，rowspan 和 colspan 怎么合并单元格，表格语义化和响应式又该注意什么。一篇把 HTML 表格讲透。
category: frontend
subcategory: html
tags: ['HTML', '表格', 'table', '排版']
pubDate: 2026-07-04
updatedDate: 2026-07-04
order: 4
---

一说表格，很多人的第一反应是"网页布局是不是用 table 排"。那是上古年代的野路子，早被 flex、grid 取代了。但表格在它该出现的地方依然无可替代——凡是"行和列交叉呈现数据"的场景，比如价目表、成绩单、参数对比、库存清单，用表格才是正确的语义。

这一篇我们就把 `<table>` 这一大家子标签理顺。

## 表格的基本结构

一个最朴素的表格：

```html
<table>
  <tr>
    <td>姓名</td>
    <td>年龄</td>
  </tr>
  <tr>
    <td>小明</td>
    <td>18</td>
  </tr>
</table>
```

三个核心标签：

- `<table>`：表格容器，所有内容都包在它里面；
- `<tr>`（table row）：**一行**；
- `<td>`（table data）：**一个单元格**。

结构逻辑是：**table 包 tr，tr 包 td**。一行里有几个 `td`，这行就有几列。记住这个"俄罗斯套娃"关系，就不会写乱。

## 表头：用 `<th>` 而不是 `<td>`

第一行通常放"列名"（姓名、年龄），这种"标题单元格"要用 `<th>`（table header）而不是 `<td>`：

```html
<table>
  <tr>
    <th>姓名</th>
    <th>年龄</th>
  </tr>
  <tr>
    <td>小明</td>
    <td>18</td>
  </tr>
</table>
```

`<th>` 默认**加粗居中**，更重要的是它带语义——告诉浏览器"这是表头"，屏幕阅读器念数据时也会先念表头，无障碍体验更好。凡是表头单元格，一律用 `<th>`。

## 语义分组：thead / tbody / tfoot

当表格变长，建议用三个标签把"表头、表身、表脚"分开：

```html
<table>
  <thead>
    <tr>
      <th>商品</th>
      <th>单价</th>
      <th>数量</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>苹果</td>
      <td>5</td>
      <td>3</td>
    </tr>
    <tr>
      <td>香蕉</td>
      <td>3</td>
      <td>5</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td>合计</td>
      <td></td>
      <td>8</td>
    </tr>
  </tfoot>
</table>
```

- `<thead>`：表头区域，放列名；
- `<tbody>`：表身，放数据行（**可以有很多个 tbody**，把数据分组）；
- `<tfoot>`：表脚，放汇总行。

好处：浏览器打印长表格时，thead 会在每页顶部重复；结构清晰也好用 CSS 分别美化（比如 tbody 隔行变色）。

## 合并单元格：rowspan 与 colspan

这是表格里最让人头大的部分，但记住一句话就通了：**rowspan 是"往下跨几行"，colspan 是"往右跨几列"**。

**横向合并（colspan）——一个单元格占多列**

```html
<table border="1">
  <tr>
    <th colspan="2">个人信息</th>
  </tr>
  <tr>
    <td>姓名</td>
    <td>小明</td>
  </tr>
</table>
```

`colspan="2"` 表示这个表头单元格横跨 2 列，于是下面那行才有空间放两个 `td`。

**纵向合并（rowspan）——一个单元格占多行**

```html
<table border="1">
  <tr>
    <th rowspan="2">水果</th>
    <td>苹果</td>
  </tr>
  <tr>
    <td>香蕉</td>
  </tr>
</table>
```

`rowspan="2"` 表示"水果"这个单元格纵向占 2 行，所以第二行只有 1 个 `td`（被它占掉了一格）。

> 小技巧：合并单元格时，被"吃掉"的那几个格子**就不要再写 `td` 了**，否则会错位。先画格子、再决定谁跨谁，最不容易乱。可以先在纸上画个草图。

## 给表格加边框看结构

上面的例子里我加了 `border="1"`，这是 HTML 自带的快速边框（实际项目里边框应该用 CSS 写）。初学调试时加上它，能立刻看清行列关系，非常实用。熟练后改用 CSS 的 `border-collapse: collapse` 让边框更美观。

## 表格的响应式：手机上别撑破

表格列一多，手机上很容易超出屏幕。两个实用办法：

**办法一：容器横向滚动**

```html
<div style="overflow-x: auto;">
  <table>...</table>
</div>
```

外层包一个 `overflow-x: auto` 的容器，表格太宽时就能左右滑动，不会撑破页面。这是最简单稳妥的方案。

**办法二：小屏转卡片（进阶，配合 CSS）**

在很窄的屏幕上，把每行变成一张"卡片"，用 CSS 把 `td` 变成块级元素，并用 `data-label` 伪元素显示列名。这个稍复杂，先知道有这思路即可，等学了 CSS 媒体查询再回来做。

## 表格语义化 checklist

写表格时记住这几点，专业度立刻上来：

1. 表头用 `<th>`，不用 `<td>`；
2. 长表格用 `thead/tbody/tfoot` 分组；
3. 给表格加 `<caption>` 标题，说明这表是干嘛的：

```html
<table>
  <caption>2026 年第二季度销售数据</caption>
  ...
</table>
```

4. 复杂表格可以用 `scope` 属性标明 th 是行表头还是列表头：`<th scope="col">`、`th scope="row"`，进一步帮屏幕阅读器理解；
5. 用 `aria-describedby` 关联表格说明（进阶）。

## 常见错误与排查

1. **tr/td 写反**：记住 table>tr>td 的层级，td 不能直接放 table 下；
2. **合并后错位**：colspan/rowspan 后忘了删掉被占的格子；
3. **用 table 做布局**：现代应用 flex/grid，table 只放数据；
4. **表头用 td**：丢失语义，屏幕阅读器无法区分；
5. **手机上溢出**：没包 overflow-x:auto。

## 动手小练习

1. 做一个"课程表"：表头是星期一到五，行是上午/下午，用 thead/tbody，并给"上午""下午"加 `scope="row"` 的 th；
2. 做一个"价目表"，用 colspan 让"套餐"跨两列，用 tfoot 写合计；
3. 故意在合并单元格时多写一个 td，观察错位现象，再修正；
4. 把表格包进 `overflow-x:auto` 的 div，缩窄浏览器窗口看是否可横向滚动。

## 一个完整示例：课程表

```html
<table border="1">
  <caption>每周课程表</caption>
  <thead>
    <tr>
      <th scope="col">时间</th>
      <th scope="col">周一</th>
      <th scope="col">周二</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">上午</th>
      <td>数学</td>
      <td>语文</td>
    </tr>
    <tr>
      <th scope="row">下午</th>
      <td>英语</td>
      <td>体育</td>
    </tr>
  </tbody>
</table>
```

注意这里"上午/下午"是**行表头**，所以用了 `<th scope="row">`，这是表格语义化的标准做法。


## 把它串起来：做一份"课程表 + 成绩表"

用表格做两个东西：一是每周课程表（表头星期一到五，行是上午/下午，行表头用 `<th scope="row">`，并用 `thead/tbody` 分组，加 `<caption>` 说明）；二是成绩表（用 `colspan` 让"期中/期末"跨两列，用 `rowspan` 让"小明"跨两行，用 `tfoot` 写平均分）。做完故意在合并单元格时多写一个 `<td>`，观察错位现象，再删掉它修正。最后把表格包进 `overflow-x:auto` 的容器，缩窄窗口看是否能横向滚动。

## 新手常问（FAQ）

**Q1：表格能不能用来给整个网页排版？**
上古年代可以，现在不行。布局请用 flex / grid，表格只用于"行列交叉的数据"，否则语义错乱、维护痛苦。

**Q2：`rowspan` 和 `colspan` 到底哪个跨行哪个跨列？**
记一句：`colspan` 往右跨列（column），`rowspan` 往下跨行（row）。合并时别忘了删掉被"吃掉"的格子。

**Q3：表头到底用 `<td>` 还是 `<th>`？**
必须用 `<th>`。它默认加粗居中，更重要的是带"这是表头"的语义，读屏软件念数据时会先念表头。


## 这一篇你该记住的

表格结构是 `table > tr > (th|td)`，`th` 是表头（加粗居中且带语义），长表格用 `thead/tbody/tfoot` 分组；`colspan` 往右跨列、`rowspan` 往下跨行，合并时记得删掉被占的格子；手机上用 `overflow-x:auto` 防撑破；用 `caption` 和 `scope` 提升语义化。

表格排好了数据，但真正让网站"听用户说"的，是表单——登录框、搜索栏、留言板全都是它。下一篇我们讲 **HTML 表单实战**，从零拼出一个能用的注册表单。
