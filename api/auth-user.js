import { verifyUserPin, createDropToken } from './_db.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { slug, pin } = body

    if (!slug || !pin) {
      return res.status(400).json({ error: 'Slug and PIN are required' })
    }

    const user = await verifyUserPin(slug, pin)
    if (!user) {
      return res.status(401).json({ valid: false, error: 'Invalid username or PIN' })
    }

    const token = createDropToken(user.slug, user.folderId)

    return res.status(200).json({
      valid: true,
      token,
      slug: user.slug,
      name: user.name,
    })
  } catch (error) {
    console.error('Error authenticating user:', error)
    return res.status(500).json({ valid: false, error: 'Authentication service error' })
  }
}
