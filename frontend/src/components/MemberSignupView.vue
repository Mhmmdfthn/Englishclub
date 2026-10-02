<script setup>
import { ref } from 'vue'
import { api } from '../api.js'

const emit = defineEmits(['back', 'done', 'goto-login'])

const fullname = ref('')
const username = ref('')
const password = ref('')
const submitting = ref(false)
const error = ref('')
const success = ref('')

async function submit() {
  if (submitting.value) return
  error.value = ''
  success.value = ''
  submitting.value = true
  try {
    const r = await api.memberRegister(fullname.value, username.value, password.value)
    success.value = `Akun @${r.username} dibuat. Selamat datang, ${r.fullname}!`
    if (r.token) {
      localStorage.setItem('member_token', r.token)
      localStorage.setItem('member_username', r.username)
      localStorage.setItem('member_fullname', r.fullname || '')
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
  <section class="screen form-page">
    <nav class="page-nav" aria-label="Navigasi akun">
      <button class="page-brand" type="button" @click="emit('back')" aria-label="Kembali"><img src="/Logo_ec.jpg" alt="Logo EC UPB" /></button>
      <span class="page-nav-title">AKUN ANGGOTA EC</span>
      <button class="page-back" type="button" @click="emit('back')">Kembali</button>
    </nav>

    <div class="play-layout">
      <aside class="mode-panel">
        <span class="panel-kicker">BUAT AKUN</span>
        <h1>Gabung sebagai anggota.</h1>
        <p class="mode-intro">Khusus nama yang sudah didaftarkan English Club.</p>
        <div class="mode-note">
          <span class="note-mark">i</span>
          <p>Tulis <b>nama lengkap</b> sama persis seperti yang didaftarkan di EC. Username &amp; password bebas kamu tentukan.</p>
        </div>
      </aside>

      <div class="card form-card">
        <div class="form-heading">
          <span class="panel-kicker">FORMULIR AKUN</span>
          <h2>Buat Akun</h2>
          <p>Nama lengkap, username, dan password.</p>
        </div>

        <label class="name-label" for="su-fullname">Nama Lengkap</label>
        <input id="su-fullname" v-model="fullname" class="field" maxlength="100" placeholder="Sesuai data EC..." :disabled="submitting" @input="error=''" />

        <label class="name-label" for="su-username">Username</label>
        <input id="su-username" v-model="username" class="field" maxlength="20" placeholder="3-20 karakter (huruf/angka/_)" autocapitalize="off" spellcheck="false" :disabled="submitting" @input="error=''" />

        <label class="name-label" for="su-password">Password</label>
        <input id="su-password" v-model="password" type="password" class="field" placeholder="Minimal 6 karakter" :disabled="submitting" @input="error=''" />

        <button class="btn play-btn" :disabled="submitting" @click="submit">
          <span>{{ submitting ? 'Memproses...' : 'BUAT AKUN' }}</span>
        </button>

        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="success" class="success-msg">{{ success }}</p>

        <p class="tiny muted" style="margin-top:12px; text-align:center;">
          Sudah punya akun?
          <button class="link-btn" type="button" @click="emit('goto-login')">Masuk di sini</button>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.link-btn { background: none; border: none; padding: 0; color: var(--royal-blue); font: inherit; font-weight: 800; cursor: pointer; text-decoration: underline; }
</style>
