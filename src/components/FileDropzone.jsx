import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, Image, Archive, Film, Code, Music, X, CloudUpload } from 'lucide-react'
import axios from 'axios'

function getFileInfo(file) {
  const mime = file.type || ''
  const name = file.name.toLowerCase()

  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return { Icon: FileText, className: 'file-icon-pdf', label: 'PDF' }
  }
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|svg|webp|avif|ico|bmp)$/i.test(name)) {
    return { Icon: Image, className: 'file-icon-image', label: 'IMAGE' }
  }
  if (mime.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(name)) {
    return { Icon: Film, className: 'file-icon-video', label: 'VIDEO' }
  }
  if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(name)) {
    return { Icon: Music, className: 'file-icon-audio', label: 'AUDIO' }
  }
  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('rar') ||
    /\.(zip|tar|gz|bz2|7z|rar|xz)$/i.test(name)
  ) {
    return { Icon: Archive, className: 'file-icon-archive', label: 'ARCHIVE' }
  }
  if (
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('javascript') ||
    /\.(js|jsx|ts|tsx|py|cpp|c|h|hpp|java|go|rs|php|html|css|json|yaml|yml|md|sh|sql)$/i.test(name)
  ) {
    return { Icon: Code, className: 'file-icon-code', label: 'CODE' }
  }
  return { Icon: FileText, className: 'file-icon-default', label: 'FILE' }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileDropzone({ auth, masterKey, onUploadSuccess }) {
  const authHeaders = auth?.token ? { 'x-drop-token': auth.token } : { 'x-master-key': auth?.masterKey || masterKey }
  const [files, setFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const inputRef = useRef(null)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length > 0) {
      setFiles(prev => [...prev, ...dropped])
    }
  }, [])

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files)
    if (selected.length > 0) {
      setFiles(prev => [...prev, ...selected])
    }
    e.target.value = ''
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    if (files.length === 0 || uploading) return

    setUploading(true)
    const results = []

    for (let i = 0; i < files.length; i++) {
      setCurrentFileIndex(i)
      setProgress(5)

      const file = files[i]

      try {
        const { data: urlData } = await axios.post('/api/create-upload-url', {
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
        }, {
          headers: authHeaders,
        })

        setProgress(15)

        const uploadRes = await axios.put(urlData.uploadUrl, file, {
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = 15 + Math.round((progressEvent.loaded * 75) / progressEvent.total)
              setProgress(percent)
            }
          },
        })

        const fileId = uploadRes.data?.id || urlData.fileId
        setProgress(90)

        let webViewLink = uploadRes.data?.webViewLink || urlData.webViewLink
        if (fileId) {
          try {
            const { data: permData } = await axios.post('/api/set-permissions', {
              fileId,
            }, {
              headers: authHeaders,
            })
            webViewLink = permData.webViewLink || webViewLink
          } catch (permErr) {
            console.warn('Permission setting failed (non-fatal):', permErr)
          }
        }

        setProgress(100)

        results.push({
          fileName: file.name,
          webViewLink: webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
          fileId,
        })
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err)
        results.push({
          fileName: file.name,
          error: err.response?.data?.error || err.message || 'Upload failed',
        })
      }
    }

    setUploading(false)
    setFiles([])
    setProgress(0)
    setCurrentFileIndex(0)

    const successResults = results.filter(r => !r.error)
    if (successResults.length > 0) {
      onUploadSuccess(successResults)
    } else {
      alert('Upload failed. Please check your network and credentials.')
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Wide 2-Column Workbench Grid */}
      <div className="dropzone-grid">
        {/* Left Column: Drop Area */}
        <div
          className={`dropzone-area ${dragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div className="dropzone-icon-wrap">
            <Upload size={22} />
          </div>
          <p className="dropzone-title">
            {dragOver ? '[ RELEASE TO DROP FILES ]' : 'Drag & Drop Files or Click to Browse'}
          </p>
          <p className="dropzone-subtitle">
            Direct high-speed stream to Google Drive &bull; Any size / format
          </p>
        </div>

        {/* Right Column: Queue & Action Panel */}
        <div className="queue-panel">
          <div className="queue-header">
            <span>// STAGED_QUEUE ({files.length} ITEMS)</span>
            <span>TARGET: GDRIVE</span>
          </div>

          {files.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '11px', textAlign: 'center' }}>
              <span>[ NO FILES SELECTED ]</span>
              <span style={{ fontSize: '10px', marginTop: '4px' }}>Drop items on the left to stage for upload</span>
            </div>
          ) : (
            <div className="file-list">
              {files.map((file, i) => {
                const { Icon, className, label } = getFileInfo(file)
                return (
                  <div key={`${file.name}-${i}`} className="file-item">
                    <Icon size={16} className={className} />
                    <div className="file-item-info">
                      <div className="file-item-name" title={file.name}>{file.name}</div>
                      <div className="file-item-size">
                        <span style={{ color: 'var(--amber)', marginRight: '6px' }}>[{label}]</span>
                        {formatSize(file.size)}
                      </div>
                    </div>
                    {!uploading && (
                      <button
                        className="file-item-remove"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(i)
                        }}
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="progress-container">
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="progress-text">
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                  STREAMING: {files[currentFileIndex]?.name}
                </span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          {/* Upload Button */}
          {files.length > 0 && (
            <button
              className="btn-primary"
              style={{ marginTop: '14px' }}
              onClick={uploadFiles}
              disabled={uploading}
            >
              {uploading ? (
                <div className="spinner" />
              ) : (
                <>
                  <CloudUpload size={15} />
                  <span>Stream {files.length} {files.length === 1 ? 'File' : 'Files'} to Drive</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
