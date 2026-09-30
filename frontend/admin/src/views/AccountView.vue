<script setup lang="ts">
// 账号管理（任务 3.10，PRD §7.6）：与原型 adminAccount 一致
// 左卡修改绑定手机号（当前密码验证，不接短信验证码）；右卡修改密码（≥8 位含字母数字，成功后强制重登）
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { changePassword, changePhone } from '@/api/account';
import { notifyError } from '@/api/http';
import { clearSession, sessionState } from '@/stores/session';

const router = useRouter();

const PHONE_PATTERN = /^1[3-9]\d{9}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;

/** 当前绑定手机号脱敏展示（与顶栏一致：138****0000） */
const maskedPhone = computed(() => {
  const phone = sessionState.phone;
  return /^1\d{10}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(7)}` : phone;
});

// ---- 修改绑定手机号 ----
const phoneForm = ref({ newPhone: '', confirmPhone: '', password: '' });
const phoneBusy = ref(false);

function validatePhoneForm(): string | null {
  const { newPhone, confirmPhone, password } = phoneForm.value;
  if (!PHONE_PATTERN.test(newPhone)) {
    return '新手机号格式不正确';
  }
  if (newPhone !== confirmPhone) {
    return '两次输入的新手机号不一致';
  }
  if (!password) {
    return '请输入当前密码';
  }
  return null;
}

async function submitPhone(): Promise<void> {
  const invalid = validatePhoneForm();
  if (invalid) {
    ElMessage.warning(invalid);
    return;
  }
  phoneBusy.value = true;
  try {
    const result = await changePhone(phoneForm.value.newPhone, phoneForm.value.password);
    sessionState.phone = result.phone; // 顶栏与当前绑定字段即时同步
    ElMessage.success('手机号修改成功');
    phoneForm.value = { newPhone: '', confirmPhone: '', password: '' };
  } catch (error) {
    notifyError(error, '手机号修改失败');
  } finally {
    phoneBusy.value = false;
  }
}

// ---- 修改密码 ----
const pwdForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' });
const pwdBusy = ref(false);

function validatePwdForm(): string | null {
  const { currentPassword, newPassword, confirmPassword } = pwdForm.value;
  if (!currentPassword) {
    return '请输入当前密码';
  }
  if (!PASSWORD_PATTERN.test(newPassword)) {
    return '新密码须为 8–64 位且同时包含字母与数字';
  }
  if (newPassword !== confirmPassword) {
    return '两次输入的新密码不一致';
  }
  return null;
}

async function submitPassword(): Promise<void> {
  const invalid = validatePwdForm();
  if (invalid) {
    ElMessage.warning(invalid);
    return;
  }
  pwdBusy.value = true;
  try {
    await changePassword(pwdForm.value.currentPassword, pwdForm.value.newPassword);
    // 服务端已销毁会话（PRD §7.6 强制重新登录）：清本地会话状态，带 expired 标记回登录页
    ElMessage.success('密码修改成功，请重新登录');
    clearSession();
    void router.replace({ name: 'login', query: { expired: '1' } });
  } catch (error) {
    notifyError(error, '密码修改失败');
  } finally {
    pwdBusy.value = false;
  }
}
</script>

<template>
  <div class="account-grid">
    <!-- 修改绑定手机号（原型 adminAccount 左卡） -->
    <div class="panel">
      <div class="p-head"><h3>修改绑定手机号</h3></div>
      <div class="p-body">
        <div class="form-group">
          <label>当前绑定手机号</label>
          <input :value="maskedPhone" disabled style="background: #f3f6f9" />
        </div>
        <div class="form-group">
          <label>新手机号<span class="req">*</span></label>
          <input v-model="phoneForm.newPhone" placeholder="请输入新手机号" maxlength="11" />
          <div class="form-tip">修改手机号需校验当前密码，不接短信验证码（已确认）</div>
        </div>
        <div class="form-group">
          <label>确认新手机号<span class="req">*</span></label>
          <input v-model="phoneForm.confirmPhone" placeholder="请再次输入新手机号" maxlength="11" />
        </div>
        <div class="form-group">
          <label>当前密码<span class="req">*</span></label>
          <input v-model="phoneForm.password" type="password" placeholder="用于验证身份" />
        </div>
        <button class="btn btn-primary" :disabled="phoneBusy" @click="submitPhone">提交修改</button>
      </div>
    </div>

    <!-- 修改密码（原型 adminAccount 右卡） -->
    <div class="panel">
      <div class="p-head"><h3>修改密码</h3></div>
      <div class="p-body">
        <div class="form-group">
          <label>当前密码<span class="req">*</span></label>
          <input v-model="pwdForm.currentPassword" type="password" placeholder="请输入当前密码" />
        </div>
        <div class="form-group">
          <label>新密码<span class="req">*</span></label>
          <input v-model="pwdForm.newPassword" type="password" placeholder="≥ 8 位，含字母与数字" />
        </div>
        <div class="form-group">
          <label>确认新密码<span class="req">*</span></label>
          <input v-model="pwdForm.confirmPassword" type="password" placeholder="请再次输入新密码" />
        </div>
        <button class="btn btn-primary" :disabled="pwdBusy" @click="submitPassword">提交修改</button>
        <div class="form-tip" style="margin-top: 12px">
          修改成功后强制退出并重新登录；账号为超级管理员，不可删除。
        </div>
      </div>
    </div>
  </div>
</template>
