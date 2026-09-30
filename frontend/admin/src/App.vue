<script setup lang="ts">
// 根组件：路由出口 + 文档标题随路由切换
import { watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
watch(
  () => route.meta.title,
  (title) => {
    document.title = title ? `${String(title)} · 平阳产业带管理后台` : '平阳产业带管理后台';
  },
  { immediate: true },
);
</script>

<template>
  <router-view />
</template>
