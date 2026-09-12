// Upload permanen via Cloudinary (signed, server-side). Tanpa env = nonaktif
// dan rute foto memakai perilaku lama (disk lokal/ephemeral di serverless).
import { v2 as cloudinary } from 'cloudinary'

const FOLDER = process.env.CLOUDINARY_FOLDER || 'englishclub/proker'
let configured = false

export function isCloudinaryEnabled() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  )
}

function ensureConfig() {
  if (configured || !isCloudinaryEnabled()) return
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
  configured = true
}

// buffer (multer memoryStorage) -> secure_url permanen
export function uploadBuffer(buffer, filename = 'upload.jpg') {
  ensureConfig()
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: FOLDER, resource_type: 'image' },
      (err, result) => {
        if (err) return reject(err)
        resolve(result)
      },
    )
    stream.end(buffer)
  }).then((result) => ({ url: result.secure_url, publicId: result.public_id }))
}

// "https://res.cloudinary.com/<cloud>/image/upload/v123/folder/nama.jpg"
//   -> "folder/nama" (tanpa versi & ekstensi). Gagal parse -> null.
export function extractPublicId(url) {
  try {
    const u = String(url || '')
    const m = u.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i)
    if (!m) return null
    return decodeURIComponent(m[1])
  } catch {
    return null
  }
}

// Hapus langsung via public_id (untuk rollback upload parsial).
export async function destroyPublicId(publicId) {
  try {
    if (!isCloudinaryEnabled() || !publicId) return false
    ensureConfig()
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' })
    return true
  } catch (e) {
    console.error('Cloudinary destroy gagal:', e.message)
    return false
  }
}

// Hapus dari Cloudinary. URL non-Cloudinary / parse gagal -> resolve diam
// (cukup hapus dari array proker; tidak boleh menggagalkan request).
export async function destroyByUrl(url) {
  try {
    if (!isCloudinaryEnabled()) return false
    ensureConfig()
    const publicId = extractPublicId(url)
    if (!publicId) return false
    return destroyPublicId(publicId)
  } catch (e) {
    console.error('Cloudinary destroy gagal:', e.message)
    return false
  }
}
