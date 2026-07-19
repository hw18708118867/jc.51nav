import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../utils/site.ts';

export async function GET(context) {
  const entries = await getCollection('tutorials', ({ data }) => !data.draft);
  entries.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    // 浏览器打开 /rss.xml 时用此 XSL 渲染成美观的订阅页；订阅器仍按 XML 读取，互不影响。
    stylesheet: '/rss.xsl',
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.pubDate,
      link: `/docs/${entry.id}/`,
      categories: [entry.data.category, ...entry.data.tags],
    })),
  });
}
