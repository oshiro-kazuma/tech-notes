import { createContentLoader } from 'vitepress'

export default createContentLoader('*.md', {
  transform(data) {
    return data
      .filter(page => page.url !== '/')
      .sort((a, b) => {
        const dateA = a.frontmatter.date ?? ''
        const dateB = b.frontmatter.date ?? ''
        return dateB.localeCompare(dateA)
      })
  }
})
