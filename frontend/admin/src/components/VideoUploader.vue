<script setup lang="ts">
// 视频上传组件（任务 3.2）：平阳介绍页视频等（mp4 ≤2GB，PRD §5.3；超大视频建议运营侧先转码）
import { ref } from 'vue';
import { ElMessage, type UploadRequestOptions } from 'element-plus';
import { request } from '@/api/http';
import { mediaUrl } from '@/utils/paths';

interface StoredObject {
  key: string;
  url: string;
  thumbnailUrl: string | null;
}

const model = defineModel<string>({ required: true });
const uploading = ref(false);
const MAX_SIZE = 2 * 1024 * 1024 * 1024;

async function onUpload(options: UploadRequestOptions): Promise<void> {
  const file = options.file as File;
  if (file.type !== 'video/mp4' && !file.name.toLowerCase().endsWith('.mp4')) {
    ElMessage.warning('仅支持 mp4 视频');
    return;
  }
  if (file.size > MAX_SIZE) {
    ElMessage.warning('视频不能超过 2GB');
    return;
  }
  uploading.value = true;
  try {
    const form = new FormData();
    form.append('file', file);
    const stored = await request<StoredObject>({
      url: '/admin/upload/video?scope=video',
      method: 'POST',
      data: form,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    model.value = stored.url;
    ElMessage.success('上传成功');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '上传失败，请重试');
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div class="upload-row">
    <div v-if="model" class="video-cell">
      <video :src="mediaUrl(model)" controls preload="metadata" />
      <span class="img-del" @click="model = ''">×</span>
    </div>
    <el-upload
      v-else
      :show-file-list="false"
      accept="video/mp4"
      :http-request="onUpload"
      :disabled="uploading"
    >
      <div class="upload-box" style="width: 200px; height: 110px">
        <span class="ic">{{ uploading ? '⏳' : '＋' }}</span>
        上传视频（mp4）
      </div>
    </el-upload>
  </div>
</template>

<style scoped>
.video-cell {
  position: relative;
  width: 200px;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  background: #0a2336;
}
.video-cell video {
  width: 100%;
  display: block;
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
