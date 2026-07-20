---
title: React 基础：组件、JSX 与 useState
description: 从 React 组件讲起，掌握 JSX 写法、函数组件、useState 管理状态、事件处理与列表渲染，理解 React 和 Vue 相通的底层思想。
category: frontend
subcategory: frameworks
tags: ['React', 'JSX', 'useState', '前端框架']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 3
---

上一篇我们学了 Vue，这一篇换 React。很多人以为 Vue 和 React 是"两门语言"，其实它们**底层思想完全一样**：状态驱动视图、组件化、声明式。区别只在"语法长相"和"状态怎么更新"。

React 最大的特点是 **JSX**——直接在 JavaScript 文件里写 HTML 标签，组件用"函数"定义，状态用 `useState` 管理。这一篇我们建立 React 的基础认知，并写出和 Vue 篇对应的"计数器 + 待办列表"。

## 组件就是函数

在 React（函数组件写法）里，**一个组件就是一个返回界面的函数**。函数名大写开头，返回 JSX：

```jsx
function Welcome() {
  return <h1>你好，React！</h1>;
}
```

注意 `Welcome` 首字母必须大写——React 靠这个区分"这是组件"还是"这是普通 HTML 标签"。返回的那段 `<h1>...</h1>` 就是 JSX。

## JSX：JS 里的 HTML

**JSX** 让你在 JavaScript 里直接写类似 HTML 的标记。它看起来像模板，本质是被编译成 `React.createElement(...)` 调用。

```jsx
const name = '小明';
return (
  <div>
    <p>你好，{name}</p>     {/* 花括号里写 JS 表达式 */}
    <p>{1 + 2}</p>
  </div>
);
```

要点：

- **`{}` 里写 JavaScript 表达式**：变量、运算、函数调用都行，但不能是 `if` 语句（要用三元 `? :` 或 `&&`）。
- **只能有一个根元素**：返回的内容要包在一个父标签里（或用 `<>...</>` 碎片包裹）。
- **`class` 要写成 `className`**：因为 `class` 是 JS 关键字，JSX 里用 `className` 代替。
- **事件名用驼峰**：`onClick`、`onChange`，不是 `onclick`。

## 状态：useState

React 用 **`useState`** 这个"钩子（Hook）"来管理状态。它返回一个数组：`[当前值, 修改值的函数]`。

```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0); // 初始值 0

  return (
    <div>
      <p>计数：{count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

关键点：

- **改状态必须调 `setCount`，不能直接 `count++`**。React 靠"你调了 setter"才知道要重渲染。
- 这和 Vue 的 `count.value++` 思路一致（都是"通过特定方式改状态"），只是写法不同：Vue 用 `.value`，React 用 `setXxx`。
- 解构 `const [count, setCount]` 是约定俗成的命名：`值` + `set值`。

## 事件处理

React 事件用驼峰 `onClick`、`onChange` 等，值是**函数**（不是字符串）：

```jsx
function App() {
  const handleClick = () => {
    alert('被点了');
  };
  return <button onClick={handleClick}>点我</button>;
}
```

常见写法：直接内联箭头函数 `onClick={() => setCount(count + 1)}`，或先定义 `handleXxx` 再引用。注意**别写成 `onClick={handleClick()}`**——那会立刻执行并把返回值（undefined）当处理函数，应该传函数本身 `onClick={handleClick}`。

## 列表渲染：map + key

React 没有 `v-for`，而是用数组的 `map` 方法把数据变成一组 JSX：

```jsx
const todos = [
  { id: 1, text: '学 React' },
  { id: 2, text: '写项目' },
];

return (
  <ul>
    {todos.map(t => (
      <li key={t.id}>{t.text}</li>
    ))}
  </ul>
);
```

**`key` 同样重要**：用唯一 id，别用数组下标。这和 Vue 的 `:key` 是同一个道理——帮 React 识别列表项，高效更新。

## 条件渲染：用 JS 表达

React 模板里没有 `v-if`，直接用 JavaScript 的三元或 `&&`：

```jsx
return (
  <div>
    {count > 0 ? <p>计数大于 0</p> : <p>计数是 0</p>}
    {show && <p>只有 show 为 true 才显示</p>}
  </div>
);
```

`&&` 的套路很常用：`show && <组件/>` 表示"show 为真才渲染这个组件"。逻辑都在 JS 里，因为 JSX 本就是 JS。

## 受控组件：表单用 state 接管

和 Vue 的 `v-model` 对应，React 用"受控组件"：input 的 `value` 绑定 state，再在 `onChange` 里 `setState` 更新：

```jsx
function InputDemo() {
  const [text, setText] = useState('');

  return (
    <div>
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="输入点什么"
      />
      <p>你输入了：{text}</p>
    </div>
  );
}
```

`e.target.value` 是输入框当前值。`onChange` 每次打字触发，把新值写进 state，界面回显——这就是 React 版的双向绑定（手动版，但逻辑透明）。

## 常见新手坑

- **直接改状态**：`count++` 不生效，必须 `setCount(count + 1)`。React 靠 setter 触发更新。
- **忘了 `key`**：列表渲染没 key 会报警告且更新错乱，用唯一 id。
- **`onClick={handle()}` 立即执行**：应传函数 `onClick={handle}`，内联才用箭头 `() => handle()`。
- **JSX 里用 `class`**：要写 `className`；用 `for` 要写 `htmlFor`。
- **返回多个根元素不包**：JSX 要求单一根，用 `<>...</>` 或外层 `div` 包裹。
- **在 JSX 里写 `if` 语句**：JSX 的 `{}` 只接受表达式，用三元 `? :` 或 `&&` 替代。

## 实战：React 版待办列表

和 Vue 篇功能一致，用 React 重写，体会"思想相同、写法不同"：

```jsx
import { useState } from 'react';

function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  const add = () => {
    const text = input.trim();
    if (!text) return;
    setTodos([...todos, { id: Date.now(), text }]); // 用新数组替换
    setInput('');
  };

  const remove = (id) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  return (
    <div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && add()}
        placeholder="输入任务回车添加"
      />
      <button onClick={add}>添加</button>

      <ul>
        {todos.map(t => (
          <li key={t.id}>
            {t.text}
            <button onClick={() => remove(t.id)}>删除</button>
          </li>
        ))}
      </ul>

      <p>共 {todos.length} 个任务</p>
    </div>
  );
}
```

注意 React 改数组状态要用"新数组替换"（如 `[...todos, item]`、`filter` 返回新数组），**不能直接 `todos.push`**——因为 React 通过"引用变了"才重渲染，原地改数组引用没变，界面不更新。这和 Vue（响应式自动追踪）的体感不同，是 React 新手最易踩的坑。

## 新手怎么把 React 基础练熟

React 和 Vue 思想同源，会一个另一个很快。建议把 Vue 篇的练习用 React 重写一遍：计数器、显示隐藏、增删列表、表单回显。重点体会 **"状态用 setter 改、数组用新数组替换、列表必带 key"** 这三条 React 铁律。

另一个心法：**JSX 就是 JavaScript**。别把它当"另一种模板语言"，它就是被编译成函数调用的 JS。所以所有 JS 能力（表达式、三元、map、&&）都能在 JSX 里用。想通这点，React 的"奇怪写法"就全通了。

还有，理解 `useState` 的"异步批量"特性：连续调两次 `setCount(count + 1)`，第二次拿到的 `count` 还是旧的（因为函数执行期间 `count` 没变）。需要基于上一次值更新时，用函数式更新 `setCount(c => c + 1)`。这是 React 和 Vue 在"状态更新"上体感差异最大的地方，早懂早避坑。

## 小测验：看看你掌握了没

- 问题一：React 改状态为什么必须调 `setXxx` 而不是直接改？答案：React 靠"调用 setter"感知变化并触发重渲染，直接改引用没变，界面不更新。
- 问题二：React 里怎么实现条件渲染？答案：用 JS 表达式，如三元 `? :` 或 `&&`，没有 `v-if` 指令。
- 问题三：为什么 `todos.push(...)` 后界面不更新？答案：React 比较引用，原地改数组引用没变；要用 `[...todos, item]` 生成新数组替换。

## 这一篇你该记住的

- React 组件 = 返回 JSX 的大写函数；JSX 是编译成 `createElement` 的 JS。
- `{}` 里写 JS 表达式；`class`→`className`；事件 `onClick`（驼峰）。
- 状态用 `useState`：`const [val, setVal] = useState(初值)`，改必须调 `setVal`。
- 列表用 `array.map` + `key`（唯一 id）；条件用三元/`&&`。
- 受控组件：`value={state}` + `onChange={e => setState(e.target.value)}`。
- 数组状态用新数组替换（`[...arr, x]`/`filter`），别原地 push。

下一篇我们讲 **组件通信：props 与 state**：父传子、子传父、单向数据流，这是搭大应用的骨架。
