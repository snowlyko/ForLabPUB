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

    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error.response?.data || error.message || error)
    return res.status(500).json({
      error: error.response?.data?.error_description || error.message || 'Internal Server Error'
    })
  }
}
