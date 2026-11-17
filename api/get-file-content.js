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

    // Get the file content as a stream
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    )

    // Collect the stream into a string, capped at ~500KB
    const MAX_SIZE = 500 * 1024
    const chunks = []
    let totalSize = 0
    let truncated = false

    await new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        totalSize += chunk.length
        if (totalSize <= MAX_SIZE) {
          chunks.push(chunk)
        } else {
          truncated = true
        }
      })
      response.data.on('end', resolve)
      response.data.on('error', reject)
    })

    const content = Buffer.concat(chunks).toString('utf-8')

    return res.status(200).json({
      content,
      truncated,
      size: totalSize,
    })
  } catch (error) {
    console.error('Error getting file content:', error.response?.data || error.message || error)
    return res.status(500).json({
      error: error.response?.data?.error_description || error.message || 'Internal Server Error'
    })
  }
}
