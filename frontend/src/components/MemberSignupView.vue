<script setup>
import { ref } from 'vue'
import { api } from '../api.js'

const emit = defineEmits(['back', 'done', 'goto-login'])

const fullname = ref('')
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const error = ref('')
const success = ref('')

function validate() {
  if (!fullname.value.trim()) return 'Nama lengkap wajib diisi.'
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.value.trim())) return 'Username 3-20 karakter (huruf, angka, underscore).'
  if (!password.value || password.value.length < 6) return 'Password minimal 6 karakter.'
  return ''
}

async function submit() {
  if (submitting.value) return
  const v = validate()
  if (v) { error.value = v; return }
  error.value = ''
  success.value = ''
  submitting.value = true
  try {
    const r = await api.memberRegister(fullname.value.trim(), username.value.trim(), password.value)
    success.value = `Akun @${r.username} dibuat. Selamat datang, ${r.fullname}!`
    if (r.token) {
      try {
        localStorage.setItem('member_token', r.token)
        localStorage.setItem('member_username', r.username)
        localStorage.setItem('member_fullname', r.fullname || '')
      } catch { /* storage diblokir: sesi tak tersimpan, user bisa login manual */ }
    }
    setTimeout(() => emit('done', { username: r.username, fullname: r.fullname }), 900)
  } catch (e) {
    error.value = e?.message || 'Pendaftaran akun belum berhasil.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="auth">
    <nav class="auth__nav" aria-label="Navigasi akun">
      <button class="auth__brand" type="button" @click="emit('back')" aria-label="Kembali ke beranda">
        <img src="/logo-ec.png" alt="Logo English Club UPB" width="36" height="36" />
        <span>English Club <b>UPB</b></span>
      </button>
      <button class="ec-btn ec-btn--ghost ec-btn--sm" type="button" @click="emit('back')">Kembali</button>
    </nav>

    <div class="ec-card auth__card">
      <span class="ec-eyebrow">Buat akun</span>
      <h1 class="ec-h2">Gabung sebagai anggota.</h1>
      <p class="ec-lede">Khusus nama yang sudah didaftarkan English Club.</p>

      <form class="auth__form" @submit.prevent="submit">
        <div class="ec-field-group">
          <label class="ec-label" for="su-fullname">Nama lengkap</label>
          <input
            id="su-fullname"
            v-model="fullname"
            class="ec-field"
            maxlength="100"
            placeholder="Sesuai data EC..."
            autocomplete="name"
            :aria-invalid="!!error"
            :disabled="submitting"
            @input="error = ''"
          />
          <span class="ec-helper">Tulis nama lengkap sama persis seperti yang didaftarkan di EC.</span>
        </div>

        <div class="ec-field-group">
          <label class="ec-label" for="su-username">Username</label>
          <input
            id="su-username"
            v-model="username"
            class="ec-field"
            maxlength="20"
            placeholder="3-20 karakter (huruf/angka/_)"
            autocomplete="username"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            :aria-invalid="!!error"
            :disabled="submitting"
            @input="error = ''"
          />
        </div>

        <div class="ec-field-group">
          <label class="ec-label" for="su-password">Password</label>
          <div class="auth__password">
            <input
              id="su-password"
              v-model="password"
              class="ec-field"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Minimal 6 karakter"
              autocomplete="new-password"
              :aria-invalid="!!error"
              :disabled="submitting"
              @input="error = ''"
            />
            <button
              class="auth__toggle"
              type="button"
              :aria-pressed="showPassword"
              :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
              :disabled="submitting"
              @click="showPassword = !showPassword"
            >{{ showPassword ? 'Sembunyi' : 'Lihat' }}</button>
          </div>
        </div>

        <p v-if="error" class="auth__error" role="alert">{{ error }}</p>
        <p v-if="success" class="auth__success" role="status">{{ success }}</p>

        <button class="ec-btn ec-btn--primary ec-btn--block" type="submit" :disabled="submitting">
          {{ submitting ? 'Memproses...' : 'Buat akun' }}
        </button>
      </form>

      <p class="ec-caption auth__switch">
        Sudah punya akun?
        <button class="auth__link" type="button" @click="emit('goto-login')">Masuk di sini</button>
      </p>
    </div>
  </section>
</template>

<style scoped>
.auth {
  width: 100%;
  max-width: 480px;
  min-height: 100dvh;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-5);
  padding: clamp(16px, 3vh, 28px) 16px 48px;
  user-select: text;
  -webkit-user-select: text;
}

.auth__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ec-space-3);
  min-height: 64px;
}

.auth__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--ec-space-3);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ec-ink);
  font-family: 'Outfit', sans-serif;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.auth__brand img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  padding: 3px;
  border-radius: var(--ec-radius-pill);
  background: var(--ec-surface);
  border: 1px solid var(--ec-line);
}

.auth__brand b {
  color: var(--ec-blue);
  font-weight: 700;
}

.auth__card {
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-3);
  padding: clamp(24px, 5vw, 36px);
}

.auth__card .ec-lede {
  margin-bottom: var(--ec-space-2);
}

.auth__form {
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-4);
  margin-top: var(--ec-space-1);
}

.auth__password {
  position: relative;
}

.auth__password .ec-field {
  padding-right: 92px;
}

.auth__toggle {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  min-height: 36px;
  padding: 6px 12px;
  border: 0;
  border-radius: var(--ec-radius-pill);
  background: transparent;
  color: var(--ec-blue);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.auth__toggle:hover:not(:disabled) {
  background: var(--ec-blue-050);
}

.auth__toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth__toggle:focus-visible {
  outline: none;
  box-shadow: var(--ec-focus-ring);
}

.auth__error {
  margin: 0;
  padding: var(--ec-space-3) var(--ec-space-4);
  border: 1px solid var(--ec-danger-line);
  border-radius: var(--ec-radius-md);
  background: var(--ec-danger-bg);
  color: var(--ec-danger);
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.5;
}

.auth__success {
  margin: 0;
  padding: var(--ec-space-3) var(--ec-space-4);
  border: 1px solid var(--ec-success-line);
  border-radius: var(--ec-radius-md);
  background: var(--ec-success-bg);
  color: var(--ec-success);
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.5;
}

.auth__switch {
  margin-top: var(--ec-space-1);
  text-align: center;
}

.auth__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--ec-blue);
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}
</style>
