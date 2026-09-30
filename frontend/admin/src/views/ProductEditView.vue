<script setup lang="ts">
// 产品新增/编辑（任务 3.4，PRD §7.1）：与原型 adminProductEdit 一致
// 基本信息（名称/类目/关联企业/状态/排序）+ 产品图片（主图/图集）+ 简介 + 富文本详情 + 价格与起订量
// 保存按钮：保存草稿(0)；主按钮随状态胶囊——已发布(1)/已下架(2，仅编辑态)；英文字段留空保存时由服务端自动翻译
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  createProduct,
  getProduct,
  updateProduct,
  type ProductPayload,
  type ProductStatus,
} from '@/api/products';
import { listCategories } from '@/api/categories';
import { getCompany, listCompanies } from '@/api/companies';
import { notifyError } from '@/api/http';
import RadioPills from '@/components/RadioPills.vue';
import ImageUploader from '@/components/ImageUploader.vue';
import RichEditor from '@/components/RichEditor.vue';

const route = useRoute();
const router = useRouter();
const editId = route.params.id ? Number(route.params.id) : null;
const isEdit = editId !== null;

interface ProductForm {
  nameZh: string;
  nameEn: string;
  categoryId: number | null;
  companyId: number | null;
  mainImage: string;
  images: string[];
  introZh: string;
  introEn: string;
  detailZh: string;
  detailEn: string;
  priceRef: string;
  moq: string;
  sort: number;
  status: ProductStatus;
}

const form = reactive<ProductForm>({
  nameZh: '',
  nameEn: '',
  categoryId: null,
  companyId: null,
  mainImage: '',
  images: [],
  introZh: '',
  introEn: '',
  detailZh: '',
  detailEn: '',
  priceRef: '',
  moq: '',
  sort: 0,
  status: 0,
});

const saving = ref(false);

// 状态胶囊：新增时不可选「已下架」（新品无发布史），编辑时可流转至已下架
const statusPills = computed(() =>
  isEdit
    ? [
        { value: 0, label: '草稿' },
        { value: 1, label: '已发布' },
        { value: 2, label: '已下架' },
      ]
    : [
        { value: 0, label: '草稿' },
        { value: 1, label: '已发布' },
      ],
);

/** 主按钮文案随状态胶囊变化（原型：保存草稿 + 保存并发布 + 取消） */
const primaryLabel = computed(() => (form.status === 2 ? '保存（已下架）' : '保存并发布'));

// 类目下拉：仅上架类目（编辑时并入产品当前类目，防止类目已下架导致下拉丢失）
const categoryOptions = ref<{ id: number; nameZh: string }[]>([]);

// 关联企业：远程搜索（按名称关键词）
const companyOptions = ref<{ id: number; nameZh: string }[]>([]);
const companyLoading = ref(false);
async function searchCompanies(keyword: string): Promise<void> {
  companyLoading.value = true;
  try {
    const res = await listCompanies({ page: 1, pageSize: 20, keyword: keyword || undefined });
    companyOptions.value = res.list.map((c) => ({ id: c.id, nameZh: c.nameZh }));
  } catch {
    // 失败消息由请求层统一弹出
  } finally {
    companyLoading.value = false;
  }
}

/** 富文本去除标签后的纯文本（空编辑器为 <p><br></p>，视为空） */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function validate(): string | null {
  if (!form.nameZh.trim()) return '请输入产品名称（中文）';
  if (form.categoryId === null) return '请选择所属类目';
  if (!form.mainImage) return '请上传产品主图';
  if (!stripHtml(form.detailZh)) return '请输入产品详情（中文）';
  return null;
}

function buildPayload(status: ProductStatus): ProductPayload {
  // 排序值容错：空/非法输入按 0 处理，取整
  const sort = Number(form.sort);
  return {
    nameZh: form.nameZh.trim(),
    nameEn: form.nameEn.trim() || undefined,
    categoryId: form.categoryId as number,
    companyId: form.companyId || null,
    mainImage: form.mainImage,
    images: form.images,
    introZh: form.introZh.trim() || undefined,
    introEn: form.introEn.trim() || undefined,
    detailZh: form.detailZh,
    // 空编辑器（<p><br></p>）视为未填写，交由服务端自动翻译
    detailEn: stripHtml(form.detailEn) ? form.detailEn : undefined,
    priceRef: form.priceRef.trim() || undefined,
    moq: form.moq.trim() || undefined,
    sort: Number.isFinite(sort) && sort > 0 ? Math.floor(sort) : 0,
    status,
  };
}

const SAVED_MESSAGE: Record<ProductStatus, string> = {
  0: '已保存为草稿',
  1: '已保存并发布',
  2: '已保存（已下架）',
};

async function save(status: ProductStatus): Promise<void> {
  if (saving.value) return;
  const invalid = validate();
  if (invalid) {
    ElMessage.warning(invalid);
    return;
  }
  saving.value = true;
  try {
    const payload = buildPayload(status);
    if (editId !== null) {
      await updateProduct(editId, payload);
    } else {
      await createProduct(payload);
    }
    ElMessage.success(SAVED_MESSAGE[status]);
    void router.push('/products');
  } catch (error) {
    notifyError(error, '保存失败');
  } finally {
    saving.value = false;
  }
}

function saveDraft(): void {
  void save(0);
}

/** 保存并发布：主按钮按胶囊取 1/2（草稿胶囊下点击主按钮仍按发布处理） */
function savePublish(): void {
  void save(form.status === 2 ? 2 : 1);
}

async function loadDetail(id: number): Promise<void> {
  try {
    const p = await getProduct(id);
    form.nameZh = p.nameZh;
    form.nameEn = p.nameEn ?? '';
    form.categoryId = p.categoryId;
    form.companyId = p.companyId;
    form.mainImage = p.mainImage;
    form.images = p.images ?? [];
    form.introZh = p.introZh ?? '';
    form.introEn = p.introEn ?? '';
    form.detailZh = p.detailZh;
    form.detailEn = p.detailEn ?? '';
    form.priceRef = p.priceRef ?? '';
    form.moq = p.moq ?? '';
    form.sort = p.sort;
    form.status = p.status;
    // 当前类目可能已下架（上架类目列表不含），补入下拉避免显示空
    if (p.category && !categoryOptions.value.some((c) => c.id === p.category!.id)) {
      categoryOptions.value.push({ id: p.category.id, nameZh: p.category.nameZh });
    }
    // 关联企业若不在初始选项中，按详情补回标签
    if (p.companyId && !companyOptions.value.some((c) => c.id === p.companyId)) {
      const co = await getCompany(p.companyId);
      companyOptions.value.push({ id: co.id, nameZh: co.nameZh });
    }
  } catch (error) {
    notifyError(error, '加载产品失败');
    void router.push('/products');
  }
}

onMounted(() => {
  // 初始选项：上架类目 + 企业首页（编辑态由 loadDetail 补缺）
  listCategories({ page: 1, pageSize: 100, status: 1 })
    .then((res) => {
      categoryOptions.value = res.list.map((c) => ({ id: c.id, nameZh: c.nameZh }));
    })
    .catch(() => {
      // 类目加载失败不阻塞编辑（保存时后端会校验）
    });
  void searchCompanies('');
  if (editId !== null) void loadDetail(editId);
});
</script>

<template>
  <div>
    <button class="btn btn-ghost btn-sm" style="margin-bottom: 16px" @click="router.push('/products')">
      ← 返回产品列表
    </button>

    <div class="form-section">
      <div class="fs-head">基本信息</div>
      <div class="fs-body">
        <div class="form-row">
          <div class="form-group">
            <label>产品名称（中文）<span class="req">*</span></label>
            <input v-model="form.nameZh" maxlength="200" placeholder="请输入产品名称" />
            <div class="form-tip">英文名称留空时保存自动翻译</div>
          </div>
          <div class="form-group">
            <label>产品名称（英文）</label>
            <input v-model="form.nameEn" class="auto-field" maxlength="200" placeholder="留空保存时自动翻译" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>所属类目<span class="req">*</span></label>
            <select v-model.number="form.categoryId">
              <option :value="null" disabled>请选择类目</option>
              <option v-for="c in categoryOptions" :key="c.id" :value="c.id">{{ c.nameZh }}</option>
            </select>
            <div class="form-tip">仅展示已上架类目</div>
          </div>
          <div class="form-group">
            <label>关联企业（选填）</label>
            <el-select
              v-model="form.companyId"
              filterable
              remote
              clearable
              :remote-method="searchCompanies"
              :loading="companyLoading"
              placeholder="不关联企业"
              style="width: 100%"
            >
              <el-option v-for="c in companyOptions" :key="c.id" :label="c.nameZh" :value="c.id" />
            </el-select>
            <div class="form-tip">产品可不关联企业（已确认）；未关联时询盘的企业字段为空</div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>状态</label>
            <RadioPills v-model="form.status" :options="statusPills" />
          </div>
          <div class="form-group">
            <label>排序值</label>
            <input v-model.number="form.sort" type="number" min="0" style="width: 140px" />
            <div class="form-tip">类目页列表排序，越小越靠前</div>
          </div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="fs-head">产品图片</div>
      <div class="fs-body">
        <div class="form-row">
          <div class="form-group">
            <label>主图<span class="req">*</span></label>
            <ImageUploader v-model="form.mainImage" scope="product" tip="上传主图" />
            <div class="form-tip">建议 1:1，≥ 800×800px</div>
          </div>
          <div class="form-group">
            <label>产品图集（≤ 10 张）</label>
            <ImageUploader v-model="form.images" scope="product" multiple :limit="10" />
          </div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="fs-head">产品简介（列表卡片摘要，≤ 200 字）</div>
      <div class="fs-body">
        <div class="form-row">
          <div class="form-group">
            <label>中文</label>
            <textarea v-model="form.introZh" maxlength="200" placeholder="展示于产品列表卡片"></textarea>
          </div>
          <div class="form-group">
            <label>英文</label>
            <textarea
              v-model="form.introEn"
              class="auto-field"
              maxlength="200"
              placeholder="留空保存时自动翻译"
            ></textarea>
          </div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="fs-head">产品详情（富文本）</div>
      <div class="fs-body">
        <div class="form-group">
          <label>中文详情<span class="req">*</span></label>
          <RichEditor v-model="form.detailZh" scope="product" placeholder="请输入产品详情…" :min-height="260" />
          <div class="form-tip">支持图文混排；粘贴时自动清除外部样式</div>
        </div>
        <div class="form-group">
          <label>英文详情</label>
          <RichEditor v-model="form.detailEn" scope="product" placeholder="留空保存时自动翻译…" :min-height="260" />
          <div class="form-tip">留空保存时自动翻译</div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="fs-head">价格与起订量</div>
      <div class="fs-body">
        <div class="form-row">
          <div class="form-group">
            <label>参考价格</label>
            <input v-model="form.priceRef" maxlength="100" placeholder="如 $2.5–3.0 / pc" />
            <div class="form-tip">文本展示，支持区间，如 $2.5–3.0 / pc</div>
          </div>
          <div class="form-group">
            <label>最小起订量 MOQ</label>
            <input v-model="form.moq" maxlength="100" placeholder="如 1000 pcs" />
          </div>
        </div>
      </div>
    </div>

    <div style="display: flex; gap: 10px; padding: 4px 0 30px">
      <button class="btn btn-ghost" :disabled="saving" @click="saveDraft">保存草稿</button>
      <button class="btn btn-primary" :disabled="saving" @click="savePublish">{{ primaryLabel }}</button>
      <button class="btn btn-ghost" @click="router.push('/products')">取消</button>
    </div>
  </div>
</template>
