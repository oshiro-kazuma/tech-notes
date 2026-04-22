<script setup lang="ts">
import { withBase } from 'vitepress'
import { data as posts } from '../../posts.data.ts'
import { formatDate } from './formatDate'

const grouped = posts.reduce((acc, post) => {
  const year = post.frontmatter.date
    ? new Date(post.frontmatter.date).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 4)
    : 'undated'
  ;(acc[year] ??= []).push(post)
  return acc
}, {} as Record<string, typeof posts>)

const years = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
</script>

<template>
  <div v-for="year in years" :key="year" class="year-group">
    <h2 class="year">{{ year }}</h2>
    <ul>
      <li v-for="post in grouped[year]" :key="post.url">
        <span class="date">{{ formatDate(post.frontmatter.date) }}</span>
        <a :href="withBase(post.url)">{{ post.frontmatter.title }}</a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.year-group {
  margin-bottom: 2rem;
}

.year {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  border: none;
  margin: 0 0 0.5rem;
  padding: 0;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
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
