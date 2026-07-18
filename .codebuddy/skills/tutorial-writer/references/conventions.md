# Tutorial Authoring Conventions (51教程网 / jc.51nav)

These conventions are derived from the existing frontend tutorials and the site
code. Follow them exactly so new articles look and behave like the current ones.

## 1. File layout & routing

- Tutorials live in `src/content/tutorials/<category>/<slug>.md`.
- The Astro glob loader sets `entry.id = "<category>/<slug>"` (path relative to
  `src/content/tutorials`, no extension).
- The published URL is `/docs/<category>/<slug>` (see
  `src/pages/docs/[...slug].astro`).
- Existing category folders: `frontend`, `backend`, `devops`, `database`,
  `tools`, `security`.
- Subcategories (for `frontend`) defined in `src/utils/site.ts`:
  `html`, `css`, `javascript`, `frameworks`, `engineering`. Other categories have
  their own subcategory slugs.

## 2. Frontmatter schema (src/content.config.ts)

Required/optional fields and types:

| Field         | Type              | Required | Notes                                             |
|---------------|-------------------|----------|---------------------------------------------------|
| `title`       | string            | yes      | Article title.                                    |
| `description` | string            | yes      | 1–2 sentence summary, shows under the title.      |
| `category`    | string            | yes      | e.g. `frontend`.                                  |
| `subcategory` | string            | no       | e.g. `css`, `html`. Groups the reading series.    |
| `tags`        | string[]          | no       | Defaults to `[]`.                                 |
| `pubDate`     | date (`YYYY-MM-DD`)| yes     | Drives "X 发布" and sort tiebreak.               |
| `updatedDate` | date              | no       | Shows "· 更新于 …" when present.                  |
| `order`       | number            | no       | Defaults to `0`. Controls prev/next order.        |
| `draft`       | boolean           | no       | Defaults to `false`. Drafts are excluded.         |

Example:

```yaml
---
title: CSS 盒模型：搞懂一个元素到底占多大地方
description: 每个 HTML 元素在浏览器眼里都是个盒子。这篇把 content、padding、border、margin 四层讲清。
category: frontend
subcategory: css
tags: ['CSS', '盒模型', '布局基础']
pubDate: 2026-07-10
order: 2
---
```

## 3. Prev / next navigation

- `src/pages/docs/[...slug].astro` derives prev/next from articles that share the
  **same `subcategory`**, sorted by `order` (then `pubDate` descending).
- Therefore `order` must be sequential **within each subcategory** (1, 2, 3…).
  Never reuse the same `order` across different subcategories (e.g. html and css
  each start at 1) — the navigation already scopes by subcategory, so just keep
  each series internally ordered.
- When adding a new article, assign it the next `order` in its subcategory and
  bump nothing else.

## 4. Writing tone & structure

- Language: conversational, beginner-friendly **Chinese**. Address the reader as
  "你"/"我们"; use everyday metaphors (e.g. "盒子像包装盒", "软垫").
- Open with a hook that explains **why** the topic matters or the pain it solves.
- Use `##` for top-level sections. Use `###` for sub-points.
- Bold (`**…**`) key terms on first introduction.
- Wrap code identifiers, property names, and values in backticks (`width`,
  `border-box`).
- Prefer short paragraphs; lead with the idea, then the code.
- End every article with:
  - A `## 这一篇你该记住的` bullet summary of the key takeaways.
  - A one-line lead-in sentence pointing to the next topic (the prev/next nav is
    auto-generated, so just mention it in prose; do not hand-write nav links).
- Reading count (GoatCounter, per-article), copy buttons, ads, comments,
  breadcrumb, and sidebar are all injected automatically — do not add them in
  the Markdown. See §7 for how the reading count is wired.

## 5. 字数下限（重要）

- 每篇教程正文至少 **2000 中文字**。统计口径：**仅计 CJK 汉字**
  （Unicode 范围 `一`–`鿿`），代码块、英文单词、数字、标点符号、空白均不计入。
- 写完后务必用 CJK 计数核对；未达标时优先补充**实战案例、常见坑点、进阶用法、
  对比辨析、自测题**等有价值内容，不要靠重复表述或水话凑数。
- 字数达标是"详细、够用"的底线，不是上限——能讲透就多写，但绝不允许低于 2000。

## 6. Code blocks

- Always fence with a language tag: ```` ```css ````, ```` ```html ````,
  ```` ```js ````, ```` ```bash ````. Plain ```` ``` ```` is fine for output/logs.
- A "复制" button is added to every `<pre>` automatically by `DocLayout.astro`;
  never hand-code a copy button.
- When an example needs HTML + CSS, show them as two separate fenced blocks
  (markup first, then style), matching the existing pattern.

## 7. Diagrams (SVG)

Add a diagram when a concept is spatial, structural, or hard to grasp from text
alone. Existing diagrams: `box-model`, `flexbox`, `grid`, `position`,
`css-cascade`, `html-semantic`, `responsive` (all in `public/diagrams/`).

Conventions:
- Save to `public/diagrams/<kebab-name>.svg`. Reference from Markdown as
  `/diagrams/<kebab-name>.svg` (leading slash, no `public`).
- Style: light theme, white/very-light background, rounded corners, friendly
  hand-drawn feel, Chinese labels. Canvas ~760×420 viewBox. Copy
  `assets/diagram-template.svg` as a base.
- Embed with a dedicated section and a short explanation blockquote:

  ```md
  ## 一张图看懂 <主题>

  文字描述容易飘，下面这张图把关系画了出来，对照着看更踏实：

  ![<中文 alt：说明图里画了什么>](/diagrams/<name>.svg)

  > 记住顺序：<一句话点出图里的关键结论>。
  ```

- Diagrams render as centered rounded cards (white bg, light border) via the
  `.prose img` rule in `src/styles/global.css` — no extra wrapper needed.

## 8. Reading count (GoatCounter)

Real per-article view counts are powered by **GoatCounter**, never faked. The
mechanism lives in `src/components/ViewCounter.astro` and is auto-injected into
every doc page — authors do **not** add anything in Markdown.

- Counting is **per URL path**: each article's unique URL
  (`/docs/<category>/<slug>`) is counted independently, so neighbouring articles
  never share a count.
- The site's GoatCounter subdomain is configured once in `src/utils/site.ts`
  under `SITE.goatcounterCode` (currently `'51nav'`). Both the `count.js` tracker
  and the `counter/<path>.json` read endpoint are derived from this value.
- If `goatcounterCode` is empty, the counter shows `--` and sends no data.
- The read endpoint returns **unique visitors** for that path (not raw
  pageviews), and results are cached up to ~4 hours, so a new visit does not
  appear instantly.
- The GoatCounter dashboard must have "Allow adding visitor counts on your
  website" enabled, otherwise the counter JSON is refused.

## 9. Verification

- `npx astro build` must succeed with no frontmatter schema errors.
- Confirm the new `/docs/<category>/<slug>` page exists in `dist/`.
- If a diagram was added, confirm `/diagrams/<name>.svg` is referenced on the
  intended page only.
- Confirm prev/next on neighboring pages still points within the same
  subcategory.
