import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Tyravel',
  description: 'TypeScript-native web framework with Laravel-style ergonomics',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'GitHub', link: 'https://github.com/thesimonharms/tyravel' },
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
          { text: 'Routing', link: '/guide/routing' },
          { text: 'Controllers & middleware', link: '/guide/controllers' },
          { text: 'Configuration', link: '/guide/configuration' },
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
          { text: 'Views', link: '/guide/views' },
          { text: 'Testing', link: '/guide/testing' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/thesimonharms/tyravel' },
    ],
  },
});