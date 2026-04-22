import { defineConfig } from 'vitepress'
import { readdirSync, readFileSync } from 'fs'
import { join, basename } from 'path'

function getSidebarItems() {
  const docsDir = join(process.cwd(), 'docs')
  return readdirSync(docsDir)
    .filter(f => f.endsWith('.md') && f !== 'index.md')
    .map(f => {
      const content = readFileSync(join(docsDir, f), 'utf-8')
      const titleMatch = content.match(/^title:\s*(.+)$/m)
      const title = titleMatch ? titleMatch[1].trim() : basename(f, '.md')
      return { text: title, link: '/' + basename(f, '.md') }
    })
}

export default defineConfig({
  title: 'tech notes',
  description: "oshiro-kazuma's tech notes",
  base: '/tech-notes/',

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
    ],

    sidebar: getSidebarItems(),

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
