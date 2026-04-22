<script setup lang="ts">
import { useData } from 'vitepress'

const { frontmatter } = useData()

const formattedDate = frontmatter.value.date
  ? new Date(frontmatter.value.date).toISOString().slice(0, 10)
  : null
</script>

<template>
  <p v-if="formattedDate" class="article-date">{{ formattedDate }}</p>
</template>

<style scoped>
.article-date {
  font-size: 0.85em;
  color: var(--vp-c-text-2);
  margin: 0 0 1.5rem;
}
</style>
