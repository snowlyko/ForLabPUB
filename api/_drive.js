import { google } from 'googleapis'
import { Readable } from 'stream'
import { verifyDropToken } from './_db.js'

/**
 * Validates the master key from the x-master-key request header.
 */
export function validateMasterKey(req) {
  const clientKey = req.headers['x-master-key']
  const masterKey = process.env.MASTER_KEY
  return !!(clientKey && masterKey && clientKey === masterKey)
}

/**
 * Resolves authentication for a request. Supports:
 * 1. User Drop Token (`x-drop-token` header or `Authorization: Bearer <token>`)
 * 2. Master Key (`x-master-key` header) for backward compatibility
 *
 * Returns `{ authenticated: boolean, folderId?: string, slug?: string, isMaster?: boolean }`
 */
export function authenticateRequest(req) {
  // Check for User Drop Token
  const dropToken = req.headers['x-drop-token'] || (
    req.headers['authorization']?.startsWith('Bearer ')
      ? req.headers['authorization'].slice(7)
      : null
  )

  if (dropToken) {
    const verified = verifyDropToken(dropToken)
    if (verified && verified.folderId) {
      return {
        authenticated: true,
        folderId: verified.folderId,
        slug: verified.slug,
        isMaster: false,
      }
    }
  }

  // Fallback to Master Key
  if (validateMasterKey(req)) {
    return {
      authenticated: true,
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
      slug: 'master',
      isMaster: true,
    }
  }

  return { authenticated: false }
}

/**
 * Creates and returns an authenticated Google Drive client.
 * Supports OAuth2 (priority 1) and Service Account JWT (priority 2).
 *
 * @returns {{ auth: object, drive: object }}
 */
export function getDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  let privateKey = process.env.GOOGLE_PRIVATE_KEY

  let auth

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(
      clientId.trim(),
      clientSecret.trim(),
      'https://developers.google.com/oauthplayground'
    )
    oauth2Client.setCredentials({ refresh_token: refreshToken.trim() })
    auth = oauth2Client
  } else if (serviceEmail && privateKey) {
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      privateKey = Buffer.from(privateKey, 'base64').toString('utf8')
    }
    privateKey = privateKey.replace(/\\n/g, '\n')

    auth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file']
    })
  } else {
    throw new Error('Google Drive configuration missing. Set either OAuth2 or Service Account credentials.')
  }

  return { auth, drive: google.drive({ version: 'v3', auth }) }
}

/**
 * Test whether the service account has Editor (write) permissions on a folder.
 * Creates and immediately deletes a tiny handshake file.
 */
export async function testFolderPermissions(folderId) {
  const { drive } = getDriveClient()

  // 1. Try to read the folder metadata
  const folder = await drive.files.get({
    fileId: folderId,
    fields: 'id, name, mimeType',
    supportsAllDrives: true,
  })

  if (folder.data.mimeType !== 'application/vnd.google-apps.folder') {
    throw new Error('The provided ID is a file, not a Google Drive folder.')
  }

  // 2. Try to write a test file
  const testStream = new Readable()
  testStream.push('forlab-handshake-ok')
  testStream.push(null)

  const created = await drive.files.create({
    requestBody: {
      name: '.forlab-test-handshake',
      parents: [folderId],
    },
    media: {
      mimeType: 'text/plain',
      body: testStream,
    },
    fields: 'id',
    supportsAllDrives: true,
  })

  // 3. Immediately clean up the test file
  if (created.data && created.data.id) {
    try {
      await drive.files.delete({
        fileId: created.data.id,
        supportsAllDrives: true,
      })
    } catch {
      // Non-fatal if delete fails
    }
  }

  return { ok: true, folderName: folder.data.name }
}
