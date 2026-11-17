<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <header class="flex flex-col gap-4 border-b border-base-300 p-5 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-xl font-black">{{ title }}</h1>
    </div>
    <div v-if="$slots.action" class="shrink-0">
      <slot name="action" />
    </div>
  </header>
</template>
