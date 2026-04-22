import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'tech notes',
  description: "oshiro-kazuma's tech notes",
  base: '/tech-notes/',

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
    ],

    sidebar: [
      {
        text: 'Notes',
        items: [
          { text: 'tech notesを作った', link: '/tech-notes-setup' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/oshiro-kazuma/tech-notes' },
    ],

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/oshiro-kazuma/tech-notes/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },

  markdown: {
    lineNumbers: true,
  },
})
