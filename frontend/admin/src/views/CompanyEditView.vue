<script setup lang="ts">
// 企业新增/编辑（任务 3.5，PRD §7.2）：与原型 adminCompanyEdit 一致
// 基本信息（名称/类目多选芯片/状态胶囊/成立年份/员工规模/地址/联系人/电话/邮箱/官网/排序）+
// Logo 与封面 + 企业简介富文本（中/英）+ 荣誉资质（≤10 张）；英文字段留空保存时由服务端自动翻译
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  createCompany,
  getCompany,
  updateCompany,
  type CompanyPayload,
} from '@/api/companies';
import { listCategories } from '@/api/categories';
import { notifyError } from '@/api/http';
import RadioPills from '@/components/RadioPills.vue';
import ImageUploader from '@/components/ImageUploader.vue';
import RichEditor from '@/components/RichEditor.vue';

const route = useRoute();
const router = useRouter();
const editId = route.params.id ? Number(route.params.id) : null;

interface CompanyForm {
  nameZh: string;
  nameEn: string;
  categoryIds: number[];
  status: 0 | 1;
  foundedYear: number | '' | null;
  scale: string;
  address: string;
  addressEn: string;
  contactName: string;
  contactNameEn: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  coverUrl: string;
  introZh: string;
  introEn: string;
  honorImages: string[];
  sort: number;
}

const form = reactive<CompanyForm>({
  nameZh: '',
  nameEn: '',
  categoryIds: [],
  status: 1,
  foundedYear: null,
  scale: '',
  address: '',
  addressEn: '',
  contactName: '',
  contactNameEn: '',
  phone: '',
  email: '',
  website: '',
  logoUrl: '',
  coverUrl: '',
  introZh: '',
  introEn: '',
  honorImages: [],
  sort: 0,
});

const saving = ref(false);

// 状态胶囊：企业仅 上架/下架 两态（原型 adminCompanyEdit，无草稿态）
const statusPills = [
  { value: 1, label: '上架' },
  { value: 0, label: '下架' },
];

// 类目多选芯片：仅上架类目（编辑时并入企业当前类目，防止类目已下架导致芯片丢失）
const categoryOptions = ref<{ id: number; nameZh: string }[]>([]);

/** 芯片点选：选中/取消切换（原型 chipToggle） */
function toggleCategory(id: number): void {
  form.categoryIds = form.categoryIds.includes(id)
    ? form.categoryIds.filter((x) => x !== id)
    : [...form.categoryIds, id];
}

/** 富文本去除标签后的纯文本（空编辑器为 <p><br></p>，视为空） */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;

function validate(): string | null {
  if (!form.nameZh.trim()) return '请输入企业名称（中文）';
  if (form.categoryIds.length === 0) return '至少选择 1 个类目';
  if (!form.logoUrl) return '请上传企业 Logo';
  if (form.foundedYear !== null && form.foundedYear !== '' && (Number(form.foundedYear) < 1900 || Number(form.foundedYear) > 2100)) {
    return '成立年份须在 1900–2100 之间';
  }
  if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) return '邮箱格式不正确';
  if (form.website.trim() && !URL_RE.test(form.website.trim())) return '官网链接格式不正确（需含 http/https）';
  if (!stripHtml(form.introZh)) return '请输入企业简介（中文）';
  return null;
}

function buildPayload(): CompanyPayload {
  // 排序/年份容错：空或非法输入按未填处理，取整
  const sort = Number(form.sort);
  const year = typeof form.foundedYear === 'number' && Number.isFinite(form.foundedYear) ? Math.floor(form.foundedYear) : undefined;
  return {
    nameZh: form.nameZh.trim(),
    nameEn: form.nameEn.trim() || undefined,
    logoUrl: form.logoUrl,
    coverUrl: form.coverUrl || undefined,
    categoryIds: [...form.categoryIds],
    foundedYear: year,
    scale: form.scale.trim() || undefined,
    address: form.address.trim() || undefined,
    addressEn: form.addressEn.trim() || undefined,
    contactName: form.contactName.trim() || undefined,
    contactNameEn: form.contactNameEn.trim() || undefined,
    phone: form.phone.trim() || undefined,
    email: form.email.trim() || undefined,
    website: form.website.trim() || undefined,
    introZh: form.introZh,
    // 空编辑器（<p><br></p>）视为未填写，交由服务端自动翻译
    introEn: stripHtml(form.introEn) ? form.introEn : undefined,
    honorImages: form.honorImages,
    sort: Number.isFinite(sort) && sort > 0 ? Math.floor(sort) : 0,
    status: form.status,
  };
}

async function save(): Promise<void> {
  if (saving.value) return;
  const invalid = validate();
  if (invalid) {
    ElMessage.warning(invalid);
    return;
  }
  saving.value = true;
  try {
    const payload = buildPayload();
    if (editId !== null) {
      await updateCompany(editId, payload);
    } else {
      await createCompany(payload);
    }
    ElMessage.success('已保存');
    void router.push('/companies');
  } catch (error) {
    notifyError(error, '保存失败');
  } finally {
    saving.value = false;
  }
}

async function loadDetail(id: number): Promise<void> {
  try {
    const c = await getCompany(id);
    form.nameZh = c.nameZh;
    form.nameEn = c.nameEn ?? '';
    form.categoryIds = c.categories.map((x) => x.id);
    form.status = c.status;
    form.foundedYear = c.foundedYear ?? null;
    form.scale = c.scale ?? '';
    form.address = c.address ?? '';
    form.addressEn = c.addressEn ?? '';
    form.contactName = c.contactName ?? '';
    form.contactNameEn = c.contactNameEn ?? '';
    form.phone = c.phone ?? '';
    form.email = c.email ?? '';
    form.website = c.website ?? '';
    form.logoUrl = c.logoUrl ?? '';
    form.coverUrl = c.coverUrl ?? '';
    form.introZh = c.introZh ?? '';
    form.introEn = c.introEn ?? '';
    form.honorImages = c.honorImages ?? [];
    form.sort = c.sort;
    // 当前类目可能已下架（上架类目列表不含），补入芯片避免选中项丢失
    for (const cat of c.categories) {
      if (!categoryOptions.value.some((x) => x.id === cat.id)) {
        categoryOptions.value.push({ id: cat.id, nameZh: cat.nameZh });
      }
    }
  } catch (error) {
    notifyError(error, '加载企业失败');
    void router.push('/companies');
  }
}

onMounted(() => {
  // 初始芯片：上架类目（编辑态由 loadDetail 补缺）
  listCategories({ page: 1, pageSize: 100, status: 1 })
    .then((res) => {
      categoryOptions.value = res.list.map((c) => ({ id: c.id, nameZh: c.nameZh }));
    })
    .catch(() => {
      // 类目加载失败不阻塞编辑（保存时后端会校验）
    });
  if (editId !== null) void loadDetail(editId);
});
</script>

<template>
  <div>
    <button class="btn btn-ghost btn-sm" style="margin-bottom: 16px" @click="router.push('/companies')">
      ← 返回企业列表
    </button>

    <div class="form-section">
      <div class="fs-head">基本信息</div>
      <div class="fs-body">
        <div class="form-row">
          <div class="form-group">
            <label>企业名称（中文）<span class="req">*</span></label>
            <input v-model="form.nameZh" maxlength="200" placeholder="请输入企业名称" />
            <div class="form-tip">英文名称留空时保存自动翻译</div>
          </div>
          <div class="form-group">
            <label>企业名称（英文）</label>
            <input v-model="form.nameEn" class="auto-field" maxlength="200" placeholder="留空保存时自动翻译" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>所属类目<span class="req">*</span>（可多选）</label>
            <div class="cat-chips">
              <span
                v-for="c in categoryOptions"
                :key="c.id"
                class="chipx"
                :class="{ on: form.categoryIds.includes(c.id) }"
                @click="toggleCategory(c.id)"
              >{{ c.nameZh }}</span>
            </div>
            <div class="form-tip">至少选择 1 个类目；企业可归属多个类目，出现在多个类目页（已确认）</div>
          </div>
          <div class="form-group">
            <label>状态</label>
            <RadioPills v-model="form.status" :options="statusPills" />
            <div class="form-tip">下架后官网不展示</div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>成立年份</label>
            <input v-model.number="form.foundedYear" type="number" min="1900" max="2100" style="width: 140px" placeholder="如 2010" />
          </div>
          <div class="form-group">
            <label>员工规模</label>
            <input v-model="form.scale" maxlength="100" placeholder="如 200–500 人" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>地址（中文）</label>
            <input v-model="form.address" maxlength="500" placeholder="请输入企业地址" />
          </div>
          <div class="form-group">
            <label>地址（英文）</label>
            <input v-model="form.addressEn" class="auto-field" maxlength="500" placeholder="留空保存时自动翻译" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>联系人（中文）</label>
            <input v-model="form.contactName" maxlength="100" placeholder="请输入联系人" />
          </div>
          <div class="form-group">
            <label>联系人（英文）</label>
            <input v-model="form.contactNameEn" class="auto-field" maxlength="100" placeholder="留空保存时自动翻译" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>联系电话</label>
            <input v-model="form.phone" maxlength="50" placeholder="如 0577-6372 0101" />
          </div>
          <div class="form-group">
            <label>邮箱</label>
            <input v-model="form.email" maxlength="255" placeholder="如 contact@example.com" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>官网链接</label>
            <input v-model="form.website" maxlength="255" placeholder="https://" />
          </div>
          <div class="form-group">
            <label>排序值</label>
            <input v-model.number="form.sort" type="number" min="0" style="width: 140px" />
            <div class="form-tip">官网企业列表排序，越小越靠前</div>
          </div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="fs-head">Logo 与封面</div>
      <div class="fs-body">
        <div class="form-row">
          <div class="form-group">
            <label>企业 Logo<span class="req">*</span></label>
            <ImageUploader v-model="form.logoUrl" scope="company" tip="上传 Logo" />
            <div class="form-tip">建议 1:1，≥ 200×200px</div>
          </div>
          <div class="form-group">
            <label>封面图</label>
            <ImageUploader v-model="form.coverUrl" scope="company" tip="上传封面图" />
            <div class="form-tip">企业详情页头部展示</div>
          </div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="fs-head">企业简介（富文本）</div>
      <div class="fs-body">
        <div class="form-group">
          <label>中文简介<span class="req">*</span></label>
          <RichEditor v-model="form.introZh" scope="company" placeholder="请输入企业简介…" :min-height="260" />
          <div class="form-tip">企业详情页展示；支持图文混排</div>
        </div>
        <div class="form-group">
          <label>英文简介</label>
          <RichEditor v-model="form.introEn" scope="company" placeholder="留空保存时自动翻译…" :min-height="260" />
          <div class="form-tip">留空保存时自动翻译</div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="fs-head">荣誉资质（≤ 10 张）</div>
      <div class="fs-body">
        <div class="form-group">
          <ImageUploader v-model="form.honorImages" scope="company" multiple :limit="10" />
          <div class="form-tip">企业详情页资质墙展示</div>
        </div>
      </div>
    </div>

    <div style="display: flex; gap: 10px; padding: 4px 0 30px">
      <button class="btn btn-primary" :disabled="saving" @click="save">保存</button>
      <button class="btn btn-ghost" @click="router.push('/companies')">取消</button>
    </div>
  </div>
</template>
