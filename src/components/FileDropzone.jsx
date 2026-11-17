import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, Image, Archive, Film, X, CloudUpload } from 'lucide-react'
import axios from 'axios'

const FILE_ICONS = {
  'application/pdf': FileText,
  'application/zip': Archive,
  'application/x-zip-compressed': Archive,
  'image/': Image,
  'video/': Film,
}

function getFileIcon(mimeType) {
  for (const [key, Icon] of Object.entries(FILE_ICONS)) {
    if (mimeType.startsWith(key)) return Icon
  }
  return FileText
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
        // Step 1: Request a direct resumable upload URL from backend (tiny request, <1KB)
        const { data: urlData } = await axios.post('/api/create-upload-url', {
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
        }, {
          headers: authHeaders,
        })

        setProgress(15)

        // Step 2: Upload file directly to Google Drive servers (bypasses serverless payload limit)
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

        // Step 3: Set "anyone with link" permission via backend
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
    <div className="fade-enter">
      {/* Dropzone */}
      <div
        className={`dropzone-area ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div className="dropzone-icon">
          <Upload size={40} strokeWidth={1.5} />
        </div>
        <p className="dropzone-title">
          {dragOver ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="dropzone-subtitle">or click to browse • any file type</p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="file-list mt-16">
          {files.map((file, i) => {
            const Icon = getFileIcon(file.type)
            return (
              <div key={`${file.name}-${i}`} className="file-item">
                <Icon size={20} className="file-item-icon" />
                <div className="file-item-info">
                  <div className="file-item-name">{file.name}</div>
                  <div className="file-item-size">{formatSize(file.size)}</div>
                </div>
                {!uploading && (
                  <button
                    className="file-item-remove"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(i)
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div className="progress-container">
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-text">
            <span>Uploading {files[currentFileIndex]?.name}</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <button
          className="btn-primary mt-16"
          onClick={uploadFiles}
          disabled={uploading}
        >
          {uploading ? (
            <div className="spinner" />
          ) : (
            <>
              <CloudUpload size={18} />
              Upload {files.length} {files.length === 1 ? 'file' : 'files'} to Google Drive
            </>
          )}
        </button>
      )}
    </div>
  )
}
