<script setup>
import { ref } from 'vue'
import { api } from '../api.js'

const emit = defineEmits(['back', 'done', 'goto-signup'])

const username = ref('')
const password = ref('')
const submitting = ref(false)
const error = ref('')

async function submit() {
  if (submitting.value) return
  if (!username.value.trim() || !password.value) { error.value = 'Username & password wajib diisi.'; return }
  error.value = ''
  submitting.value = true
  try {
    const r = await api.memberLogin(username.value, password.value)
    localStorage.setItem('member_token', r.token)
    localStorage.setItem('member_username', r.username)
    localStorage.setItem('member_fullname', r.fullname || '')
    emit('done', { username: r.username, fullname: r.fullname })
  } catch (e) {
    error.value = e?.status === 401 ? 'Username atau password salah.' : (e?.message || 'Login belum berhasil.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="screen form-page">
    <nav class="page-nav" aria-label="Navigasi akun">
      <button class="page-brand" type="button" @click="emit('back')" aria-label="Kembali"><img src="/Logo_ec.jpg" alt="Logo EC UPB" /></button>
      <span class="page-nav-title">AKUN ANGGOTA EC</span>
      <button class="page-back" type="button" @click="emit('back')">Kembali</button>
    </nav>

    <div class="play-layout">
      <aside class="mode-panel">
        <span class="panel-kicker">MASUK</span>
        <h1>Selamat datang kembali.</h1>
        <p class="mode-intro">Masuk dengan username &amp; password akun EC kamu.</p>
        <div class="mode-note">
          <span class="note-mark">i</span>
          <p>Lupa password? Hubungi Admin EC untuk reset manual.</p>
        </div>
      </aside>

      <div class="card form-card">
        <div class="form-heading">
          <span class="panel-kicker">FORMULIR LOGIN</span>
          <h2>Masuk Akun</h2>
          <p>Hanya username dan password.</p>
        </div>

        <label class="name-label" for="li-username">Username</label>
        <input id="li-username" v-model="username" class="field" maxlength="20" placeholder="Username kamu..." autocapitalize="off" spellcheck="false" :disabled="submitting" @input="error=''" @keyup.enter="submit" />

        <label class="name-label" for="li-password">Password</label>
        <input id="li-password" v-model="password" type="password" class="field" placeholder="••••••••" :disabled="submitting" @input="error=''" @keyup.enter="submit" />

        <button class="btn play-btn" :disabled="submitting" @click="submit">
          <span>{{ submitting ? 'Memeriksa...' : 'MASUK' }}</span>
        </button>

        <p v-if="error" class="error">{{ error }}</p>

        <p class="tiny muted" style="margin-top:12px; text-align:center;">
          Belum punya akun?
          <button class="link-btn" type="button" @click="emit('goto-signup')">Buat akun</button>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.link-btn { background: none; border: none; padding: 0; color: var(--royal-blue); font: inherit; font-weight: 800; cursor: pointer; text-decoration: underline; }
</style>
