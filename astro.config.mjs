import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// 站点根地址（用于 sitemap / RSS / canonical 的绝对链接）
export default defineConfig({
  site: 'https://jc.51nav.com',
  output: 'static',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
