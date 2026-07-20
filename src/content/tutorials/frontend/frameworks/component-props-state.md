---
title: 组件通信：props 与单向数据流
description: 从"为什么需要组件通信"讲起，掌握父传子 props、子传父回调、单向数据流原则，以及 Vue 与 React 的对应写法，搭出可维护的组件树。
category: frontend
subcategory: frameworks
tags: ['前端框架', '组件通信', 'props', '单向数据流']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 4
---

单个组件再强，也只是乐高的一块。真实页面是**组件的树**：一个页面组件，底下有头部、侧边栏、内容区，内容区里又是一排卡片。问题来了：父组件的数据，怎么传给子组件？子组件发生了点击，怎么告诉父组件？

这就是**组件通信**。它的核心原则只有一句话：**单向数据流**——数据从父流向子，子想改数据要通过"回调"通知父，由父来改。这一篇我们把 props、子传父、以及为什么"单向"更安全讲透，Vue 和 React 都会给例子。

## 父传子：props（只读的传话筒）

**props** 是父组件传给子组件的"参数"，子组件接收后用于渲染。关键性质：**props 是只读的**，子组件不能改它（改了框架会警告）。

**Vue 版**：

```vue
<!-- 父 -->
<UserCard :name="user.name" :age="user.age" />

<!-- 子 UserCard.vue -->
<script setup>
const props = defineProps({
  name: String,
  age: Number,
});
</script>
<template>
  <div>{{ props.name }} 今年 {{ props.age }} 岁</div>
</template>
```

父用 `:name="..."` 传，子用 `defineProps` 声明接收。子组件里 `props` 只读。

**React 版**：

```jsx
// 父
<UserCard name={user.name} age={user.age} />

// 子
function UserCard(props) {
  return <div>{props.name} 今年 {props.age} 岁</div>;
}
```

React 里 props 就是函数的参数对象。同样只读——不能直接 `props.name = 'x'`。

## 子传父：通过"回调 props"

子组件没有自己的办法直接改父的数据（因为 props 只读）。但父可以**传一个函数给子**，子在特定时机（如点击）调用这个函数，把数据"回传"给父，由父来改自己的状态。这就是"子传父"。

**Vue 版**（用 `defineEmits` 发事件）：

```vue
<!-- 子 Counter.vue -->
<script setup>
const emit = defineEmits(['change']);
function onClick() {
  emit('change', 1); // 通知父：变化了 +1
}
</script>
<template>
  <button @click="onClick">+1</button>
</template>

<!-- 父 -->
<Counter @change="(delta) => count += delta" />
```

**React 版**（直接传函数 prop）：

```jsx
// 父
function Parent() {
  const [count, setCount] = useState(0);
  return <Counter onChange={(delta) => setCount(c => c + delta)} />;
}

// 子
function Counter({ onChange }) {
  return <button onClick={() => onChange(1)}>+1</button>;
}
```

两种写法本质一样：**父把一个"处理函数"作为 prop 传给子，子调用它把信息带回父，父在自己的状态里改**。这就是单向数据流的标准闭环。

## 单向数据流：为什么重要

"单向"指数据**只能从父到子流动**，子不能直接改父的数据，只能通过回调请求父去改。好处：

- **可预测**：想找"某个数据在哪被改了"，顺着父组件往上找就行，不会散落各处。
- **易调试**：数据流向清晰，出 bug 时一眼看出是哪一层传错了。
- **组件可复用**：子组件不依赖父的内部实现，换个父也能用。

反面是"双向绑定满天飞"——子改父、父改子互相纠缠，项目一大就变成"意大利面条"，谁改了什么全乱套。所以框架都倡导单向流，即便有 `v-model`/`useSyncExternalStore` 这类"双向"语法糖，底层仍是单向的受控逻辑。

## 状态该放哪：提升状态（Lifting State）

一个经典问题：两个兄弟组件都要用同一份数据（如 A 输入框、B 实时显示），数据该放谁那？答案是**提升（lift）到它们共同的父组件**，父持有状态，分别通过 props 传给两个子。

```
        Parent（持有 state: text）
       /        \
   Input(子A)   Preview(子B)
   改 text       显示 text
```

- 父 `Parent` 用 `useState` 持有 `text`。
- 父把 `text` 通过 props 传给 `Preview` 显示。
- 父把一个 `setText` 回调传给 `Input`，Input 打字时调它，父更新 `text`，`Preview` 自动刷新。

这就是"状态提升"——**谁需要、就往它们共同的祖先提一层**。它是 React 里最重要的设计模式之一，Vue 同理。

## 跨层通信：provide/inject 与 Context

如果组件层级很深（父 → 子 → 孙 → 曾孙），一层层传 props 很累（叫"prop drilling"透传地狱）。两种解法：

- **Vue**：用 `provide` / `inject`，祖先 `provide` 一个值，任意后代 `inject` 直接拿，跳过中间层。
- **React**：用 `Context`，把值放进 `Context.Provider`，深层组件用 `useContext` 直接取。
- **通用**：更重的场景用"状态管理库"（下一大类的主题，如 Pinia、Redux）。

但记住：**能 props 传就不要上 Context/状态库**。过度使用全局状态会让数据流 again 变乱。优先局部、就近提升。

## 常见新手坑

- **在子组件改 props**：`props.name = 'x'` 会警告且无效。要改就通过回调让父改，或子用 `ref` 维护自己的本地副本。
- **状态放错位置**：两个兄弟都要的数据只放在其中一个，导致另一个拿不到。记住"提升到共同父"。
- **prop drilling 地狱**：五六层传同一个 props，应改用 provide/inject 或 Context。
- **回调命名混乱**：React 里 `onXxx` 约定（如 `onClick`、`onChange`），子调用 `props.onXxx(...)`，别起名 `handleXxx` 当 prop 名（那是父自己的函数名）。
- **把函数当数据传却忘了依赖**：父传给子的回调若依赖父的某状态，状态变时回调要重新生成或用函数式更新，否则子拿到旧闭包。
- **过度使用全局状态**：什么都塞进状态库，数据流再次失控。局部优先。

## 实战：父子联动的搜索框

父持有 `keyword`，输入框（子）改 keyword，列表（子）按 keyword 过滤显示：

```jsx
function SearchPage() {
  const [keyword, setKeyword] = useState('');

  return (
    <div>
      <SearchInput value={keyword} onChange={setKeyword} />
      <ResultList keyword={keyword} />
    </div>
  );
}

function SearchInput({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="搜索"
    />
  );
}

function ResultList({ keyword }) {
  const list = ['苹果', '香蕉', '橙子', '苹果汁'];
  const filtered = list.filter(i => i.includes(keyword));
  return (
    <ul>
      {filtered.map(i => <li key={i}>{i}</li>)}
    </ul>
  );
}
```

`keyword` 提升在 `SearchPage`，`SearchInput` 通过 `onChange` 回调改它，`ResultList` 通过 `keyword` prop 接收并过滤。单向数据流清晰：数据在父，子只读 + 回调通知。这是几乎所有表单/筛选交互的标准骨架。

## 新手怎么把组件通信练熟

组件通信是搭大应用的骨架，不熟就写不出真实项目。建议每天一个小练习：做一个"父显示计数、子有 +1 按钮"（子传父）；做一个"父传用户名给子显示"（父传子）；做一个"兄弟组件共享一个开关"（状态提升）。重点是**忍住不把状态乱放**，严格走"父持有 → props 下传 → 回调上传"。

另一个心法：**画组件树**。动手前先在本子上画：页面由哪些组件组成、谁是谁的父/子、哪些数据需要共享、共享数据提到哪一层。想清楚这棵树，代码自然就清晰了。很多"组件越写越乱"的问题，根源是没先规划结构，想到哪写到哪。

还有，区分"受控"和"非受控"。表单类组件，值来自父（props）且通过回调改，叫受控——数据流透明、好调试，优先用。只有极简单场景才用非受控（组件自己内部管值，父需要时再取）。受控是 React/Vue 官方推荐的默认姿势。

## 小测验：看看你掌握了没

- 问题一：子组件为什么不能直接改 props？答案：props 是只读的传话筒，保证单向数据流可预测；要改须通过回调让父改自己的状态。
- 问题二：两个兄弟组件都要同一份数据，放哪？答案：提升到它们共同的父组件（状态提升），再用 props 分别下发。
- 问题三：props 透传层数太多（drilling）怎么办？答案：用 provide/inject（Vue）或 Context（React），或更重的状态管理库，但局部优先。

## 这一篇你该记住的

- 父传子用 **props**（只读）；子传父用**回调 prop**（子调用通知父改）。
- 单向数据流：数据父→子，子不能直接改父，只能请求父改，保证可预测、易调试。
- 状态提升：多个组件共享的数据，提到共同父组件，再 props 下发。
- 深层透传用 provide/inject（Vue）或 Context（React），但局部优先、别滥用全局。
- 实战骨架：父持有状态 → props 下传 → 回调上传，所有表单/筛选皆此模式。

下一篇我们讲 **前端路由**：单页应用怎么在"不刷新整页"的情况下切换页面，vue-router 与 react-router 的核心概念。
