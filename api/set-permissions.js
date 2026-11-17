import { authenticateRequest, getDriveClient } from './_drive.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const authState = authenticateRequest(req)
  if (!authState.authenticated) {
    return res.status(401).json({ error: 'Unauthorized: Invalid credentials or expired session' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { fileId } = body

    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' })
    }

    const { drive } = getDriveClient()

    // Set "anyone with link can view" permission
    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        },
        supportsAllDrives: true
      })
    } catch (permErr) {
      console.warn('Permission error (non-fatal):', permErr.message)
    }

    // Retrieve the webViewLink for the file
    const fileRes = await drive.files.get({
      fileId,
      fields: 'id, webViewLink',
      supportsAllDrives: true
    })

    const webViewLink = fileRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`

    return res.status(200).json({
      success: true,
      fileId,
      webViewLink
    })
  } catch (error) {
    console.error('Error setting file permissions:', error.response?.data || error.message || error)
    return res.status(500).json({
      error: error.response?.data?.error_description || error.message || 'Internal Server Error'
    })
  }
}
