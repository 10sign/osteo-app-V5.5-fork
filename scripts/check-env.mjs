const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET'
]
const missing = required.filter(k => !process.env[k])
if (missing.length) {
  console.error(`Missing env: ${missing.join(', ')}`)
  process.exit(1)
}