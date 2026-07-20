---
title: Vue 基础：响应式数据与模板指令
description: 从 Vue 单文件组件讲起，掌握 ref/reactive 响应式、模板插值、v-if/v-for/v-bind/v-on 等核心指令，写出第一个会交互的 Vue 应用。
category: frontend
subcategory: frameworks
tags: ['Vue', '响应式', '指令', '前端框架']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 2
---

上一篇建立了"状态驱动视图"的思维，这一篇落到具体的 Vue 上。Vue 是国内最流行的前端框架之一，它的特点是**上手平缓、文档友好、单文件组件把结构/逻辑/样式收在一起**，特别适合从原生 JS 过渡的同学。

Vue 的魔法叫**响应式（Reactivity）**：你声明一个数据，模板里用到它的地方，会"自动"在数据变化时重新渲染。你完全不用手动去改 DOM。这一篇我们把 Vue 的核心机制讲透，并写出一个能增删列表的小应用。

## 单文件组件：三块合一

Vue 推荐用 **SFC（Single File Component，单文件组件）**，一个 `.vue` 文件里写三块：

```vue
<script setup>
// 逻辑：状态和方法
</script>

<template>
  <!-- 结构：界面长什么样 -->
</template>

<style scoped>
/* 样式：只作用于本组件 */
</style>
```

`scoped` 让样式只对本组件生效，避免全局污染。这种"一个组件一个文件"的组织，让代码既清晰又好维护。

## 响应式：ref 和 reactive

要让数据"变了我界面就跟着变"，得用 Vue 提供的响应式 API。最常用的是 `ref`：

```vue
<script setup>
import { ref } from 'vue';

const count = ref(0);          // 响应式数字，初始 0
const message = ref('你好');

function increment() {
  count.value++;               // 注意：脚本里访问要加 .value
}
</script>
```

关键点：**`ref` 包裹的值，在 `<script>` 里访问要加 `.value`，在模板里不用**。模板里直接写 `{{ count }}` 即可，Vue 自动帮你解开。

如果是对象/数组，可用 `reactive`（不用 `.value`，直接改属性）：

```js
import { reactive } from 'vue';
const user = reactive({ name: '小明', age: 18 });
user.age++; // 直接改，界面自动更新
```

经验：**基本类型用 `ref`，对象用 `reactive`**（也可以对象也用 `ref`，访问时 `user.value.name`）。新手统一用 `ref` 最不容易错。

## 模板插值：把数据"贴"到界面

模板里用双花括号 `{{ }}` 显示数据，它会被 Vue 替换成对应的值，且随数据变化自动更新：

```vue
<template>
  <p>{{ message }}</p>
  <p>计数：{{ count }}</p>
  <p>{{ user.name }} 今年 {{ user.age }} 岁</p>
</template>
```

花括号里可以是变量，也可以是简单表达式（如 `{{ count * 2 }}`），但**不放复杂逻辑**（那该放方法里）。

## 核心指令：v- 开头的特殊属性

Vue 用以 `v-` 开头的"指令"在模板里做动态行为。最常用的四个：

**1. `v-bind`：动态绑定属性**（语法糖是 `:`）

```vue
<img :src="imageUrl" :alt="imageAlt" />
<!-- 等价于 v-bind:src -->
```

数据变了，`src` 自动变。常用于动态 class、style、链接。

**2. `v-on`：监听事件**（语法糖是 `@`）

```vue
<button @click="increment">+1</button>
<input @input="onInput" />
```

`@click` 点、`@input` 输入、`@submit` 提交，方法名写在引号里。

**3. `v-if` / `v-else`：条件渲染**

```vue
<p v-if="count > 0">计数大于 0</p>
<p v-else>计数是 0</p>
```

条件为真才渲染该元素。注意和 `v-show` 区别：`v-if` 是真删 DOM，`v-show` 只是切 `display` 样式——频繁切换用 `v-show`，不常切换用 `v-if`。

**4. `v-for`：列表渲染**

```vue
<ul>
  <li v-for="item in items" :key="item.id">{{ item.name }}</li>
</ul>
```

**` :key` 极其重要**：它帮 Vue 识别每个列表项，高效更新。别用数组下标当 key（重排时会出 bug），用唯一 id。

## 双向绑定：v-model

表单输入"用户打字 → 数据更新 → 界面反映"是高频需求。`v-model` 一行搞定双向绑定：

```vue
<input v-model="message" placeholder="输入点什么" />
<p>你输入了：{{ message }}</p>
```

用户在输入框打字，`message` 自动更新，下面的 `{{ message }}` 也跟着变。等价于"`:value` + `@input`"的语法糖，但省事太多。

## 计算属性：派生数据用 computed

如果界面要显示一个"基于其他数据算出来"的值，别在模板写复杂表达式，用 `computed`：

```vue
<script setup>
import { ref, computed } from 'vue';
const price = ref(100);
const quantity = ref(2);
const total = computed(() => price.value * quantity.value); // 自动随依赖变
</script>

<template>
  <p>总价：{{ total }}</p>
</template>
```

`computed` 会**缓存**结果，只有依赖变了才重算，比每次渲染都调函数高效。它的语义是"一个值由别的值推导而来"。

## 常见新手坑

- **脚本里忘了 `.value`**：`count++` 不生效，得 `count.value++`。模板里才不用加。
- **`v-for` 不写 `:key`**：列表更新错乱、输入框内容串位。务必用唯一 id 作 key。
- **在模板里写复杂逻辑**：`{{ items.filter(...).map(...) }}` 又慢又难读，挪到 `computed`。
- **用 `v-if` 和 `v-for` 同一元素**：Vue 里 `v-if` 优先级高于 `v-for`，混用逻辑混乱。先过滤数据再 `v-for`，或套一层 `template` 用 `v-if`。
- **直接替换 reactive 对象**：`user = {...}` 会丢失响应性（reactive 不能整体替换），用 `Object.assign` 或改用 `ref`。
- **误以为 `computed` 能改值**：`computed` 默认只读，要改得写 `get/set`，否则用 `ref` + 方法。

## 实战：一个待办列表（增删）

把上面串起来，做一个能"加任务、删任务、显示数量"的小应用：

```vue
<script setup>
import { ref, computed } from 'vue';

const todos = ref([]);
const newTodo = ref('');

const remaining = computed(() => todos.value.length);

function add() {
  const text = newTodo.value.trim();
  if (!text) return;                 // 空的不加
  todos.value.push({
    id: Date.now(),
    text,
  });
  newTodo.value = '';               // 清空输入框
}

function remove(id) {
  todos.value = todos.value.filter(t => t.id !== id);
}
</script>

<template>
  <input v-model="newTodo" @keyup.enter="add" placeholder="输入任务回车添加" />
  <button @click="add">添加</button>

  <ul>
    <li v-for="t in todos" :key="t.id">
      {{ t.text }}
      <button @click="remove(t.id)">删除</button>
    </li>
  </ul>

  <p>共 {{ remaining }} 个任务</p>
</template>
```

全程你没碰过 DOM：`todos` 是状态，`v-for` 渲染列表，`@click` 改状态，`computed` 派生数量。状态一变，界面自动同步——这就是 Vue 响应式的全部魅力。

## 新手怎么把 Vue 基础练熟

Vue 上手快，但"响应式思维"要练。建议每天一个小练习：做一个计数器（加减）、一个显示/隐藏切换（v-if）、一个可增删的列表（v-for + key）、一个输入框实时回显（v-model）。重点是**忍住不用 `getElementById`**，强迫自己"只改状态"。

另一个心法：**`ref` 的 `.value` 只在 `<script>` 里出现**，`<template>` 里永远不写 `.value`。记不住就默念"脚本加 value，模板不加"。这是 Vue 新手 80% bug 的来源。

还有，善用 Vue 官方提供的"响应式"调试。浏览器装 Vue DevTools 插件，能实时看到每个组件的 `ref`/`reactive` 当前值，改了什么、界面怎么变，一目了然。调试 Vue 没有 DevTools，就像开车没有后视镜。

## 小测验：看看你掌握了没

- 问题一：`ref` 的值在脚本里和模板里访问方式有什么不同？答案：脚本里要 `.value`，模板里直接写变量名（Vue 自动解开）。
- 问题二：为什么 `v-for` 必须写 `:key`？答案：帮 Vue 识别列表项身份，高效且正确地更新/重排，避免状态错乱。
- 问题三：`computed` 和直接在模板写表达式比，优势是什么？答案：会缓存，依赖不变不重算；语义清晰（派生值），模板更干净。

## 这一篇你该记住的

- Vue 单文件组件 = `<script>` + `<template>` + `<style scoped>` 三块合一。
- 响应式：`ref`（基本类型，脚本里 `.value`）/`reactive`（对象，直接改属性）。
- 模板插值 `{{ }}`，指令 `v-bind`(`:`)、`v-on`(`@`)、`v-if`/`v-else`、`v-for`(必带 `:key`)。
- `v-model` 一行实现表单双向绑定；`computed` 派生并缓存值。
- 实战：只改状态，界面自动同步，绝不手动操作 DOM。

下一篇我们讲 **React 基础**：组件、JSX、useState 与事件，建立和 Vue 相通但写法不同的认知。
