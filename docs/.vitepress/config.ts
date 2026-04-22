import { defineConfig } from 'vitepress'
import { readdirSync, readFileSync } from 'fs'
import { join, basename } from 'path'

function getSidebarItems() {
  const docsDir = join(process.cwd(), 'docs')
  const posts = readdirSync(docsDir)
    .filter(f => f.endsWith('.md') && f !== 'index.md')
    .map(f => {
      const content = readFileSync(join(docsDir, f), 'utf-8')
      const titleMatch = content.match(/^title:\s*(.+)$/m)
      const dateMatch = content.match(/^date:\s*(.+)$/m)
      const title = titleMatch ? titleMatch[1].trim() : basename(f, '.md')
      const date = dateMatch ? dateMatch[1].trim() : ''
      const year = date ? new Date(date).getFullYear().toString() : 'undated'
      return { text: title, link: '/' + basename(f, '.md'), year, date }
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  const grouped: Record<string, { text: string; link: string }[]> = {}
  for (const post of posts) {
    ;(grouped[post.year] ??= []).push({ text: post.text, link: post.link })
  }

  return Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map(year => ({ text: year, items: grouped[year] }))
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
