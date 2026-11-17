import { validateMasterKey, testFolderPermissions } from './_drive.js'
import { getAllUsers, updateUserPin, deleteUser } from './_db.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // Strictly require Master Key
  if (!validateMasterKey(req)) {
    return res.status(403).json({ error: 'Forbidden: Admin Master Key required' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { action } = body

    // 1. List all users
    if (action === 'list') {
      const users = await getAllUsers()
      return res.status(200).json({ users })
    }

    // 2. Reset a user's PIN
    if (action === 'reset-pin') {
      const { slug, newPin } = body
      if (!slug || !newPin || newPin.trim().length < 4) {
        return res.status(400).json({ error: 'Slug and a new PIN of at least 4 digits are required' })
      }

      const success = await updateUserPin(slug, newPin)
      if (!success) {
        return res.status(404).json({ error: `User "${slug}" not found` })
      }

      return res.status(200).json({ success: true, message: `PIN for @${slug} reset successfully.` })
    }

    // 3. Delete a user
    if (action === 'delete-user') {
      const { slug } = body
      if (!slug) {
        return res.status(400).json({ error: 'Slug is required' })
      }

      const success = await deleteUser(slug)
      if (!success) {
        return res.status(404).json({ error: `User "${slug}" not found` })
      }

      return res.status(200).json({ success: true, message: `User @${slug} deleted.` })
    }

    // 4. Test a user's folder write permissions
    if (action === 'test-folder') {
      const { folderId } = body
      if (!folderId) {
        return res.status(400).json({ error: 'folderId is required' })
      }

      try {
        const testRes = await testFolderPermissions(folderId)
        return res.status(200).json({ valid: true, folderName: testRes.folderName })
      } catch (err) {
        return res.status(200).json({ valid: false, error: err.message })
      }
    }

    return res.status(400).json({ error: `Unknown action: ${action}` })
  } catch (error) {
    console.error('Admin API error:', error)
    return res.status(500).json({ error: error.message || 'Internal Server Error' })
  }
}
