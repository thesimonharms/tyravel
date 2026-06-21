import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Tyravel',
  description: 'TypeScript-native web framework with Laravel-style ergonomics',
  lang: 'en-US',
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['meta', { name: 'theme-color', content: '#4f46e5' }],
    ['link', { rel: 'icon', href: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>' }],
  ],

  sitemap: {
    hostname: 'https://tyravel.dev',
  },

  markdown: {
    lineNumbers: true,
  },

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction', activeMatch: '/guide/' },
      {
        text: 'v0.6.0',
        items: [
          { text: 'Changelog', link: 'https://github.com/thesimonharms/tyravel/blob/main/CHANGELOG.md' },
          { text: 'Roadmap', link: 'https://github.com/thesimonharms/tyravel/blob/main/ROADMAP.md' },
          { text: 'Contributing', link: 'https://github.com/thesimonharms/tyravel' },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Getting started',
        items: [
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'Installation', link: '/guide/getting-started' },
          { text: 'Application structure', link: '/guide/application-structure' },
        ],
      },
      {
        text: 'Core concepts',
        items: [
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'Routing', link: '/guide/routing' },
          { text: 'Controllers & middleware', link: '/guide/controllers' },
          { text: 'Validation & form requests', link: '/guide/validation' },
        ],
      },
      {
        text: 'Data & APIs',
        items: [
          { text: 'Database & ORM', link: '/guide/database' },
          { text: 'API resources', link: '/guide/api-resources' },
          { text: 'Pagination', link: '/guide/pagination' },
        ],
      },
      {
        text: 'Platform features',
        items: [
          { text: 'Authentication', link: '/guide/auth' },
          { text: 'Queues & jobs', link: '/guide/queues' },
          { text: 'Events', link: '/guide/events' },
          { text: 'Views & templating', link: '/guide/views' },
          { text: 'Testing', link: '/guide/testing' },
        ],
      },
    ],

    editLink: {
      pattern: 'https://github.com/thesimonharms/tyravel/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/thesimonharms/tyravel' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © Simon Harms',
    },

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
    },

    lastUpdated: {
      text: 'Last updated',
    },

    docFooter: {
      prev: 'Previous',
      next: 'Next',
    },
  },
});
