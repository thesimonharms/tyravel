import { defineConfig } from 'vitepress';
import {
  cookbookSidebar,
  guideSidebar,
  referenceSidebar,
  tutorialsSidebar,
} from './sidebar.mts';

export default defineConfig({
  title: 'Pondoknusa',
  description: 'TypeScript-native web framework with Laravel-style ergonomics',
  lang: 'en-US',
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['meta', { name: 'theme-color', content: '#0f0f1a' }],
    ['meta', { property: 'og:image', content: 'https://pondoknusa.dev/logo.svg' }],
    ['meta', { name: 'twitter:image', content: 'https://pondoknusa.dev/logo.svg' }],
    ['link', { rel: 'icon', href: '/favicon.svg?v=2.0.0', type: 'image/svg+xml' }],
    ['link', { rel: 'apple-touch-icon', href: '/logo.svg' }],
  ],

  sitemap: {
    hostname: 'https://pondoknusa.dev',
  },

  markdown: {
    lineNumbers: true,
  },

  themeConfig: {
    logo: { src: '/logo.svg', alt: 'Pondoknusa' },

    nav: [
      { text: 'Guide', link: '/guide/introduction', activeMatch: '/guide/' },
      { text: 'Reference', link: '/reference/', activeMatch: '/reference/' },
      { text: 'Tutorials', link: '/tutorials/', activeMatch: '/tutorials/' },
      { text: 'Cookbook', link: '/cookbook/', activeMatch: '/cookbook/' },
      {
        text: 'v2.0.0',
        items: [
          { text: 'Changelog', link: 'https://github.com/pondoknusa/pondoknusa/blob/main/CHANGELOG.md' },
          { text: 'API stability', link: '/guide/api-stability' },
          { text: 'Upgrading to 2.0', link: '/guide/upgrading-to-2.0' },
          { text: 'Upgrading to 1.0', link: '/guide/upgrading-to-1.0' },
          { text: 'Roadmap', link: 'https://github.com/pondoknusa/pondoknusa/blob/main/ROADMAP.md' },
          { text: 'GitHub', link: 'https://github.com/pondoknusa/pondoknusa' },
        ],
      },
    ],

    sidebar: {
      '/guide/': guideSidebar,
      '/reference/': referenceSidebar,
      '/tutorials/': tutorialsSidebar,
      '/cookbook/': cookbookSidebar,
    },

    editLink: {
      pattern: 'https://github.com/pondoknusa/pondoknusa/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/pondoknusa/pondoknusa' },
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