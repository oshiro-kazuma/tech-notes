import { createContentLoader } from 'vitepress'

export default createContentLoader('*.md', {
  transform(data) {
    return data
      .filter(page => page.url !== '/')
      .sort((a, b) =>
        (a.frontmatter.title ?? '').localeCompare(b.frontmatter.title ?? '')
      )
  }
})
