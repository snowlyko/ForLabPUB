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
    const parentFolderId = authState.folderId
    const { drive } = getDriveClient()

    // 1. List files in user's root folder (non-folder items only)
    const rootFiles = []
    let pageToken = null

    do {
      const listRes = await drive.files.list({
        q: `'${parentFolderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, webViewLink, webContentLink)',
        orderBy: 'createdTime desc',
        pageSize: 100,
        pageToken: pageToken || undefined,
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      })

      for (const file of (listRes.data.files || [])) {
        rootFiles.push({
          ...file,
          folder: 'Files',
        })
      }
      pageToken = listRes.data.nextPageToken
    } while (pageToken)

    // 2. Find the user's Snippets subfolder
    const snippetFiles = []
    const folderRes = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = 'Snippets' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })

    if (folderRes.data.files && folderRes.data.files.length > 0) {
      const snippetsFolderId = folderRes.data.files[0].id
      let snippetPageToken = null

      do {
        const snippetListRes = await drive.files.list({
          q: `'${snippetsFolderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
          fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, webViewLink, webContentLink)',
          orderBy: 'createdTime desc',
          pageSize: 100,
          pageToken: snippetPageToken || undefined,
          spaces: 'drive',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        })

        for (const file of (snippetListRes.data.files || [])) {
          snippetFiles.push({
            ...file,
            folder: 'Snippets',
          })
        }
        snippetPageToken = snippetListRes.data.nextPageToken
      } while (snippetPageToken)
    }

    // 3. Merge and sort by createdTime descending
    const allFiles = [...rootFiles, ...snippetFiles].sort(
      (a, b) => new Date(b.createdTime) - new Date(a.createdTime)
    )

    return res.status(200).json({ files: allFiles })
  } catch (error) {
    console.error('Error listing files:', error.response?.data || error.message || error)
    return res.status(500).json({
      error: error.response?.data?.error_description || error.message || 'Internal Server Error'
    })
  }
}
