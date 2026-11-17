import { getUserBySlug, createUser, parseFolderId, createDropToken } from './_db.js'
import { testFolderPermissions } from './_drive.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { slug, name, pin, folderUrl } = body

    if (!slug || !pin || !folderUrl) {
      return res.status(400).json({ error: 'Slug, PIN, and Google Drive folder link are required.' })
    }

    const normalizedSlug = slug.trim().toLowerCase()
    if (!/^[a-z0-9-]{3,20}$/.test(normalizedSlug)) {
      return res.status(400).json({ error: 'Username must be 3-20 characters long and contain only lowercase letters, numbers, or dashes.' })
    }

    if (pin.trim().length < 4) {
      return res.status(400).json({ error: 'PIN must be at least 4 characters long.' })
    }

    // 1. Check if slug is already taken
    const existing = await getUserBySlug(normalizedSlug)
    if (existing) {
      return res.status(409).json({ error: `Username "${normalizedSlug}" is already taken. Please choose another.` })
    }

    // 2. Parse folder ID
    const folderId = parseFolderId(folderUrl)
    if (!folderId) {
      return res.status(400).json({ error: 'Invalid Google Drive folder link or ID.' })
    }

    // 3. Test that the service account can write to this folder
    try {
      await testFolderPermissions(folderId)
    } catch (testErr) {
      const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'the service account'
      return res.status(400).json({
        error: `Could not write to your folder. Make sure you shared it with ${saEmail} as "Editor". (${testErr.message})`,
      })
    }

    // 4. Save user to SQLite
    const user = await createUser({
      slug: normalizedSlug,
      name: name?.trim() || normalizedSlug,
      pin: pin.trim(),
      folderId,
    })

    const token = createDropToken(user.slug, user.folderId)

    return res.status(201).json({
      success: true,
      token,
      slug: user.slug,
      name: user.name,
    })
  } catch (error) {
    console.error('Error registering user:', error)
    return res.status(500).json({ error: error.message || 'Internal Server Error' })
  }
}
