<script setup lang="ts">
import { data as posts } from '../../posts.data.ts'
</script>

<template>
  <div class="article-list">
    <a v-for="post in posts" :key="post.url" :href="post.url" class="article-item">
      {{ post.frontmatter.title }}
    </a>
  </div>
</template>

<style scoped>
.article-list {
  max-width: 640px;
  margin: 2rem auto;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.article-item {
  display: block;
  padding: 1rem 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  color: var(--vp-c-text-1);
  text-decoration: none;
  font-weight: 500;
  transition: border-color 0.2s, color 0.2s;
}

.article-item:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
</style>
