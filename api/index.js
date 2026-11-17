import verifyKeyHandler from './_verify-key.js'
import authUserHandler from './_auth-user.js'
import registerUserHandler from './_register-user.js'
import verifyFolderHandler from './_verify-folder.js'
import getSystemInfoHandler from './_get-system-info.js'
import createUploadUrlHandler from './_create-upload-url.js'
import uploadSnippetHandler from './_upload-snippet.js'
import uploadFileHandler from './_upload-file.js'
import listFilesHandler from './_list-files.js'
import getFileContentHandler from './_get-file-content.js'
import deleteFileHandler from './_delete-file.js'
import setPermissionsHandler from './_set-permissions.js'
import adminManageHandler from './_admin-manage.js'

const routeMap = {
  'verify-key': verifyKeyHandler,
  'auth-user': authUserHandler,
  'register-user': registerUserHandler,
  'verify-folder': verifyFolderHandler,
  'get-system-info': getSystemInfoHandler,
  'create-upload-url': createUploadUrlHandler,
  'upload-snippet': uploadSnippetHandler,
  'upload-file': uploadFileHandler,
  'list-files': listFilesHandler,
  'get-file-content': getFileContentHandler,
  'delete-file': deleteFileHandler,
  'set-permissions': setPermissionsHandler,
  'admin-manage': adminManageHandler,
}

export default async function handler(req, res) {
  // Extract route from query param (?route=...) or URL path
  const routeParam = req.query?.route
  const rawPath = req.headers?.['x-matched-path'] || req.url || ''
  const pathWithoutQuery = rawPath.split('?')[0]
  const extractedRoute = pathWithoutQuery.replace(/^\/?(api\/)?/, '').replace(/\/$/, '')

  const targetRoute = routeParam || extractedRoute
  const targetHandler = routeMap[targetRoute]

  if (!targetHandler) {
    return res.status(404).json({
      error: `API route not found: "${targetRoute}"`,
      availableRoutes: Object.keys(routeMap),
    })
  }

  try {
    return await targetHandler(req, res)
  } catch (err) {
    console.error(`Error in API route [${targetRoute}]:`, err)
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || 'Internal Server Error' })
    }
  }
}
