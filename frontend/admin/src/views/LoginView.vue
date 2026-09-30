<script setup lang="ts">
// 登录页（任务 3.1 骨架版 / 3.3 完善）：与原型 adminLogin 一致
// 手机号 + 密码 → 服务端会话；成功后默认进入询盘管理（PRD §7.0）；失败展示后端消息（含锁定剩余时间）
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { login } from '@/api/auth';
import { notifyError } from '@/api/http';
import { markLoggedIn } from '@/stores/session';

const route = useRoute();
const router = useRouter();

const form = reactive({ phone: '', password: '' });
const submitting = ref(false);

async function onSubmit() {
  if (!/^1[3-9]\d{9}$/.test(form.phone)) {
    ElMessage.warning('请输入正确的手机号');
    return;
  }
  if (!form.password) {
    ElMessage.warning('请输入密码');
    return;
  }
  submitting.value = true;
  try {
    const data = await login({ phone: form.phone, password: form.password });
    markLoggedIn(data.phone);
    ElMessage.success('登录成功');
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/inquiries';
    void router.replace(redirect);
  } catch (error) {
    notifyError(error, '登录失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="lg">
        <div class="ic">🏛️</div>
        <h2>平阳产业带管理后台</h2>
        <p>PINGYANG INDUSTRIAL BELT · ADMIN</p>
      </div>
      <form @submit.prevent="onSubmit">
        <div class="form-group">
          <label>登录手机号</label>
          <input v-model.trim="form.phone" type="tel" maxlength="11" placeholder="请输入绑定的手机号" autocomplete="username" />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="form.password" type="password" placeholder="请输入密码" autocomplete="current-password" />
        </div>
        <button class="btn btn-primary btn-block" style="padding: 12px" type="submit" :disabled="submitting">
          {{ submitting ? '登录中…' : '登 录' }}
        </button>
      </form>
      <div class="ft">首期仅一个超级管理员账号 · 连续失败 5 次锁定 15 分钟</div>
    </div>
  </div>
</template>
