<script setup lang="ts">
// 图片上传组件（任务 3.2）：单图 / 多图两态复用（产品主图、图集、Logo、封面、荣誉资质、类目图标…）
// 上传走 /admin/upload/image?scope=xxx（服务端白名单校验 + 魔数嗅探，PRD §5.3 jpg/png/webp ≤5MB）
import { ref } from 'vue';
import { ElMessage, type UploadRequestOptions } from 'element-plus';
import { request } from '@/api/http';

interface StoredObject {
  key: string;
  url: string;
  thumbnailUrl: string | null;
}

const props = withDefaults(
  defineProps<{
    /** 上传 scope（后端白名单）：product / company / news / content */
    scope: 'product' | 'company' | 'news' | 'content';
    /** 多图上限（图集/资质 ≤10；单图模式忽略） */
    limit?: number;
    /** 是否多图模式 */
    multiple?: boolean;
    /** 上传框提示文案 */
    tip?: string;
  }>(),
  { limit: 10, multiple: false, tip: '' },
);

const model = defineModel<string | string[]>({ required: true });
const uploading = ref(false);

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_SIZE = 5 * 1024 * 1024;

async function onUpload(options: UploadRequestOptions): Promise<void> {
  const file = options.file as File;
  if (!ACCEPT.includes(file.type)) {
    ElMessage.warning('仅支持 jpg / png / webp 图片');
    return;
  }
  if (file.size > MAX_SIZE) {
    ElMessage.warning('图片不能超过 5MB');
    return;
  }
  uploading.value = true;
  try {
    const form = new FormData();
    form.append('file', file);
    const stored = await request<StoredObject>({
      url: `/admin/upload/image?scope=${props.scope}`,
      method: 'POST',
      data: form,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (props.multiple) {
      const values = [...(Array.isArray(model.value) ? model.value : [])];
      if (values.length >= props.limit) {
        ElMessage.warning(`最多上传 ${props.limit} 张图片`);
        return;
      }
      values.push(stored.url);
      model.value = values;
    } else {
      model.value = stored.url;
    }
    ElMessage.success('上传成功');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '上传失败，请重试');
  } finally {
    uploading.value = false;
  }
}

function removeAt(index: number): void {
  const values = [...(Array.isArray(model.value) ? model.value : [])];
  values.splice(index, 1);
  model.value = values;
}
</script>

<template>
  <div class="upload-row">
    <!-- 已上传图预览 -->
    <template v-if="multiple">
      <div v-for="(url, i) in (model as string[])" :key="url" class="img-cell">
        <el-image :src="url" fit="cover" :preview-src-list="(model as string[])" :initial-index="i" />
        <span class="img-del" @click="removeAt(i)">×</span>
      </div>
    </template>
    <template v-else>
      <div v-if="model && !Array.isArray(model)" class="img-cell">
        <el-image :src="model" fit="cover" :preview-src-list="[model]" />
        <span class="img-del" @click="model = ''">×</span>
      </div>
    </template>
    <!-- 添加上传框（多图达到上限时隐藏） -->
    <el-upload
      v-if="!multiple || (model as string[]).length < limit"
      :show-file-list="false"
      :accept="ACCEPT"
      :http-request="onUpload"
      :disabled="uploading"
    >
      <div class="upload-box" :class="{ wide: !multiple }" style="width: 120px; height: 120px">
        <span class="ic">{{ uploading ? '⏳' : '＋' }}</span>
        {{ multiple ? '添加图片' : tip || '上传图片' }}
      </div>
    </el-upload>
  </div>
</template>

<style scoped>
.img-cell {
  position: relative;
  width: 120px;
  height: 120px;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
}
.img-cell :deep(.el-image) {
  width: 100%;
  height: 100%;
}
.img-del {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(10, 30, 46, 0.7);
  color: #fff;
  font-size: 14px;
  line-height: 20px;
  text-align: center;
  cursor: pointer;
}
.img-del:hover {
  background: var(--red);
}
</style>
