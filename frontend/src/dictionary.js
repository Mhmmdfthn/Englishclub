const DB_NAME = 'englishclub-word-hunt'
const STORE_NAME = 'dictionary'
const DB_VERSION = 1

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function readWords(db) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get('words')
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

function writeWords(db, words) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(words, 'words')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function loadDictionary(fetchWords) {
  const db = await openDatabase()
  try {
    const cached = await readWords(db)
    if (cached?.length) return new Set(cached)
    const words = await fetchWords()
    await writeWords(db, words)
    return new Set(words)
  } finally {
    db.close()
  }
}