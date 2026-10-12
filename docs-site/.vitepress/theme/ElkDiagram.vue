<!-- SPDX-License-Identifier: EPL-2.0 -->
<script setup lang="ts">
import { computed } from 'vue';
import { renderElkSvg, type ElkGraphJson } from './elkSvg';

const props = defineProps<{ graph: ElkGraphJson; alt?: string }>();
const svg = computed(() => renderElkSvg(props.graph));
</script>

<template>
  <figure class="elk-figure" :aria-label="alt" v-html="svg" />
</template>

<style scoped>
.elk-figure :deep(svg) {
  max-width: 100%;
  height: auto;
}
.elk-figure :deep(.elk-node > rect) {
  stroke: var(--vp-c-text-1);
  fill: var(--vp-c-bg-soft);
}
.elk-figure :deep(.elk-port) {
  fill: var(--vp-c-brand-1);
}
.elk-figure :deep(.elk-edge-section) {
  fill: none;
  stroke: var(--vp-c-text-2);
}
.elk-figure :deep(.elk-label) {
  font: 12px var(--vp-font-family-base);
  fill: var(--vp-c-text-1);
}
</style>
