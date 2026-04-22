<script setup lang="ts">
import { withBase } from 'vitepress'
import { data as posts } from '../../posts.data.ts'
</script>

<template>
  <ul>
    <li v-for="post in posts" :key="post.url">
      <a :href="withBase(post.url)">{{ post.frontmatter.title }}</a>
    </li>
  </ul>
</template>
