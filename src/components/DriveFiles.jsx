import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  RefreshCw, Download, ExternalLink, Eye, Trash2,
  FileText, Image, Archive, Film, Code, Music, Search, FolderOpen, AlertTriangle, X
} from 'lucide-react'
import axios from 'axios'
import FilePreviewModal from './FilePreviewModal'

const TEXT_EXTENSIONS = new Set([
  '.txt', '.py', '.cpp', '.c', '.h', '.hpp', '.java', '.js', '.jsx', '.ts', '.tsx',
  '.json', '.md', '.csv', '.html', '.css', '.xml', '.yaml', '.yml', '.sh', '.bat',
  '.sql', '.r', '.m', '.rb', '.go', '.rs', '.php', '.swift', '.kt', '.scala',
  '.pl', '.lua', '.dart', '.toml', '.ini', '.cfg', '.conf', '.log', '.env',
])

function getExtension(fileName) {
  if (!fileName) return ''
  const dot = fileName.lastIndexOf('.')
  if (dot === -1) return ''
  return fileName.substring(dot).toLowerCase()
}

function isTextFile(fileName) {
  return TEXT_EXTENSIONS.has(getExtension(fileName))
}

function getFileVisual(file) {
  const mime = file.mimeType || ''
  const name = (file.name || '').toLowerCase()
  const ext = getExtension(name)

  if (mime === 'application/pdf' || ext === '.pdf') {
    return { Icon: FileText, className: 'file-icon-pdf', tag: 'PDF' }
  }
  if (mime.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif'].includes(ext)) {
    return { Icon: Image, className: 'file-icon-image', tag: 'IMG' }
  }
  if (mime.startsWith('video/') || ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) {
    return { Icon: Film, className: 'file-icon-video', tag: 'VID' }
  }
  if (mime.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.flac', '.m4a'].includes(ext)) {
    return { Icon: Music, className: 'file-icon-audio', tag: 'AUD' }
  }
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || ['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
    return { Icon: Archive, className: 'file-icon-archive', tag: 'ARC' }
  }
  if (isTextFile(name) || mime.startsWith('text/') || mime.includes('json') || mime.includes('javascript')) {
    return { Icon: Code, className: 'file-icon-code', tag: 'SRC' }
  }
  return { Icon: FileText, className: 'file-icon-default', tag: 'DOC' }
}

function formatSize(bytes) {
  if (!bytes || bytes === '0') return '\u2014'
  const b = Number(bytes)
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isToday(dateStr) {
  if (!dateStr) return false
  const now = new Date()
  const then = new Date(dateStr)
  return now.toDateString() === then.toDateString()
}

function isThisWeek(dateStr) {
  if (!dateStr) return false
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now - then
  return diffMs < 7 * 24 * 60 * 60 * 1000
}

const FILTERS = [
  { key: 'all', label: 'All Files' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
]

export default function DriveFiles({ auth, masterKey }) {
  const token = auth?.token
  const master = auth?.masterKey || masterKey
  const authHeaders = useMemo(() => {
    return token ? { 'x-drop-token': token } : { 'x-master-key': master }
  }, [token, master])

  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const [previewFile, setPreviewFile] = useState(null)
  const [previewContent, setPreviewContent] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewTruncated, setPreviewTruncated] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchFiles = useCallback(async (showRefresh) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const { data } = await axios.post('/api/list-files', {}, {
        headers: authHeaders,
      })
      setFiles(data.files || [])
    } catch (err) {
      console.error('Failed to list files:', err)
      setError(err.response?.data?.error || 'Failed to load files from Google Drive')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [authHeaders])

  useEffect(() => {
    fetchFiles(false)
  }, [fetchFiles])

  const handlePreview = async (file) => {
    setPreviewFile(file)
    setPreviewContent('')
    setPreviewLoading(true)
    setPreviewTruncated(false)

    try {
      const { data } = await axios.post('/api/get-file-content', { fileId: file.id }, {
        headers: authHeaders,
      })
      setPreviewContent(data.content || '')
      setPreviewTruncated(data.truncated || false)
    } catch (err) {
      console.error('Failed to get file content:', err)
      setPreviewContent('Failed to load file content.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)

    try {
      await axios.post('/api/delete-file', { fileId: deleteTarget.id }, {
        headers: authHeaders,
      })
      setFiles(prev => prev.filter(f => f.id !== deleteTarget.id))
    } catch (err) {
      console.error('Failed to delete file:', err)
      alert(err.response?.data?.error || 'Failed to delete file')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  let filtered = files
  if (filter === 'today') filtered = filtered.filter(f => isToday(f.createdTime))
  if (filter === 'week') filtered = filtered.filter(f => isThisWeek(f.createdTime))
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(f => (f.name || '').toLowerCase().includes(q))
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Explorer Toolbar */}
      <div className="explorer-toolbar">
        <div className="explorer-search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="explorer-search-input"
            placeholder="Search files by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearch('')}
              title="Clear search filter"
            >
              <X size={13} />
            </button>
          )}
          <span className="search-count-badge">
            {filtered.length} {filtered.length === 1 ? 'FILE' : 'FILES'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="explorer-filters">
            {FILTERS.map(f => (
              <button
                key={f.key}
                className={`explorer-filter-btn ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            className="btn-secondary"
            onClick={() => fetchFiles(true)}
            disabled={refreshing}
            title="Refresh drive files"
          >
            <RefreshCw size={12} className={refreshing ? 'drive-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '36px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <span>// QUERYING_GOOGLE_DRIVE_API...</span>
        </div>
      ) : error ? (
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', padding: '36px 20px', textAlign: 'center' }}>
          <AlertTriangle size={24} color="var(--red)" style={{ margin: '0 auto 10px' }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--red)', marginBottom: '8px' }}>{error}</p>
          <button className="btn-secondary" onClick={() => fetchFiles(false)}>
            Retry Connection
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', padding: '48px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          <FolderOpen size={28} style={{ margin: '0 auto 10px', color: 'var(--text-muted)' }} />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            {files.length === 0 ? '[ NO FILES IN CONNECTED FOLDER ]' : '[ NO MATCHING RECORDS ]'}
          </p>
          <span style={{ fontSize: '11px' }}>Drop files to upload them to your Google Drive</span>
        </div>
      ) : (
        <div className="drive-file-list">
          {filtered.map((file) => {
            const { Icon, className, tag } = getFileVisual(file)
            const canPreview = isTextFile(file.name)
            const downloadUrl = `https://drive.google.com/uc?id=${file.id}&export=download`

            return (
              <div key={file.id} className="drive-file-item">
                <div className="drive-file-left">
                  <Icon size={16} className={className} />
                  <div className="drive-file-info">
                    <div className="drive-file-name" title={file.name}>{file.name}</div>
                    <div className="drive-file-meta">
                      <span className={`drive-badge ${file.folder === 'Snippets' ? 'badge-snippet' : 'badge-file'}`}>
                        {tag}
                      </span>
                      <span>{formatSize(file.size)}</span>
                      <span>&bull;</span>
                      <span>{timeAgo(file.createdTime)}</span>
                      {file.folder && <span>&bull; IN: {file.folder.toUpperCase()}</span>}
                    </div>
                  </div>
                </div>

                <div className="drive-file-actions">
                  {canPreview && (
                    <button
                      className="drive-action-btn"
                      onClick={() => handlePreview(file)}
                      title="Quick Preview"
                    >
                      <Eye size={13} />
                    </button>
                  )}
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="drive-action-btn"
                    title="Direct Download"
                  >
                    <Download size={13} />
                  </a>
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="drive-action-btn"
                    title="Open in Google Drive"
                  >
                    <ExternalLink size={13} />
                  </a>
                  <button
                    className="drive-action-btn drive-delete-btn"
                    onClick={() => setDeleteTarget(file)}
                    title="Delete File"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          content={previewContent}
          truncated={previewTruncated}
          loading={previewLoading}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 className="modal-title" style={{ color: 'var(--red)', marginBottom: '8px' }}>// DELETE RECORD</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{deleteTarget.name}</strong> from Google Drive?
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1, background: 'var(--red)', borderColor: 'var(--red)', color: '#ffffff' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <div className="spinner" /> : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
