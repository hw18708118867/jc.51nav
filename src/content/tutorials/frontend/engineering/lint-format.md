---
title: 代码规范：ESLint 与 Prettier 让团队像一个人写
description: 从"为什么需要规范"讲起，搞懂 ESLint（找错）与 Prettier（统一格式）的分工，配置 editorconfig、git hooks 与 lint-staged，把风格争论交给工具。
category: frontend
subcategory: engineering
tags: ['工程化', 'ESLint', 'Prettier', '代码规范']
pubDate: 2026-07-20
updatedDate: 2026-07-20
order: 4
---

你有没有经历过：打开同事的代码，缩进一会儿 2 空格一会儿 4 空格，引号一会儿单一会儿双，一个文件里三种风格；或者 review 时大家吵"该不该加分号""函数名用驼峰还是下划线"，吵半天没结论也没产出。

**代码规范工具**就是来解决这个的：把"风格怎么写"和"什么算错"变成**机器规则**，谁写都一样，争论交给工具。这一篇我们讲清 ESLint 和 Prettier 的分工、怎么配、怎么在提交时自动生效。

## 为什么需要规范

三个实在的理由：

- **可读性**：统一风格让任何人读任何人的代码都不用"重新适应"，review 和接手都快。
- **减少低级 bug**：很多错误是"写法隐患"（如未声明变量、用了已废弃 API），工具能自动揪出。
- **消灭无谓争论**："加分号还是不加分号"这种问题，定一条规则，从此闭嘴，把精力留给真正重要的逻辑。

规范不是束缚，是**团队的生产力放大器**。

## ESLint：找出"有问题的代码"

**ESLint** 是 JS/TS 的"静态检查器"：它读你的代码（不运行），按规则集找出**潜在错误和坏味道**。

```js
// ESLint 会警告：'unused' 定义了没使用
const unused = 1;
// ESLint 会报错：不能用 ==（要用 ===）
if (a == 1) {}
// ESLint 会警告：console 不应留在生产代码
console.log('debug');
```

ESLint 的规则分两类：

- **错误类（error）**：可能导致 bug，如 `no-undef`（用了未声明变量）、`eqeqeq`（强制 `===`）。
- **风格类（warn）**：如 `no-console`、`prefer-const`（该用 const 却用了 let）。

配置（`.eslintrc.js`）选一套预设再微调：

```js
module.exports = {
  extends: ['eslint:recommended', 'plugin:vue/vue3-recommended'],
  rules: {
    'no-console': 'warn',     // console 警告
    'eqeqeq': 'error',        // 强制 ===
  },
};
```

团队统一 `extends` 同一套（如 Airbnb、Standard、或框架官方推荐），风格就一致了。

## Prettier：只管"格式化"

**Prettier** 和 ESLint 分工不同：ESLint 管"对不对、坏不坏"，Prettier **只管"长得好不好看"**——缩进、换行、引号、分号、尾逗号。它不关心逻辑，只负责把代码排整齐。

```js
// 你写的（乱）
const  x={a:1,b:2}

// Prettier 一键变（整齐）
const x = { a: 1, b: 2 };
```

Prettier 是"有态度的"——它几乎不给选项，强制一种排版，反而省心（没得吵）。配置（`.prettierrc`）极简：

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 80
}
```

**关键认知：ESLint 管逻辑，Prettier 管格式，两者配合**。现代工程里 ESLint 关掉所有"格式类"规则，把格式全交给 Prettier，避免它们抢活儿打架（用 `eslint-config-prettier` 关掉冲突规则）。

## editorconfig：跨编辑器的底线

不同编辑器默认缩进、换行符不同（Windows 用 CRLF、Mac 用 LF）。**.editorconfig** 放在项目根，让所有编辑器遵守同一套"文件格式底线"：

```ini
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
```

它管的是"文件层面的格式"（缩进、换行符、编码），和 Prettier（代码排版）互补。新人 clone 项目，编辑器自动按这个来，不会出现"我这边整齐提交后变乱"的惨剧。

## git hooks：提交时自动检查

光有规则不够——人可能忘跑、可能偷懒跳过。要在**提交代码时自动跑检查和格式化**，靠 **git hooks**（Git 的钩子）。常用 `pre-commit` 钩子：提交前自动格式化改动的文件、跑 lint，不过就拦下提交。

手动配 hooks 麻烦，用 **husky** + **lint-staged** 自动化：

```json
// package.json
{
  "lint-staged": {
    "*.{js,ts,vue}": [
      "eslint --fix",   // 自动修能修的
      "prettier --write" // 格式化
    ]
  }
}
```

`lint-staged` 只处理"本次提交改动的文件"（不是全项目），快；husky 把这段挂到 `pre-commit`。效果：你 `git commit` 时，工具自动把代码格式化好、把能修的 lint 问题修掉，修不了的（真错误）拦住你，逼你改完再提交。团队代码质量被"焊死"在合格线以上。

## 常见新手坑

- **ESLint 和 Prettier 抢规则打架**：两者都管格式会冲突（如缩进）。用 `eslint-config-prettier` 关掉 ESLint 的格式规则，格式全归 Prettier。
- **只在 CI 检查，本地不配**：提交后才发现一堆错被打回，体验差。本地装 husky 钩子，提交前就修。
- **`.editorconfig` 没设 `end_of_line`**：Windows/Mac 混用导致满屏"换行符变更"的 diff 噪音。
- **规则太严把人逼疯**：一开始别上 Airbnb 全套（很严），从框架官方推荐起步，逐步加。规范要"团队能接受"才推得动。
- **`lint-staged` 配成全量检查**：每次提交扫整个项目，慢到想摔键盘。只处理暂存区改动文件。
- **关掉所有警告当没看见**：`eslint-disable` 到处写等于没规范。真有问题就修，临时跳过要写理由。

## 实战：一个最小规范工作流

项目里加这几样，规范就立起来了：

```
.editorconfig        # 文件格式底线
.eslintrc.js         # ESLint 规则（extends 官方推荐）
.prettierrc          # Prettier 格式
package.json         # 加 lint-staged + husky 钩子
```

日常开发：你正常写代码 → 保存时编辑器（装了 ESLint/Prettier 插件）实时提示 → `git commit` 时 husky 触发 lint-staged，自动格式化+修 lint → 有真错误则提交被拦。全程你几乎不用手动管格式，工具替你"把代码收拾干净"。

## 新手怎么把规范用起来

规范的价值在"团队统一"，但个人项目也值得用——它像"代码拼写检查"，帮你养成好习惯。建议每个新项目都初始化一套：装 ESLint + Prettier + 编辑器插件，让保存即格式化。重点是**别在规则上纠结太久**，选框架官方推荐的那套直接上，跑起来比完美重要。

另一个心法：**规范是"渐进"的，不是"革命"的**。接手老项目别一上来开 strict 全套，否则几千个报错没人修、大家直接关掉工具。先开"推荐"档，新代码遵守，老代码逐步迁移。规范推得动，才是好规范。

还有，把"提交前自动修复"当成底线。人都会忘、都会懒，靠 husky + lint-staged 把质量卡在提交那一刻，比"事后 code review 才发现"高效十倍。工具替团队守门，人才能把精力放在真正需要思考的地方。

## 小测验：看看你掌握了没

- 问题一：ESLint 和 Prettier 的分工区别？答案：ESLint 管"对不对、坏不坏"（潜在错误/坏味道）；Prettier 只管"好不好看"（排版格式）。两者配合，格式类规则交给 Prettier。
- 问题二：git hooks 在规范里起什么作用？答案：在提交（pre-commit）时自动跑 lint+格式化，不过就拦提交，把代码质量焊死在合格线。
- 问题三：为什么 lint-staged 只处理改动文件而不是全量？答案：全量检查每次提交都扫整个项目，太慢；只处理暂存区改动文件才快且够用。

## 这一篇你该记住的

- 规范提升可读性、减少低级 bug、消灭无谓争论，是团队生产力放大器。
- ESLint 查"错误与坏味道"（逻辑层）；Prettier 只管"排版格式"（表现层），分工不打架。
- 用 `eslint-config-prettier` 关掉 ESLint 格式规则，避免冲突。
- `.editorconfig` 定跨编辑器文件底线（缩进/换行符/编码）。
- husky + lint-staged：提交时自动格式化+修 lint，不过则拦提交。
- 规范渐进推、提交前自动修，比事后 review 高效。

下一篇我们讲 **CI/CD 与自动化**：代码推上去后，怎么自动测试、自动构建、自动部署，让"交付"从手工变流水线。
