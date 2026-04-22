import DefaultTheme from 'vitepress/theme'
import ArticleList from './ArticleList.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ArticleList', ArticleList)
  }
}
