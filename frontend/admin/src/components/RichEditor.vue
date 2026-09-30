<script setup lang="ts">
// 富文本编辑器（任务 3.2）：wangEditor 5 封装（计划 §2 选型）
// 工具栏按 PRD §5.3：标题、段落、加粗、斜体、下划线、列表、图片、视频、链接、撤销/重做、清除格式；
// 粘贴样式过滤由 wangEditor 默认策略承担（禁止直接粘贴外部样式）；
// 图片/视频经 /admin/upload 接口入库（OSS/CDN，本地驱动为 /uploads 静态目录）
import { onBeforeUnmount, shallowRef } from 'vue';
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import type { IDomEditor } from '@wangeditor/editor';
import { request } from '@/api/http';
import '@wangeditor/editor/dist/css/style.css';

interface StoredObject {
  key: string;
  url: string;
  thumbnailUrl: string | null;
}

const props = withDefaults(
  defineProps<{
    /** 富文本内媒体上传 scope：product / company / news / content */
    scope: 'product' | 'company' | 'news' | 'content';
    placeholder?: string;
    /** 编辑器最小高度（px） */
    minHeight?: number;
  }>(),
  { placeholder: '请输入内容…', minHeight: 220 },
);

const model = defineModel<string>({ required: true });
// 官方用法：onCreated 记录编辑器实例（IDomEditor），Toolbar 与销毁均基于该实例
const editorRef = shallowRef<IDomEditor | null>(null);

const toolbarKeys = [
  'headerSelect',
  '|',
  'bold',
  'italic',
  'underline',
  '|',
  'bulletedList',
  'numberedList',
  '|',
  'insertLink',
  'insertImage',
  'insertVideo',
  '|',
  'undo',
  'redo',
  '|',
  'clearStyle',
];

const editorConfig = {
  placeholder: props.placeholder,
  MENU_CONF: {
    uploadImage: {
      // 媒体统一走后台上传接口（会话鉴权 + 白名单校验 + 魔数嗅探）
      async customUpload(file: File, insertFn: (url: string, alt: string, href: string) => void) {
        const form = new FormData();
        form.append('file', file);
        try {
          const stored = await request<StoredObject>({
            url: `/admin/upload/image?scope=${props.scope}`,
            method: 'POST',
            data: form,
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          insertFn(stored.url, file.name, stored.url);
        } catch {
          // 失败消息由请求层统一弹出
        }
      },
    },
    insertVideo: {
      // 视频同样入库，插入视频地址；封面由视频帧/运营图承担（PRD：视频封面由运营单独上传）
      async customUpload(file: File, insertFn: (url: string) => void) {
        const form = new FormData();
        form.append('file', file);
        try {
          const stored = await request<StoredObject>({
            url: '/admin/upload/video?scope=video',
            method: 'POST',
            data: form,
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          insertFn(stored.url);
        } catch {
          // 失败消息由请求层统一弹出
        }
      },
    },
  },
};

// v-model 即 Editor 组件的值绑定：内部变更自动 emit，外部赋值（编辑页加载详情）由组件内部 watch 同步进编辑器
function handleCreated(editor: IDomEditor): void {
  editorRef.value = editor;
}

onBeforeUnmount(() => {
  editorRef.value?.destroy();
});
</script>

<template>
  <div class="rich-wrap">
    <Toolbar :editor="editorRef" :default-config="{ toolbarKeys }" mode="default" class="rich-toolbar-el" />
    <!-- 注意：此处不能写 ref="editorRef"——与 setup 同名 ref 冲突时 Vue 会用
         组件实例覆盖 shallowRef，导致 Toolbar 收到不带事件 API 的假 editor（官方用法即无 ref） -->
    <Editor
      v-model="model"
      :default-config="editorConfig"
      mode="default"
      :style="{ height: `${minHeight}px`, overflowY: 'hidden' }"
      @on-created="handleCreated"
    />
  </div>
</template>

<style scoped>
.rich-wrap {
  border: 1px solid #d4dce4;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.rich-wrap :deep(.w-e-toolbar) {
  border-bottom: 1px solid #e5eaf0;
  background: #fafcfe;
}
.rich-wrap :deep(.w-e-text-container) {
  background: #fff;
}
.rich-wrap :deep(.w-e-text-container [data-slate-editor]) {
  padding: 10px 14px;
  line-height: 1.7;
}
.rich-wrap :deep(.w-e-text-placeholder) {
  top: 12px;
  left: 14px;
}
</style>
