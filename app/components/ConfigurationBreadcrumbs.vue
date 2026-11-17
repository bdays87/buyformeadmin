<script setup lang="ts">
defineProps<{
  section: string
  current: string
}>()
</script>

<template>
  <nav aria-label="Breadcrumb" class="breadcrumbs mb-4 text-sm text-base-content/60">
    <ul>
      <li><NuxtLink to="/admin">Overview</NuxtLink></li>
      <li>{{ section }}</li>
      <li class="font-medium text-base-content">{{ current }}</li>
    </ul>
  </nav>
</template>
