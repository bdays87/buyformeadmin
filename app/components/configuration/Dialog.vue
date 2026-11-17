<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  wide?: boolean
}>(), { description: '', wide: false })

defineEmits<{ close: [] }>()
</script>

<template>
  <div v-if="open" role="dialog" aria-modal="true" class="modal modal-open">
    <div :class="['modal-box max-h-[90vh] overflow-y-auto', wide ? 'max-w-4xl' : 'max-w-xl']">
      <div class="mb-6 flex items-start justify-between gap-5">
        <div>
          <h2 class="text-2xl font-black tracking-[-0.025em]">{{ title }}</h2>
          <p v-if="description" class="mt-1 text-sm leading-6 text-base-content/55">{{ description }}</p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm btn-circle" aria-label="Close dialog" @click="$emit('close')">
          <Icon name="lucide:x" class="size-4" />
        </button>
      </div>
      <slot />
    </div>
    <button type="button" class="modal-backdrop" aria-label="Close dialog" @click="$emit('close')">close</button>
  </div>
</template>
