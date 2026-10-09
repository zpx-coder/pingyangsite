<script setup lang="ts">
// 类目管理列表页（任务 3.6，PRD §7.3）：与原型 adminCategories 一致
// 表格 8 列（图标/双语名/简介摘要/产品数/企业数/排序/状态/操作）+ 底部删除限制提示；
// 新增/编辑使用弹窗表单（原型 openCatModal）；删除保护：非空类目前端即时提示 + 后端兜底拒绝
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { usePagedList } from '@/composables/usePagedList';
import {
  createCategory,
  listCategories,
  removeCategory,
  updateCategory,
  type CategoryPayload,
  type CategoryView,
} from '@/api/categories';
import { notifyError } from '@/api/http';
import { confirmDanger } from '@/utils/confirm';
import StatusBadge from '@/components/StatusBadge.vue';
import PaginationBar from '@/components/PaginationBar.vue';
import RadioPills from '@/components/RadioPills.vue';
import ImageUploader from '@/components/ImageUploader.vue';
import { mediaUrl } from '@/utils/paths';

const { list, total, page, pageSize, loading, search, onPageChange } = usePagedList<CategoryView, object>({
  pageSize: 20,
  fetchFn: ({ page, pageSize }) => listCategories({ page, pageSize }),
});

onMounted(() => {
  void search();
});

const busyId = ref<number | null>(null);

// ---- 弹窗表单（原型 openCatModal：新增/编辑复用） ----
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const saving = ref(false);

interface CategoryForm {
  nameZh: string;
  nameEn: string;
  iconUrl: string;
  introZh: string;
  introEn: string;
  sort: number;
  status: 0 | 1;
}

const form = reactive<CategoryForm>({
  nameZh: '',
  nameEn: '',
  iconUrl: '',
  introZh: '',
  introEn: '',
  sort: 0,
  status: 1,
});

const statusPills = [
  { value: 1, label: '上架' },
  { value: 0, label: '下架' },
];

function openCreate(): void {
  editingId.value = null;
  form.nameZh = '';
  form.nameEn = '';
  form.iconUrl = '';
  form.introZh = '';
  form.introEn = '';
  form.sort = 0;
  form.status = 1;
  dialogVisible.value = true;
}

function openEdit(row: CategoryView): void {
  editingId.value = row.id;
  form.nameZh = row.nameZh;
  form.nameEn = row.nameEn ?? '';
  form.iconUrl = row.iconUrl ?? '';
  form.introZh = row.introZh ?? '';
  form.introEn = row.introEn ?? '';
  form.sort = row.sort;
  form.status = row.status;
  dialogVisible.value = true;
}

function buildPayload(): CategoryPayload {
  const sort = Number(form.sort);
  return {
    nameZh: form.nameZh.trim(),
    nameEn: form.nameEn.trim() || undefined,
    iconUrl: form.iconUrl || undefined,
    introZh: form.introZh.trim() || undefined,
    introEn: form.introEn.trim() || undefined,
    sort: Number.isFinite(sort) && sort >= 0 ? Math.floor(sort) : 0,
    status: form.status,
  };
}

async function save(): Promise<void> {
  if (saving.value) return;
  if (!form.nameZh.trim()) {
    ElMessage.warning('请输入类目名称（中文）');
    return;
  }
  saving.value = true;
  try {
    const payload = buildPayload();
    if (editingId.value !== null) {
      await updateCategory(editingId.value, payload);
    } else {
      await createCategory(payload);
    }
    ElMessage.success('类目已保存');
    dialogVisible.value = false;
    await search();
  } catch (error) {
    notifyError(error, '保存失败');
  } finally {
    saving.value = false;
  }
}

/** 单行上架/下架（类目状态 0 下架 / 1 上架；下架不校验关联，PRD §7.3） */
async function toggleStatus(row: CategoryView): Promise<void> {
  busyId.value = row.id;
  try {
    const target: 0 | 1 = row.status === 1 ? 0 : 1;
    await updateCategory(row.id, { status: target });
    ElMessage.success(target === 1 ? '已上架' : '已下架');
    await search();
  } catch (error) {
    notifyError(error, '状态变更失败');
  } finally {
    busyId.value = null;
  }
}

/** 删除保护（PRD §7.3）：类目下存在产品或企业（含企业-类目多选关联）时禁止删除 */
async function removeRow(row: CategoryView): Promise<void> {
  if (row.productCount > 0 || row.companyCount > 0) {
    ElMessage.warning('请先迁移该类目下的产品与企业');
    return;
  }
  const ok = await confirmDanger(`确定删除类目「${row.nameZh}」吗？删除后不可恢复`);
  if (!ok) return;
  busyId.value = row.id;
  try {
    await removeCategory(row.id);
    ElMessage.success('已删除');
    await search();
  } catch (error) {
    notifyError(error, '删除失败');
  } finally {
    busyId.value = null;
  }
}

/** 图标占位（无图标时）：按 id 生成渐变底色 + 首字符，与原型渐变图标块一致 */
function iconHue(id: number): number {
  return (id * 67) % 360;
}
</script>

<template>
  <div>
    <div class="panel">
      <div class="p-body">
        <div class="filter-bar">
          <div class="spacer"></div>
          <button class="btn btn-primary btn-sm" @click="openCreate">＋ 新增类目</button>
        </div>
      </div>
    </div>

    <div class="panel">
      <div v-if="loading" class="p-body" style="padding: 40px; text-align: center; color: var(--muted)">
        加载中…
      </div>
      <template v-else>
        <table class="table">
          <thead>
            <tr>
              <th style="width: 70px">图标</th>
              <th>类目名称</th>
              <th>简介</th>
              <th>产品数</th>
              <th>企业数</th>
              <th>排序</th>
              <th>状态</th>
              <th style="width: 150px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in list" :key="row.id">
              <td>
                <div v-if="row.iconUrl" class="thumb"><img :src="mediaUrl(row.iconUrl)" alt="" loading="lazy" /></div>
                <div
                  v-else
                  class="cat-icon-ph"
                  :style="{ background: `linear-gradient(135deg, hsl(${iconHue(row.id)}, 60%, 92%), hsl(${iconHue(row.id)}, 50%, 84%))` }"
                >{{ row.nameZh.slice(0, 1) }}</div>
              </td>
              <td><b>{{ row.nameZh }}</b><span v-if="row.nameEn" class="name-en">{{ row.nameEn }}</span></td>
              <td><span class="sum">{{ row.introZh ?? '—' }}</span></td>
              <td>{{ row.productCount }}</td>
              <td>{{ row.companyCount }}</td>
              <td>{{ row.sort }}</td>
              <td><StatusBadge kind="published" :value="row.status" /></td>
              <td>
                <div class="ops">
                  <span class="link" @click="openEdit(row)">编辑</span>
                  <span class="link" :class="{ 'link-busy': busyId === row.id }" @click="toggleStatus(row)">
                    {{ row.status === 1 ? '下架' : '上架' }}
                  </span>
                  <span class="link danger" @click="removeRow(row)">删除</span>
                </div>
              </td>
            </tr>
            <tr v-if="list.length === 0">
              <td colspan="8" style="text-align: center; color: var(--muted); padding: 40px">暂无类目数据</td>
            </tr>
          </tbody>
        </table>
        <PaginationBar v-model:page="page" :page-size="pageSize" :total="total" unit="个类目" @update:page="onPageChange" />
      </template>
    </div>

    <div class="alert">💡 删除限制：类目下存在产品或企业时禁止删除；下架后官网首页与导航不再展示该类目。</div>

    <!-- 新增/编辑弹窗（原型 openCatModal） -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId !== null ? '编辑类目' : '新增类目'"
      width="560"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="form-row">
        <div class="form-group">
          <label>类目名称（中文）<span class="req">*</span></label>
          <input v-model="form.nameZh" maxlength="200" placeholder="如：宠物用品" />
        </div>
        <div class="form-group">
          <label>类目名称（英文）</label>
          <input v-model="form.nameEn" class="auto-field" maxlength="200" placeholder="留空保存时自动翻译" />
        </div>
      </div>
      <div class="form-group">
        <label>类目图标</label>
        <ImageUploader v-model="form.iconUrl" scope="content" :size="80" tip="上传" />
        <div class="form-tip">首页类目卡片与类目页展示</div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>类目简介（中文）</label>
          <textarea v-model="form.introZh" maxlength="500" placeholder="展示于首页卡片与类目页"></textarea>
        </div>
        <div class="form-group">
          <label>类目简介（英文）</label>
          <textarea v-model="form.introEn" class="auto-field" maxlength="500" placeholder="留空保存时自动翻译"></textarea>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>排序值</label>
          <input v-model.number="form.sort" type="number" min="0" style="width: 140px" placeholder="0" />
          <div class="form-tip">首页展示顺序，越小越靠前</div>
        </div>
        <div class="form-group">
          <label>状态</label>
          <RadioPills v-model="form.status" :options="statusPills" />
          <div class="form-tip">下架后官网首页与导航不再展示</div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-ghost" @click="dialogVisible = false">取消</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">保存</button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 图标占位块（无 iconUrl 时）：与原型渐变图标块一致 */
.cat-icon-ph {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--navy);
}
</style>
