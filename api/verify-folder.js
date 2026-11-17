import { parseFolderId } from './_db.js'
import { testFolderPermissions } from './_drive.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { folderUrl } = body

    const folderId = parseFolderId(folderUrl)
    if (!folderId) {
      return res.status(400).json({ error: 'Invalid Google Drive folder link or ID.' })
    }

    try {
      const result = await testFolderPermissions(folderId)
      return res.status(200).json({
        valid: true,
        folderId,
        folderName: result.folderName,
      })
    } catch (testErr) {
      const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'your sync service account'
      return res.status(400).json({
        valid: false,
        error: `Could not access this folder. Make sure you shared it with ${saEmail} and gave it "Editor" permissions. (${testErr.message})`,
      })
    }
  } catch (error) {
    console.error('Error verifying folder:', error)
    return res.status(500).json({ error: error.message || 'Internal Server Error' })
  }
}
