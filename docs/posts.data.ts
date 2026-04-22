import { createContentLoader } from 'vitepress'

export default createContentLoader('*.md', {
  transform(data) {
    return data
      .filter(page => page.url !== '/')
      .sort((a, b) => {
        const dateA = new Date(a.frontmatter.date ?? 0).getTime()
        const dateB = new Date(b.frontmatter.date ?? 0).getTime()
        return dateB - dateA
      })
  }
})
