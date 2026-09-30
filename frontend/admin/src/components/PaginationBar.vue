<script setup lang="ts">
// 通用分页条（与原型 adminPager 一致：左「共 N 条」+ 右页码，.pagination/.pg 样式）
// 页码策略与前台一致（lib/pagination.ts）：≤7 页全列，否则省略号
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    page: number;
    pageSize: number;
    total: number;
  }>(),
  { page: 1, pageSize: 20, total: 0 },
);

const emit = defineEmits<{ 'update:page': [page: number] }>();

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

/** 页码序列（含 '…' 哨兵） */
const pages = computed<(number | '…')[]>(() => {
  const count = pageCount.value;
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const current = Math.min(Math.max(props.page, 1), count);
  const set = new Set<number>([1, 2, current - 1, current, current + 1, count - 1, count]);
  const result: (number | '…')[] = [];
  let prev = 0;
  for (const n of [...set].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b)) {
    if (n - prev > 1) result.push('…');
    result.push(n);
    prev = n;
  }
  return result;
});

function go(page: number): void {
  if (page < 1 || page > pageCount.value || page === props.page) return;
  emit('update:page', page);
}
</script>

<template>
  <div class="pager-bar">
    <span>共 {{ total }} 条</span>
    <div class="pagination" style="margin: 0">
      <span class="pg" :class="{ dis: page <= 1 }" @click="go(page - 1)">‹</span>
      <template v-for="(item, index) in pages" :key="index">
        <span v-if="item === '…'" class="pg dis">…</span>
        <span v-else class="pg" :class="{ cur: item === page }" @click="go(item)">{{ item }}</span>
      </template>
      <span class="pg" :class="{ dis: page >= pageCount }" @click="go(page + 1)">›</span>
    </div>
  </div>
</template>

<style scoped>
.pager-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  font-size: 13px;
  color: var(--muted);
}
.pagination {
  display: flex;
  justify-content: center;
  gap: 8px;
}
.pagination span {
  min-width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}
.pagination .pg {
  background: #fff;
  border: 1px solid var(--line);
  color: var(--muted);
}
.pagination .pg.cur {
  background: var(--navy);
  border-color: var(--navy);
  color: #fff;
}
.pagination .pg.dis {
  opacity: 0.4;
  cursor: default;
}
.pagination .pg:hover:not(.dis):not(.cur) {
  border-color: var(--blue);
  color: var(--blue);
}
</style>
