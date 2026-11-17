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
    const { fileName, mimeType } = body

    const folderId = authState.folderId
    const { auth } = getDriveClient()

    const fileMetadata = {
      name: fileName || 'Untitled',
      ...(folderId ? { parents: [folderId] } : {})
    }

    // Forward browser origin so Google sets CORS headers for resumable upload
    const origin = req.headers.origin || req.headers.referer?.replace(/\/+$/, '') || '*'

    const response = await auth.request({
      url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,webViewLink',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType || 'application/octet-stream',
        'Origin': origin,
      },
      data: fileMetadata
    })

    const uploadUrl = typeof response.headers?.get === 'function'
      ? response.headers.get('location')
      : (response.headers?.location || response.headers?.['Location'])
    const fileId = response.data ? response.data.id : null
    const webViewLink = response.data && response.data.webViewLink
      ? response.data.webViewLink
      : (fileId ? `https://drive.google.com/file/d/${fileId}/view` : null)

    if (!uploadUrl) {
      throw new Error('Failed to retrieve resumable upload URL from Google Drive API')
    }

    return res.status(200).json({
      uploadUrl,
      fileId,
      webViewLink
    })
  } catch (error) {
    console.error('Error creating upload URL:', error.response?.data || error.message || error)
    return res.status(500).json({
      error: error.response?.data?.error_description || error.message || 'Internal Server Error'
    })
  }
}
