import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const dbUrl = process.env.TURSO_DATABASE_URL || (process.env.VERCEL ? 'file:/tmp/forlab.db' : 'file:forlab.db')
const dbAuthToken = process.env.TURSO_AUTH_TOKEN || undefined

export const db = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
})

// Initialize tables if they don't exist
let isInitialized = false
export async function initDb() {
  if (isInitialized) return
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT,
      pin_hash TEXT NOT NULL,
      drive_folder_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  isInitialized = true
}

// Generate a signed session token for a user
const TOKEN_SECRET = process.env.JWT_SECRET || process.env.MASTER_KEY || 'forlab-secure-secret-salt-2026'

export function createDropToken(slug, folderId) {
  // Expire in 24 hours
  const payload = {
    slug,
    folderId,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  }
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadStr).digest('base64url')
  return `${payloadStr}.${hmac}`
}

export function verifyDropToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [payloadStr, signature] = parts
  const expectedHmac = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadStr).digest('base64url')

  if (signature !== expectedHmac) return null

  try {
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'))
    if (!payload.exp || Date.now() > payload.exp) {
      return null // Token expired
    }
    return payload
  } catch {
    return null
  }
}

// Helper: Extract folder ID from URL or return raw ID
export function parseFolderId(input) {
  if (!input) return null
  const cleaned = input.trim()
  const match = cleaned.match(/folders\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  // If it's already an ID (alphanumeric + dashes/underscores, usually ~28-44 chars)
  if (/^[a-zA-Z0-9_-]{15,}$/.test(cleaned)) {
    return cleaned
  }
  return null
}

// Get user by slug
export async function getUserBySlug(slug) {
  await initDb()
  const normalized = slug.trim().toLowerCase()
  const res = await db.execute({
    sql: 'SELECT * FROM users WHERE slug = ?',
    args: [normalized],
  })
  return res.rows.length > 0 ? res.rows[0] : null
}

// Create a new user
export async function createUser({ slug, name, pin, folderId }) {
  await initDb()
  const normalizedSlug = slug.trim().toLowerCase()

  // Validate slug format: alphanumeric, dashes, 3-20 chars
  if (!/^[a-z0-9-]{3,20}$/.test(normalizedSlug)) {
    throw new Error('Slug must be 3-20 characters long and contain only lowercase letters, numbers, or dashes.')
  }

  // Hash the PIN (bcrypt)
  const pinHash = await bcrypt.hash(pin.trim(), 10)

  await db.execute({
    sql: 'INSERT INTO users (slug, name, pin_hash, drive_folder_id) VALUES (?, ?, ?, ?)',
    args: [normalizedSlug, name?.trim() || normalizedSlug, pinHash, folderId],
  })

  return { slug: normalizedSlug, name: name?.trim() || normalizedSlug, folderId }
}

// Verify a user's PIN
export async function verifyUserPin(slug, pin) {
  const user = await getUserBySlug(slug)
  if (!user) return null

  const isValid = await bcrypt.compare(pin.trim(), user.pin_hash)
  if (!isValid) return null

  return {
    slug: user.slug,
    name: user.name,
    folderId: user.drive_folder_id,
  }
}

// Get all users (for Admin Dashboard)
export async function getAllUsers() {
  await initDb()
  const res = await db.execute({
    sql: 'SELECT id, slug, name, drive_folder_id, created_at FROM users ORDER BY created_at DESC',
    args: [],
  })
  return res.rows
}

// Update a user's PIN
export async function updateUserPin(slug, newPin) {
  await initDb()
  const normalized = slug.trim().toLowerCase()
  const pinHash = await bcrypt.hash(newPin.trim(), 10)
  const res = await db.execute({
    sql: 'UPDATE users SET pin_hash = ? WHERE slug = ?',
    args: [pinHash, normalized],
  })
  return res.rowsAffected > 0
}

// Delete a user
export async function deleteUser(slug) {
  await initDb()
  const normalized = slug.trim().toLowerCase()
  const res = await db.execute({
    sql: 'DELETE FROM users WHERE slug = ?',
    args: [normalized],
  })
  return res.rowsAffected > 0
}
