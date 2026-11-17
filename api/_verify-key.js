export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { key } = body
    const masterKey = process.env.MASTER_KEY

    if (!masterKey) {
      console.error('[ForLab] Server Error: MASTER_KEY environment variable is not configured!')
      return res.status(500).json({
        valid: false,
        error: 'MASTER_KEY is not configured in Vercel Environment Variables. Please add MASTER_KEY in Vercel Project Settings.',
      })
    }

    if (key && key.trim() === masterKey.trim()) {
      return res.status(200).json({ valid: true })
    } else {
      return res.status(401).json({ valid: false, error: 'Incorrect master key' })
    }
  } catch (err) {
    return res.status(500).json({ valid: false, error: err.message || 'Server authentication error' })
  }
}
