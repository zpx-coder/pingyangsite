<script setup lang="ts">
// 状态胶囊单选（原型 .radio-pills）：各模块状态/置顶等二选一、三选一场景复用
interface Option {
  value: string | number;
  label: string;
}

defineProps<{ options: Option[] }>();
const model = defineModel<string | number>({ required: true });
</script>

<template>
  <div class="radio-pills">
    <label
      v-for="opt in options"
      :key="opt.value"
      :class="{ on: model === opt.value }"
      @click="model = opt.value"
    >
      {{ opt.label }}
    </label>
  </div>
</template>
