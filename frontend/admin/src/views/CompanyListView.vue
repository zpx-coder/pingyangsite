<script setup lang="ts">
// 企业管理列表页（任务 3.5，PRD §7.2）：
// 名称/类目/状态组合筛选；20/页；类目列为多类目标签；单行 编辑/上架(下架)/删除（逻辑删除二次确认）
// 与原型 adminCompanies 一致：filter-bar + 表格（Logo/企业名称/所属类目/产品数/联系人/电话/状态/操作）+ 共 N 条分页
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { usePagedList } from '@/composables/usePagedList';
import { listCompanies, removeCompany, updateCompany, type CompanyView } from '@/api/companies';
import { listCategories } from '@/api/categories';
import { notifyError } from '@/api/http';
import { confirmDanger } from '@/utils/confirm';
import StatusBadge from '@/components/StatusBadge.vue';
import PaginationBar from '@/components/PaginationBar.vue';

const router = useRouter();

interface CompanyFilters {
  keyword: string;
  categoryId: number | undefined;
  status: 0 | 1 | undefined;
}

const { filters, list, total, page, pageSize, loading, search, onPageChange } = usePagedList<
  CompanyView,
  CompanyFilters
>({
  pageSize: 20,
  fetchFn: ({ page, pageSize, filters: f }) =>
    listCompanies({
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

const busyId = ref<number | null>(null);

function goCreate(): void {
  void router.push('/companies/edit');
}

function goEdit(id: number): void {
  void router.push(`/companies/edit/${id}`);
}

/** 单行上架/下架（企业状态 0 下架 / 1 上架；仅传 status，不影响其他字段） */
async function toggleStatus(row: CompanyView): Promise<void> {
  busyId.value = row.id;
  try {
    const target: 0 | 1 = row.status === 1 ? 0 : 1;
    await updateCompany(row.id, { status: target });
    ElMessage.success(target === 1 ? '已上架' : '已下架');
    await search();
  } catch (error) {
    notifyError(error, '状态变更失败');
  } finally {
    busyId.value = null;
  }
}

async function removeRow(row: CompanyView): Promise<void> {
  const ok = await confirmDanger(`确定删除企业「${row.nameZh}」吗？删除后前台不再展示，其关联产品仍保留（展示为未关联）`);
  if (!ok) return;
  busyId.value = row.id;
  try {
    await removeCompany(row.id);
    ElMessage.success('已删除');
    await search();
  } catch (error) {
    notifyError(error, '删除失败');
  } finally {
    busyId.value = null;
  }
}
</script>

<template>
  <div>
    <div class="panel">
      <div class="p-body">
        <div class="filter-bar">
          <input v-model="filters.keyword" class="grow" placeholder="按企业名称搜索" @keyup.enter="search" />
          <select v-model.number="filters.categoryId">
            <option :value="undefined">全部类目</option>
            <option v-for="c in categoryOptions" :key="c.id" :value="c.id">{{ c.nameZh }}</option>
          </select>
          <select v-model.number="filters.status">
            <option :value="undefined">全部状态</option>
            <option :value="1">上架</option>
            <option :value="0">下架</option>
          </select>
          <button class="btn btn-primary btn-sm" @click="search">查询</button>
          <div class="spacer"></div>
          <button class="btn btn-primary btn-sm" @click="goCreate">＋ 新增企业</button>
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
              <th style="width: 70px">Logo</th>
              <th>企业名称</th>
              <th>所属类目</th>
              <th>产品数</th>
              <th>联系人</th>
              <th>电话</th>
              <th>状态</th>
              <th style="width: 150px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in list" :key="row.id">
              <td><div class="thumb"><img v-if="row.logoUrl" :src="row.logoUrl" alt="" loading="lazy" /><span v-else>—</span></div></td>
              <td><b>{{ row.nameZh }}</b><span v-if="row.nameEn" class="name-en">{{ row.nameEn }}</span></td>
              <td>
                <span v-for="c in row.categories" :key="c.id" class="cat-tag">{{ c.nameZh }}</span>
                <span v-if="row.categories.length === 0">—</span>
              </td>
              <td>{{ row.productCount ?? 0 }}</td>
              <td>{{ row.contactName ?? '—' }}</td>
              <td>{{ row.phone ?? '—' }}</td>
              <td><StatusBadge kind="published" :value="row.status" /></td>
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
              <td colspan="8" style="text-align: center; color: var(--muted); padding: 40px">暂无企业数据</td>
            </tr>
          </tbody>
        </table>
        <PaginationBar v-model:page="page" :page-size="pageSize" :total="total" @update:page="onPageChange" />
      </template>
    </div>
  </div>
</template>
