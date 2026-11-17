<script setup lang="ts">
defineProps<{
  title: string
  description: string
  count: number
  countLabel: string
}>()
</script>

<template>
  <header class="mb-7 flex flex-col gap-5 border-b border-base-300 pb-7 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <div class="mb-3 flex items-center gap-3">
        <span class="badge badge-neutral badge-sm">Configuration</span>
        <span class="text-sm text-base-content/50">{{ count }} {{ countLabel }}</span>
      </div>
      <h1 class="text-3xl font-black tracking-[-0.035em] sm:text-4xl">{{ title }}</h1>
      <p class="mt-2 max-w-2xl leading-7 text-base-content/60">{{ description }}</p>
    </div>
    <div class="shrink-0"><slot name="action" /></div>
  </header>
</template>
