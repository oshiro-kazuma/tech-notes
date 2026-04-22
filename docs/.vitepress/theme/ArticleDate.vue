<script setup lang="ts">
import { useData } from 'vitepress'
import { formatDate } from './formatDate'

const { frontmatter } = useData()
</script>

<template>
  <p v-if="frontmatter.date" class="article-date">{{ formatDate(frontmatter.date) }}</p>
</template>

<style scoped>
.article-date {
  font-size: 0.85em;
  color: var(--vp-c-text-2);
  margin: -0.5rem 0 1.5rem;
}
</style>
