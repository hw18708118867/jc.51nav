// 构建后把 @astrojs/sitemap 生成的分片（sitemap-0.xml、sitemap-1.xml ...）
// 合并成站点根目录的单个 sitemap.xml，并为每条 URL 注入 <lastmod>，
// 让 Google 知道每篇内容最后一次更新的时间：
//   - /docs/<分类>/<slug>/  取对应源文件 src/content/tutorials/<分类>/<slug>.md 的最后提交时间
//   - 分类页 / 首页 / about / search 等没有单独源文件的页面，取仓库最新一次提交时间兜底
// 只要每次改动后提交并重新构建，lastmod 就会反映真实更新时间。
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const distDir = 'dist';
const tutorialsDir = join('src', 'content', 'tutorials');

// 仓库最新一次提交时间（ISO 8601），作为无单独源文件页面的兜底
function repoLastMod() {
  try {
    const out = execSync('git log -1 --format=%cI', { encoding: 'utf-8' }).trim();
    return out || new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// 取某个源文件的最后提交时间（ISO 8601），无记录返回 null
function gitLastMod(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    const out = execSync(`git log -1 --format=%cI -- "${filePath}"`, {
      encoding: 'utf-8',
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

// /docs/<分类>/<slug>/  ->  src/content/tutorials/<分类>/<slug>.md
function sourceForDoc(urlPath) {
  const m = urlPath.match(/^\/docs\/([^/]+)\/([^/]+)\/?$/);
  if (m) return join(tutorialsDir, m[1], m[2] + '.md');
  return null;
}

const globalLastMod = repoLastMod();

const files = readdirSync(distDir).filter((f) => /^sitemap-\d+\.xml$/.test(f));
if (files.length === 0) {
  console.error('[build-sitemap] 未找到 sitemap 分片，跳过合并。');
  process.exit(0);
}

const urls = [];
for (const f of files) {
  const xml = readFileSync(join(distDir, f), 'utf-8');
  const matches = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
  const updated = [];
  for (let block of matches) {
    const locMatch = block.match(/<loc>([\s\S]*?)<\/loc>/);
    if (!locMatch) {
      urls.push(block);
      updated.push(block);
      continue;
    }
    const loc = locMatch[1].trim();
    const urlPath = loc.replace(/^https?:\/\/[^/]+/, '');
    const src = sourceForDoc(urlPath);
    const lastmod = (src && gitLastMod(src)) || globalLastMod;
    // 在 </url> 前插入 <lastmod>
    block = block.replace(/<\/url>/, `  <lastmod>${lastmod}</lastmod>\n</url>`);
    urls.push(block);
    updated.push(block);
  }
  // 同时把 lastmod 写回分片文件，保证 sitemap-index.xml -> sitemap-N.xml 这条路径也带更新时间
  const frag = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${updated.join('\n')}
</urlset>
`;
  writeFileSync(join(distDir, f), frag, 'utf-8');
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urls.join('\n')}
</urlset>
`;

writeFileSync(join(distDir, 'sitemap.xml'), sitemap, 'utf-8');
console.log(`[build-sitemap] 已生成 sitemap.xml，共 ${urls.length} 条 URL（每条均带 lastmod）。`);
