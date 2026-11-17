import express from 'express'
import dotenv from 'dotenv'
import verifyKeyHandler from './api/verify-key.js'
import authUserHandler from './api/auth-user.js'
import registerUserHandler from './api/register-user.js'
import verifyFolderHandler from './api/verify-folder.js'
import getSystemInfoHandler from './api/get-system-info.js'
import createUploadUrlHandler from './api/create-upload-url.js'
import uploadSnippetHandler from './api/upload-snippet.js'
import uploadFileHandler from './api/upload-file.js'
import listFilesHandler from './api/list-files.js'
import getFileContentHandler from './api/get-file-content.js'
import deleteFileHandler from './api/delete-file.js'
import setPermissionsHandler from './api/set-permissions.js'
import adminManageHandler from './api/admin-manage.js'

dotenv.config()

const app = express()
const PORT = 3001

// Support large file uploads (up to 50MB)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(express.text({ limit: '50mb' }))

// Express adapter for Vercel serverless function signatures
const adapter = (handler) => async (req, res) => {
  try {
    await handler(req, res)
  } catch (err) {
    console.error('API Error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal Server Error' })
    }
  }
}

// Auth & Multi-User Routes
app.post('/api/verify-key', adapter(verifyKeyHandler))
app.post('/api/auth-user', adapter(authUserHandler))
app.post('/api/register-user', adapter(registerUserHandler))
app.post('/api/verify-folder', adapter(verifyFolderHandler))
app.get('/api/get-system-info', adapter(getSystemInfoHandler))
app.post('/api/get-system-info', adapter(getSystemInfoHandler))

// File Operations Routes
app.post('/api/create-upload-url', adapter(createUploadUrlHandler))
app.post('/api/upload-snippet', adapter(uploadSnippetHandler))
app.post('/api/upload-file', adapter(uploadFileHandler))
app.post('/api/list-files', adapter(listFilesHandler))
app.post('/api/get-file-content', adapter(getFileContentHandler))
app.post('/api/delete-file', adapter(deleteFileHandler))
app.post('/api/set-permissions', adapter(setPermissionsHandler))
app.post('/api/admin-manage', adapter(adminManageHandler))

app.listen(PORT, () => {
  console.log(`\n🚀 Local API Server running at http://localhost:${PORT}`)
  console.log(`🔐 Master Key loaded: ${process.env.MASTER_KEY ? 'Yes' : 'No'}`)
  console.log(`📁 Database: SQLite (file:forlab.db)\n`)
})
