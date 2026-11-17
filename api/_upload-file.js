import { Readable } from 'stream'
import { authenticateRequest, getDriveClient } from './_drive.js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
}

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
    const { fileName, mimeType, fileData } = body

    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'fileName and fileData are required' })
    }

    const parentFolderId = authState.folderId
    const { drive } = getDriveClient()

    // Convert Base64 back to binary Buffer and Stream
    const buffer = Buffer.from(fileData, 'base64')
    const bufferStream = new Readable()
    bufferStream.push(buffer)
    bufferStream.push(null)

    const fileMetadata = {
      name: fileName,
      ...(parentFolderId ? { parents: [parentFolderId] } : {})
    }

    const media = {
      mimeType: mimeType || 'application/octet-stream',
      body: bufferStream
    }

    const uploadedFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
      supportsAllDrives: true
    })

    const fileId = uploadedFile.data.id

    // Set permission so anyone with link can view
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        },
        supportsAllDrives: true
      })
    } catch (permErr) {
      console.warn('Permission error (non-fatal):', permErr.message)
    }

    const webViewLink = uploadedFile.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`

    return res.status(200).json({
      webViewLink,
      fileName,
      fileId
    })
  } catch (error) {
    console.error('Error uploading file:', error.response?.data || error.message || error)
    return res.status(500).json({
      error: error.response?.data?.error_description || error.message || 'Internal Server Error'
    })
  }
}
