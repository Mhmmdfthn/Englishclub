<script setup>
import { ref } from 'vue'
import { api } from '../api.js'

const emit = defineEmits(['back', 'done', 'goto-signup'])

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const error = ref('')

async function submit() {
  if (submitting.value) return
  const u = username.value.trim()
  if (!u || !password.value) { error.value = 'Username & password wajib diisi.'; return }
  error.value = ''
  submitting.value = true
  try {
    const r = await api.memberLogin(u, password.value)
    try {
      localStorage.setItem('member_token', r.token)
      localStorage.setItem('member_username', r.username)
      localStorage.setItem('member_fullname', r.fullname || '')
    } catch { error.value = 'Browser memblokir penyimpanan. Aktifkan cookies untuk masuk.'; return }
    emit('done', { username: r.username, fullname: r.fullname })
  } catch (e) {
    if (e?.status === 401) error.value = 'Username atau password salah.'
    else if (e?.status === 422) error.value = e?.message || 'Data login tidak valid.'
    else if (e?.network || e?.status === 503) error.value = 'Server sibuk, coba lagi sebentar.'
    else error.value = e?.message || 'Login belum berhasil.'
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
      <span class="ec-eyebrow">Masuk</span>
      <h1 class="ec-h2">Selamat datang kembali.</h1>
      <p class="ec-lede">Masuk dengan username &amp; password akun EC kamu.</p>

      <form class="auth__form" @submit.prevent="submit">
        <div class="ec-field-group">
          <label class="ec-label" for="li-username">Username</label>
          <input
            id="li-username"
            v-model="username"
            class="ec-field"
            maxlength="20"
            placeholder="Username kamu..."
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
          <label class="ec-label" for="li-password">Password</label>
          <div class="auth__password">
            <input
              id="li-password"
              v-model="password"
              class="ec-field"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              autocomplete="current-password"
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

        <button class="ec-btn ec-btn--primary ec-btn--block" type="submit" :disabled="submitting">
          {{ submitting ? 'Memeriksa...' : 'Masuk' }}
        </button>
      </form>

      <p class="ec-caption auth__switch">
        Belum punya akun?
        <button class="auth__link" type="button" @click="emit('goto-signup')">Buat akun</button>
      </p>
      <p class="ec-helper auth__note">Lupa password? Hubungi Admin EC untuk reset manual.</p>
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

.auth__note {
  text-align: center;
}
</style>
