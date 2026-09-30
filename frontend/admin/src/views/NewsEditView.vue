<script setup lang="ts">
// 新闻新增/编辑页（任务 3.7，PRD §7.4）：与原型 adminNewsEdit 一致
// 标题/封面/发布时间（支持定时）/状态/置顶/摘要/正文（双语富文本）；底部 存为草稿 + 保存并发布
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { createNews, getNews, updateNews, type NewsPayload } from '@/api/news';
import { notifyError } from '@/api/http';
import { toDateTimeLocal } from '@/utils/format';
import RadioPills from '@/components/RadioPills.vue';
import ImageUploader from '@/components/ImageUploader.vue';
import RichEditor from '@/components/RichEditor.vue';

const route = useRoute();
const router = useRouter();

const editId = route.params.id ? Number(route.params.id) : null;

interface NewsForm {
  titleZh: string;
  titleEn: string;
  coverUrl: string;
  publishTime: string; // datetime-local 值（本地时区）
  status: 0 | 1;
  isTop: 0 | 1;
  summaryZh: string;
  summaryEn: string;
  contentZh: string;
  contentEn: string;
}

const form = reactive<NewsForm>({
  titleZh: '',
  titleEn: '',
  coverUrl: '',
  publishTime: toDateTimeLocal(new Date()),
  status: 1,
  isTop: 0,
  summaryZh: '',
  summaryEn: '',
  contentZh: '',
  contentEn: '',
});

const statusPills = [
  { value: 1, label: '已发布' },
  { value: 0, label: '草稿' },
];

const topPills = [
  { value: 1, label: '置顶' },
  { value: 0, label: '不置顶' },
];

/** 富文本是否为空（校验「正文必填」用） */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

async function loadDetail(id: number): Promise<void> {
  try {
    const n = await getNews(id);
    form.titleZh = n.titleZh;
    form.titleEn = n.titleEn ?? '';
    form.coverUrl = n.coverUrl ?? '';
    form.publishTime = toDateTimeLocal(n.publishTime);
    form.status = n.status;
    form.isTop = n.isTop ? 1 : 0;
    form.summaryZh = n.summaryZh ?? '';
    form.summaryEn = n.summaryEn ?? '';
    form.contentZh = n.contentZh;
    form.contentEn = n.contentEn ?? '';
  } catch (error) {
    notifyError(error, '加载新闻失败');
    void router.push('/news');
  }
}

onMounted(() => {
  if (editId !== null) void loadDetail(editId);
});

function buildPayload(status: 0 | 1): NewsPayload {
  const publishTime = form.publishTime ? new Date(form.publishTime).toISOString() : '';
  return {
    titleZh: form.titleZh.trim(),
    titleEn: form.titleEn.trim() || undefined,
    coverUrl: form.coverUrl || undefined,
    summaryZh: form.summaryZh.trim() || undefined,
    summaryEn: form.summaryEn.trim() || undefined,
    contentZh: form.contentZh,
    contentEn: stripHtml(form.contentEn) ? form.contentEn : undefined,
    publishTime,
    isTop: form.isTop === 1,
    status,
  };
}

const saving = ref(false);

/** 存为草稿（status 0）/ 保存并发布（status 1）：与原型双按钮一致 */
async function save(status: 0 | 1): Promise<void> {
  if (saving.value) return;
  if (!form.titleZh.trim()) {
    ElMessage.warning('请输入新闻标题（中文）');
    return;
  }
  if (!form.publishTime) {
    ElMessage.warning('请选择发布时间');
    return;
  }
  if (!stripHtml(form.contentZh)) {
    ElMessage.warning('请输入新闻正文（中文）');
    return;
  }
  saving.value = true;
  try {
    const payload = buildPayload(status);
    if (editId !== null) {
      await updateNews(editId, payload);
    } else {
      await createNews(payload);
    }
    ElMessage.success(status === 1 ? '新闻已发布' : '已保存为草稿');
    void router.push('/news');
  } catch (error) {
    notifyError(error, '保存失败');
    saving.value = false;
  }
}

function cancel(): void {
  void router.push('/news');
}
</script>

<template>
  <div>
    <button class="btn btn-ghost btn-sm" style="margin-bottom: 16px" @click="router.push('/news')">
      ← 返回新闻列表
    </button>

    <div class="form-section">
      <div class="fs-head">基本信息</div>
      <div class="fs-body">
        <div class="form-row">
          <div class="form-group">
            <label>新闻标题（中文）<span class="req">*</span></label>
            <input v-model="form.titleZh" maxlength="200" placeholder="请输入新闻标题" />
            <div class="form-tip">英文标题留空时保存自动翻译</div>
          </div>
          <div class="form-group">
            <label>新闻标题（英文）</label>
            <input v-model="form.titleEn" class="auto-field" maxlength="200" placeholder="留空保存时自动翻译" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>封面图</label>
            <ImageUploader v-model="form.coverUrl" scope="news" tip="上传封面" />
            <div class="form-tip">新闻列表与详情页展示（推荐 16:9 横图）</div>
          </div>
          <div class="form-group">
            <label>发布时间<span class="req">*</span></label>
            <input v-model="form.publishTime" type="datetime-local" style="width: 220px" />
            <div class="form-tip">支持定时发布：选择未来时间，到点前台自动展示</div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>状态</label>
            <RadioPills v-model="form.status" :options="statusPills" />
            <div class="form-tip">草稿不在官网展示</div>
          </div>
          <div class="form-group">
            <label>置顶</label>
            <RadioPills v-model="form.isTop" :options="topPills" />
            <div class="form-tip">置顶新闻排在官网新闻列表最前</div>
          </div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="fs-head">内容编辑</div>
      <div class="fs-body">
        <div class="form-row">
          <div class="form-group">
            <label>摘要（中文）</label>
            <textarea v-model="form.summaryZh" maxlength="200" rows="3" placeholder="新闻列表卡片摘要，最多 200 字"></textarea>
          </div>
          <div class="form-group">
            <label>摘要（英文）</label>
            <textarea v-model="form.summaryEn" class="auto-field" maxlength="200" rows="3" placeholder="留空保存时自动翻译"></textarea>
          </div>
        </div>
        <div class="form-group">
          <label>正文（中文）<span class="req">*</span></label>
          <RichEditor v-model="form.contentZh" scope="news" :min-height="260" placeholder="请输入新闻正文" />
        </div>
        <div class="form-group">
          <label>正文（英文）</label>
          <RichEditor v-model="form.contentEn" scope="news" :min-height="260" placeholder="留空保存时自动翻译" />
          <div class="form-tip">英文正文留空时保存自动翻译</div>
        </div>
      </div>
    </div>

    <div style="display: flex; gap: 10px; padding: 4px 0 30px">
      <button class="btn btn-ghost" :disabled="saving" @click="save(0)">存为草稿</button>
      <button class="btn btn-primary" :disabled="saving" @click="save(1)">保存并发布</button>
      <button class="btn btn-ghost" @click="cancel">取消</button>
    </div>
  </div>
</template>
