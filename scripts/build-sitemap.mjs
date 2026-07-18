// 构建后把 @astrojs/sitemap 生成的分片（sitemap-0.xml、sitemap-1.xml ...）
// 合并成站点根目录的单个 sitemap.xml，方便搜索引擎直接提交。
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const distDir = 'dist';
const files = readdirSync(distDir).filter(
  (f) => /^sitemap-\d+\.xml$/.test(f) // 只取数字分片，排除 sitemap-index.xml
);

if (files.length === 0) {
  console.error('[build-sitemap] 未找到 sitemap 分片，跳过合并。');
  process.exit(0);
}

const urls = [];
for (const f of files) {
  const xml = readFileSync(join(distDir, f), 'utf-8');
  const matches = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
  urls.push(...matches);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urls.join('\n')}
</urlset>
`;

writeFileSync(join(distDir, 'sitemap.xml'), sitemap, 'utf-8');
console.log(`[build-sitemap] 已生成 sitemap.xml，共 ${urls.length} 条 URL（来源：${files.join(', ')}）。`);
