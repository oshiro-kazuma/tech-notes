import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import ArticleList from './ArticleList.vue'
import ArticleDate from './ArticleDate.vue'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => h(ArticleDate),
    })
  },
  enhanceApp({ app }) {
    app.component('ArticleList', ArticleList)
  }
}
