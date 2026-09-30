/// <reference types="vite/client" />

// @wangeditor/editor-for-vue 包 exports 未暴露其 dist/src/index.d.ts 类型，
// 以宽松组件类型声明补全（Editor/Toolbar 用法见 RichEditor.vue）
declare module '@wangeditor/editor-for-vue' {
  import type { DefineComponent } from 'vue';
  export const Editor: DefineComponent;
  export const Toolbar: DefineComponent;
}
