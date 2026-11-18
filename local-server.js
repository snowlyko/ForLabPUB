import express from 'express'
import dotenv from 'dotenv'
import apiHandler from './api/index.js'

dotenv.config()

const app = express()
const PORT = 3001

// Support large file uploads (up to 50MB)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(express.text({ limit: '50mb' }))

// Forward all /api/* requests through unified API handler
app.all('/api/{*splat}', async (req, res) => {
  try {
    await apiHandler(req, res)
  } catch (err) {
    console.error('API Error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal Server Error' })
    }
  }
})

app.listen(PORT, () => {
  console.log(`\n🚀 Local API Server running at http://localhost:${PORT}`)
  console.log(`🔐 Master Key loaded: ${process.env.MASTER_KEY ? 'Yes' : 'No'}`)
  console.log(`📁 Database: SQLite (file:forlab.db)\n`)
})
