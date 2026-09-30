<script setup lang="ts">
// 产品管理列表页（任务 3.4，PRD §7.1）：
// 名称关键词/类目/状态组合筛选；20/页；单行 编辑/上架(下架)/删除；批量上架/下架/删除（删除二次确认）
// 与原型 adminProducts 一致：filter-bar + 表格（主图/名称/类目/企业/状态/排序/更新时间/操作）+ 共 N 条分页
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { usePagedList } from '@/composables/usePagedList';
import {
  batchProducts,
  listProducts,
  removeProduct,
  updateProductStatus,
  type ProductStatus,
  type ProductView,
} from '@/api/products';
import { listCategories } from '@/api/categories';
import { notifyError } from '@/api/http';
import { confirmDanger } from '@/utils/confirm';
import { formatDateTime } from '@/utils/format';
import StatusBadge from '@/components/StatusBadge.vue';
import PaginationBar from '@/components/PaginationBar.vue';

const router = useRouter();

interface ProductFilters {
  keyword: string;
  categoryId: number | undefined;
  status: ProductStatus | undefined;
}

const { filters, list, total, page, pageSize, loading, search, onPageChange } = usePagedList<
  ProductView,
  ProductFilters
>({
  pageSize: 20,
  fetchFn: ({ page, pageSize, filters: f }) =>
    listProducts({
      page,
      pageSize,
      keyword: f.keyword || undefined,
      categoryId: f.categoryId,
      status: f.status,
    }),
});

// 类目下拉（筛选用，全量类目）
const categoryOptions = ref<{ id: number; nameZh: string }[]>([]);
onMounted(() => {
  listCategories({ page: 1, pageSize: 100, status: undefined })
    .then((res) => {
      categoryOptions.value = res.list.map((c) => ({ id: c.id, nameZh: c.nameZh }));
    })
    .catch(() => {
      // 类目加载失败不阻塞列表（筛选下拉为空）
    });
  void search();
});

const selected = ref<ProductView[]>([]);
const busyId = ref<number | null>(null);

function goCreate(): void {
  void router.push('/products/edit');
}

function goEdit(id: number): void {
  void router.push(`/products/edit/${id}`);
}

/** 单行上架/下架（状态流转：草稿/已下架 → 已发布；已发布 → 已下架） */
async function toggleStatus(row: ProductView): Promise<void> {
  busyId.value = row.id;
  try {
    const target: ProductStatus = row.status === 1 ? 2 : 1;
    await updateProductStatus(row.id, target);
    ElMessage.success(target === 1 ? '已上架' : '已下架');
    await search();
  } catch (error) {
    notifyError(error, '状态变更失败');
  } finally {
    busyId.value = null;
  }
}

async function removeRow(row: ProductView): Promise<void> {
  const ok = await confirmDanger(`确定删除产品「${row.nameZh}」吗？删除后前台不再展示（询盘记录不受影响）`);
  if (!ok) return;
  busyId.value = row.id;
  try {
    await removeProduct(row.id);
    ElMessage.success('已删除');
    await search();
  } catch (error) {
    notifyError(error, '删除失败');
  } finally {
    busyId.value = null;
  }
}

const BATCH_LABEL: Record<'publish' | 'unpublish' | 'delete', string> = {
  publish: '批量上架',
  unpublish: '批量下架',
  delete: '批量删除',
};

async function runBatch(action: 'publish' | 'unpublish' | 'delete'): Promise<void> {
  const ids = selected.value.map((row) => row.id);
  if (ids.length === 0) {
    ElMessage.warning('请先勾选要操作的产品');
    return;
  }
  const label = BATCH_LABEL[action];
  if (action === 'delete') {
    const ok = await confirmDanger(`确定${label}选中的 ${ids.length} 个产品吗？删除后前台不再展示（询盘记录不受影响）`);
    if (!ok) return;
  }
  try {
    const result = await batchProducts(ids, action);
    ElMessage.success(`${label}成功（${result.count} 条）`);
    selected.value = [];
    await search();
  } catch (error) {
    notifyError(error, `${label}失败`);
  }
}

/** 原型勾选列：全部勾选/取消 */
function toggleSelectAll(checked: boolean): void {
  selected.value = checked ? [...list.value] : [];
}
function rowChecked(row: ProductView): boolean {
  return selected.value.some((s) => s.id === row.id);
}
function toggleRow(row: ProductView, checked: boolean): void {
  selected.value = checked
    ? [...selected.value, row]
    : selected.value.filter((s) => s.id !== row.id);
}
</script>

<template>
  <div>
    <div class="panel">
      <div class="p-body">
        <div class="filter-bar">
          <input v-model="filters.keyword" class="grow" placeholder="按产品名称搜索" @keyup.enter="search" />
          <select v-model.number="filters.categoryId">
            <option :value="undefined">全部类目</option>
            <option v-for="c in categoryOptions" :key="c.id" :value="c.id">{{ c.nameZh }}</option>
          </select>
          <select v-model.number="filters.status">
            <option :value="undefined">全部状态</option>
            <option :value="0">草稿</option>
            <option :value="1">已发布</option>
            <option :value="2">已下架</option>
          </select>
          <button class="btn btn-primary btn-sm" @click="search">查询</button>
          <div class="spacer"></div>
          <button class="btn btn-ghost btn-sm" @click="runBatch('publish')">批量上架</button>
          <button class="btn btn-ghost btn-sm" @click="runBatch('unpublish')">批量下架</button>
          <button class="btn btn-danger btn-sm" @click="runBatch('delete')">批量删除</button>
          <button class="btn btn-primary btn-sm" @click="goCreate">＋ 新增产品</button>
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
              <th style="width: 36px">
                <input type="checkbox" :checked="list.length > 0 && selected.length === list.length" @change="toggleSelectAll(($event.target as HTMLInputElement).checked)" />
              </th>
              <th style="width: 70px">主图</th>
              <th>产品名称</th>
              <th>所属类目</th>
              <th>关联企业</th>
              <th>状态</th>
              <th>排序</th>
              <th>更新时间</th>
              <th style="width: 150px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in list" :key="row.id">
              <td>
                <input type="checkbox" :checked="rowChecked(row)" @change="toggleRow(row, ($event.target as HTMLInputElement).checked)" />
              </td>
              <td><div class="thumb"><img v-if="row.mainImage" :src="row.mainImage" alt="" loading="lazy" /><span v-else>—</span></div></td>
              <td><b>{{ row.nameZh }}</b><span v-if="row.nameEn" class="name-en">{{ row.nameEn }}</span></td>
              <td>{{ row.category?.nameZh ?? '—' }}</td>
              <td>{{ row.company?.nameZh ?? '' }}<span v-if="!row.company" style="color: var(--red)">未关联</span></td>
              <td><StatusBadge kind="product" :value="row.status" /></td>
              <td>{{ row.sort }}</td>
              <td>{{ formatDateTime(row.updatedAt) }}</td>
              <td>
                <div class="ops">
                  <span class="link" @click="goEdit(row.id)">编辑</span>
                  <span class="link" :class="{ 'link-busy': busyId === row.id }" @click="toggleStatus(row)">
                    {{ row.status === 1 ? '下架' : '上架' }}
                  </span>
                  <span class="link danger" @click="removeRow(row)">删除</span>
                </div>
              </td>
            </tr>
            <tr v-if="list.length === 0">
              <td colspan="9" style="text-align: center; color: var(--muted); padding: 40px">暂无产品数据</td>
            </tr>
          </tbody>
        </table>
        <PaginationBar v-model:page="page" :page-size="pageSize" :total="total" @update:page="onPageChange" />
      </template>
    </div>
  </div>
</template>
