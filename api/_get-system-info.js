import { getDriveClient } from './_drive.js'

let cachedEmail = null

export default async function handler(req, res) {
  try {
    if (!cachedEmail) {
      const { drive } = getDriveClient()
      const about = await drive.about.get({ fields: 'user(emailAddress)' })
      cachedEmail = about.data?.user?.emailAddress
    }

    return res.status(200).json({
      serviceAccountEmail: cachedEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    })
  } catch {
    return res.status(200).json({
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    })
  }
}
