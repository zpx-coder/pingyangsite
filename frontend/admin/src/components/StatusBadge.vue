<script setup lang="ts">
// 状态徽标（原型 .badge-*）：各模块状态枚举 → 文案与配色统一收敛于此，列表/弹窗复用
import { computed } from 'vue';

// kind 对应各模块的状态取值空间（与后端约定一致：0/1/2）
const MAPS = {
  // 产品：0 草稿 / 1 已发布 / 2 已下架（PRD §7.1）
  product: { 0: ['草稿', 'badge-gray'], 1: ['已发布', 'badge-green'], 2: ['已下架', 'badge-red'] },
  // 企业/类目：0 下架 / 1 上架（PRD §7.2/7.3）
  published: { 0: ['下架', 'badge-red'], 1: ['上架', 'badge-green'] },
  // 新闻：0 草稿 / 1 已发布（PRD §7.4.1）
  news: { 0: ['草稿', 'badge-gray'], 1: ['已发布', 'badge-green'] },
  // 询盘：0 未处理 / 1 已处理（PRD §7.5）
  inquiry: { 0: ['未处理', 'badge-red'], 1: ['已处理', 'badge-green'] },
} as const;

export type BadgeKind = keyof typeof MAPS;

const props = defineProps<{ kind: BadgeKind; value: number | null | undefined }>();
const entry = computed(() => {
  const map = MAPS[props.kind] as unknown as Record<number, readonly [string, string]>;
  const hit = map[props.value ?? -1];
  return hit ?? (['—', 'badge-gray'] as const);
});
</script>

<template>
  <span class="badge" :class="entry[1]">{{ entry[0] }}</span>
</template>
