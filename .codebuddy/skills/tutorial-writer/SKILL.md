---
name: tutorial-writer
description: "This skill should be used when writing, creating, or editing tutorial articles (Markdown) for the 51教程网 (jc.51nav) Astro site. It enforces the site frontmatter schema, file layout, writing tone, code-block conventions, and SVG diagram conventions so that new tutorials match the existing ones exactly. Trigger on requests like 写一篇教程, 新建一个教程, 加一篇关于 X 的教程, 按现有风格写教程, or any task that adds or rewrites content under the tutorials content directory."
---

# Tutorial Writer

Author Markdown tutorials for the 51教程网 Astro site so they match the existing
frontend series in tone, structure, and formatting.

## When to use

Use this skill whenever a task creates, rewrites, or substantially edits a
tutorial under `src/content/tutorials/`. For quick typo fixes or one-line edits,
the conventions still apply but the full workflow can be abbreviated.

## Workflow

1. **Pick the location and slug.**
   Create the file at `src/content/tutorials/(category)/(slug).md`. The file path
   becomes the article id (`(category)/(slug)`), and the published URL is
   `/docs/(category)/(slug)`. Use a kebab-case slug that mirrors the title
   (e.g. `css-box-model`). Keep the existing category folders: `frontend`,
   `backend`, `devops`, `database`, `tools`, `security`.

2. **Write the frontmatter.** Follow the required schema exactly. See
   `references/conventions.md` for field types and the full field list, and copy
   `assets/tutorial-template.md` as a starting point. Critical rules:
   - `category` is required (e.g. `frontend`); `subcategory` groups the reading
     series (e.g. `css`, `html`).
   - `order` controls prev/next navigation **within the same subcategory** — keep
     it sequential (1, 2, 3…) per subcategory. Do not reuse order numbers across
     different subcategories.
   - `pubDate` uses `YYYY-MM-DD`.

3. **Write the body.** Follow the tone and structure rules in
   `references/conventions.md`:
   - Conversational, beginner-friendly Chinese; open with a "why this matters"
     hook; use metaphors.
   - `##` for section headings; bold key terms; backticks for property/value names.
   - End with a "这一篇你该记住的" summary list and a one-line lead-in to the next topic.
   - **字数下限**：每篇正文至少 **2000 中文字**（仅统计 CJK 汉字，代码块、英文、
     标点、空白不计入）。写完后用 CJK 计数核对；不足则补充实战案例、常见坑点、
     进阶用法或自测题，不要靠水话凑数。
   - Keep code blocks fenced with a language tag (```css, ```html, ```js). A copy
     button is added automatically — no manual button needed.

4. **Add a diagram when the concept is visual.** For spatial/structural ideas
   (box model, flex/grid axes, positioning context, cascade specificity,
   semantic page skeleton, responsive breakpoints, etc.), draw a hand-style SVG
   and save it to `public/diagrams/(name).svg`. Embed it with a
   `## 一张图看懂 (主题)` section, an `![alt](/diagrams/(name).svg)` image, and a
   `> ` blockquote that explains the picture. Copy `assets/diagram-template.svg`
   as a starting canvas. Diagrams render as rounded white cards automatically.

5. **Verify.** Run `npx astro build` (or start `npx astro dev`) and confirm the
   new page builds, the frontmatter has no schema errors, and the diagram (if
   any) appears. Also confirm the new `order` keeps prev/next sensible within its
   subcategory.

## Bundled resources

- `references/conventions.md` — full frontmatter schema, routing/prev-next rules,
  writing tone, code-block and diagram conventions, and the GoatCounter
  per-article reading-count setup (§7).
- `assets/tutorial-template.md` — copy-ready starter with correct frontmatter and
  section skeleton.
- `assets/diagram-template.svg` — starter SVG canvas (light theme, 760×420) for
  new diagrams.
