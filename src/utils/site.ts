export const SITE = {
  name: '51教程网',
  shortName: '51教程网',
  title: '51教程网 - 系统化 IT 技术教程站',
  description:
    '51教程网是一个面向开发者的中文 IT 技术教程站，涵盖前端、后端、运维、数据库、开发工具与网络安全，提供系统化、可实践的从入门到进阶教程。',
  url: 'https://jc.51nav.com',
  author: '51教程网',
  lang: 'zh-CN',
};

export interface SubCategory {
  slug: string;
  name: string;
}

export interface Category {
  slug: string;
  name: string;
  description: string;
  icon: string;
  subcategories: SubCategory[];
}

export const CATEGORIES: Category[] = [
  {
    slug: 'frontend',
    name: '前端开发',
    description: 'HTML、CSS、JavaScript 及主流前端框架的实战教程。',
    icon: '🎨',
    subcategories: [
      { slug: 'html-css', name: 'HTML / CSS' },
      { slug: 'javascript', name: 'JavaScript' },
      { slug: 'frameworks', name: '前端框架' },
      { slug: 'engineering', name: '工程化' },
    ],
  },
  {
    slug: 'backend',
    name: '后端开发',
    description: 'Node.js、Python、Go 等服务端开发与 API 设计。',
    icon: '⚙️',
    subcategories: [
      { slug: 'nodejs', name: 'Node.js' },
      { slug: 'python', name: 'Python' },
      { slug: 'golang', name: 'Go' },
      { slug: 'api', name: 'API 设计' },
    ],
  },
  {
    slug: 'devops',
    name: '运维与 DevOps',
    description: 'Docker、Kubernetes、CI/CD 与云原生实践。',
    icon: '🚀',
    subcategories: [
      { slug: 'container', name: '容器技术' },
      { slug: 'cicd', name: 'CI / CD' },
      { slug: 'monitoring', name: '监控运维' },
      { slug: 'cloudnative', name: '云原生' },
    ],
  },
  {
    slug: 'database',
    name: '数据库',
    description: 'MySQL、Redis、MongoDB 等数据库原理与调优。',
    icon: '🗄️',
    subcategories: [
      { slug: 'relational', name: '关系型数据库' },
      { slug: 'nosql', name: 'NoSQL' },
      { slug: 'tuning', name: '性能调优' },
      { slug: 'modeling', name: '数据建模' },
    ],
  },
  {
    slug: 'tools',
    name: '开发工具',
    description: 'Git、VS Code、终端与效率工具使用指南。',
    icon: '🛠️',
    subcategories: [
      { slug: 'git', name: 'Git' },
      { slug: 'editor', name: '编辑器' },
      { slug: 'terminal', name: '终端 Shell' },
      { slug: 'efficiency', name: '效率工具' },
    ],
  },
  {
    slug: 'security',
    name: '网络安全',
    description: 'Web 安全、渗透测试、密码学与安全合规的系统化教程。',
    icon: '🛡️',
    subcategories: [
      { slug: 'web', name: 'Web 安全' },
      { slug: 'pentest', name: '渗透测试' },
      { slug: 'crypto', name: '密码学' },
      { slug: 'compliance', name: '安全合规' },
    ],
  },
];

export function getSubCategory(category: string, slug: string): SubCategory | undefined {
  return getCategory(category)?.subcategories.find((s) => s.slug === slug);
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
