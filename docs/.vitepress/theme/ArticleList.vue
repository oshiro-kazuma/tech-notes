<script setup lang="ts">
import { withBase } from 'vitepress'
import { data as posts } from '../../posts.data.ts'
import { formatDate } from './formatDate'
</script>

<template>
  <ul>
    <li v-for="post in posts" :key="post.url">
      <span class="date">{{ formatDate(post.frontmatter.date) }}</span>
      <a :href="withBase(post.url)">{{ post.frontmatter.title }}</a>
    </li>
  </ul>
</template>

<style scoped>
ul {
  list-style: none;
  padding: 0;
}

li {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  padding: 0.4rem 0;
}

.date {
  font-size: 0.85em;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
</style>
